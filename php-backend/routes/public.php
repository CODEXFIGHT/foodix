<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Endpoints públicos (sin autenticación): carta digital por sucursal.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/receipt_upload.php';
require_once __DIR__ . '/promotions.php';  // branchHasPromotionsFeature()

function handlePublic(array $seg, string $method): never {
    // GET /public/menu/{slug}
    if (($seg[1] ?? '') === 'menu' && $method === 'GET') {
        handlePublicMenu($seg[2] ?? '');
    }
    // GET /public/branch-logo/{username} — logo de la sucursal del usuario (login)
    if (($seg[1] ?? '') === 'branch-logo' && $method === 'GET') {
        handleBranchLogoLookup($seg[2] ?? '');
    }
    // GET /public/spei-receipt — comprobante del checkout de la landing (visitante sin sesión)
    if (($seg[1] ?? '') === 'spei-receipt' && $method === 'POST') {
        $url = saveReceiptFromRequest('receipt');
        jsonResponse(['receipt_url' => $url]);
    }
    jsonError(404, 'Recurso público no encontrado');
}

// Devuelve el logo de la sucursal a la que pertenece un nombre de usuario y
// una pista de método de acceso (PIN vs contraseña), para que el login pueda
// mostrar el teclado numérico automáticamente sin revelar datos sensibles
// (nunca se expone email, password ni nada salvo lo necesario para la UI).
function handleBranchLogoLookup(string $username): never {
    $username = trim($username);
    if ($username === '') jsonResponse(['found' => false, 'logo_url' => null]);

    $db = Database::connect();
    $stmt = $db->prepare(
        'SELECT u.id, u.name, u.role, u.branch_id, (u.pin_hash IS NOT NULL) AS has_pin, b.logo_url
         FROM users u JOIN branches b ON b.id = u.branch_id
         WHERE u.username = ? AND u.active = 1 AND b.active = 1
         LIMIT 1'
    );
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if (!$row) jsonResponse(['found' => false, 'logo_url' => null]);

    // Misma regla que /auth/login: solo admin/superadmin entran con contraseña.
    $requiresPin = $row['role'] !== 'admin' && $row['role'] !== 'superadmin';

    jsonResponse([
        'found'        => true,
        'logo_url'     => $row['logo_url'] ?: null,
        'name'         => $row['name'],
        'requires_pin' => $requiresPin,
        'has_pin'      => (bool)$row['has_pin'],
        'user_id'      => (int)$row['id'],
        'branch_id'    => (int)$row['branch_id'],
    ]);
}

// Etiqueta legible del calendario de una promoción ("Lun, Mar · 13:00–17:00"),
// para que la carta explique CUÁNDO aplica una promo que hoy no está vigente en
// vez de simplemente ocultarla.
function promoScheduleLabel(?string $days, ?string $start, ?string $end): string {
    $dayNames = ['mon'=>'Lun','tue'=>'Mar','wed'=>'Mié','thu'=>'Jue','fri'=>'Vie','sat'=>'Sáb','sun'=>'Dom'];
    $parts = [];

    if ($days !== null && $days !== '') {
        $keys = explode(',', $days);
        $labels = array_values(array_filter(array_map(fn($k) => $dayNames[$k] ?? null, $keys)));
        $parts[] = count($labels) === 7 ? 'Todos los días' : implode(', ', $labels);
    } else {
        $parts[] = 'Todos los días';
    }

    if ($start !== null && $end !== null) {
        $parts[] = substr($start, 0, 5) . '–' . substr($end, 0, 5);
    }

    return implode(' · ', $parts);
}

/**
 * Combos y promociones vigentes de la sucursal para la carta pública.
 *
 * Solo se exponen si el plan incluye la función 'promotions' (misma regla que
 * evaluateOrderPromotions(): si la sucursal bajó de plan, la carta deja de
 * ofrecer combos en vez de mostrar algo que el checkout rechazaría después).
 *
 * Un combo se omite si NINGUNO de sus productos sigue existiendo — es
 * exactamente el caso en el que expandComboToItems() devuelve null y el pedido
 * sería rechazado. Si existen pero alguno no está disponible, el combo se
 * marca `sold_out` para que la carta lo muestre sin permitir agregarlo.
 *
 * @param array<int,string[]> $imagesByProduct Imágenes ya cargadas de los productos
 *                                             disponibles (se reutilizan para no
 *                                             repetir la consulta).
 */
function publicPromotionsPayload(PDO $db, int $branchId, array $imagesByProduct): array {
    if (!branchHasPromotionsFeature($db, $branchId)) {
        return ['combos' => [], 'promotions' => []];
    }

    // ── Combos ────────────────────────────────────────────────────────────────
    $comboStmt = $db->prepare(
        'SELECT id, name, description, price, image_url, sort_order
         FROM combos WHERE branch_id = ? AND active = 1
         ORDER BY sort_order ASC, id DESC'
    );
    $comboStmt->execute([$branchId]);
    $comboRows = $comboStmt->fetchAll();

    $combos = [];
    if ($comboRows) {
        $comboIds = array_map(fn($c) => (int)$c['id'], $comboRows);
        $in = implode(',', array_fill(0, count($comboIds), '?'));
        $itemStmt = $db->prepare(
            "SELECT ci.combo_id, ci.product_id, ci.quantity, p.name, p.price, p.available
             FROM combo_items ci LEFT JOIN products p ON p.id = ci.product_id AND p.branch_id = ?
             WHERE ci.combo_id IN ($in)
             ORDER BY ci.id ASC"
        );
        $itemStmt->execute(array_merge([$branchId], $comboIds));
        $itemRows = $itemStmt->fetchAll();

        // Imágenes de los productos de combo que no venían en el catálogo
        // disponible (ej. un componente marcado como no disponible).
        $missingIds = [];
        foreach ($itemRows as $r) {
            $pid = (int)$r['product_id'];
            if ($r['name'] !== null && !isset($imagesByProduct[$pid])) $missingIds[$pid] = true;
        }
        if ($missingIds) {
            $ids = array_keys($missingIds);
            $inImg = implode(',', array_fill(0, count($ids), '?'));
            $imgStmt = $db->prepare(
                "SELECT product_id, url FROM product_images WHERE product_id IN ($inImg) ORDER BY sort_order ASC, id ASC"
            );
            $imgStmt->execute($ids);
            foreach ($imgStmt->fetchAll() as $img) {
                $imagesByProduct[(int)$img['product_id']][] = $img['url'];
            }
        }

        $itemsByCombo = [];
        foreach ($itemRows as $r) {
            if ($r['name'] === null) continue;   // producto borrado: se ignora
            $pid = (int)$r['product_id'];
            $itemsByCombo[(int)$r['combo_id']][] = [
                'product_id' => $pid,
                'name'       => $r['name'],
                'quantity'   => max(1, (int)$r['quantity']),
                'price'      => (float)$r['price'],
                'available'  => (bool)$r['available'],
                'image'      => $imagesByProduct[$pid][0] ?? null,
            ];
        }

        foreach ($comboRows as $c) {
            $items = $itemsByCombo[(int)$c['id']] ?? [];
            if (!$items) continue;               // combo vacío: el pedido fallaría

            $regular = 0.0;
            $soldOut = false;
            foreach ($items as $it) {
                $regular += $it['price'] * $it['quantity'];
                if (!$it['available']) $soldOut = true;
            }

            $combos[] = [
                'id'            => (int)$c['id'],
                'name'          => $c['name'],
                'description'   => $c['description'] ?? '',
                'price'         => (float)$c['price'],
                'regular_price' => round($regular, 2),
                'image'         => $c['image_url'] ?: ($items[0]['image'] ?? null),
                'sort_order'    => (int)$c['sort_order'],
                'sold_out'      => $soldOut,
                'items'         => $items,
            ];
        }
    }

    // ── Promociones ───────────────────────────────────────────────────────────
    // Misma evaluación de día/horario que evaluateOrderPromotions(), para que lo
    // que anuncia la carta y lo que descuenta el checkout no se contradigan.
    $promoStmt = $db->prepare(
        'SELECT id, name, type, value, applies_to, target_id, days_of_week, start_time, end_time
         FROM promotions WHERE branch_id = ? AND active = 1 ORDER BY id DESC'
    );
    $promoStmt->execute([$branchId]);

    $now      = new DateTimeImmutable();
    $dayMap   = ['Mon'=>'mon','Tue'=>'tue','Wed'=>'wed','Thu'=>'thu','Fri'=>'fri','Sat'=>'sat','Sun'=>'sun'];
    $todayKey = $dayMap[$now->format('D')];
    $nowTime  = $now->format('H:i:s');

    $promotions = array_map(function ($p) use ($todayKey, $nowTime) {
        $activeNow = true;
        if ($p['days_of_week'] !== null && $p['days_of_week'] !== '') {
            $activeNow = in_array($todayKey, explode(',', (string)$p['days_of_week']), true);
        }
        if ($activeNow && $p['start_time'] !== null && $p['end_time'] !== null) {
            $activeNow = $nowTime >= $p['start_time'] && $nowTime <= $p['end_time'];
        }

        return [
            'id'             => (int)$p['id'],
            'name'           => $p['name'],
            'type'           => $p['type'],
            'value'          => (float)$p['value'],
            'applies_to'     => $p['applies_to'],
            'target_id'      => $p['target_id'] !== null ? (int)$p['target_id'] : null,
            'active_now'     => $activeNow,
            'schedule_label' => promoScheduleLabel($p['days_of_week'], $p['start_time'], $p['end_time']),
        ];
    }, $promoStmt->fetchAll());

    return ['combos' => $combos, 'promotions' => $promotions];
}

function handlePublicMenu(string $slug): never {
    $slug = trim($slug);
    if ($slug === '') jsonError(422, 'Sucursal requerida');

    $db = Database::connect();

    // Sucursal activa por slug
    $stmt = $db->prepare(
        'SELECT id, name, slug, logo_url, phone, address, wa_default_order_type
         FROM branches WHERE slug = ? AND active = 1 LIMIT 1'
    );
    $stmt->execute([$slug]);
    $branch = $stmt->fetch();
    if (!$branch) jsonError(404, 'Carta no disponible');

    $branchId = (int)$branch['id'];

    // No publicar la carta si la suscripción está dada de baja definitivamente.
    $subStmt = $db->prepare(
        'SELECT status FROM subscriptions WHERE branch_id = ? ORDER BY id DESC LIMIT 1'
    );
    $subStmt->execute([$branchId]);
    $sub = $subStmt->fetch();
    if ($sub && $sub['status'] === 'terminated') {
        jsonError(404, 'Carta no disponible');
    }

    // Una sucursal suspendida conserva su URL pública, pero no debe mostrar
    // productos ni permitir pedidos. Devolvemos una respuesta válida para que
    // la carta pueda mostrar un aviso amable y la sucursal siga siendo
    // reactivable sin cambiar el enlace del QR.
    if ($sub && $sub['status'] === 'suspended') {
        jsonResponse([
            'branch' => [
                'name'                  => $branch['name'],
                'slug'                  => $branch['slug'],
                'logo_url'              => $branch['logo_url'],
                'phone'                 => $branch['phone'],
                'address'               => $branch['address'],
                'wa_default_order_type' => $branch['wa_default_order_type'] ?? 'pickup',
            ],
            'paused'         => true,
            'pause_message'  => 'Esta carta está temporalmente en pausa. Gracias por visitarnos; esperamos atenderte muy pronto.',
            'categories'     => [],
            'products'       => [],
            'top_seller_ids' => [],
            'combos'         => [],
            'promotions'     => [],
        ]);
    }

    // Categorías activas
    $catStmt = $db->prepare(
        'SELECT id, name, color, station, menu_group, sort_order FROM categories
         WHERE branch_id = ? AND active = 1 ORDER BY sort_order ASC, name ASC'
    );
    $catStmt->execute([$branchId]);
    $categories = array_map(fn($c) => [
        'id'         => (int)$c['id'],
        'name'       => $c['name'],
        'color'      => $c['color'],
        'station'    => $c['station'] ?? 'both',
        'menu_group' => $c['menu_group'] ?? 'alimento',
        'sort_order' => (int)$c['sort_order'],
    ], $catStmt->fetchAll());

    // Productos disponibles
    $prodStmt = $db->prepare(
        'SELECT id, category_id, name, description, ingredients, allergens, badge, price, station_override
         FROM products WHERE branch_id = ? AND available = 1
         ORDER BY sort_order ASC, name ASC'
    );
    $prodStmt->execute([$branchId]);
    $rows = $prodStmt->fetchAll();

    // "Más vendidos": productos con más unidades vendidas en los últimos 30 días.
    // Se usa para priorizar el catálogo del bot de WhatsApp (Recomendados → Más
    // vendidos → categorías). Cálculo al vuelo (sin contador mantenido) porque el
    // volumen de pedidos de un solo restaurante es bajo y esto evita que un
    // pedido editado/cancelado deje el contador desincronizado.
    $topStmt = $db->prepare(
        'SELECT oi.product_id, SUM(oi.quantity) AS qty_sold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.branch_id = ? AND o.status != \'cancelled\'
           AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND oi.product_id IS NOT NULL
         GROUP BY oi.product_id
         ORDER BY qty_sold DESC
         LIMIT 10'
    );
    $topStmt->execute([$branchId]);
    $topSellerIds = array_map('intval', array_column($topStmt->fetchAll(), 'product_id'));

    // Imágenes de todos los productos en una sola consulta
    $imagesByProduct = [];
    if ($rows) {
        $ids = array_map(fn($r) => (int)$r['id'], $rows);
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $imgStmt = $db->prepare(
            "SELECT product_id, url FROM product_images WHERE product_id IN ($in) ORDER BY sort_order ASC, id ASC"
        );
        $imgStmt->execute($ids);
        foreach ($imgStmt->fetchAll() as $img) {
            $imagesByProduct[(int)$img['product_id']][] = $img['url'];
        }
    }

    $splitList = function (?string $raw): array {
        if (!$raw) return [];
        // Acepta separación por salto de línea o por coma.
        $parts = preg_split('/[\r\n,]+/', $raw);
        return array_values(array_filter(array_map('trim', $parts), fn($x) => $x !== ''));
    };

    $products = array_map(function ($p) use ($imagesByProduct, $splitList) {
        $images = $imagesByProduct[(int)$p['id']] ?? [];
        return [
            'id'          => (int)$p['id'],
            'category_id' => $p['category_id'] ? (int)$p['category_id'] : null,
            'name'        => $p['name'],
            'description' => $p['description'] ?? '',
            'price'       => (float)$p['price'],
            'ingredients' => $splitList($p['ingredients']),
            'allergens'   => $splitList($p['allergens']),
            'badge'       => $p['badge'] ?: null,
            'station_override' => $p['station_override'] ?: null,
            'images'      => $images,
            'image'       => $images[0] ?? null,
        ];
    }, $rows);

    $growth = publicPromotionsPayload($db, $branchId, $imagesByProduct);

    jsonResponse([
        'branch' => [
            'name'                  => $branch['name'],
            'slug'                  => $branch['slug'],
            'logo_url'              => $branch['logo_url'],
            'phone'                 => $branch['phone'],
            'address'               => $branch['address'],
            'wa_default_order_type' => $branch['wa_default_order_type'] ?? 'pickup',
        ],
        'paused'         => false,
        'categories'     => $categories,
        'products'       => $products,
        'top_seller_ids' => $topSellerIds,
        'combos'         => $growth['combos'],
        'promotions'     => $growth['promotions'],
    ]);
}
