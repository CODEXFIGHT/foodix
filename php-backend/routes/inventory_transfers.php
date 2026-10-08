<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Transferencias de insumos entre almacenes de una misma sucursal.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// GET  /inventory-transfers?branch_id=      → lista
// GET  /inventory-transfers/{id}            → detalle con items
// POST /inventory-transfers                 → crea {from_warehouse_id, to_warehouse_id, items:[{inventory_item_id,quantity}], notes}
//                                              (no mueve stock — solo reserva la intención)
// POST /inventory-transfers/{id}/receive    → confirma recepción: descuenta origen, incrementa destino
// PATCH /inventory-transfers/{id}           → cancelar {status:'cancelled'}

function handleInventoryTransfers(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    if ($id && $sub2 === 'receive' && $method === 'POST') {
        handleReceiveTransfer($db, $id, $payload);
    }

    if (!$id && $method === 'GET') {
        $branchId = branchScopeTr($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare(
            'SELECT t.*, wf.name AS from_warehouse_name, wt.name AS to_warehouse_name
             FROM inventory_transfers t
             JOIN inventory_warehouses wf ON wf.id = t.from_warehouse_id
             JOIN inventory_warehouses wt ON wt.id = t.to_warehouse_id
             WHERE t.branch_id = ? ORDER BY t.id DESC LIMIT 100'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map(fn($t) => castTransfer($db, $t, false), $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeTr($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $fromId = (int)($body['from_warehouse_id'] ?? 0);
        $toId   = (int)($body['to_warehouse_id'] ?? 0);
        if ($fromId <= 0 || $toId <= 0 || $fromId === $toId) jsonError(422, 'Almacenes de origen y destino inválidos');
        requireWarehouseInBranch($db, $fromId, $branchId);
        requireWarehouseInBranch($db, $toId, $branchId);

        $items = $body['items'] ?? [];
        $clean = [];
        foreach ($items as $it) {
            $invId = (int)($it['inventory_item_id'] ?? 0);
            $qty   = round((float)($it['quantity'] ?? 0), 3);
            if ($invId > 0 && $qty > 0) $clean[] = [$invId, $qty];
        }
        if (!$clean) jsonError(422, 'Agrega al menos un insumo');

        $db->beginTransaction();
        try {
            $db->prepare(
                'INSERT INTO inventory_transfers (branch_id, from_warehouse_id, to_warehouse_id, notes, requested_by)
                 VALUES (?, ?, ?, ?, ?)'
            )->execute([$branchId, $fromId, $toId, trim((string)($body['notes'] ?? '')) ?: null, (int)$payload['sub']]);
            $transferId = (int)$db->lastInsertId();

            $ins = $db->prepare(
                'INSERT INTO inventory_transfer_items (transfer_id, inventory_item_id, quantity) VALUES (?, ?, ?)'
            );
            foreach ($clean as [$invId, $qty]) $ins->execute([$transferId, $invId, $qty]);
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); throw $e; }

        jsonResponse(castTransfer($db, fetchTransfer($db, $transferId), true), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'GET') {
        $t = fetchTransfer($db, $id);
        if (!$t) jsonError(404, 'Transferencia no encontrada');
        jsonResponse(castTransfer($db, $t, true));
    }

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        if (($body['status'] ?? '') === 'cancelled') {
            $db->prepare("UPDATE inventory_transfers SET status = 'cancelled' WHERE id = ? AND status = 'pending'")
               ->execute([$id]);
        }
        jsonResponse(castTransfer($db, fetchTransfer($db, $id), true));
    }

    jsonError(405, 'Método no permitido');
}

// Descuenta el almacén origen y da de alta en el destino solo al confirmar —
// nunca antes, para no inflar el inventario destino con transferencias en
// tránsito que aún podrían cancelarse.
function handleReceiveTransfer(PDO $db, int $id, array $payload): never {
    requireRole($payload, 'admin', 'superadmin');
    $t = fetchTransfer($db, $id);
    if (!$t) jsonError(404, 'Transferencia no encontrada');
    if ($t['status'] !== 'pending') jsonError(422, 'La transferencia ya fue procesada');

    $stmt = $db->prepare('SELECT * FROM inventory_transfer_items WHERE transfer_id = ?');
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    $db->beginTransaction();
    try {
        $decr = $db->prepare(
            'UPDATE inventory_warehouse_stocks SET stock = stock - ? WHERE warehouse_id = ? AND inventory_item_id = ?'
        );
        $incr = $db->prepare(
            'INSERT INTO inventory_warehouse_stocks (warehouse_id, inventory_item_id, stock)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)'
        );
        $mov = $db->prepare(
            'INSERT INTO inventory_movements (branch_id, inventory_item_id, warehouse_id, type, quantity, reason, ref_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        foreach ($items as $it) {
            $invId = (int)$it['inventory_item_id'];
            $qty   = (float)$it['quantity'];

            // Asegura la fila de origen antes de restar (evita quedar en negativo silencioso si nunca se capturó).
            $db->prepare(
                'INSERT IGNORE INTO inventory_warehouse_stocks (warehouse_id, inventory_item_id, stock) VALUES (?, ?, 0)'
            )->execute([(int)$t['from_warehouse_id'], $invId]);
            $decr->execute([$qty, (int)$t['from_warehouse_id'], $invId]);
            $incr->execute([(int)$t['to_warehouse_id'], $invId, $qty]);

            $mov->execute([
                (int)$t['branch_id'], $invId, (int)$t['from_warehouse_id'], 'transfer_out', -$qty,
                "Transferencia #$id → almacén " . (int)$t['to_warehouse_id'], $id, (int)$payload['sub'],
            ]);
            $mov->execute([
                (int)$t['branch_id'], $invId, (int)$t['to_warehouse_id'], 'transfer_in', $qty,
                "Transferencia #$id ← almacén " . (int)$t['from_warehouse_id'], $id, (int)$payload['sub'],
            ]);
        }

        $db->prepare("UPDATE inventory_transfers SET status = 'completed', received_by = ?, received_at = NOW() WHERE id = ?")
           ->execute([(int)$payload['sub'], $id]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    jsonResponse(castTransfer($db, fetchTransfer($db, $id), true));
}

function fetchTransfer(PDO $db, int $id): ?array {
    $stmt = $db->prepare(
        'SELECT t.*, wf.name AS from_warehouse_name, wt.name AS to_warehouse_name
         FROM inventory_transfers t
         JOIN inventory_warehouses wf ON wf.id = t.from_warehouse_id
         JOIN inventory_warehouses wt ON wt.id = t.to_warehouse_id
         WHERE t.id = ?'
    );
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castTransfer(PDO $db, array $t, bool $withItems): array {
    $out = [
        'id'                 => (int)$t['id'],
        'branch_id'          => (int)$t['branch_id'],
        'from_warehouse_id'  => (int)$t['from_warehouse_id'],
        'from_warehouse_name'=> $t['from_warehouse_name'],
        'to_warehouse_id'    => (int)$t['to_warehouse_id'],
        'to_warehouse_name'  => $t['to_warehouse_name'],
        'status'             => $t['status'],
        'notes'              => $t['notes'],
        'created_at'         => $t['created_at'],
        'received_at'        => $t['received_at'],
    ];
    if ($withItems) {
        $stmt = $db->prepare(
            'SELECT ti.*, i.name, i.unit FROM inventory_transfer_items ti
             JOIN inventory_items i ON i.id = ti.inventory_item_id WHERE ti.transfer_id = ?'
        );
        $stmt->execute([(int)$t['id']]);
        $out['items'] = array_map(fn($r) => [
            'id'                => (int)$r['id'],
            'inventory_item_id' => (int)$r['inventory_item_id'],
            'name'              => $r['name'],
            'unit'              => $r['unit'],
            'quantity'          => (float)$r['quantity'],
        ], $stmt->fetchAll());
    }
    return $out;
}

function requireWarehouseInBranch(PDO $db, int $warehouseId, int $branchId): void {
    $stmt = $db->prepare('SELECT id FROM inventory_warehouses WHERE id = ? AND branch_id = ? AND active = 1');
    $stmt->execute([$warehouseId, $branchId]);
    if (!$stmt->fetch()) jsonError(422, "Almacén $warehouseId no pertenece a esta sucursal");
}

function branchScopeTr(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
