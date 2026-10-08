<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Estaciones de cocina (KDS) caliente y fría en tiempo real.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleStations(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();

    $station  = $seg[1] ?? '';
    $sub2     = $seg[2] ?? '';
    $entityId = isset($seg[3]) && is_numeric($seg[3]) ? (int)$seg[3] : null;

    // GET /stations/orders?branch_id= — comandas de AMBAS estaciones (hot+cold)
    // en UNA sola petición. Reduce a la mitad las llamadas del KDS unificado.
    if ($station === 'orders' && $method === 'GET') {
        $branchId = stationBranchScope($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        jsonResponse([
            'hot'  => buildStationOrders($db, (int)$branchId, 'hot'),
            'cold' => buildStationOrders($db, (int)$branchId, 'cold'),
        ]);
    }

    if (!in_array($station, ['hot', 'cold'], true)) {
        jsonError(404, 'Estación inválida. Use: hot | cold');
    }

    // GET /stations/{station}/orders?branch_id=
    if ($sub2 === 'orders' && $method === 'GET') {
        handleGetStationOrders($db, $payload, $station);
    }

    // PATCH /stations/{station}/items/{order_item_id}
    if ($sub2 === 'items' && $entityId && $method === 'PATCH') {
        handleUpdateItemStatus($db, $payload, $station, $entityId);
    }

    jsonError(404, 'Ruta de estación no encontrada');
}

// ── GET /stations/{station}/orders ────────────────────────────────────────────

function handleGetStationOrders(PDO $db, array $payload, string $station): never {
    $branchId = stationBranchScope($payload);
    if (!$branchId) jsonError(422, 'branch_id requerido');
    jsonResponse(buildStationOrders($db, (int)$branchId, $station));
}

/** Construye las comandas activas de una estación (sin emitir respuesta HTTP). */
function buildStationOrders(PDO $db, int $branchId, string $station): array {
    // Órdenes con al menos un ítem activo (pendiente/preparando/listo-sin-
    // entregar) o recién cancelado en esta estación (para alertar a cocina).
    // 'ready' se mantiene visible hasta que se marca 'delivered' explícito —
    // antes desaparecía del tablero apenas todos los ítems quedaban listos,
    // antes de que cocina alcanzara a marcarlo como entregado (carrera contra
    // el siguiente poll de 2s).
    $stmt = $db->prepare(
        'SELECT DISTINCT
           o.id, o.table_name, o.status, o.notes, o.order_type,
           o.created_at, o.source, o.customer_name, o.customer_phone,
           u.name AS waiter_name,
           TIMESTAMPDIFF(SECOND, o.created_at, NOW()) AS elapsed_seconds
         FROM orders o
         JOIN order_item_station_status oiss ON oiss.order_id = o.id AND oiss.station = ?
         LEFT JOIN users u ON u.id = o.created_by
         WHERE o.branch_id = ?
           AND o.status IN (\'pending\',\'preparing\',\'ready\')
           AND (oiss.status IN (\'pending\',\'preparing\',\'ready\')
                OR (oiss.status = \'cancelled\' AND oiss.updated_at > (NOW() - INTERVAL 3 MINUTE)))
         ORDER BY o.created_at ASC
         LIMIT 50'
    );
    $stmt->execute([$station, $branchId]);
    $orders = $stmt->fetchAll();

    if (!$orders) return [];

    // Ítems de TODAS las órdenes de esta estación en UNA sola consulta (evita el
    // N+1: antes era 1 query por orden, ~51 consultas por poll cada 2 s y por
    // pantalla de cocina). Se agrupan en PHP por order_id.
    $orderIds     = array_map(static fn($o) => (int)$o['id'], $orders);
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmtItems = $db->prepare(
        "SELECT oi.order_id, oi.id AS order_item_id, oi.product_name, oi.quantity,
                oi.price_type, oi.unit_price, oi.weight_kg, oi.price_per_kg, oi.price_pending,
                oi.modifiers_json, oi.item_notes, oi.created_at,
                oiss.status AS station_status, oiss.updated_at AS station_updated_at
         FROM order_items oi
         JOIN order_item_station_status oiss
           ON oiss.order_item_id = oi.id AND oiss.station = ?
         WHERE oi.order_id IN ($placeholders)
         ORDER BY oi.order_id ASC, oi.id ASC"
    );
    $stmtItems->execute(array_merge([$station], $orderIds));

    $itemsByOrder = [];
    foreach ($stmtItems->fetchAll() as $r) {
        $itemsByOrder[(int)$r['order_id']][] = $r;
    }

    $result = [];
    foreach ($orders as $order) {
        $orderId    = (int)$order['id'];
        $orderEpoch = strtotime((string)$order['created_at']);

        $rows = $itemsByOrder[$orderId] ?? [];

        $items = [];
        foreach ($rows as $i) {
            // Un ítem cancelado solo se muestra como alerta durante 3 min.
            if ($i['station_status'] === 'cancelled') {
                $updated = strtotime((string)$i['station_updated_at']);
                if ($updated < strtotime('-3 minutes')) continue;
            }
            // "NUEVO": agregado a una orden ya abierta (>30 s después de crearla)
            // y aún sin empezar.
            $itemEpoch = strtotime((string)$i['created_at']);
            $isNew = $i['station_status'] === 'pending'
                  && $itemEpoch !== false && $orderEpoch !== false
                  && ($itemEpoch - $orderEpoch) > 30;

            $items[] = [
                'order_item_id'  => (int)$i['order_item_id'],
                'product_name'   => $i['product_name'],
                'quantity'       => (int)$i['quantity'],
                'station_status' => $i['station_status'],
                'price_type'     => $i['price_type'] ?? 'fixed',
                'unit_price'     => isset($i['unit_price']) ? (float)$i['unit_price'] : null,
                'weight_kg'      => isset($i['weight_kg']) && $i['weight_kg'] !== null ? (float)$i['weight_kg'] : null,
                'price_per_kg'   => isset($i['price_per_kg']) && $i['price_per_kg'] !== null ? (float)$i['price_per_kg'] : null,
                'price_pending'  => !empty($i['price_pending']),
                'modifiers'      => !empty($i['modifiers_json']) ? json_decode($i['modifiers_json'], true) : [],
                'item_notes'     => $i['item_notes'] ?? null,
                'created_at'     => $i['created_at'],
                'is_new'         => $isNew,
            ];
        }

        if (!$items) continue; // todo quedó fuera (cancelaciones viejas)

        // Completitud: solo cuenta los ítems vivos (excluye cancelados); 'ready'
        // y 'delivered' cuentan como listos.
        $live = array_filter($items, fn($i) => $i['station_status'] !== 'cancelled');
        $stationComplete = !empty($live) && !array_filter($live, fn($i) => !in_array($i['station_status'], ['ready', 'delivered'], true));

        $result[] = [
            'id'               => $orderId,
            'table_name'       => $order['table_name'],
            'status'           => $order['status'],
            'order_type'       => $order['order_type'] ?? 'dine_in',
            'waiter_name'      => $order['waiter_name'] ?? null,
            'notes'            => $order['notes'],
            'created_at'       => $order['created_at'],
            'elapsed_seconds'  => (int)$order['elapsed_seconds'],
            'station_complete' => $stationComplete,
            'source'           => $order['source'] ?? 'pos',
            'customer_name'    => $order['customer_name'] ?? null,
            'customer_phone'   => $order['customer_phone'] ?? null,
            'items'            => $items,
        ];
    }

    return $result;
}

// ── PATCH /stations/{station}/items/{order_item_id} ───────────────────────────

function handleUpdateItemStatus(PDO $db, array $payload, string $station, int $orderItemId): never {
    $body      = getBody();
    $newStatus = (string)($body['status'] ?? '');

    if (!in_array($newStatus, ['preparing', 'ready', 'delivered'], true)) {
        jsonError(422, 'Estado inválido. Use: preparing | ready | delivered');
    }

    // Verificar que el ítem existe en esta estación
    $stmt = $db->prepare(
        'SELECT oiss.id, oiss.order_id, oiss.status
         FROM order_item_station_status oiss
         WHERE oiss.order_item_id = ? AND oiss.station = ? LIMIT 1'
    );
    $stmt->execute([$orderItemId, $station]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonError(404, 'Ítem no encontrado en esta estación');
    }

    $orderId = (int)$row['order_id'];

    // Actualizar status
    $db->prepare(
        'UPDATE order_item_station_status
         SET status = ?, updated_by = ?, updated_at = NOW()
         WHERE order_item_id = ? AND station = ?'
    )->execute([$newStatus, $payload['sub'], $orderItemId, $station]);

    // Sincronizar el estado a nivel de ítem (order_items.status) que ve el mesero/
    // admin. Si TODAS las estaciones del ítem están 'ready' o 'delivered', el
    // ítem queda 'completed'; si alguna está 'preparing', pasa a 'preparing'.
    $sc = $db->prepare(
        "SELECT COUNT(*) AS total,
                SUM(CASE WHEN status IN ('ready','delivered') THEN 1 ELSE 0 END) AS ready_count,
                SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) AS preparing_count
         FROM order_item_station_status
         WHERE order_item_id = ? AND status <> 'cancelled'"
    );
    $sc->execute([$orderItemId]);
    $sCmp = $sc->fetch();
    if ((int)$sCmp['total'] > 0 && (int)$sCmp['total'] === (int)$sCmp['ready_count']) {
        $db->prepare(
            "UPDATE order_items SET status = 'completed', completed_at = NOW()
             WHERE id = ? AND status NOT IN ('completed','cancelled')"
        )->execute([$orderItemId]);
    } elseif ((int)$sCmp['preparing_count'] > 0 || $newStatus === 'preparing') {
        $db->prepare(
            "UPDATE order_items SET status = 'preparing' WHERE id = ? AND status = 'pending'"
        )->execute([$orderItemId]);
    }

    // Verificar si TODOS los ítems de TODAS las estaciones de esta orden están
    // 'ready' o 'delivered'.
    $stmt = $db->prepare(
        'SELECT COUNT(*) AS total,
                SUM(CASE WHEN status IN (\'ready\',\'delivered\') THEN 1 ELSE 0 END) AS ready_count
         FROM order_item_station_status
         WHERE order_id = ?'
    );
    $stmt->execute([$orderId]);
    $completion = $stmt->fetch();

    $orderFullyReady = (int)$completion['total'] > 0
                    && (int)$completion['total'] === (int)$completion['ready_count'];

    if ($orderFullyReady) {
        $db->prepare(
            'UPDATE orders SET status = \'ready\', updated_at = NOW() WHERE id = ? AND status NOT IN (\'delivered\',\'completed\',\'cancelled\')'
        )->execute([$orderId]);
    }

    $auditAction = match ($newStatus) {
        'ready'     => 'kitchen.item.completed',
        'delivered' => 'kitchen.item.delivered',
        default     => 'kitchen.item.started',
    };
    logAudit($db, $payload, $auditAction,
        'order_item', $orderItemId,
        ['station' => $station, 'status' => $row['status']],
        ['station' => $station, 'status' => $newStatus]);

    jsonResponse([
        'updated'           => true,
        'order_item_id'     => $orderItemId,
        'station'           => $station,
        'new_status'        => $newStatus,
        'order_fully_ready' => $orderFullyReady,
        'order_id'          => $orderId,
    ]);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function stationBranchScope(array $payload): int {
    if ($payload['role'] === 'superadmin') {
        return intParam('branch_id');
    }
    return (int)$payload['branch_id'];
}
