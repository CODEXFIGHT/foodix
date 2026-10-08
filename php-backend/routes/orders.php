<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de pedidos, items, cobros y estados.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Transiciones válidas de estado.
// 'completed' es alcanzable desde cualquier estado activo (no solo desde
// 'delivered'): el mesero/cajero puede completar y cobrar un pedido sin
// tener que ir marcando preparando → listo → entregado paso a paso primero.
// El seguimiento fino por estación sigue existiendo para quien use KDS
// (order_item_station_status, independiente de esta cadena).
const ORDER_TRANSITIONS = [
    'pending'   => ['preparing', 'completed', 'cancelled'],
    'preparing' => ['ready',     'completed', 'cancelled'],
    'ready'     => ['delivered', 'completed', 'cancelled'],
    'delivered' => ['completed'],
    'completed' => [],
    'cancelled' => [],
];

function handleOrders(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $orderId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    // PATCH /orders/{id}/status
    if ($orderId && $sub2 === 'status' && $method === 'PATCH') {
        handleUpdateOrderStatus($db, $orderId, $payload);
    }

    // POST /orders/{id}/pay  — registra pagos (cuenta dividida), propina, descuento
    if ($orderId && $sub2 === 'pay' && $method === 'POST') {
        handlePayOrder($db, $orderId, $payload);
    }

    // ── Edición de ítems de una orden abierta (Fase 2: mesas editables) ──────
    $itemId = isset($seg[3]) && is_numeric($seg[3]) ? (int)$seg[3] : null;
    $sub4   = $seg[4] ?? '';

    // POST /orders/{id}/items — agrega productos a la orden abierta
    if ($orderId && $sub2 === 'items' && !$itemId && $method === 'POST') {
        handleAddOrderItems($db, $orderId, $payload);
    }
    // PATCH /orders/{id}/items/{itemId}/status — estado del ítem (cocina/mesero)
    if ($orderId && $sub2 === 'items' && $itemId && $sub4 === 'status' && $method === 'PATCH') {
        handleUpdateOrderItemStatus($db, $orderId, $itemId, $payload);
    }
    // PATCH /orders/{id}/items/{itemId} — cantidad / nota / modificadores / precio
    if ($orderId && $sub2 === 'items' && $itemId && $sub4 === '' && $method === 'PATCH') {
        handleUpdateOrderItem($db, $orderId, $itemId, $payload);
    }
    // DELETE /orders/{id}/items/{itemId} — quitar (o cancelar con auditoría)
    if ($orderId && $sub2 === 'items' && $itemId && $method === 'DELETE') {
        handleRemoveOrderItem($db, $orderId, $itemId, $payload);
    }

    // ── Cuenta dividida (Fase: Dividir Cuenta) ───────────────────────────────
    // $itemId reutiliza seg[3] como id de la división en estas rutas.
    $splitId = $itemId;
    // POST /orders/{id}/splits — define/reemplaza el plan de divisiones
    if ($orderId && $sub2 === 'splits' && !$splitId && $method === 'POST') {
        handleCreateSplits($db, $orderId, $payload);
    }
    // DELETE /orders/{id}/splits — elimina el plan (vuelve a cuenta única)
    if ($orderId && $sub2 === 'splits' && !$splitId && $method === 'DELETE') {
        handleDeleteSplits($db, $orderId, $payload);
    }
    // POST /orders/{id}/splits/{splitId}/pay — cobra una división
    if ($orderId && $sub2 === 'splits' && $splitId && $sub4 === 'pay' && $method === 'POST') {
        handlePaySplit($db, $orderId, $splitId, $payload);
    }

    // GET /orders?branch_id=&status=
    if (!$orderId && $method === 'GET') {
        $branchId = branchScopeO($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $status  = strParam('status');
        $type    = strParam('order_type');
        $source  = strParam('source'); // canal: pos | mesero | whatsapp
        $from    = strParam('from'); // YYYY-MM-DD (incluye desde 00:00)
        $to      = strParam('to');   // YYYY-MM-DD (incluye hasta 23:59:59)
        $sql     = 'SELECT o.id, o.branch_id, o.table_id, o.table_name, o.order_type, o.customer_id,
                          o.delivery_address, o.delivery_status, o.driver_id, o.status, o.source,
                          o.subtotal, o.tax, o.total, o.discount, o.tip, o.paid, o.payment_status,
                          o.notes, o.created_by, o.created_at, o.updated_at, o.completed_at,
                          u.name AS waiter_name
                   FROM orders o LEFT JOIN users u ON u.id = o.created_by
                   WHERE o.branch_id = ?';
        $params = [$branchId];

        if ($status) { $sql .= ' AND o.status = ?'; $params[] = $status; }
        if ($type)   { $sql .= ' AND o.order_type = ?'; $params[] = $type; }
        if ($source) { $sql .= ' AND o.source = ?'; $params[] = $source; }
        if ($from)   { $sql .= ' AND o.created_at >= ?'; $params[] = $from . ' 00:00:00'; }
        if ($to)     { $sql .= ' AND o.created_at <= ?'; $params[] = $to . ' 23:59:59'; }
        $sql .= ' ORDER BY o.created_at DESC LIMIT 500';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // Attach items en lote (1 query) en vez de N+1 (una por pedido).
        jsonResponse(attachItemsBatch($db, $orders));
    }

    // POST /orders
    if (!$orderId && $method === 'POST') {
        handleCreateOrder($db, $payload);
    }

    if (!$orderId) jsonError(404, 'Ruta no encontrada');

    // PATCH /orders/{id}/delivery — asigna repartidor / cambia estado de entrega
    if ($orderId && $sub2 === 'delivery' && $method === 'PATCH') {
        handleUpdateDelivery($db, $orderId, $payload);
    }
    // GET /orders/{id}/delivery-events — bitácora de estados de entrega
    if ($orderId && $sub2 === 'delivery-events' && $method === 'GET') {
        $stmt = $db->prepare(
            'SELECT e.status, e.driver_id, d.name AS driver_name, e.note, e.created_at
             FROM order_delivery_events e LEFT JOIN drivers d ON d.id = e.driver_id
             WHERE e.order_id = ? ORDER BY e.id ASC'
        );
        $stmt->execute([$orderId]);
        jsonResponse(array_map(fn($e) => [
            'status'      => $e['status'],
            'driver_id'   => $e['driver_id'] ? (int)$e['driver_id'] : null,
            'driver_name' => $e['driver_name'],
            'note'        => $e['note'],
            'created_at'  => $e['created_at'],
        ], $stmt->fetchAll()));
    }

    // GET /orders/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare(
            'SELECT id, branch_id, table_id, table_name, order_type, customer_id,
                    delivery_address, delivery_status, driver_id, status, source,
                    subtotal, tax, total, discount, tip, paid, payment_status,
                    notes, created_by, created_at, updated_at, completed_at
             FROM orders WHERE id = ?'
        );
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) jsonError(404, 'Pedido no encontrado');
        jsonResponse(attachItems($db, $order));
    }

    // PATCH /orders/{id}
    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body    = getBody();
        $set     = [];
        $params  = [];

        if (isset($body['notes'])) { $set[] = 'notes = ?'; $params[] = $body['notes']; }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $orderId;

        $db->prepare('UPDATE orders SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$orderId]);
        jsonResponse(attachItems($db, $stmt->fetch()));
    }

    jsonError(405, 'Método no permitido');
}

// ── Create ────────────────────────────────────────────────────────────────────

function handleCreateOrder(PDO $db, array $payload): never {
    require_once __DIR__ . '/recipes.php';     // deductRecipeStock()
    require_once __DIR__ . '/promotions.php';  // validateCoupon()/incrementCouponUse()
    $body     = getBody();
    $branchId = branchScopeO($payload, $body);
    $items    = $body['items'] ?? [];

    if (!$branchId) jsonError(422, 'branch_id requerido');
    if (empty($items)) jsonError(422, 'Al menos un producto es requerido');

    // Idempotencia (outbox offline del mesero): si este mismo request ya se
    // procesó antes (un reintento tras recuperar conexión que no supo si el
    // primer intento llegó), devolver la orden ya creada en vez de duplicar.
    $clientRequestId = trim((string)($body['client_request_id'] ?? ''));
    if ($clientRequestId !== '') {
        $dedupStmt = $db->prepare(
            'SELECT order_id FROM mesero_request_dedup WHERE client_request_id = ? LIMIT 1'
        );
        $dedupStmt->execute([$clientRequestId]);
        $existingOrderId = $dedupStmt->fetchColumn();
        if ($existingOrderId !== false) {
            respondOrder($db, (int)$existingOrderId, 200);
        }
    }

    $tableId   = isset($body['table_id']) && is_numeric($body['table_id']) ? (int)$body['table_id'] : null;
    $tableName = trim((string)($body['table_name'] ?? ($tableId ? "Mesa $tableId" : 'Para Llevar')));
    $notes     = trim((string)($body['notes'] ?? '')) ?: null;
    $createdBy = (int)$payload['sub'];

    $orderType = (string)($body['order_type'] ?? 'dine_in');
    if (!in_array($orderType, ['dine_in','takeaway','delivery'], true)) $orderType = 'dine_in';
    // Canal de origen del pedido — 'pos' es el default de la columna (mostrador/admin);
    // el cliente puede declarar explícitamente otro canal propio (ej. 'mesero').
    // WhatsApp usa su propio flujo de creación (whatsapp.php) y no pasa por aquí.
    $source = (string)($body['source'] ?? 'pos');
    if (!in_array($source, ['pos', 'mesero'], true)) $source = 'pos';
    $customerId      = isset($body['customer_id']) && is_numeric($body['customer_id']) ? (int)$body['customer_id'] : null;
    $customerPhone   = trim((string)($body['customer_phone'] ?? '')) ?: null;
    $deliveryAddress = trim((string)($body['delivery_address'] ?? '')) ?: null;
    $driverId        = isset($body['driver_id']) && is_numeric($body['driver_id']) ? (int)$body['driver_id'] : null;
    $deliveryStatus  = $orderType === 'delivery' ? ($driverId ? 'assigned' : 'pending') : null;

    // Normaliza y calcula totales desde los items (no confiar en el cliente).
    // Soporta precio fijo, abierto y por KG (peso × precio/kg). Una línea con
    // `combo_id` (sin product_name) es un marcador — se expande a sus
    // productos reales, ya prorrateados, dentro de evaluateOrderPromotions().
    $cleanItems = [];
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        if (!empty($item['combo_id'])) {
            $cleanItems[] = ['combo_id' => (int)$item['combo_id'], 'quantity' => max(1, (int)($item['quantity'] ?? 1)), 'subtotal' => 0.0];
            continue;
        }
        $cleanItems[] = cleanOrderItemInput($item);
    }

    // Combos (expande a productos reales) + promociones automáticas + lealtad
    // — todo esto se evalúa SIEMPRE, sin que el cliente haga nada especial.
    $promoResult = evaluateOrderPromotions($db, $branchId, $cleanItems, $customerPhone);
    $cleanItems  = $promoResult['expandedItems'];
    $subtotal    = round(array_sum(array_column($cleanItems, 'subtotal')), 2);

    // Cupón (opcional, canje explícito): se valida aquí para poder incluir su
    // descuento en el total antes de insertar la orden; el uso solo se
    // registra si la orden se crea con éxito (ver incrementCouponUse() más
    // abajo, dentro de la transacción).
    $couponCode = trim((string)($body['coupon_code'] ?? ''));
    $coupon     = $couponCode !== '' ? validateCoupon($db, $branchId, $couponCode, $subtotal) : null;
    if ($couponCode !== '' && $coupon === null) {
        jsonError(422, 'Cupón inválido, vencido o ya alcanzó su límite de usos');
    }
    $couponDiscount = $coupon['discount'] ?? 0.0;

    $discount = max(0.0, round((float)($body['discount'] ?? 0) + $couponDiscount + $promoResult['discount'], 2));
    $discount = min($discount, $subtotal); // no más que el subtotal
    $tip      = max(0.0, round((float)($body['tip'] ?? 0), 2));

    // Tasa de IVA según la configuración de la sucursal (0 si está desactivado).
    // El IVA va incluido en el precio: es solo desglose informativo y NO altera el total.
    $taxRate = branchTaxRate($db, $branchId);
    $taxable = max(0.0, $subtotal - $discount);
    $tax     = $taxRate > 0 ? round($taxable - ($taxable / (1 + $taxRate)), 2) : 0.0;
    $total   = round($taxable + $tip, 2);

    $db->beginTransaction();
    try {
        // Bloquea la fila de la mesa antes de decidir: evita que dos POST /orders
        // concurrentes (móvil + kiosko) para la misma mesa creen cada uno su propia
        // orden y se pisen mutuamente el current_order_id (last-write-wins).
        if ($tableId) {
            $lockStmt = $db->prepare(
                'SELECT current_order_id FROM tables WHERE id = ? AND branch_id = ? FOR UPDATE'
            );
            $lockStmt->execute([$tableId, $branchId]);
            $tableRow = $lockStmt->fetch();
            if ($tableRow === false) {
                $db->rollBack();
                jsonError(404, 'Mesa no encontrada');
            }
            if ($tableRow['current_order_id'] !== null) {
                $db->rollBack();
                jsonError(409, 'La mesa ya tiene una comanda abierta', [
                    'existing_order_id' => (int)$tableRow['current_order_id'],
                ]);
            }
        }

        $stmt = $db->prepare(
            'INSERT INTO orders (branch_id, table_id, table_name, order_type, customer_id, customer_phone, delivery_address, delivery_status, driver_id,
                                 status, source, subtotal, tax, total, discount, tip, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\', ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $tableId, $tableName, $orderType, $customerId, $customerPhone, $deliveryAddress, $deliveryStatus, $driverId,
            $source, $subtotal, $tax, $total, $discount, $tip, $notes, $createdBy,
        ]);
        $orderId = (int)$db->lastInsertId();

        if ($coupon !== null) {
            incrementCouponUse($db, $coupon['id']);
        }

        foreach ($cleanItems as $item) {
            insertOrderItemRow($db, $orderId, $branchId, $item, $createdBy);
        }

        insertDiscountAuditRows($db, $orderId, $promoResult['auditRows']);

        // Marcar mesa como ocupada
        if ($tableId) {
            $db->prepare(
                'UPDATE tables SET status = \'ocupada\', current_order_id = ? WHERE id = ?'
            )->execute([$orderId, $tableId]);
        }

        if ($clientRequestId !== '') {
            $db->prepare(
                'INSERT INTO mesero_request_dedup (client_request_id, branch_id, action, order_id)
                 VALUES (?, ?, \'create_order\', ?)
                 ON DUPLICATE KEY UPDATE order_id = VALUES(order_id)'
            )->execute([$clientRequestId, $branchId, $orderId]);
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    logAudit($db, $payload, 'order.created', 'order', $orderId, null, [
        'order_type' => $orderType,
        'table_name' => $tableName,
        'total'      => $total,
        'items'      => count($cleanItems),
    ]);

    // Push en tiempo real a la cocina/admin de la sucursal (best-effort).
    require_once __DIR__ . '/push.php';
    notifyKitchenNewOrder($db, $branchId, $orderId, $tableName, $createdBy, count($cleanItems));

    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    jsonResponse(attachItems($db, $stmt->fetch()), 201);
}

// ── Status ────────────────────────────────────────────────────────────────────

function handleUpdateOrderStatus(PDO $db, int $orderId, array $payload): never {
    require_once __DIR__ . '/recipes.php'; // restoreRecipeStock()
    $body      = getBody();
    $newStatus = (string)($body['status'] ?? '');

    $stmt = $db->prepare(
        'SELECT id, branch_id, table_id, status FROM orders WHERE id = ?'
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) jsonError(404, 'Pedido no encontrado');

    $current  = $order['status'];
    $allowed  = ORDER_TRANSITIONS[$current] ?? [];

    if (!in_array($newStatus, $allowed, true)) {
        jsonError(422, "Transición inválida: $current → $newStatus");
    }

    $completedAt = $newStatus === 'completed' ? date('Y-m-d H:i:s') : null;

    $db->beginTransaction();
    try {
        $db->prepare(
            'UPDATE orders SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ?'
        )->execute([$newStatus, $completedAt, $orderId]);

        // Cancelar el pedido completo cancela en cascada cada ítem vivo y
        // revierte (o mermea, si ya se preparó) el inventario que consumió.
        if ($newStatus === 'cancelled') {
            $items = $db->prepare(
                "SELECT id, status, product_id, quantity FROM order_items
                 WHERE order_id = ? AND status <> 'cancelled'"
            );
            $items->execute([$orderId]);
            foreach ($items->fetchAll() as $it) {
                $wasPrepared = in_array($it['status'], ['preparing', 'completed'], true);
                if ($it['product_id']) {
                    restoreRecipeStock(
                        $db, (int)$order['branch_id'], (int)$it['id'], (int)$it['product_id'], (int)$it['quantity'],
                        $orderId, (int)$payload['sub'], $wasPrepared, 'Cancelación de pedido completo'
                    );
                }
                $db->prepare('UPDATE order_items SET status = \'cancelled\', cancel_reason = COALESCE(cancel_reason, \'Cancelación de pedido completo\') WHERE id = ?')
                   ->execute([$it['id']]);
                $db->prepare('UPDATE order_item_station_status SET status = \'cancelled\', updated_by = ?, updated_at = NOW() WHERE order_item_id = ?')
                   ->execute([$payload['sub'], $it['id']]);
            }
        }

        // Si se completa o cancela, liberar mesa
        if (in_array($newStatus, ['completed', 'cancelled'], true) && $order['table_id']) {
            $db->prepare(
                'UPDATE tables SET status = \'libre\', current_order_id = NULL WHERE id = ?'
            )->execute([$order['table_id']]);
        }
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, $newStatus === 'cancelled' ? 'order.cancelled' : 'order.status.changed',
        'order', $orderId, ['status' => $current], ['status' => $newStatus]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, table_id, table_name, order_type, customer_id,
                delivery_address, delivery_status, driver_id, status,
                subtotal, tax, total, discount, tip, paid, payment_status,
                notes, created_by, created_at, updated_at, completed_at
         FROM orders WHERE id = ?'
    );
    $stmt->execute([$orderId]);
    jsonResponse(attachItems($db, $stmt->fetch()));
}

// ── Pagos (cuenta dividida) ─────────────────────────────────────────────────────

function handlePayOrder(PDO $db, int $orderId, array $payload): never {
    require_once __DIR__ . '/customers.php'; // applyCustomerLoyalty()
    $body = getBody();

    $stmt = $db->prepare('SELECT id, branch_id, table_id, customer_id, status, total, paid, tip, discount FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) jsonError(404, 'Pedido no encontrado');
    if (in_array($order['status'], ['cancelled'], true)) {
        jsonError(422, 'No se puede cobrar un pedido cancelado');
    }
    // No cobrar si hay productos por KG con precio aún estimado/pendiente.
    $pend = $db->prepare(
        "SELECT COUNT(*) FROM order_items WHERE order_id = ? AND status <> 'cancelled' AND price_pending = 1"
    );
    $pend->execute([$orderId]);
    if ((int)$pend->fetchColumn() > 0) {
        jsonError(422, 'Confirma el precio final de los productos por KG antes de cobrar');
    }
    $customerId = $order['customer_id'] ? (int)$order['customer_id'] : null;

    $payments = $body['payments'] ?? [];
    if (!is_array($payments) || !$payments) jsonError(422, 'Se requiere al menos un pago');

    $allowed = ['efectivo', 'tarjeta', 'transferencia', 'monedero', 'otro'];
    $branchId  = (int)$order['branch_id'];
    $createdBy = (int)$payload['sub'];

    // ── Caja obligatoria ──────────────────────────────────────────────────────
    // No se puede registrar un pago sin un turno de caja abierto en este POS.
    // La validación es del lado del servidor: el front no puede saltarla.
    // (Se valida ANTES de abrir la transacción para no dejarla a medias.)
    $posId     = cashPosId($body);
    $session   = requireOpenCashSession($db, $payload, ['branch_id' => $branchId]);
    $sessionId = (int)$session['id'];
    $sessionPos = $session['pos_id'] !== null ? (int)$session['pos_id'] : $posId;

    $addedAmount  = 0.0;
    $addedTip     = 0.0;
    $monederoUsed = 0.0;

    $db->beginTransaction();
    try {
        // Descuento adicional aplicado al cobrar (opcional).
        if (isset($body['discount'])) {
            $newDiscount = max(0.0, round((float)$body['discount'], 2));
            $db->prepare('UPDATE orders SET discount = ? WHERE id = ?')->execute([$newDiscount, $orderId]);
        }

        // Liga el pedido a la caja/POS bajo la que se cobra (solo la 1.ª vez).
        $db->prepare(
            'UPDATE orders SET cash_session_id = COALESCE(cash_session_id, ?),
                               pos_id = COALESCE(pos_id, ?) WHERE id = ?'
        )->execute([$sessionId, $sessionPos, $orderId]);

        $ins = $db->prepare(
            'INSERT INTO order_payments (order_id, branch_id, cash_session_id, pos_id, method, amount, tip, received, reference, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($payments as $p) {
            $method = (string)($p['method'] ?? 'efectivo');
            if (!in_array($method, $allowed, true)) $method = 'otro';
            $amount = round((float)($p['amount'] ?? 0), 2);
            if ($amount <= 0) continue;
            $tip      = max(0.0, round((float)($p['tip'] ?? 0), 2));
            $received = isset($p['received']) ? round((float)$p['received'], 2) : null;
            $ref      = trim((string)($p['reference'] ?? '')) ?: null;

            $ins->execute([$orderId, $branchId, $sessionId, $sessionPos, $method, $amount, $tip, $received, $ref, $createdBy]);
            $addedAmount += $amount;
            $addedTip    += $tip;
            if ($method === 'monedero') $monederoUsed += $amount;
        }

        $paid = round((float)$order['paid'] + $addedAmount, 2);
        $tip  = round((float)$order['tip'] + $addedTip, 2);
        $total = (float)$order['total'];

        $payStatus = $paid <= 0 ? 'unpaid' : ($paid + 0.009 >= $total ? 'paid' : 'partial');
        $complete  = !empty($body['complete']) && $payStatus === 'paid';

        $db->prepare(
            'UPDATE orders SET paid = ?, tip = ?, payment_status = ?,
             status = IF(? AND status NOT IN (\'cancelled\'), \'completed\', status),
             completed_at = IF(?, NOW(), completed_at)
             WHERE id = ?'
        )->execute([$paid, $tip, $payStatus, (int)$complete, (int)$complete, $orderId]);

        // Liberar mesa al completar el pago.
        if ($complete && $order['table_id']) {
            $db->prepare('UPDATE tables SET status = \'libre\', current_order_id = NULL WHERE id = ?')
               ->execute([(int)$order['table_id']]);
        }

        // Monedero y lealtad del cliente (con ledger de auditoría).
        if ($customerId) {
            applyCustomerLoyalty($db, $customerId, $branchId, $monederoUsed, $complete, (float)$order['total'], $orderId, $createdBy);
        }

        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, $complete ? 'order.payment.completed' : 'order.payment.added',
        'order', $orderId, null, [
            'amount'         => round($addedAmount, 2),
            'tip'            => round($addedTip, 2),
            'payment_status' => $payStatus,
            'methods'        => array_values(array_unique(array_map(
                fn($p) => (string)($p['method'] ?? 'efectivo'), $payments))),
        ]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, table_id, table_name, order_type, customer_id,
                delivery_address, delivery_status, driver_id, status,
                subtotal, tax, total, discount, tip, paid, payment_status,
                notes, created_by, created_at, updated_at, completed_at
         FROM orders WHERE id = ?'
    );
    $stmt->execute([$orderId]);
    jsonResponse(attachItems($db, $stmt->fetch()));
}

// ── Ítems de orden abierta (Fase 2) ─────────────────────────────────────────

/** Normaliza un ítem del body a su forma canónica. Valida precio no negativo. */
function cleanOrderItemInput(array $item): array {
    $name = trim((string)($item['product_name'] ?? ''));
    if ($name === '') jsonError(422, 'Cada producto requiere nombre');

    // Línea por KG: el subtotal = peso × precio/kg (cantidad fija = 1).
    $weightKg   = isset($item['weight_kg'])    && $item['weight_kg']    !== '' ? max(0.0, (float)$item['weight_kg'])    : null;
    $pricePerKg = isset($item['price_per_kg']) && $item['price_per_kg'] !== '' ? max(0.0, (float)$item['price_per_kg']) : null;
    $pricePending = !empty($item['price_pending']) ? 1 : 0;

    if ($weightKg !== null && $pricePerKg !== null) {
        $qty       = 1;
        $unitPrice = round($weightKg * $pricePerKg, 2);
    } else {
        $qty       = max(1, (int)($item['quantity'] ?? 1));
        $unitPrice = round((float)($item['unit_price'] ?? 0), 2);
    }
    if ($unitPrice < 0) jsonError(422, 'El precio no puede ser negativo');

    // Tipo de precio de la línea: explícito si viene, si no se deduce del peso.
    $priceType = in_array($item['price_type'] ?? '', ['fixed','open','kg','variable'], true)
        ? $item['price_type']
        : ($pricePerKg !== null ? 'kg' : 'fixed');

    $mods = $item['modifiers'] ?? null;
    $modsJson = (is_array($mods) && $mods) ? json_encode(array_map(fn($m) => [
        'name'        => trim((string)($m['name'] ?? '')),
        'price_delta' => (float)($m['price_delta'] ?? 0),
    ], $mods), JSON_UNESCAPED_UNICODE) : null;

    return [
        'product_id'     => (int)($item['product_id'] ?? 0),
        'product_name'   => $name,
        'quantity'       => $qty,
        'unit_price'     => $unitPrice,
        'price_type'     => $priceType,
        'weight_kg'      => $weightKg,
        'price_per_kg'   => $pricePerKg,
        'price_pending'  => $pricePending,
        'subtotal'       => round($unitPrice * $qty, 2),
        'modifiers_json' => $modsJson,
        'item_notes'     => trim((string)($item['item_notes'] ?? '')) ?: null,
    ];
}

/**
 * Intenta fusionar un ítem entrante con una línea PENDIENTE idéntica de la misma
 * cuenta (mismo producto, modificadores y nota). Si la encuentra, suma la cantidad
 * a esa línea y devuelve su id; si no, devuelve null para que se inserte normal.
 *
 * Solo fusiona con líneas 'pending' (aún no enviadas a cocina): las que ya están
 * en preparación/completadas se dejan como están para no alterar lo que la cocina
 * ya vio. Los productos por KG o con precio pendiente nunca se fusionan (son únicos).
 */
function tryMergeOrderItem(PDO $db, int $orderId, int $branchId, array $item, int $createdBy): ?int {
    if (($item['price_per_kg'] ?? null) !== null) return null;
    if ((int)($item['price_pending'] ?? 0) === 1) return null;

    $find = $db->prepare(
        "SELECT id, quantity, unit_price FROM order_items
         WHERE order_id = ? AND status = 'pending' AND price_per_kg IS NULL AND price_pending = 0
           AND product_id <=> ?
           AND product_name = ?
           AND COALESCE(modifiers_json, '') = COALESCE(?, '')
           AND COALESCE(item_notes, '')    = COALESCE(?, '')
         ORDER BY id ASC LIMIT 1"
    );
    $find->execute([
        $orderId,
        ($item['product_id'] ?? 0) ?: null,
        $item['product_name'],
        $item['modifiers_json'],
        $item['item_notes'],
    ]);
    $row = $find->fetch();
    if (!$row) return null;

    $id     = (int)$row['id'];
    $newQty = (int)$row['quantity'] + (int)$item['quantity'];
    $unit   = round((float)$row['unit_price'], 2);
    $db->prepare('UPDATE order_items SET quantity = ?, subtotal = ? WHERE id = ?')
       ->execute([$newQty, round($unit * $newQty, 2), $id]);

    // Descuenta la receta por las unidades agregadas (la línea original ya descontó las suyas).
    if (($item['product_id'] ?? 0)) {
        deductRecipeStock($db, $branchId, (int)$item['product_id'], (int)$item['quantity'], $orderId, $createdBy);
    }
    return $id;
}

/** Inserta un ítem + su estado por estación + descuenta receta. Devuelve el id. */
function insertOrderItemRow(PDO $db, int $orderId, int $branchId, array $item, int $createdBy): int {
    $stmt = $db->prepare(
        'INSERT INTO order_items (order_id, product_id, combo_id, product_name, quantity, unit_price, price_type, weight_kg, price_per_kg, price_pending, subtotal, modifiers_json, item_notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $orderId, $item['product_id'] ?: null, $item['combo_id'] ?? null, $item['product_name'], $item['quantity'],
        $item['unit_price'], $item['price_type'] ?? 'fixed', $item['weight_kg'] ?? null, $item['price_per_kg'] ?? null,
        $item['price_pending'] ?? 0, $item['subtotal'], $item['modifiers_json'], $item['item_notes'], $createdBy,
    ]);
    $itemId = (int)$db->lastInsertId();

    // Estación efectiva del producto (override producto > categoría > 'hot').
    $effectiveStation = 'hot';
    if ($item['product_id']) {
        $st = $db->prepare(
            'SELECT COALESCE(p.station_override, c.station, \'hot\') AS effective_station
             FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?'
        );
        $st->execute([$item['product_id']]);
        $row = $st->fetch();
        if ($row) $effectiveStation = $row['effective_station'];
    }
    $stationStmt = $db->prepare(
        'INSERT IGNORE INTO order_item_station_status (order_id, order_item_id, station, status)
         VALUES (?, ?, ?, \'pending\')'
    );
    if (in_array($effectiveStation, ['hot', 'both'], true))  $stationStmt->execute([$orderId, $itemId, 'hot']);
    if (in_array($effectiveStation, ['cold', 'both'], true)) $stationStmt->execute([$orderId, $itemId, 'cold']);

    if ($item['product_id']) {
        deductRecipeStock($db, $branchId, $item['product_id'], $item['quantity'], $orderId, $createdBy);
    }
    return $itemId;
}

/**
 * Tasa de IVA efectiva de una sucursal como fracción (ej. 0.16).
 * Devuelve 0 si la sucursal tiene el IVA desactivado. Tolerante a esquemas
 * antiguos sin las columnas tax_enabled/tax_rate (asume IVA 16% activo).
 */
function branchTaxRate(PDO $db, int $branchId): float {
    try {
        $stmt = $db->prepare('SELECT tax_enabled, tax_rate FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return 0.16; // columnas aún no migradas
    }
    if (!$row) return 0.16;
    if ((int)$row['tax_enabled'] === 0) return 0.0;
    return max(0.0, (float)$row['tax_rate']) / 100;
}

/** Recalcula subtotal/IVA/total desde los ítems NO cancelados (conserva descuento/propina). */
function recomputeOrderTotals(PDO $db, int $orderId): void {
    $stmt = $db->prepare(
        "SELECT COALESCE(SUM(subtotal),0) AS s FROM order_items WHERE order_id = ? AND status <> 'cancelled'"
    );
    $stmt->execute([$orderId]);
    $subtotal = round((float)$stmt->fetchColumn(), 2);

    $o = $db->prepare('SELECT branch_id, discount, tip FROM orders WHERE id = ?');
    $o->execute([$orderId]);
    $row = $o->fetch();
    $discount = min(max(0.0, (float)$row['discount']), $subtotal);
    $tip      = max(0.0, (float)$row['tip']);

    // IVA según la sucursal (0 si está desactivado); incluido en el precio.
    $taxRate = branchTaxRate($db, (int)$row['branch_id']);
    $taxable = max(0.0, $subtotal - $discount);
    $tax     = $taxRate > 0 ? round($taxable - ($taxable / (1 + $taxRate)), 2) : 0.0;
    $total   = round($taxable + $tip, 2);

    $db->prepare('UPDATE orders SET subtotal = ?, discount = ?, tax = ?, total = ?, updated_at = NOW() WHERE id = ?')
       ->execute([$subtotal, $discount, $tax, $total, $orderId]);
}

/** Carga una orden editable (abierta y sin pagar) o aborta con error claro. */
function loadEditableOrder(PDO $db, int $orderId): array {
    $stmt = $db->prepare('SELECT id, branch_id, table_id, status, payment_status FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) jsonError(404, 'Pedido no encontrado');
    if ($order['status'] === 'cancelled') {
        jsonError(409, 'El pedido está cancelado y no puede editarse');
    }
    if (($order['payment_status'] ?? 'unpaid') === 'paid') {
        jsonError(409, 'El pedido ya está pagado y no puede editarse');
    }
    // Si la cuenta tiene divisiones YA cobradas, no se pueden editar productos
    // (el reparto del dinero quedaría inconsistente).
    $paid = $db->prepare("SELECT COUNT(*) FROM order_splits WHERE order_id = ? AND status = 'paid'");
    $paid->execute([$orderId]);
    if ((int)$paid->fetchColumn() > 0) {
        jsonError(409, 'La cuenta tiene divisiones cobradas; no se pueden editar productos');
    }
    return $order;
}

/** Deshace el plan de divisiones PENDIENTE al editar la orden (el total cambió). */
function clearPendingSplitsOnEdit(PDO $db, int $orderId): void {
    // Seguro: loadEditableOrder ya bloqueó el caso con divisiones cobradas.
    $db->prepare("DELETE FROM order_splits WHERE order_id = ? AND status = 'pending'")->execute([$orderId]);
}

/** Devuelve la orden con sus ítems (helper de respuesta). */
function respondOrder(PDO $db, int $orderId, int $httpStatus = 200, array $extra = []): never {
    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = attachItems($db, $stmt->fetch());
    jsonResponse($extra ? array_merge(['order' => $order], $extra) : $order, $httpStatus);
}

// POST /orders/{id}/items
function handleAddOrderItems(PDO $db, int $orderId, array $payload): never {
    require_once __DIR__ . '/recipes.php'; // deductRecipeStock()
    $order = loadEditableOrder($db, $orderId);
    $body  = getBody();
    $items = $body['items'] ?? [];
    if (!is_array($items) || !$items) jsonError(422, 'Al menos un producto es requerido');

    // Validar/normalizar TODO antes de abrir la transacción.
    $clean = [];
    foreach ($items as $raw) {
        if (is_array($raw)) $clean[] = cleanOrderItemInput($raw);
    }
    if (!$clean) jsonError(422, 'Al menos un producto es requerido');

    $branchId  = (int)$order['branch_id'];
    $createdBy = (int)$payload['sub'];
    $newIds    = [];

    // Idempotencia (outbox offline del mesero): un reintento del mismo
    // request ya procesado no debe volver a sumar/duplicar las líneas.
    $clientRequestId = trim((string)($body['client_request_id'] ?? ''));
    if ($clientRequestId !== '') {
        $dedupStmt = $db->prepare(
            'SELECT order_id FROM mesero_request_dedup WHERE client_request_id = ? LIMIT 1'
        );
        $dedupStmt->execute([$clientRequestId]);
        if ($dedupStmt->fetchColumn() !== false) {
            respondOrder($db, $orderId, 200, ['new_item_ids' => []]);
        }
    }

    $db->beginTransaction();
    try {
        foreach ($clean as $item) {
            // Si ya existe una línea PENDIENTE idéntica (mismo producto, modificadores
            // y nota), suma la cantidad a esa línea en vez de duplicarla. Así la cuenta
            // muestra "Producto ×N" en una sola línea en lugar de muchas repetidas.
            $mergedId = tryMergeOrderItem($db, $orderId, $branchId, $item, $createdBy);
            $newIds[] = $mergedId ?? insertOrderItemRow($db, $orderId, $branchId, $item, $createdBy);
        }
        // Si el pedido estaba en estado "completed" (Ticket Abierto), lo regresamos a "preparing"
        // para que vuelva a figurar como activo en cocina y pantallas.
        if ($order['status'] === 'completed') {
            $db->prepare('UPDATE orders SET status = \'preparing\' WHERE id = ?')->execute([$orderId]);
        }
        recomputeOrderTotals($db, $orderId);
        clearPendingSplitsOnEdit($db, $orderId);

        if ($clientRequestId !== '') {
            $db->prepare(
                'INSERT INTO mesero_request_dedup (client_request_id, branch_id, action, order_id)
                 VALUES (?, ?, \'add_items\', ?)
                 ON DUPLICATE KEY UPDATE order_id = VALUES(order_id)'
            )->execute([$clientRequestId, $branchId, $orderId]);
        }

        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, 'order.item.added', 'order', $orderId, null, [
        'count'    => count($newIds),
        'item_ids' => $newIds,
        'names'    => array_map(fn($i) => $i['product_name'], $clean),
    ]);
    respondOrder($db, $orderId, 201, ['new_item_ids' => $newIds]);
}

// PATCH /orders/{id}/items/{itemId}
function handleUpdateOrderItem(PDO $db, int $orderId, int $itemId, array $payload): never {
    loadEditableOrder($db, $orderId);
    $body = getBody();

    $stmt = $db->prepare('SELECT id, quantity, unit_price, status FROM order_items WHERE id = ? AND order_id = ?');
    $stmt->execute([$itemId, $orderId]);
    $item = $stmt->fetch();
    if (!$item) jsonError(404, 'Ítem no encontrado');
    // Un producto completado SÍ se puede seguir editando (cantidad/nota) mientras
    // la cuenta siga abierta: en barras/mariscos la mesa crece durante el servicio.
    // Solo los cancelados quedan bloqueados.
    if ($item['status'] === 'cancelled') {
        jsonError(409, 'No se puede editar un producto cancelado');
    }

    // Confirmación de precio por KG: si llegan peso y/o precio/kg, recalcula.
    $weightKg   = array_key_exists('weight_kg', $body)    && $body['weight_kg']    !== '' ? max(0.0, (float)$body['weight_kg'])    : null;
    $pricePerKg = array_key_exists('price_per_kg', $body) && $body['price_per_kg'] !== '' ? max(0.0, (float)$body['price_per_kg']) : null;
    $isKgUpdate = $weightKg !== null || $pricePerKg !== null;

    if ($isKgUpdate) {
        $w  = $weightKg   ?? (float)$item['weight_kg'];
        $pk = $pricePerKg ?? (float)$item['price_per_kg'];
        $qty = 1;
        $unitPrice = round($w * $pk, 2);
        // Confirmar precio quita la marca de pendiente (salvo que se pida lo contrario).
        $pricePending = array_key_exists('price_pending', $body) ? (int)(bool)$body['price_pending'] : 0;
        $set    = ['quantity = ?', 'unit_price = ?', 'weight_kg = ?', 'price_per_kg = ?', 'price_pending = ?', 'subtotal = ?'];
        $params = [$qty, $unitPrice, $w, $pk, $pricePending, round($unitPrice, 2)];
    } else {
        $qty = array_key_exists('quantity', $body) ? (int)$body['quantity'] : (int)$item['quantity'];
        if ($qty < 1) jsonError(422, 'La cantidad debe ser al menos 1');
        $unitPrice = array_key_exists('unit_price', $body) ? round((float)$body['unit_price'], 2) : (float)$item['unit_price'];
        if ($unitPrice < 0) jsonError(422, 'El precio no puede ser negativo');
        $set    = ['quantity = ?', 'unit_price = ?', 'subtotal = ?'];
        $params = [$qty, $unitPrice, round($unitPrice * $qty, 2)];
    }

    if (array_key_exists('item_notes', $body)) {
        $set[] = 'item_notes = ?';
        $params[] = trim((string)$body['item_notes']) ?: null;
    }
    if (array_key_exists('modifiers', $body)) {
        $mods = $body['modifiers'];
        $params[] = (is_array($mods) && $mods) ? json_encode(array_map(fn($m) => [
            'name'        => trim((string)($m['name'] ?? '')),
            'price_delta' => (float)($m['price_delta'] ?? 0),
        ], $mods), JSON_UNESCAPED_UNICODE) : null;
        $set[] = 'modifiers_json = ?';
    }

    $params[] = $itemId;
    $db->beginTransaction();
    try {
        $db->prepare('UPDATE order_items SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        recomputeOrderTotals($db, $orderId);
        clearPendingSplitsOnEdit($db, $orderId);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, 'order.item.updated', 'order_item', $itemId,
        ['quantity' => (int)$item['quantity'], 'unit_price' => (float)$item['unit_price']],
        ['quantity' => $qty, 'unit_price' => $unitPrice]);
    respondOrder($db, $orderId);
}

// DELETE /orders/{id}/items/{itemId}
function handleRemoveOrderItem(PDO $db, int $orderId, int $itemId, array $payload): never {
    require_once __DIR__ . '/recipes.php'; // restoreRecipeStock()
    loadEditableOrder($db, $orderId);
    $body = getBody();

    $stmt = $db->prepare('SELECT id, status, product_id, quantity FROM order_items WHERE id = ? AND order_id = ?');
    $stmt->execute([$itemId, $orderId]);
    $item = $stmt->fetch();
    if (!$item) jsonError(404, 'Ítem no encontrado');

    $role     = $payload['role'] ?? '';
    $isAdmin  = in_array($role, ['admin', 'superadmin'], true);
    $pending  = $item['status'] === 'pending';
    $wasPrepared = in_array($item['status'], ['preparing', 'completed'], true);

    // Si ya está en preparación/completado, solo admin puede quitarlo y queda
    // como cancelación con motivo (para auditoría); no se borra físicamente.
    if (!$pending && !$isAdmin) {
        jsonError(403, 'Solo un administrador puede cancelar un producto en preparación');
    }

    $reason = trim((string)($body['reason'] ?? '')) ?: 'Cancelado';
    $db->beginTransaction();
    try {
        if ($item['product_id']) {
            $orderBranch = $db->prepare('SELECT branch_id FROM orders WHERE id = ?');
            $orderBranch->execute([$orderId]);
            $branchId = (int)$orderBranch->fetchColumn();
            restoreRecipeStock(
                $db, $branchId, $itemId, (int)$item['product_id'], (int)$item['quantity'],
                $orderId, (int)$payload['sub'], $wasPrepared, $reason
            );
        }
        if ($pending) {
            $db->prepare('DELETE FROM order_item_station_status WHERE order_item_id = ?')->execute([$itemId]);
            $db->prepare('DELETE FROM order_items WHERE id = ?')->execute([$itemId]);
        } else {
            $db->prepare('UPDATE order_items SET status = \'cancelled\', cancel_reason = ? WHERE id = ?')
               ->execute([$reason, $itemId]);
            $db->prepare('UPDATE order_item_station_status SET status = \'cancelled\', updated_by = ?, updated_at = NOW() WHERE order_item_id = ?')
               ->execute([$payload['sub'], $itemId]);
        }
        recomputeOrderTotals($db, $orderId);
        clearPendingSplitsOnEdit($db, $orderId);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, $pending ? 'order.item.removed' : 'order.item.cancelled', 'order_item', $itemId,
        ['status' => $item['status']],
        $pending ? null : ['status' => 'cancelled', 'reason' => $reason]);
    respondOrder($db, $orderId);
}

// PATCH /orders/{id}/items/{itemId}/status
function handleUpdateOrderItemStatus(PDO $db, int $orderId, int $itemId, array $payload): never {
    require_once __DIR__ . '/recipes.php'; // restoreRecipeStock()
    $body = getBody();
    $new  = (string)($body['status'] ?? '');
    if (!in_array($new, ['pending', 'preparing', 'completed', 'cancelled'], true)) {
        jsonError(422, 'Estado inválido. Use: pending | preparing | completed | cancelled');
    }

    $stmt = $db->prepare(
        'SELECT oi.id, oi.status AS item_status, oi.product_id, oi.quantity, o.status AS order_status, o.branch_id
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.id = ? AND oi.order_id = ?'
    );
    $stmt->execute([$itemId, $orderId]);
    $item = $stmt->fetch();
    if (!$item) jsonError(404, 'Ítem no encontrado');
    if ($item['order_status'] === 'cancelled') jsonError(409, 'El pedido está cancelado');

    // Cancelar un ítem ya en preparación/completado requiere admin.
    if ($new === 'cancelled'
        && in_array($item['item_status'], ['preparing', 'completed'], true)
        && !in_array($payload['role'] ?? '', ['admin', 'superadmin'], true)) {
        jsonError(403, 'Solo un administrador puede cancelar un producto en preparación');
    }

    $completedAt = $new === 'completed' ? date('Y-m-d H:i:s') : null;
    $reason      = $new === 'cancelled' ? (trim((string)($body['reason'] ?? '')) ?: 'Cancelado') : null;
    $uid         = $payload['sub'];
    $wasPrepared = in_array($item['item_status'], ['preparing', 'completed'], true);

    $db->beginTransaction();
    try {
        if ($new === 'cancelled' && $item['product_id']) {
            restoreRecipeStock(
                $db, (int)$item['branch_id'], $itemId, (int)$item['product_id'], (int)$item['quantity'],
                $orderId, (int)$uid, $wasPrepared, $reason
            );
        }
        $db->prepare(
            'UPDATE order_items SET status = ?, completed_at = ?, cancel_reason = COALESCE(?, cancel_reason) WHERE id = ?'
        )->execute([$new, $completedAt, $reason, $itemId]);

        // Reflejar en el KDS por estación.
        if ($new === 'completed') {
            $db->prepare('UPDATE order_item_station_status SET status = \'ready\', updated_by = ?, updated_at = NOW() WHERE order_item_id = ?')
               ->execute([$uid, $itemId]);
        } elseif ($new === 'cancelled') {
            $db->prepare('UPDATE order_item_station_status SET status = \'cancelled\', updated_by = ?, updated_at = NOW() WHERE order_item_id = ?')
               ->execute([$uid, $itemId]);
        } elseif ($new === 'preparing') {
            $db->prepare('UPDATE order_item_station_status SET status = \'preparing\', updated_by = ?, updated_at = NOW() WHERE order_item_id = ? AND status = \'pending\'')
               ->execute([$uid, $itemId]);
        }

        recomputeOrderTotals($db, $orderId); // un cancelado deja de sumar al total

        // Si todos los ítems vivos están completados, la orden pasa a 'ready'.
        $c = $db->prepare(
            "SELECT COUNT(*) AS total, SUM(status = 'completed') AS done
             FROM order_items WHERE order_id = ? AND status <> 'cancelled'"
        );
        $c->execute([$orderId]);
        $cmp = $c->fetch();
        if ((int)$cmp['total'] > 0 && (int)$cmp['total'] === (int)$cmp['done']) {
            $db->prepare('UPDATE orders SET status = \'ready\', updated_at = NOW() WHERE id = ? AND status NOT IN (\'delivered\',\'completed\',\'cancelled\')')
               ->execute([$orderId]);
        }
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, 'order.item.status.changed', 'order_item', $itemId,
        ['status' => $item['item_status']],
        ['status' => $new] + ($reason ? ['reason' => $reason] : []));
    respondOrder($db, $orderId);
}

// ── Cuenta dividida (Dividir Cuenta) ─────────────────────────────────────────

/** Carga una orden divisible (con ítems, no cancelada ni pagada) o aborta. */
function loadSplittableOrder(PDO $db, int $orderId): array {
    $stmt = $db->prepare(
        'SELECT id, branch_id, table_id, customer_id, status, total, paid, tip, discount, payment_status
         FROM orders WHERE id = ?'
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) jsonError(404, 'Pedido no encontrado');
    if ($order['status'] === 'cancelled') jsonError(409, 'El pedido está cancelado');
    if (($order['payment_status'] ?? 'unpaid') === 'paid') jsonError(409, 'El pedido ya está pagado');
    return $order;
}

// POST /orders/{id}/splits — define o reemplaza el plan de divisiones
function handleCreateSplits(PDO $db, int $orderId, array $payload): never {
    $order = loadSplittableOrder($db, $orderId);
    $body  = getBody();

    // No dividir tickets vacíos.
    $cnt = $db->prepare("SELECT COUNT(*) FROM order_items WHERE order_id = ? AND status <> 'cancelled'");
    $cnt->execute([$orderId]);
    if ((int)$cnt->fetchColumn() === 0) jsonError(422, 'No se puede dividir una cuenta vacía');

    // No dividir con productos por KG de precio aún pendiente.
    $pend = $db->prepare("SELECT COUNT(*) FROM order_items WHERE order_id = ? AND status <> 'cancelled' AND price_pending = 1");
    $pend->execute([$orderId]);
    if ((int)$pend->fetchColumn() > 0) jsonError(422, 'Confirma el precio de los productos por KG antes de dividir');

    // No rehacer el plan si ya se cobró alguna división.
    $paidSplits = $db->prepare("SELECT COUNT(*) FROM order_splits WHERE order_id = ? AND status = 'paid'");
    $paidSplits->execute([$orderId]);
    if ((int)$paidSplits->fetchColumn() > 0) jsonError(409, 'Ya hay divisiones cobradas; no se puede rehacer el plan');

    $mode = (string)($body['mode'] ?? 'amount');
    if (!in_array($mode, ['items', 'people', 'amount', 'guest'], true)) $mode = 'amount';

    $splits = $body['splits'] ?? [];
    if (!is_array($splits) || count($splits) < 2) jsonError(422, 'Se requieren al menos 2 divisiones');

    $orderTotal = round((float)$order['total'], 2);

    $clean = [];
    $sum   = 0.0;
    foreach ($splits as $idx => $s) {
        if (!is_array($s)) continue;
        $label = trim((string)($s['label'] ?? '')) ?: ('División ' . ($idx + 1));
        $total = round((float)($s['total'] ?? 0), 2);
        if ($total < 0) jsonError(422, 'El monto de una división no puede ser negativo');
        $items = [];
        if (in_array($mode, ['items', 'guest'], true) && isset($s['items']) && is_array($s['items'])) {
            foreach ($s['items'] as $it) {
                $oiId = (int)($it['order_item_id'] ?? 0);
                $qty  = max(1, (int)($it['quantity'] ?? 1));
                if ($oiId > 0) $items[] = ['order_item_id' => $oiId, 'quantity' => $qty];
            }
        }
        $clean[] = ['label' => $label, 'total' => $total, 'items' => $items, 'sort' => (int)$idx];
        $sum += $total;
    }
    if (count($clean) < 2) jsonError(422, 'Se requieren al menos 2 divisiones');

    // La suma de divisiones debe igualar el total (tolerancia de centavos por redondeo).
    if (abs($sum - $orderTotal) > 0.05) {
        jsonError(422, 'La suma de las divisiones (' . number_format($sum, 2) .
            ') debe igualar el total (' . number_format($orderTotal, 2) . ')');
    }

    $branchId  = (int)$order['branch_id'];
    $createdBy = (int)$payload['sub'];
    $taxRate   = 0.16; // IVA contenido (informativo)

    $db->beginTransaction();
    try {
        // Sustituye el plan anterior (todas pendientes; ya validamos que no hay pagadas).
        $db->prepare('DELETE FROM order_splits WHERE order_id = ?')->execute([$orderId]);

        $insS = $db->prepare(
            'INSERT INTO order_splits (order_id, branch_id, label, mode, subtotal, tax, total, status, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\', ?, ?)'
        );
        $insI = $db->prepare('INSERT INTO order_split_items (split_id, order_item_id, quantity) VALUES (?, ?, ?)');

        foreach ($clean as $c) {
            $tax = round($c['total'] - ($c['total'] / (1 + $taxRate)), 2);
            $insS->execute([$orderId, $branchId, $c['label'], $mode, $c['total'], $tax, $c['total'], $c['sort'], $createdBy]);
            $sid = (int)$db->lastInsertId();
            foreach ($c['items'] as $it) {
                $insI->execute([$sid, $it['order_item_id'], $it['quantity']]);
            }
        }
        // Reflejar estado de pago: 'partial' si ya había abonos, si no 'unpaid'.
        $db->prepare("UPDATE orders SET payment_status = IF(paid > 0, 'partial', 'unpaid'), updated_at = NOW() WHERE id = ?")
           ->execute([$orderId]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, 'order.split.created', 'order', $orderId, null, [
        'mode' => $mode, 'count' => count($clean), 'total' => $orderTotal,
    ]);
    respondOrder($db, $orderId, 201);
}

// DELETE /orders/{id}/splits — vuelve a cuenta única (si nada se ha cobrado)
function handleDeleteSplits(PDO $db, int $orderId, array $payload): never {
    loadSplittableOrder($db, $orderId);
    $paidSplits = $db->prepare("SELECT COUNT(*) FROM order_splits WHERE order_id = ? AND status = 'paid'");
    $paidSplits->execute([$orderId]);
    if ((int)$paidSplits->fetchColumn() > 0) jsonError(409, 'Hay divisiones ya cobradas; no se puede deshacer');

    $db->prepare('DELETE FROM order_splits WHERE order_id = ?')->execute([$orderId]);
    logAudit($db, $payload, 'order.split.cleared', 'order', $orderId, null, null);
    respondOrder($db, $orderId);
}

// POST /orders/{id}/splits/{splitId}/pay — cobra una división
function handlePaySplit(PDO $db, int $orderId, int $splitId, array $payload): never {
    require_once __DIR__ . '/customers.php'; // applyCustomerLoyalty()
    $order = loadSplittableOrder($db, $orderId);

    $stmt = $db->prepare('SELECT id, total, paid, status FROM order_splits WHERE id = ? AND order_id = ?');
    $stmt->execute([$splitId, $orderId]);
    $split = $stmt->fetch();
    if (!$split) jsonError(404, 'División no encontrada');
    if ($split['status'] === 'paid') jsonError(409, 'Esta división ya está pagada');

    $body     = getBody();
    $payments = $body['payments'] ?? [];
    if (!is_array($payments) || !$payments) jsonError(422, 'Se requiere al menos un pago');

    $allowed    = ['efectivo', 'tarjeta', 'transferencia', 'monedero', 'otro'];
    $branchId   = (int)$order['branch_id'];
    $createdBy  = (int)$payload['sub'];
    $splitTotal = round((float)$split['total'], 2);

    // Normaliza pagos ANTES de la transacción para poder validar el monto cubierto.
    $rows = [];
    $addedAmount = 0.0;
    foreach ($payments as $p) {
        $method = (string)($p['method'] ?? 'efectivo');
        if (!in_array($method, $allowed, true)) $method = 'otro';
        $amount = round((float)($p['amount'] ?? 0), 2);
        if ($amount <= 0) continue;
        $rows[] = [
            'method'   => $method,
            'amount'   => $amount,
            'tip'      => max(0.0, round((float)($p['tip'] ?? 0), 2)),
            'received' => isset($p['received']) ? round((float)$p['received'], 2) : null,
            'ref'      => trim((string)($p['reference'] ?? '')) ?: null,
        ];
        $addedAmount += $amount;
    }
    if (!$rows) jsonError(422, 'El monto a cobrar debe ser mayor a 0');

    // Una división se cobra completa: el pago debe cubrir su total.
    $splitPaid = round((float)$split['paid'] + $addedAmount, 2);
    if ($splitPaid + 0.05 < $splitTotal) {
        jsonError(422, 'El pago no cubre el total de esta división (' . number_format($splitTotal, 2) . ')');
    }

    $addedTip = 0.0; $monederoUsed = 0.0; $methods = [];

    $db->beginTransaction();
    try {
        $sessStmt = $db->prepare("SELECT id FROM cash_sessions WHERE branch_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
        $sessStmt->execute([$branchId]);
        $sessRow   = $sessStmt->fetch();
        $sessionId = $sessRow ? (int)$sessRow['id'] : null;

        $ins = $db->prepare(
            'INSERT INTO order_payments (order_id, split_id, branch_id, cash_session_id, method, amount, tip, received, reference, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($rows as $r) {
            $ins->execute([$orderId, $splitId, $branchId, $sessionId, $r['method'], $r['amount'], $r['tip'], $r['received'], $r['ref'], $createdBy]);
            $addedTip += $r['tip'];
            $methods[] = $r['method'];
            if ($r['method'] === 'monedero') $monederoUsed += $r['amount'];
        }

        $db->prepare("UPDATE order_splits SET paid = ?, status = 'paid', paid_at = NOW() WHERE id = ?")
           ->execute([$splitPaid, $splitId]);

        $newPaid = round((float)$order['paid'] + $addedAmount, 2);
        $newTip  = round((float)$order['tip'] + $addedTip, 2);

        // ¿Quedan divisiones pendientes? Solo se cierra la mesa cuando no queda ninguna.
        $rem = $db->prepare("SELECT COUNT(*) FROM order_splits WHERE order_id = ? AND status = 'pending'");
        $rem->execute([$orderId]);
        $allPaid = (int)$rem->fetchColumn() === 0;

        $payStatus = $allPaid ? 'paid' : 'partial';
        $db->prepare(
            'UPDATE orders SET paid = ?, tip = ?, payment_status = ?,
             status = IF(? AND status NOT IN (\'cancelled\'), \'completed\', status),
             completed_at = IF(?, NOW(), completed_at), updated_at = NOW()
             WHERE id = ?'
        )->execute([$newPaid, $newTip, $payStatus, (int)$allPaid, (int)$allPaid, $orderId]);

        if ($allPaid && $order['table_id']) {
            $db->prepare("UPDATE tables SET status = 'libre', current_order_id = NULL WHERE id = ?")
               ->execute([(int)$order['table_id']]);
        }

        $customerId = $order['customer_id'] ? (int)$order['customer_id'] : null;
        if ($customerId) {
            applyCustomerLoyalty($db, $customerId, $branchId, $monederoUsed, $allPaid, (float)$order['total'], $orderId, $createdBy);
        }

        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    logAudit($db, $payload, $allPaid ? 'order.split.settled' : 'order.split.paid', 'order_split', $splitId, null, [
        'amount'   => round($addedAmount, 2),
        'tip'      => round($addedTip, 2),
        'all_paid' => $allPaid,
        'methods'  => array_values(array_unique($methods)),
    ]);
    respondOrder($db, $orderId);
}

// ── Domicilios ──────────────────────────────────────────────────────────────────

function handleUpdateDelivery(PDO $db, int $orderId, array $payload): never {
    $body = getBody();
    $stmt = $db->prepare('SELECT id, branch_id, driver_id AS current_driver_id FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) jsonError(404, 'Pedido no encontrado');

    $set = []; $params = [];
    $newStatus = null;
    if (isset($body['delivery_status'])) {
        $allowed = ['pending','assigned','on_route','delivered','cancelled'];
        if (!in_array($body['delivery_status'], $allowed, true)) jsonError(422, 'Estado de entrega inválido');
        $newStatus = (string)$body['delivery_status'];
        $set[] = 'delivery_status = ?'; $params[] = $newStatus;
    }
    $newDriverId = $order['current_driver_id'] ? (int)$order['current_driver_id'] : null;
    if (array_key_exists('driver_id', $body)) {
        $newDriverId = is_numeric($body['driver_id']) ? (int)$body['driver_id'] : null;
        $set[] = 'driver_id = ?';
        $params[] = $newDriverId;
    }
    if (!$set) jsonError(422, 'Sin campos para actualizar');
    $params[] = $orderId;
    $db->prepare('UPDATE orders SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

    // Bitácora: registra cada cambio de estado/repartidor para poder medir
    // tiempo por etapa y saber quién hizo cada asignación.
    $db->prepare(
        'INSERT INTO order_delivery_events (order_id, branch_id, status, driver_id, created_by)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $orderId, (int)$order['branch_id'], $newStatus ?? 'driver_assigned', $newDriverId, (int)$payload['sub'],
    ]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, table_id, table_name, order_type, customer_id,
                delivery_address, delivery_status, driver_id, status, source,
                subtotal, tax, total, discount, tip, paid, payment_status,
                notes, created_by, created_at, updated_at, completed_at
         FROM orders WHERE id = ?'
    );
    $stmt->execute([$orderId]);
    jsonResponse(attachItems($db, $stmt->fetch()));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza tipos de un row de order y le adjunta su arreglo de items ya normalizado. */
function normalizeOrder(array $order, array $items): array {
    $order['id']          = (int)$order['id'];
    $order['branch_id']   = (int)$order['branch_id'];
    $order['table_id']    = $order['table_id'] ? (int)$order['table_id'] : null;
    $order['order_type']  = $order['order_type'] ?? 'dine_in';
    $order['customer_id'] = isset($order['customer_id']) && $order['customer_id'] ? (int)$order['customer_id'] : null;
    $order['delivery_address'] = $order['delivery_address'] ?? null;
    $order['delivery_status']  = $order['delivery_status'] ?? null;
    $order['driver_id']   = isset($order['driver_id']) && $order['driver_id'] ? (int)$order['driver_id'] : null;
    $order['subtotal']    = (float)$order['subtotal'];
    $order['tax']         = (float)$order['tax'];
    $order['total']       = (float)$order['total'];
    $order['discount']    = isset($order['discount']) ? (float)$order['discount'] : 0.0;
    $order['tip']         = isset($order['tip']) ? (float)$order['tip'] : 0.0;
    $order['paid']        = isset($order['paid']) ? (float)$order['paid'] : 0.0;
    $order['payment_status'] = $order['payment_status'] ?? 'unpaid';
    $order['created_by']  = $order['created_by'] ? (int)$order['created_by'] : null;

    $order['items'] = array_map(fn($i) => [
        'id'           => (int)$i['id'],
        'order_id'     => (int)$i['order_id'],
        'product_id'   => $i['product_id'] ? (int)$i['product_id'] : null,
        'combo_id'     => isset($i['combo_id']) && $i['combo_id'] !== null ? (int)$i['combo_id'] : null,
        'product_name' => $i['product_name'],
        'quantity'     => (int)$i['quantity'],
        'unit_price'   => (float)$i['unit_price'],
        'price_type'   => $i['price_type'] ?? 'fixed',
        'weight_kg'    => isset($i['weight_kg']) && $i['weight_kg'] !== null ? (float)$i['weight_kg'] : null,
        'price_per_kg' => isset($i['price_per_kg']) && $i['price_per_kg'] !== null ? (float)$i['price_per_kg'] : null,
        'price_pending'=> !empty($i['price_pending']),
        'subtotal'     => (float)$i['subtotal'],
        'modifiers'    => !empty($i['modifiers_json']) ? json_decode($i['modifiers_json'], true) : [],
        'item_notes'   => $i['item_notes'] ?? null,
        'status'       => $i['status'] ?? 'pending',
        'created_at'   => $i['created_at'] ?? null,
        'completed_at' => $i['completed_at'] ?? null,
        'cancel_reason'=> $i['cancel_reason'] ?? null,
    ], $items);

    return $order;
}

/** Adjunta items a un solo pedido (1 query). Para endpoints de detalle. */
function attachItems(PDO $db, array $order): array {
    $stmt = $db->prepare(
        'SELECT id, order_id, product_id, combo_id, product_name, quantity, unit_price, price_type, weight_kg, price_per_kg, price_pending, subtotal, modifiers_json, item_notes,
                status, created_at, completed_at, cancel_reason
         FROM order_items WHERE order_id = ? ORDER BY id ASC'
    );
    $stmt->execute([$order['id']]);
    $normalized = normalizeOrder($order, $stmt->fetchAll());
    $oid = (int)$order['id'];
    $normalized['splits'] = fetchSplitsByOrder($db, [$oid])[$oid] ?? [];
    // Desglose de descuentos automáticos (promoción/cupón/lealtad) para mostrar
    // "por qué" se descontó en el detalle del pedido/recibo, no solo el número.
    $discStmt = $db->prepare(
        'SELECT kind, reference_id, label, amount FROM order_discounts_applied WHERE order_id = ? ORDER BY id ASC'
    );
    $discStmt->execute([$oid]);
    $normalized['discounts_applied'] = array_map(fn($d) => [
        'kind'         => $d['kind'],
        'reference_id' => $d['reference_id'] !== null ? (int)$d['reference_id'] : null,
        'label'        => $d['label'],
        'amount'       => (float)$d['amount'],
    ], $discStmt->fetchAll());
    return $normalized;
}

/** Adjunta items a una LISTA de pedidos con UNA sola query (evita N+1). */
function attachItemsBatch(PDO $db, array $orders): array {
    if (!$orders) return [];

    $ids = array_map(fn($o) => (int)$o['id'], $orders);
    $ph  = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $db->prepare(
        "SELECT id, order_id, product_id, combo_id, product_name, quantity, unit_price, price_type, weight_kg, price_per_kg, price_pending, subtotal, modifiers_json, item_notes,
                status, created_at, completed_at, cancel_reason
         FROM order_items WHERE order_id IN ($ph) ORDER BY id ASC"
    );
    $stmt->execute($ids);

    // Agrupar items por order_id.
    $byOrder = [];
    foreach ($stmt->fetchAll() as $item) {
        $byOrder[(int)$item['order_id']][] = $item;
    }

    // Divisiones de cobro en lote (para el indicador de progreso en listados).
    $splitsByOrder = fetchSplitsByOrder($db, $ids);

    return array_map(
        function ($o) use ($byOrder, $splitsByOrder) {
            $normalized = normalizeOrder($o, $byOrder[(int)$o['id']] ?? []);
            $normalized['splits'] = $splitsByOrder[(int)$o['id']] ?? [];
            return $normalized;
        },
        $orders,
    );
}

/**
 * Devuelve [order_id => OrderSplit[]] con sus ítems asignados, en una sola pasada.
 * La división es una capa de cobro: no toca ítems ni comanda de cocina.
 */
function fetchSplitsByOrder(PDO $db, array $orderIds): array {
    if (!$orderIds) return [];
    $ph   = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $db->prepare(
        "SELECT id, order_id, label, mode, subtotal, discount, tax, total, paid, status, sort_order, created_at, paid_at
         FROM order_splits WHERE order_id IN ($ph) ORDER BY sort_order ASC, id ASC"
    );
    $stmt->execute(array_values($orderIds));
    $splits = $stmt->fetchAll();
    if (!$splits) return [];

    $splitIds = array_map(fn($s) => (int)$s['id'], $splits);
    $ph2  = implode(',', array_fill(0, count($splitIds), '?'));
    $iStmt = $db->prepare(
        "SELECT si.split_id, si.order_item_id, si.quantity, oi.product_name
         FROM order_split_items si JOIN order_items oi ON oi.id = si.order_item_id
         WHERE si.split_id IN ($ph2)"
    );
    $iStmt->execute($splitIds);
    $itemsBySplit = [];
    foreach ($iStmt->fetchAll() as $r) {
        $itemsBySplit[(int)$r['split_id']][] = [
            'order_item_id' => (int)$r['order_item_id'],
            'quantity'      => (int)$r['quantity'],
            'product_name'  => $r['product_name'],
        ];
    }

    $byOrder = [];
    foreach ($splits as $s) {
        $byOrder[(int)$s['order_id']][] = [
            'id'         => (int)$s['id'],
            'order_id'   => (int)$s['order_id'],
            'label'      => $s['label'],
            'mode'       => $s['mode'],
            'subtotal'   => (float)$s['subtotal'],
            'discount'   => (float)$s['discount'],
            'tax'        => (float)$s['tax'],
            'total'      => (float)$s['total'],
            'paid'       => (float)$s['paid'],
            'status'     => $s['status'],
            'sort_order' => (int)$s['sort_order'],
            'items'      => $itemsBySplit[(int)$s['id']] ?? [],
            'created_at' => $s['created_at'] ?? null,
            'paid_at'    => $s['paid_at'] ?? null,
        ];
    }
    return $byOrder;
}

function branchScopeO(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
