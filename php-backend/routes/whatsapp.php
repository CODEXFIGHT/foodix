<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Integración WhatsApp (Twilio / Meta / Wati) — estado de conexión, sesiones
 * conversacionales (carrito) e historial de mensajes por sucursal.
 *
 * Endpoints de administración (JWT admin/superadmin):
 *   GET  /whatsapp/status?branch_slug=  — estado de conexión de la sucursal
 *   POST /whatsapp/connect              — marca conectado/conectando
 *   POST /whatsapp/logout               — limpia el estado de conexión
 *
 * Endpoints de servicio (header X-Service-Token == WA_SERVICE_SECRET), usados por
 * el webhook de Next.js para persistir el estado conversacional en serverless:
 *   GET  /whatsapp/session?branch_slug=&phone=  — carga la sesión
 *   POST /whatsapp/session                       — guarda/borra la sesión
 *   POST /whatsapp/message                       — registra un mensaje (historial)
 *   POST /whatsapp/auto-connect                  — marca "conectado" al llegar el primer
 *                                                   mensaje real (autodetección, sin clic manual)
 *   GET  /whatsapp/kitchen-load?branch_slug=     — pedidos activos ahora mismo (aviso de demora)
 *   GET  /whatsapp/inactive-sessions?minutes=    — sesiones con pedido a medias listas para el
 *                                                   recordatorio "¿sigues ahí?" (cron externo)
 *   POST /whatsapp/notify-inactive               — marca que ya se le avisó a esa sesión
 *
 * Solo planes AI/MultiSucursal pueden conectar WhatsApp (la integración es exclusiva).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';

function handleWhatsapp(array $seg, string $method): never {
    $action = $seg[1] ?? '';

    // ── Endpoints de servicio (webhook Next.js) ──
    if (in_array($action, [
        'session', 'message', 'order', 'resolve', 'auto-connect', 'kitchen-load',
        'inactive-sessions', 'notify-inactive',
    ], true)) {
        waRequireServiceToken();
        $db = Database::connect();
        if ($action === 'resolve'           && $method === 'GET')  waResolveBranch($db);
        if ($action === 'session'           && $method === 'GET')  waGetSession($db);
        if ($action === 'session'           && $method === 'POST') waSaveSession($db);
        if ($action === 'message'           && $method === 'POST') waLogMessage($db);
        if ($action === 'order'             && $method === 'POST') waCreateOrder($db);
        if ($action === 'auto-connect'      && $method === 'POST') waAutoConnect($db);
        if ($action === 'kitchen-load'      && $method === 'GET')  waKitchenLoad($db);
        if ($action === 'inactive-sessions' && $method === 'GET')  waInactiveSessions($db);
        if ($action === 'notify-inactive'   && $method === 'POST') waMarkNotified($db);
        jsonError(404, 'Ruta no encontrada');
    }

    // ── Endpoints de administración (JWT) ──
    $payload = requireAuth();
    requireRole($payload, 'admin', 'superadmin');
    $db = Database::connect();

    if ($action === 'status'  && $method === 'GET')  waStatus($db, $payload);
    if ($action === 'connect' && $method === 'POST') waConnect($db, $payload);
    if ($action === 'logout'  && $method === 'POST') waLogout($db, $payload);

    jsonError(404, 'Ruta no encontrada');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Valida el token de servicio compartido con la capa Next.js. */
function waRequireServiceToken(): void {
    $token = $_SERVER['HTTP_X_SERVICE_TOKEN'] ?? '';
    $secret = defined('WA_SERVICE_SECRET') ? WA_SERVICE_SECRET : '';
    if ($secret === '' || !hash_equals($secret, (string)$token)) {
        jsonError(401, 'Token de servicio inválido');
    }
}

/** Resuelve el branch_id desde un slug de sucursal activa. */
function waBranchIdFromSlug(PDO $db, string $slug): ?int {
    $slug = trim($slug);
    if ($slug === '') return null;
    $stmt = $db->prepare('SELECT id FROM branches WHERE slug = ? AND active = 1 LIMIT 1');
    $stmt->execute([$slug]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int)$id;
}

/** Plan AI/MultiSucursal = WhatsApp habilitado. */
function waBranchHasWhatsApp(PDO $db, int $branchId): bool {
    $plan = currentPlanForBranch($db, $branchId);
    return in_array('whatsapp_ai_waiter', licenseForPlan($plan)['features'], true);
}

/** Asegura una fila de conexión y la devuelve. */
function waLoadConnection(PDO $db, int $branchId): array {
    $stmt = $db->prepare('SELECT * FROM wa_connections WHERE branch_id = ? LIMIT 1');
    $stmt->execute([$branchId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return [
            'branch_id' => $branchId, 'provider' => 'twilio', 'status' => 'desconectado',
            'phone_number' => null, 'from_number' => null, 'last_sync_at' => null, 'meta' => null,
        ];
    }
    return $row;
}

// ── GET /whatsapp/status ───────────────────────────────────────────────────────
function waStatus(PDO $db, array $payload): never {
    $branchId = waResolveAdminBranch($db, $payload);
    $conn = waLoadConnection($db, $branchId);
    jsonResponse([
        'plan_pro'     => waBranchHasWhatsApp($db, $branchId),
        'provider'     => $conn['provider'] ?? 'twilio',
        'status'       => $conn['status'] ?? 'desconectado',
        'phone_number' => $conn['phone_number'] ?? null,
        'from_number'  => $conn['from_number'] ?? null,
        'last_sync_at' => $conn['last_sync_at'] ?? null,
    ]);
}

// ── POST /whatsapp/connect ─────────────────────────────────────────────────────
function waConnect(PDO $db, array $payload): never {
    $branchId = waResolveAdminBranch($db, $payload);
    requirePlanFeature($db, $branchId, 'whatsapp_ai_waiter', 'WhatsApp AI Waiter');

    $body = getBody();
    $status      = in_array(($body['status'] ?? ''), ['conectando', 'conectado'], true)
        ? (string)$body['status'] : 'conectado';
    $fromNumber  = mb_substr(trim((string)($body['from_number'] ?? '')), 0, 32) ?: null;
    $phoneNumber = mb_substr(trim((string)($body['phone_number'] ?? '')), 0, 32) ?: null;

    $stmt = $db->prepare(
        'INSERT INTO wa_connections (branch_id, provider, status, phone_number, from_number, last_sync_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            phone_number = COALESCE(VALUES(phone_number), phone_number),
            from_number  = COALESCE(VALUES(from_number),  from_number),
            last_sync_at = NOW(),
            last_error   = NULL'
    );
    $stmt->execute([$branchId, 'twilio', $status, $phoneNumber, $fromNumber]);

    jsonResponse(waLoadConnection($db, $branchId));
}

// ── POST /whatsapp/logout ──────────────────────────────────────────────────────
function waLogout(PDO $db, array $payload): never {
    $branchId = waResolveAdminBranch($db, $payload);
    $stmt = $db->prepare(
        'UPDATE wa_connections
         SET status = \'desconectado\', phone_number = NULL, last_sync_at = NOW()
         WHERE branch_id = ?'
    );
    $stmt->execute([$branchId]);
    jsonResponse(['ok' => true, 'status' => 'desconectado']);
}

// ── POST /whatsapp/auto-connect (servicio) ──────────────────────────────────────
/**
 * Marca la sucursal como "conectado" automáticamente cuando el webhook recibe
 * el primer mensaje real de WhatsApp — sin que el admin tenga que hacer clic
 * en "Marcar conectado" / "Ya me uní". Idempotente: si ya estaba conectado,
 * solo refresca last_sync_at (mantiene "última sincronización" al día).
 *
 * Solo aplica a sucursales con plan AI/MultiSucursal (no-op silencioso si no,
 * para no romper el flujo del webhook por una sucursal sin acceso).
 */
function waAutoConnect(PDO $db): never {
    $body     = getBody();
    $branchId = waBranchIdFromSlug($db, (string)($body['branch_slug'] ?? ''));
    if (!$branchId || !waBranchHasWhatsApp($db, $branchId)) {
        jsonResponse(['ok' => false]);
    }

    $provider   = in_array($body['provider'] ?? '', ['twilio', 'meta', 'wati'], true)
        ? $body['provider'] : 'twilio';
    $fromNumber = mb_substr(trim((string)($body['from_number'] ?? '')), 0, 32) ?: null;

    $stmt = $db->prepare(
        'INSERT INTO wa_connections (branch_id, provider, status, from_number, last_sync_at)
         VALUES (?, ?, \'conectado\', ?, NOW())
         ON DUPLICATE KEY UPDATE
            status = \'conectado\',
            from_number = COALESCE(VALUES(from_number), from_number),
            last_sync_at = NOW(),
            last_error = NULL'
    );
    $stmt->execute([$branchId, $provider, $fromNumber]);

    jsonResponse(['ok' => true]);
}

/**
 * Sucursal objetivo para acciones de admin: por defecto la del token; el
 * superadmin puede pasar ?branch_slug= para operar sobre cualquiera.
 */
function waResolveAdminBranch(PDO $db, array $payload): int {
    $slug = trim((string)($_GET['branch_slug'] ?? ''));
    if ($slug !== '' && ($payload['role'] ?? '') === 'superadmin') {
        $id = waBranchIdFromSlug($db, $slug);
        if (!$id) jsonError(404, 'Sucursal no encontrada');
        return $id;
    }
    $branchId = (int)($payload['branch_id'] ?? 0);
    if ($branchId <= 0) jsonError(422, 'Sucursal no determinada');
    return $branchId;
}

// ── GET /whatsapp/resolve (servicio) ───────────────────────────────────────────
/**
 * Resuelve la sucursal dueña de un número de WhatsApp del negocio (multi-tenant).
 * Busca en wa_connections.from_number comparando solo dígitos (tolera el '+').
 * Devuelve el slug de la sucursal y si tiene WhatsApp (plan Pro/Enterprise).
 */
function waResolveBranch(PDO $db): never {
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug !== '') {
        $stmt = $db->prepare('SELECT id, slug FROM branches WHERE slug = ? AND active = 1 LIMIT 1');
        $stmt->execute([$slug]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) jsonResponse(['branch_slug' => null, 'plan_pro' => false]);
        jsonResponse([
            'branch_slug' => $row['slug'],
            'plan_pro'    => waBranchHasWhatsApp($db, (int)$row['id']),
        ]);
    }

    $digits = preg_replace('/\D+/', '', (string)($_GET['to'] ?? ''));
    if ($digits === '') jsonResponse(['branch_slug' => null, 'plan_pro' => false]);

    $stmt = $db->prepare(
        "SELECT b.slug, c.branch_id
         FROM wa_connections c
         JOIN branches b ON b.id = c.branch_id AND b.active = 1
         WHERE REPLACE(REPLACE(c.from_number, '+', ''), ' ', '') = ?
           AND c.status = 'conectado'
         LIMIT 1"
    );
    $stmt->execute([$digits]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonResponse(['branch_slug' => null, 'plan_pro' => false]);

    jsonResponse([
        'branch_slug' => $row['slug'],
        'plan_pro'    => waBranchHasWhatsApp($db, (int)$row['branch_id']),
    ]);
}

// ── GET /whatsapp/session (servicio) ───────────────────────────────────────────
function waGetSession(PDO $db): never {
    $branchId = waBranchIdFromSlug($db, (string)($_GET['branch_slug'] ?? ''));
    $phone    = mb_substr(trim((string)($_GET['phone'] ?? '')), 0, 32);
    if (!$branchId || $phone === '') jsonError(422, 'branch_slug y phone requeridos');

    $stmt = $db->prepare('SELECT * FROM wa_sessions WHERE branch_id = ? AND phone = ? LIMIT 1');
    $stmt->execute([$branchId, $phone]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) { jsonResponse(['session' => null]); }

    jsonResponse(['session' => [
        'phone'          => $row['phone'],
        'step'           => $row['step'],
        'cart'           => $row['cart'] ? json_decode((string)$row['cart'], true) : [],
        // Producto en espera de cantidad/notas — SIN esto, el producto que el
        // cliente está agregando se pierde si el mensaje de "cantidad" o
        // "notas" cae en otra invocación serverless (bug real: el pedido
        // terminaba solo con el último producto que llegó a completarse).
        'pendingProduct' => isset($row['pending_product']) && $row['pending_product']
            ? json_decode((string)$row['pending_product'], true) : null,
        // Ya le mostramos el prompt de recuperación ("¿continuar/cancelar/ver
        // menú?") y estamos esperando su decisión — ver whatsappFlow.ts.
        'awaitingResume' => (bool)($row['awaiting_resume'] ?? false),
        'orderType'      => $row['order_type'] ?: null,
        'tableNumber'    => $row['table_number'] ?: null,
        'customerName'   => $row['customer_name'] ?: null,
        // Cursor de paginación del menú ("ver más") — sin persistirlo, en
        // serverless "ver más" siempre volvía a mostrar la página 1.
        'menuPage'       => isset($row['menu_page']) ? (int)$row['menu_page'] : 0,
        'lastActivity'   => strtotime((string)$row['last_activity']) * 1000,
    ]]);
}

// ── POST /whatsapp/session (servicio) ──────────────────────────────────────────
function waSaveSession(PDO $db): never {
    $body     = getBody();
    $branchId = waBranchIdFromSlug($db, (string)($body['branch_slug'] ?? ''));
    $phone    = mb_substr(trim((string)($body['phone'] ?? '')), 0, 32);
    if (!$branchId || $phone === '') jsonError(422, 'branch_slug y phone requeridos');

    // clear = true → borra la sesión (pedido confirmado o cancelado)
    if (!empty($body['clear'])) {
        $stmt = $db->prepare('DELETE FROM wa_sessions WHERE branch_id = ? AND phone = ?');
        $stmt->execute([$branchId, $phone]);
        jsonResponse(['ok' => true, 'cleared' => true]);
    }

    $step           = mb_substr((string)($body['step'] ?? 'idle'), 0, 24);
    $cart           = isset($body['cart']) ? json_encode($body['cart'], JSON_UNESCAPED_UNICODE) : null;
    $pendingProduct = isset($body['pendingProduct']) && $body['pendingProduct']
        ? json_encode($body['pendingProduct'], JSON_UNESCAPED_UNICODE) : null;
    $awaitingResume = !empty($body['awaitingResume']) ? 1 : 0;
    $orderType = isset($body['orderType'])    ? mb_substr((string)$body['orderType'], 0, 16) : null;
    $table     = isset($body['tableNumber'])  ? mb_substr((string)$body['tableNumber'], 0, 16) : null;
    $custName  = isset($body['customerName']) ? mb_substr((string)$body['customerName'], 0, 80) : null;
    $menuPage  = isset($body['menuPage']) ? max(0, (int)$body['menuPage']) : 0;

    $stmt = $db->prepare(
        'INSERT INTO wa_sessions (branch_id, phone, step, cart, pending_product, awaiting_resume, order_type, table_number, customer_name, menu_page, last_activity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
            step = VALUES(step),
            cart = VALUES(cart),
            pending_product = VALUES(pending_product),
            awaiting_resume = VALUES(awaiting_resume),
            order_type = VALUES(order_type),
            table_number = VALUES(table_number),
            customer_name = VALUES(customer_name),
            menu_page = VALUES(menu_page),
            last_activity = NOW()'
    );
    $stmt->execute([$branchId, $phone, $step, $cart, $pendingProduct, $awaitingResume, $orderType, $table, $custName, $menuPage]);

    jsonResponse(['ok' => true]);
}

// ── GET /whatsapp/inactive-sessions (servicio) ─────────────────────────────────
/**
 * Sesiones con pedido a medias que llevan >= `minutes` sin actividad y todavía
 * no recibieron el recordatorio "¿sigues ahí?" desde su última actividad. El
 * cron externo (Vercel Hobby no permite crons de alta frecuencia) llama esto
 * cada 5-10 min y le manda el aviso a cada una — ver
 * app/api/whatsapp/cron/inactivity/route.ts.
 */
function waInactiveSessions(PDO $db): never {
    $minutes = isset($_GET['minutes']) ? (int)$_GET['minutes'] : 15;
    $minutes = max(5, min(60, $minutes));

    $stmt = $db->prepare(
        "SELECT b.slug AS branch_slug, s.phone
         FROM wa_sessions s
         JOIN branches b ON b.id = s.branch_id
         WHERE s.step NOT IN ('idle', 'done', 'human_support')
           AND s.awaiting_resume = 0
           AND (JSON_LENGTH(s.cart) > 0 OR s.pending_product IS NOT NULL)
           AND s.last_activity <= (NOW() - INTERVAL ? MINUTE)
           AND (s.last_notified_at IS NULL OR s.last_notified_at < s.last_activity)"
    );
    $stmt->execute([$minutes]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(['sessions' => array_map(fn($r) => [
        'branch_slug' => $r['branch_slug'],
        'phone'       => $r['phone'],
    ], $rows)]);
}

// ── POST /whatsapp/notify-inactive (servicio) ──────────────────────────────────
/**
 * Marca que ya se le mandó el recordatorio de inactividad a esta sesión.
 * NO toca `last_activity` a propósito: el aviso automático no es actividad
 * real del cliente y no debe resetear su reloj de inactividad/TTL.
 */
function waMarkNotified(PDO $db): never {
    $body     = getBody();
    $branchId = waBranchIdFromSlug($db, (string)($body['branch_slug'] ?? ''));
    $phone    = mb_substr(trim((string)($body['phone'] ?? '')), 0, 32);
    if (!$branchId || $phone === '') jsonError(422, 'branch_slug y phone requeridos');

    $stmt = $db->prepare('UPDATE wa_sessions SET last_notified_at = NOW() WHERE branch_id = ? AND phone = ?');
    $stmt->execute([$branchId, $phone]);

    jsonResponse(['ok' => true]);
}

// ── POST /whatsapp/order (servicio) ────────────────────────────────────────────
/**
 * Crea un pedido real desde el flujo de WhatsApp y lo deja en cocina (KDS).
 * Reutiliza los helpers de orders.php (cálculo de items, inserción de estados
 * por estación y push a cocina). Atribuye el pedido al admin de la sucursal.
 *
 * Body: { branch_slug, customer_name, customer_phone, order_type, table_number,
 *         items: [{ product_id, name, unit_price, quantity }] }
 */
function waCreateOrder(PDO $db): never {
    require_once __DIR__ . '/orders.php';      // cleanOrderItemInput, insertOrderItemRow, branchTaxRate
    require_once __DIR__ . '/recipes.php';     // deductRecipeStock (usado por insertOrderItemRow)
    require_once __DIR__ . '/push.php';        // notifyKitchenNewOrder
    require_once __DIR__ . '/promotions.php';  // evaluateOrderPromotions()

    $body     = getBody();
    $branchId = waBranchIdFromSlug($db, (string)($body['branch_slug'] ?? ''));
    if (!$branchId) jsonError(404, 'Sucursal no encontrada');
    requirePlanFeature($db, $branchId, 'whatsapp_ai_waiter', 'WhatsApp AI Waiter');

    $rawItems = $body['items'] ?? [];
    if (empty($rawItems) || !is_array($rawItems)) jsonError(422, 'El pedido no tiene productos');

    $orderType = (string)($body['order_type'] ?? 'takeaway');
    if (!in_array($orderType, ['dine_in', 'takeaway', 'delivery'], true)) $orderType = 'takeaway';

    $customerName    = mb_substr(trim((string)($body['customer_name'] ?? 'Cliente WhatsApp')), 0, 80);
    $customerPhone   = mb_substr(trim((string)($body['customer_phone'] ?? '')), 0, 32) ?: null;
    $tableNumber     = trim((string)($body['table_number'] ?? ''));
    $deliveryAddress = mb_substr(trim((string)($body['delivery_address'] ?? '')), 0, 200) ?: null;
    $tableName       = $orderType === 'dine_in' && $tableNumber !== ''
        ? (preg_match('/^\d/', $tableNumber) ? "Mesa $tableNumber" : $tableNumber)
        : 'WhatsApp';

    // Usuario al que se atribuye el pedido (admin de la sucursal).
    $u = $db->prepare("SELECT id FROM users WHERE branch_id = ? AND active = 1 ORDER BY (role = 'admin') DESC, id ASC LIMIT 1");
    $u->execute([$branchId]);
    $createdBy = (int)($u->fetchColumn() ?: 0);
    if ($createdBy <= 0) jsonError(422, 'La sucursal no tiene usuarios para asignar el pedido');

    // Normaliza items (mapea el formato del carrito de WhatsApp al de orders.php).
    $subtotal = 0.0;
    $cleanItems = [];
    foreach ($rawItems as $it) {
        if (!is_array($it)) continue;
        $clean = cleanOrderItemInput([
            'product_id'   => $it['product_id'] ?? 0,
            'product_name' => $it['name'] ?? ($it['product_name'] ?? ''),
            'quantity'     => $it['quantity'] ?? 1,
            'unit_price'   => $it['unit_price'] ?? ($it['price'] ?? 0),
            // Nota libre que el cliente escribió por WhatsApp (ej. "sin cebolla").
            // Twilio/Meta no exponen modificadores reales del producto en la Carta
            // QR pública, así que el bot usa texto libre en vez de inventar opciones.
            'item_notes'   => $it['item_notes'] ?? ($it['notes'] ?? null),
        ]);
        $subtotal += $clean['subtotal'];
        $cleanItems[] = $clean;
    }
    if (empty($cleanItems)) jsonError(422, 'El pedido no tiene productos válidos');

    // Huella del carrito para idempotencia — se calcula ANTES de evaluar
    // combos/promociones/lealtad, para que un reintento compare lo que el
    // cliente realmente pidió y no se vea afectado si una promoción por
    // horario expira justo entre el intento original y el reintento.
    $cartFingerprint = implode(',', array_map(
        fn($i) => $i['product_id'] . ':' . $i['quantity'],
        $cleanItems
    ));

    // Combos (el bot de WhatsApp todavía no los expone al cliente, pero el
    // helper es el mismo que usa el POS) + promociones automáticas + lealtad
    // — se evalúan siempre, sin que el cliente haga nada especial.
    $promoResult = evaluateOrderPromotions($db, $branchId, $cleanItems, $customerPhone);
    $cleanItems  = $promoResult['expandedItems'];
    $subtotal    = round(array_sum(array_column($cleanItems, 'subtotal')), 2);
    $discount    = $promoResult['discount'];

    $taxRate = branchTaxRate($db, $branchId);
    $taxable = max(0.0, $subtotal - $discount);
    $tax     = $taxRate > 0 ? round($taxable - ($taxable / (1 + $taxRate)), 2) : 0.0;
    $total   = round($taxable, 2); // el bot de WhatsApp no maneja propina todavía

    $cartHash = hash('sha256', $branchId . '|' . ($customerPhone ?? '') . '|' . $cartFingerprint);

    $dedupStmt = $db->prepare(
        'SELECT order_id FROM wa_order_dedup
         WHERE branch_id = ? AND phone = ? AND cart_hash = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
         LIMIT 1'
    );
    $dedupStmt->execute([$branchId, $customerPhone ?? '', $cartHash]);
    $existingOrderId = $dedupStmt->fetchColumn();
    if ($existingOrderId !== false) {
        $o = $db->prepare('SELECT total FROM orders WHERE id = ? LIMIT 1');
        $o->execute([(int)$existingOrderId]);
        jsonResponse([
            'id' => (int)$existingOrderId, 'order_id' => (int)$existingOrderId,
            'total' => (float)($o->fetchColumn() ?: $total),
        ]);
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            'INSERT INTO orders (branch_id, table_name, order_type, status, subtotal, tax, total, discount,
                                 notes, source, customer_name, customer_phone, delivery_address, created_by)
             VALUES (?, ?, ?, \'pending\', ?, ?, ?, ?, ?, \'whatsapp\', ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $tableName, $orderType, $subtotal, $tax, $total, $discount,
            'Pedido por WhatsApp', $customerName, $customerPhone, $deliveryAddress, $createdBy,
        ]);
        $orderId = (int)$db->lastInsertId();

        foreach ($cleanItems as $item) {
            insertOrderItemRow($db, $orderId, $branchId, $item, $createdBy);
        }

        insertDiscountAuditRows($db, $orderId, $promoResult['auditRows']);

        $db->prepare(
            'INSERT INTO wa_order_dedup (branch_id, phone, cart_hash, order_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE order_id = VALUES(order_id), created_at = NOW()'
        )->execute([$branchId, $customerPhone ?? '', $cartHash, $orderId]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        error_log('[FoodIX WA] waCreateOrder: ' . $e->getMessage());
        jsonError(500, 'No se pudo crear el pedido');
    }

    notifyKitchenNewOrder($db, $branchId, $orderId, $tableName, $createdBy, count($cleanItems), 'WhatsApp 🤖');

    jsonResponse(['id' => $orderId, 'order_id' => $orderId, 'total' => $total]);
}

// Umbral de pedidos activos (pending/preparing) a partir del cual se avisa al
// cliente que la cocina está saturada — ver finishOrder() en whatsappFlow.ts.
const WA_KITCHEN_BUSY_THRESHOLD = 8;

// ── GET /whatsapp/kitchen-load?branch_slug= (servicio) ─────────────────────────
/** ¿La cocina de esta sucursal tiene muchos pedidos activos ahora mismo? */
function waKitchenLoad(PDO $db): never {
    $branchId = waBranchIdFromSlug($db, (string)($_GET['branch_slug'] ?? ''));
    if (!$branchId) jsonResponse(['busy' => false, 'active_orders' => 0]);

    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM orders WHERE branch_id = ? AND status IN ('pending','preparing')"
    );
    $stmt->execute([$branchId]);
    $activeOrders = (int)$stmt->fetchColumn();

    jsonResponse([
        'busy'          => $activeOrders >= WA_KITCHEN_BUSY_THRESHOLD,
        'active_orders' => $activeOrders,
    ]);
}

// ── POST /whatsapp/message (servicio) ──────────────────────────────────────────
/**
 * Registra un mensaje en el historial y, si trae `provider_message_id` (Twilio
 * MessageSid u homólogo), sirve como guard de idempotencia contra reintentos
 * del webhook: el índice único (branch_id, provider_message_id) rechaza el
 * segundo intento y este devuelve `duplicate: true` en vez de fallar, para
 * que whatsappFlow.ts pueda cortar el procesamiento sin volver a ejecutar el
 * paso de la conversación.
 */
function waLogMessage(PDO $db): never {
    $body       = getBody();
    $branchId   = waBranchIdFromSlug($db, (string)($body['branch_slug'] ?? ''));
    $phone      = mb_substr(trim((string)($body['phone'] ?? '')), 0, 32);
    $direction  = ($body['direction'] ?? 'in') === 'out' ? 'out' : 'in';
    $msgBody    = mb_substr((string)($body['body'] ?? ''), 0, 4000);
    $providerId = trim((string)($body['provider_message_id'] ?? '')) ?: null;
    if (!$branchId || $phone === '') jsonError(422, 'branch_slug y phone requeridos');

    try {
        $stmt = $db->prepare(
            'INSERT INTO wa_messages (branch_id, phone, direction, body, provider_message_id) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$branchId, $phone, $direction, $msgBody, $providerId]);
    } catch (PDOException $e) {
        // Código 23000 = violación de índice único → mismo mensaje ya procesado.
        if ($e->getCode() === '23000' && $providerId !== null) {
            jsonResponse(['ok' => true, 'duplicate' => true]);
        }
        throw $e;
    }

    jsonResponse(['ok' => true]);
}
