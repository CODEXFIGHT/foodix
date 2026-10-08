<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Promociones, combos, cupones y reglas de lealtad (Módulo 5 — crecimiento).
 *
 *   GET/POST         /promotions            — promociones (descuento por día/horario)
 *   GET/PATCH/DELETE /promotions/{id}
 *   GET/POST         /promotions/combos     — combos (bundle a precio fijo)
 *   GET/PATCH/DELETE /promotions/combos/{id}
 *   GET/POST         /promotions/coupons    — cupones canjeables por código
 *   GET/PATCH/DELETE /promotions/coupons/{id}
 *   GET/POST         /promotions/loyalty    — reglas "compra X veces y recibe Y"
 *   GET/PATCH/DELETE /promotions/loyalty/{id}
 *
 * El canje de cupón en checkout vive en orders.php (handleCreateOrder llama a
 * validateCoupon()/incrementCouponUse() definidas aquí). La carta pública
 * (Carta QR) muestra combos y promociones vigentes vía publicPromotionsPayload()
 * en public.php. Falta exponerlos en el bot de WhatsApp.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';

function handlePromotions(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();

    if ($payload['role'] !== 'superadmin') {
        requirePlanFeature($db, (int)$payload['branch_id'], 'promotions', 'Promociones y combos');
    }

    $sub1    = $seg[1] ?? '';

    if (in_array($sub1, ['combos', 'coupons', 'loyalty'], true)) {
        $id = isset($seg[2]) && is_numeric($seg[2]) ? (int)$seg[2] : null;
        match ($sub1) {
            'combos'  => handleCombosRoute($db, $payload, $id, $method),
            'coupons' => handleCouponsRoute($db, $payload, $id, $method),
            'loyalty' => handleLoyaltyRoute($db, $payload, $id, $method),
        };
    }

    $promoId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    handlePromotionsRoute($db, $payload, $promoId, $method);
}

function branchScopePromo(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}

// ── Promociones ──────────────────────────────────────────────────────────────

function castPromotion(array $p): array {
    $p['id']         = (int)$p['id'];
    $p['branch_id']  = (int)$p['branch_id'];
    $p['value']      = (float)$p['value'];
    $p['target_id']  = $p['target_id'] !== null ? (int)$p['target_id'] : null;
    $p['active']     = (bool)$p['active'];
    $p['days_of_week'] = $p['days_of_week'] !== null && $p['days_of_week'] !== ''
        ? explode(',', (string)$p['days_of_week']) : null;
    return $p;
}

function handlePromotionsRoute(PDO $db, array $payload, ?int $id, string $method): never {
    if (!$id && $method === 'GET') {
        $branchId = branchScopePromo($payload);
        $stmt = $db->prepare('SELECT * FROM promotions WHERE branch_id = ? ORDER BY active DESC, id DESC');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castPromotion', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopePromo($payload, $body);
        $name     = trim((string)($body['name'] ?? ''));
        $type     = (string)($body['type'] ?? '');
        $value    = (float)($body['value'] ?? 0);

        if (!$name) jsonError(422, 'Nombre requerido');
        if (!in_array($type, ['discount_percent', 'discount_amount'], true)) jsonError(422, 'Tipo inválido');
        if ($value <= 0) jsonError(422, 'El valor debe ser mayor a 0');

        $appliesTo = in_array($body['applies_to'] ?? 'order', ['order', 'category', 'product'], true)
            ? $body['applies_to'] : 'order';
        $targetId = isset($body['target_id']) && is_numeric($body['target_id']) ? (int)$body['target_id'] : null;
        $days     = is_array($body['days_of_week'] ?? null) && !empty($body['days_of_week'])
            ? implode(',', array_intersect($body['days_of_week'], ['mon','tue','wed','thu','fri','sat','sun']))
            : null;
        $startTime = trim((string)($body['start_time'] ?? '')) ?: null;
        $endTime   = trim((string)($body['end_time'] ?? '')) ?: null;

        $stmt = $db->prepare(
            'INSERT INTO promotions (branch_id, name, type, value, applies_to, target_id, days_of_week, start_time, end_time, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([$branchId, $name, $type, $value, $appliesTo, $targetId, $days, $startTime, $endTime]);
        $newId = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM promotions WHERE id = ?');
        $stmt->execute([$newId]);
        jsonResponse(castPromotion($stmt->fetch()), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body   = getBody();
        $set    = [];
        $params = [];

        foreach (['name', 'type', 'applies_to', 'start_time', 'end_time'] as $field) {
            if (isset($body[$field])) { $set[] = "$field = ?"; $params[] = $body[$field]; }
        }
        if (isset($body['value']))     { $set[] = 'value = ?';     $params[] = (float)$body['value']; }
        if (isset($body['target_id'])) { $set[] = 'target_id = ?'; $params[] = $body['target_id'] !== null ? (int)$body['target_id'] : null; }
        if (isset($body['active']))    { $set[] = 'active = ?';    $params[] = (int)(bool)$body['active']; }
        if (array_key_exists('days_of_week', $body)) {
            $set[] = 'days_of_week = ?';
            $params[] = is_array($body['days_of_week']) && !empty($body['days_of_week'])
                ? implode(',', array_intersect($body['days_of_week'], ['mon','tue','wed','thu','fri','sat','sun']))
                : null;
        }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $id;
        $db->prepare('UPDATE promotions SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT * FROM promotions WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(castPromotion($stmt->fetch()));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM promotions WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// ── Combos ───────────────────────────────────────────────────────────────────

function castCombo(array $c, array $items = []): array {
    $c['id']         = (int)$c['id'];
    $c['branch_id']  = (int)$c['branch_id'];
    $c['price']      = (float)$c['price'];
    $c['active']     = (bool)$c['active'];
    $c['sort_order'] = (int)$c['sort_order'];
    $c['items']      = array_map(fn($i) => [
        'id'         => (int)$i['id'],
        'product_id' => (int)$i['product_id'],
        'quantity'   => (int)$i['quantity'],
        'name'       => $i['name'] ?? null,
    ], $items);
    return $c;
}

function comboItems(PDO $db, int $comboId): array {
    $stmt = $db->prepare(
        'SELECT ci.id, ci.product_id, ci.quantity, p.name
         FROM combo_items ci LEFT JOIN products p ON p.id = ci.product_id
         WHERE ci.combo_id = ?'
    );
    $stmt->execute([$comboId]);
    return $stmt->fetchAll();
}

function saveComboItems(PDO $db, int $comboId, array $items): void {
    $db->prepare('DELETE FROM combo_items WHERE combo_id = ?')->execute([$comboId]);
    $stmt = $db->prepare('INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)');
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $productId = (int)($item['product_id'] ?? 0);
        $qty       = max(1, (int)($item['quantity'] ?? 1));
        if ($productId <= 0) continue;
        $stmt->execute([$comboId, $productId, $qty]);
    }
}

function handleCombosRoute(PDO $db, array $payload, ?int $id, string $method): never {
    if (!$id && $method === 'GET') {
        $branchId = branchScopePromo($payload);
        $stmt = $db->prepare('SELECT * FROM combos WHERE branch_id = ? ORDER BY sort_order ASC, id DESC');
        $stmt->execute([$branchId]);
        $combos = $stmt->fetchAll();
        jsonResponse(array_map(fn($c) => castCombo($c, comboItems($db, (int)$c['id'])), $combos));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopePromo($payload, $body);
        $name     = trim((string)($body['name'] ?? ''));
        $price    = (float)($body['price'] ?? 0);
        $items    = is_array($body['items'] ?? null) ? $body['items'] : [];

        if (!$name) jsonError(422, 'Nombre requerido');
        if ($price <= 0) jsonError(422, 'El precio debe ser mayor a 0');
        if (empty($items)) jsonError(422, 'El combo necesita al menos un producto');

        $stmt = $db->prepare(
            'INSERT INTO combos (branch_id, name, description, price, image_url, active, sort_order)
             VALUES (?, ?, ?, ?, ?, 1, ?)'
        );
        $stmt->execute([
            $branchId, $name, trim((string)($body['description'] ?? '')) ?: null, $price,
            trim((string)($body['image_url'] ?? '')) ?: null, (int)($body['sort_order'] ?? 0),
        ]);
        $newId = (int)$db->lastInsertId();
        saveComboItems($db, $newId, $items);

        $stmt = $db->prepare('SELECT * FROM combos WHERE id = ?');
        $stmt->execute([$newId]);
        jsonResponse(castCombo($stmt->fetch(), comboItems($db, $newId)), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body   = getBody();
        $set    = [];
        $params = [];

        foreach (['name', 'description', 'image_url'] as $field) {
            if (isset($body[$field])) { $set[] = "$field = ?"; $params[] = $body[$field]; }
        }
        if (isset($body['price']))      { $set[] = 'price = ?';      $params[] = (float)$body['price']; }
        if (isset($body['active']))     { $set[] = 'active = ?';     $params[] = (int)(bool)$body['active']; }
        if (isset($body['sort_order'])) { $set[] = 'sort_order = ?'; $params[] = (int)$body['sort_order']; }

        if ($set) {
            $params[] = $id;
            $db->prepare('UPDATE combos SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        }
        if (isset($body['items']) && is_array($body['items'])) {
            saveComboItems($db, $id, $body['items']);
        }

        $stmt = $db->prepare('SELECT * FROM combos WHERE id = ?');
        $stmt->execute([$id]);
        $combo = $stmt->fetch();
        if (!$combo) jsonError(404, 'Combo no encontrado');
        jsonResponse(castCombo($combo, comboItems($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM combos WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// ── Cupones ──────────────────────────────────────────────────────────────────

function castCoupon(array $c): array {
    $c['id']         = (int)$c['id'];
    $c['branch_id']  = (int)$c['branch_id'];
    $c['value']      = (float)$c['value'];
    $c['max_uses']   = $c['max_uses'] !== null ? (int)$c['max_uses'] : null;
    $c['uses_count'] = (int)$c['uses_count'];
    $c['active']     = (bool)$c['active'];
    return $c;
}

function handleCouponsRoute(PDO $db, array $payload, ?int $id, string $method): never {
    if (!$id && $method === 'GET') {
        $branchId = branchScopePromo($payload);
        $stmt = $db->prepare('SELECT * FROM coupons WHERE branch_id = ? ORDER BY active DESC, id DESC');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castCoupon', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopePromo($payload, $body);
        $code     = strtoupper(trim((string)($body['code'] ?? '')));
        $type     = (string)($body['type'] ?? '');
        $value    = (float)($body['value'] ?? 0);

        if (!preg_match('/^[A-Z0-9_-]{3,30}$/', $code)) jsonError(422, 'Código inválido: 3-30 caracteres (letras, números, - _)');
        if (!in_array($type, ['discount_percent', 'discount_amount'], true)) jsonError(422, 'Tipo inválido');
        if ($value <= 0) jsonError(422, 'El valor debe ser mayor a 0');

        $st = $db->prepare('SELECT id FROM coupons WHERE branch_id = ? AND code = ?');
        $st->execute([$branchId, $code]);
        if ($st->fetch()) jsonError(409, 'Ya existe un cupón con ese código');

        $maxUses   = isset($body['max_uses']) && is_numeric($body['max_uses']) ? (int)$body['max_uses'] : null;
        $expiresAt = trim((string)($body['expires_at'] ?? '')) ?: null;

        $stmt = $db->prepare(
            'INSERT INTO coupons (branch_id, code, type, value, max_uses, expires_at, active)
             VALUES (?, ?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([$branchId, $code, $type, $value, $maxUses, $expiresAt]);
        $newId = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM coupons WHERE id = ?');
        $stmt->execute([$newId]);
        jsonResponse(castCoupon($stmt->fetch()), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body   = getBody();
        $set    = [];
        $params = [];

        if (isset($body['active']))     { $set[] = 'active = ?';     $params[] = (int)(bool)$body['active']; }
        if (isset($body['max_uses']))   { $set[] = 'max_uses = ?';   $params[] = $body['max_uses'] !== null ? (int)$body['max_uses'] : null; }
        if (isset($body['expires_at'])) { $set[] = 'expires_at = ?'; $params[] = $body['expires_at'] ?: null; }
        if (isset($body['value']))      { $set[] = 'value = ?';     $params[] = (float)$body['value']; }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $id;
        $db->prepare('UPDATE coupons SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT * FROM coupons WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(castCoupon($stmt->fetch()));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM coupons WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

/**
 * Valida un código de cupón contra el subtotal de una orden y calcula el
 * descuento (sin registrar el uso todavía). Devuelve null si no existe,
 * está inactivo, vencido o ya alcanzó su límite de usos.
 */
function validateCoupon(PDO $db, int $branchId, string $code, float $subtotal): ?array {
    $code = strtoupper(trim($code));
    if ($code === '') return null;

    $stmt = $db->prepare(
        'SELECT id, type, value, max_uses, uses_count, expires_at FROM coupons
         WHERE branch_id = ? AND code = ? AND active = 1 LIMIT 1'
    );
    $stmt->execute([$branchId, $code]);
    $c = $stmt->fetch();
    if (!$c) return null;
    if ($c['expires_at'] !== null && strtotime((string)$c['expires_at']) < time()) return null;
    if ($c['max_uses'] !== null && (int)$c['uses_count'] >= (int)$c['max_uses']) return null;

    $discount = $c['type'] === 'discount_percent'
        ? round($subtotal * ((float)$c['value'] / 100), 2)
        : min((float)$c['value'], $subtotal);

    return ['id' => (int)$c['id'], 'discount' => max(0.0, $discount)];
}

/** Registra el uso de un cupón ya validado (llamar dentro de la transacción de la orden). */
function incrementCouponUse(PDO $db, int $couponId): void {
    $db->prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?')->execute([$couponId]);
}

// ── Lealtad ──────────────────────────────────────────────────────────────────

function castLoyaltyRule(array $r): array {
    $r['id']                 = (int)$r['id'];
    $r['branch_id']          = (int)$r['branch_id'];
    $r['purchases_required'] = (int)$r['purchases_required'];
    $r['reward_value']       = $r['reward_value'] !== null ? (float)$r['reward_value'] : null;
    $r['reward_product_id']  = $r['reward_product_id'] !== null ? (int)$r['reward_product_id'] : null;
    $r['active']             = (bool)$r['active'];
    return $r;
}

function handleLoyaltyRoute(PDO $db, array $payload, ?int $id, string $method): never {
    if (!$id && $method === 'GET') {
        $branchId = branchScopePromo($payload);
        $stmt = $db->prepare('SELECT * FROM loyalty_rules WHERE branch_id = ? ORDER BY active DESC, purchases_required ASC');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castLoyaltyRule', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body       = getBody();
        $branchId   = branchScopePromo($payload, $body);
        $name       = trim((string)($body['name'] ?? ''));
        $required   = (int)($body['purchases_required'] ?? 0);
        $rewardType = (string)($body['reward_type'] ?? '');

        if (!$name) jsonError(422, 'Nombre requerido');
        if ($required < 1) jsonError(422, 'Debe requerir al menos 1 compra');
        if (!in_array($rewardType, ['free_product', 'discount_percent', 'discount_amount'], true)) {
            jsonError(422, 'Tipo de recompensa inválido');
        }
        $rewardProductId = isset($body['reward_product_id']) && is_numeric($body['reward_product_id'])
            ? (int)$body['reward_product_id'] : null;
        if ($rewardType === 'free_product' && !$rewardProductId) {
            jsonError(422, 'Selecciona el producto de regalo');
        }
        $rewardValue = $rewardType !== 'free_product' ? (float)($body['reward_value'] ?? 0) : null;
        if ($rewardType !== 'free_product' && $rewardValue <= 0) jsonError(422, 'El valor de la recompensa debe ser mayor a 0');

        $stmt = $db->prepare(
            'INSERT INTO loyalty_rules (branch_id, name, purchases_required, reward_type, reward_value, reward_product_id, active)
             VALUES (?, ?, ?, ?, ?, ?, 1)'
        );
        $stmt->execute([$branchId, $name, $required, $rewardType, $rewardValue, $rewardProductId]);
        $newId = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM loyalty_rules WHERE id = ?');
        $stmt->execute([$newId]);
        jsonResponse(castLoyaltyRule($stmt->fetch()), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body   = getBody();
        $set    = [];
        $params = [];

        if (isset($body['name']))               { $set[] = 'name = ?';               $params[] = $body['name']; }
        if (isset($body['purchases_required']))  { $set[] = 'purchases_required = ?';  $params[] = (int)$body['purchases_required']; }
        if (isset($body['active']))              { $set[] = 'active = ?';              $params[] = (int)(bool)$body['active']; }
        if (isset($body['reward_value']))        { $set[] = 'reward_value = ?';        $params[] = (float)$body['reward_value']; }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $id;
        $db->prepare('UPDATE loyalty_rules SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT * FROM loyalty_rules WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(castLoyaltyRule($stmt->fetch()));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM loyalty_rules WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// ── Capa de ejecución (checkout) ─────────────────────────────────────────────
// A diferencia del cupón (canje explícito, ver validateCoupon() arriba), lo de
// aquí abajo se evalúa SIEMPRE al crear un pedido — el cliente no hace nada
// para "activar" una promoción, combo o recompensa de lealtad.

/**
 * Expande un combo a sus productos reales, prorrateando el precio para que la
 * suma de las líneas sea EXACTAMENTE combos.price × $qty (una repartición
 * independiente por cada unidad de combo pedida, para que el agrupado por
 * combo_id en el recibo quede limpio). Cada línea resultante ya trae el mismo
 * shape que devuelve cleanOrderItemInput() (orders.php) — insertOrderItemRow()
 * las trata como cualquier otro ítem normal (misma estación/receta/KDS).
 *
 * Devuelve null si el combo no existe, está inactivo, o ninguno de sus
 * productos sigue existiendo — el llamador decide qué hacer (esta capa
 * rechaza el pedido completo, ver evaluateOrderPromotions()).
 */
function expandComboToItems(PDO $db, int $comboId, int $qty): ?array {
    $c = $db->prepare('SELECT id, name, price FROM combos WHERE id = ? AND active = 1');
    $c->execute([$comboId]);
    $combo = $c->fetch();
    if (!$combo) return null;

    $rawItems = comboItems($db, $comboId);
    $valid = array_values(array_filter($rawItems, fn($i) => $i['name'] !== null));
    if (empty($valid)) return null;

    // Precio de catálogo de cada producto (para prorratear el precio del combo
    // según lo que cada línea "valdría" normalmente).
    $ids = array_map(fn($i) => (int)$i['product_id'], $valid);
    $in  = implode(',', array_fill(0, count($ids), '?'));
    $pStmt = $db->prepare("SELECT id, price FROM products WHERE id IN ($in)");
    $pStmt->execute($ids);
    $catalogPrice = [];
    foreach ($pStmt->fetchAll() as $row) $catalogPrice[(int)$row['id']] = (float)$row['price'];

    $comboUnitPrice = (float)$combo['price'];
    $expanded = [];

    for ($n = 0; $n < $qty; $n++) {
        $weights = [];
        $weightSum = 0.0;
        foreach ($valid as $ci) {
            $w = ($catalogPrice[(int)$ci['product_id']] ?? 0.0) * (int)$ci['quantity'];
            $weights[] = $w;
            $weightSum += $w;
        }
        // Si todos los componentes valen 0 (o no tienen precio), reparte igual.
        if ($weightSum <= 0) {
            $weights = array_fill(0, count($valid), 1.0);
            $weightSum = count($valid);
        }

        $centsTotal = (int)round($comboUnitPrice * 100);
        $centsPerLine = [];
        $allocated = 0;
        $maxIdx = null;
        $maxCents = -1;

        foreach ($valid as $idx => $ci) {
            $share = $weights[$idx] / $weightSum;
            $cents = (int)floor($centsTotal * $share);
            $centsPerLine[$idx] = $cents;
            $allocated += $cents;
            // El remanente de redondeo se vuelca en la línea de MAYOR monto
            // (normalmente el producto más caro del combo), no en la última
            // por posición — evita penalizar/inflar según orden arbitrario.
            if ($cents > $maxCents) { $maxCents = $cents; $maxIdx = $idx; }
        }
        $remainder = $centsTotal - $allocated;
        if ($maxIdx !== null) $centsPerLine[$maxIdx] += $remainder;

        foreach ($valid as $idx => $ci) {
            $lineQty = max(1, (int)$ci['quantity']);
            $lineSubtotal = round($centsPerLine[$idx] / 100, 2);
            $expanded[] = [
                'product_id'     => (int)$ci['product_id'],
                'product_name'   => (string)$ci['name'],
                'quantity'       => $lineQty,
                'unit_price'     => round($lineSubtotal / $lineQty, 2),
                'price_type'     => 'fixed',
                'weight_kg'      => null,
                'price_per_kg'   => null,
                'price_pending'  => 0,
                'subtotal'       => $lineSubtotal,
                'modifiers_json' => null,
                'item_notes'     => null,
                'combo_id'       => $comboId,
            ];
        }
    }

    return ['items' => $expanded, 'label' => (string)$combo['name']];
}

/**
 * ¿El plan actual de la sucursal incluye la función 'promotions'? A diferencia
 * de requirePlanFeature() (que corta la petición con 403), esta variante NO
 * lanza — se usa para decidir en silencio si se evalúan promociones/lealtad
 * automáticas al cobrar (una sucursal que bajó de plan después de crear sus
 * promociones no debe seguir descontando dinero por una función que ya no paga).
 */
function branchHasPromotionsFeature(PDO $db, int $branchId): bool {
    $plan = currentPlanForBranch($db, $branchId);
    return in_array('promotions', licenseForPlan($plan)['features'], true);
}

/**
 * Evalúa TODO lo automático de un pedido en creación — combos, promociones
 * activas (día/horario) y recompensas de lealtad — y devuelve lo necesario
 * para que orders.php/whatsapp.php terminen de armar la orden. NO toca
 * cupones (canje explícito, resuelto aparte por el llamador vía
 * validateCoupon()/incrementCouponUse()).
 *
 * @param array   $cleanItems    Ítems ya normalizados por cleanOrderItemInput(),
 *                                 más posibles placeholders `{combo_id, quantity, subtotal:0}`
 *                                 (ver orders.php/whatsapp.php — un combo_id sin
 *                                 product_id real marca "expandir este combo aquí").
 * @param ?string $customerPhone Para lealtad; null desactiva esa evaluación.
 *
 * @return array{discount: float, expandedItems: array, auditRows: array}
 */
function evaluateOrderPromotions(PDO $db, int $branchId, array $cleanItems, ?string $customerPhone): array {
    $hasFeature = branchHasPromotionsFeature($db, $branchId);

    // ── (a) Expandir combos ─────────────────────────────────────────────────
    $expandedItems = [];
    foreach ($cleanItems as $item) {
        if (empty($item['combo_id'])) { $expandedItems[] = $item; continue; }

        if (!$hasFeature) {
            jsonError(422, 'Los combos no están disponibles en el plan actual de la sucursal');
        }
        $result = expandComboToItems($db, (int)$item['combo_id'], max(1, (int)($item['quantity'] ?? 1)));
        if ($result === null) {
            jsonError(422, 'Ese combo ya no tiene productos disponibles — quítalo del pedido e inténtalo de nuevo');
        }
        $expandedItems = array_merge($expandedItems, $result['items']);
    }

    $subtotal = round(array_sum(array_column($expandedItems, 'subtotal')), 2);
    $auditRows = [];
    $totalDiscount = 0.0;

    // Una sucursal sin la función 'promotions' no evalúa promociones/lealtad
    // automáticas (combos ya se rechazaron arriba si aplicaba) — los cupones
    // manuales siguen funcionando igual, eso lo resuelve el llamador aparte.
    if (!$hasFeature) {
        return ['discount' => 0.0, 'expandedItems' => $expandedItems, 'auditRows' => []];
    }

    // ── (b) Promociones automáticas (se acumulan, tope al subtotal) ─────────
    $promoStmt = $db->prepare('SELECT * FROM promotions WHERE branch_id = ? AND active = 1');
    $promoStmt->execute([$branchId]);
    $promos = $promoStmt->fetchAll();

    if (!empty($promos)) {
        $needsCategory = false;
        foreach ($promos as $p) { if ($p['applies_to'] === 'category') { $needsCategory = true; break; } }

        $categoryByProduct = [];
        if ($needsCategory) {
            $productIds = array_values(array_unique(array_filter(
                array_map(fn($i) => (int)($i['product_id'] ?? 0), $expandedItems)
            )));
            if (!empty($productIds)) {
                $in = implode(',', array_fill(0, count($productIds), '?'));
                $catStmt = $db->prepare("SELECT id, category_id FROM products WHERE id IN ($in)");
                $catStmt->execute($productIds);
                foreach ($catStmt->fetchAll() as $row) {
                    $categoryByProduct[(int)$row['id']] = $row['category_id'] !== null ? (int)$row['category_id'] : null;
                }
            }
        }

        $today   = new DateTimeImmutable();
        $dayMap  = ['Mon'=>'mon','Tue'=>'tue','Wed'=>'wed','Thu'=>'thu','Fri'=>'fri','Sat'=>'sat','Sun'=>'sun'];
        $todayKey = $dayMap[$today->format('D')];
        $nowTime  = $today->format('H:i:s');

        foreach ($promos as $p) {
            if ($p['days_of_week'] !== null && $p['days_of_week'] !== '') {
                $days = explode(',', (string)$p['days_of_week']);
                if (!in_array($todayKey, $days, true)) continue;
            }
            if ($p['start_time'] !== null && $p['end_time'] !== null) {
                if ($nowTime < $p['start_time'] || $nowTime > $p['end_time']) continue;
            }

            $base = 0.0;
            if ($p['applies_to'] === 'order') {
                $base = $subtotal;
            } elseif ($p['applies_to'] === 'category') {
                $targetCat = (int)$p['target_id'];
                foreach ($expandedItems as $it) {
                    $pid = (int)($it['product_id'] ?? 0);
                    if ($pid && ($categoryByProduct[$pid] ?? null) === $targetCat) $base += $it['subtotal'];
                }
            } else { // 'product'
                $targetProduct = (int)$p['target_id'];
                foreach ($expandedItems as $it) {
                    if ((int)($it['product_id'] ?? 0) === $targetProduct) $base += $it['subtotal'];
                }
            }
            if ($base <= 0) continue;

            $amt = $p['type'] === 'discount_percent'
                ? round($base * ((float)$p['value'] / 100), 2)
                : min((float)$p['value'], $base);
            if ($amt <= 0) continue;

            $totalDiscount += $amt;
            $auditRows[] = ['kind' => 'promotion', 'reference_id' => (int)$p['id'], 'label' => '🏷️ ' . $p['name'], 'amount' => $amt];
        }
    }

    // ── (c) Lealtad — por teléfono, ventana de 90 días, repetible cada N ────
    if ($customerPhone) {
        $priorStmt = $db->prepare(
            "SELECT COUNT(*) FROM orders WHERE branch_id = ? AND customer_phone = ?
             AND status IN ('completed','delivered')
             AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)"
        );
        $priorStmt->execute([$branchId, $customerPhone]);
        $newCount = (int)$priorStmt->fetchColumn() + 1; // esta orden, si llega a completarse, cuenta.

        $rulesStmt = $db->prepare('SELECT * FROM loyalty_rules WHERE branch_id = ? AND active = 1');
        $rulesStmt->execute([$branchId]);
        foreach ($rulesStmt->fetchAll() as $rule) {
            $required = (int)$rule['purchases_required'];
            if ($required < 1 || $newCount % $required !== 0) continue;

            if ($rule['reward_type'] === 'free_product') {
                $prodStmt = $db->prepare('SELECT id, name FROM products WHERE id = ?');
                $prodStmt->execute([(int)$rule['reward_product_id']]);
                $prod = $prodStmt->fetch();
                if (!$prod) continue;
                $expandedItems[] = [
                    'product_id'     => (int)$prod['id'],
                    'product_name'   => $prod['name'] . ' (gratis)',
                    'quantity'       => 1,
                    'unit_price'     => 0.0,
                    'price_type'     => 'fixed',
                    'weight_kg'      => null,
                    'price_per_kg'   => null,
                    'price_pending'  => 0,
                    'subtotal'       => 0.0,
                    'modifiers_json' => null,
                    'item_notes'     => null,
                    'combo_id'       => null,
                ];
                $auditRows[] = ['kind' => 'loyalty', 'reference_id' => (int)$rule['id'],
                    'label' => '🎁 ' . $rule['name'] . ': ' . $prod['name'] . ' gratis', 'amount' => 0.0];
            } else {
                $amt = $rule['reward_type'] === 'discount_percent'
                    ? round($subtotal * ((float)$rule['reward_value'] / 100), 2)
                    : min((float)$rule['reward_value'], $subtotal);
                if ($amt > 0) {
                    $totalDiscount += $amt;
                    $auditRows[] = ['kind' => 'loyalty', 'reference_id' => (int)$rule['id'],
                        'label' => '⭐ ' . $rule['name'], 'amount' => $amt];
                }
            }
        }
    }

    return [
        'discount'      => min(round($totalDiscount, 2), $subtotal),
        'expandedItems' => $expandedItems,
        'auditRows'     => $auditRows,
    ];
}

/** Inserta las filas de auditoría de descuentos de una orden ya creada (dentro de la misma transacción). */
function insertDiscountAuditRows(PDO $db, int $orderId, array $auditRows): void {
    if (empty($auditRows)) return;
    $stmt = $db->prepare(
        'INSERT INTO order_discounts_applied (order_id, kind, reference_id, label, amount) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($auditRows as $row) {
        $stmt->execute([$orderId, $row['kind'], $row['reference_id'], $row['label'], $row['amount']]);
    }
}
