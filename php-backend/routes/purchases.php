<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Compras a proveedores y entrada de mercancía.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Órdenes de compra.
// GET  /purchases?branch_id=      → lista
// GET  /purchases/{id}            → detalle con items
// POST /purchases                 → crea {supplier_id, items:[{inventory_item_id,quantity,unit_cost}], notes}
// POST /purchases/{id}/receive    → recibe (total o parcial): suma stock + movimientos
//                                    body opcional {items:[{id, received_quantity}]} — sin body, recibe todo lo pendiente
// PATCH /purchases/{id}           → cancelar {status:'cancelled'}

function handlePurchases(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    if ($id && $sub2 === 'receive' && $method === 'POST') {
        handleReceivePurchase($db, $id, $payload);
    }

    if (!$id && $method === 'GET') {
        $branchId = branchScopePur($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare(
            'SELECT po.*, s.name AS supplier_name
             FROM purchase_orders po
             LEFT JOIN suppliers s ON s.id = po.supplier_id
             WHERE po.branch_id = ? ORDER BY po.id DESC LIMIT 100'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map(fn($p) => castPO($db, $p, false), $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopePur($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $items = $body['items'] ?? [];
        if (empty($items)) jsonError(422, 'Agrega al menos un insumo');

        $supplierId = isset($body['supplier_id']) && is_numeric($body['supplier_id']) ? (int)$body['supplier_id'] : null;

        $db->beginTransaction();
        try {
            $total = 0.0;
            $clean = [];
            foreach ($items as $it) {
                $invId = (int)($it['inventory_item_id'] ?? 0);
                $qty   = round((float)($it['quantity'] ?? 0), 3);
                $cost  = round((float)($it['unit_cost'] ?? 0), 2);
                if ($invId <= 0 || $qty <= 0) continue;
                $sub = round($qty * $cost, 2);
                $total += $sub;
                $clean[] = [$invId, $qty, $cost, $sub];
            }
            if (!$clean) jsonError(422, 'Insumos inválidos');

            $db->prepare(
                'INSERT INTO purchase_orders (branch_id, supplier_id, status, total, notes, created_by)
                 VALUES (?, ?, \'pending\', ?, ?, ?)'
            )->execute([
                $branchId, $supplierId, $total,
                trim((string)($body['notes'] ?? '')) ?: null, (int)$payload['sub'],
            ]);
            $poId = (int)$db->lastInsertId();

            $ins = $db->prepare(
                'INSERT INTO purchase_order_items (po_id, inventory_item_id, quantity, unit_cost, subtotal)
                 VALUES (?, ?, ?, ?, ?)'
            );
            foreach ($clean as [$invId, $qty, $cost, $sub]) {
                $ins->execute([$poId, $invId, $qty, $cost, $sub]);
            }
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); throw $e; }

        jsonResponse(castPO($db, fetchPO($db, $poId), true), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'GET') {
        $po = fetchPO($db, $id);
        if (!$po) jsonError(404, 'Compra no encontrada');
        jsonResponse(castPO($db, $po, true));
    }

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        if (($body['status'] ?? '') === 'cancelled') {
            $db->prepare("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'")
               ->execute([$id]);
        }
        jsonResponse(castPO($db, fetchPO($db, $id), true));
    }

    jsonError(405, 'Método no permitido');
}

function handleReceivePurchase(PDO $db, int $id, array $payload): never {
    requireRole($payload, 'admin', 'superadmin');
    $po = fetchPO($db, $id);
    if (!$po) jsonError(404, 'Compra no encontrada');
    if (!in_array($po['status'], ['pending', 'partially_received'], true)) {
        jsonError(422, 'La compra ya fue procesada');
    }

    $body = getBody();
    // Sin 'items' en el body: recibe todo lo pendiente de cada línea (comportamiento previo).
    $overrides = [];
    foreach (($body['items'] ?? []) as $it) {
        $itemId = (int)($it['id'] ?? 0);
        if ($itemId > 0) $overrides[$itemId] = round((float)($it['received_quantity'] ?? 0), 3);
    }

    $stmt = $db->prepare('SELECT * FROM purchase_order_items WHERE po_id = ?');
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    $db->beginTransaction();
    try {
        $upd = $db->prepare('UPDATE inventory_items SET stock = stock + ?, cost = ? WHERE id = ?');
        $recv = $db->prepare('UPDATE purchase_order_items SET received_quantity = received_quantity + ? WHERE id = ?');
        $mov = $db->prepare(
            'INSERT INTO inventory_movements (branch_id, inventory_item_id, type, quantity, reason, ref_id, created_by)
             VALUES (?, ?, \'purchase\', ?, ?, ?, ?)'
        );

        $fullyReceived = true;
        foreach ($items as $it) {
            $itemId    = (int)$it['id'];
            $pending   = round((float)$it['quantity'] - (float)$it['received_quantity'], 3);
            $requested = array_key_exists($itemId, $overrides) ? $overrides[$itemId] : $pending;
            $delta     = max(0.0, min($requested, $pending));

            if ($delta > 0) {
                $upd->execute([$delta, (float)$it['unit_cost'], (int)$it['inventory_item_id']]);
                $recv->execute([$delta, $itemId]);
                $mov->execute([
                    (int)$po['branch_id'], (int)$it['inventory_item_id'], $delta,
                    "Compra #$id" . ($delta < $pending ? ' (recepción parcial)' : ''), $id, (int)$payload['sub'],
                ]);
            }
            if (round($pending - $delta, 3) > 0) $fullyReceived = false;
        }

        $newStatus = $fullyReceived ? 'received' : 'partially_received';
        $db->prepare("UPDATE purchase_orders SET status = ?, received_at = IF(? = 'received', NOW(), received_at) WHERE id = ?")
           ->execute([$newStatus, $newStatus, $id]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    jsonResponse(castPO($db, fetchPO($db, $id), true));
}

function fetchPO(PDO $db, int $id): ?array {
    $stmt = $db->prepare(
        'SELECT po.*, s.name AS supplier_name FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = ?'
    );
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castPO(PDO $db, array $p, bool $withItems): array {
    $out = [
        'id'            => (int)$p['id'],
        'branch_id'     => (int)$p['branch_id'],
        'supplier_id'   => $p['supplier_id'] ? (int)$p['supplier_id'] : null,
        'supplier_name' => $p['supplier_name'] ?? null,
        'status'        => $p['status'],
        'total'         => (float)$p['total'],
        'notes'         => $p['notes'],
        'created_at'    => $p['created_at'],
        'received_at'   => $p['received_at'],
    ];
    if ($withItems) {
        $stmt = $db->prepare(
            'SELECT poi.*, i.name, i.unit FROM purchase_order_items poi
             JOIN inventory_items i ON i.id = poi.inventory_item_id WHERE poi.po_id = ?'
        );
        $stmt->execute([(int)$p['id']]);
        $out['items'] = array_map(fn($r) => [
            'id'                 => (int)$r['id'],
            'inventory_item_id'  => (int)$r['inventory_item_id'],
            'name'               => $r['name'],
            'unit'               => $r['unit'],
            'quantity'           => (float)$r['quantity'],
            'received_quantity'  => (float)$r['received_quantity'],
            'pending_quantity'   => round((float)$r['quantity'] - (float)$r['received_quantity'], 3),
            'unit_cost'          => (float)$r['unit_cost'],
            'subtotal'           => (float)$r['subtotal'],
        ], $stmt->fetchAll());
    }
    return $out;
}

function branchScopePur(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
