<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Control de inventario, insumos y ajustes de stock.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Insumos / materia prima y sus movimientos de stock.
// GET    /inventory?branch_id=        → lista de insumos
// POST   /inventory                   → crear insumo
// PATCH  /inventory/{id}              → editar insumo
// DELETE /inventory/{id}              → eliminar insumo
// POST   /inventory/{id}/adjust       → merma/ajuste {type:waste|adjustment, quantity, reason}

function handleInventory(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $itemId  = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    if ($itemId && $sub2 === 'adjust' && $method === 'POST') {
        handleAdjust($db, $itemId, $payload);
    }

    if (!$itemId && $method === 'GET') {
        $branchId = branchScopeInv($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare(
            'SELECT * FROM inventory_items WHERE branch_id = ? AND active = 1 ORDER BY name'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castItem', $stmt->fetchAll()));
    }

    if (!$itemId && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeInv($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');

        $stmt = $db->prepare(
            'INSERT INTO inventory_items
               (branch_id, name, sku, unit, purchase_unit, purchase_to_base_factor, stock, min_stock, cost, default_warehouse_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $name,
            trim((string)($body['sku'] ?? '')) ?: null,
            trim((string)($body['unit'] ?? 'pza')),
            trim((string)($body['purchase_unit'] ?? '')) ?: null,
            round((float)($body['purchase_to_base_factor'] ?? 1), 4) ?: 1,
            round((float)($body['stock'] ?? 0), 3),
            round((float)($body['min_stock'] ?? 0), 3),
            round((float)($body['cost'] ?? 0), 2),
            isset($body['default_warehouse_id']) ? (int)$body['default_warehouse_id'] : null,
        ]);
        jsonResponse(castItem(fetchItem($db, (int)$db->lastInsertId())), 201);
    }

    if (!$itemId) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        $set = []; $params = [];
        $textFields    = ['name','unit','sku','purchase_unit'];
        $numericFields = ['min_stock','cost','stock','purchase_to_base_factor'];
        foreach ([...$textFields, ...$numericFields] as $f) {
            if (!array_key_exists($f, $body)) continue;
            $set[] = "$f = ?";
            $params[] = in_array($f, $textFields, true) ? (trim((string)$body[$f]) ?: null) : (float)$body[$f];
        }
        if (array_key_exists('default_warehouse_id', $body)) {
            $set[] = 'default_warehouse_id = ?';
            $params[] = $body['default_warehouse_id'] !== null ? (int)$body['default_warehouse_id'] : null;
        }
        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $itemId;
        $db->prepare('UPDATE inventory_items SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castItem(fetchItem($db, $itemId)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('UPDATE inventory_items SET active = 0 WHERE id = ?')->execute([$itemId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function handleAdjust(PDO $db, int $itemId, array $payload): never {
    requireRole($payload, 'admin', 'superadmin');
    $body = getBody();
    $item = fetchItem($db, $itemId);
    if (!$item) jsonError(404, 'Insumo no encontrado');

    $type = (string)($body['type'] ?? 'adjustment');
    if (!in_array($type, ['waste', 'adjustment'], true)) jsonError(422, 'Tipo inválido');
    $qty = round((float)($body['quantity'] ?? 0), 3);
    if ($qty == 0) jsonError(422, 'Cantidad inválida');

    // waste resta; adjustment puede sumar o restar (cantidad con signo).
    $delta = $type === 'waste' ? -abs($qty) : $qty;

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE inventory_items SET stock = stock + ? WHERE id = ?')->execute([$delta, $itemId]);
        $db->prepare(
            'INSERT INTO inventory_movements (branch_id, inventory_item_id, type, quantity, reason, created_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            (int)$item['branch_id'], $itemId, $type, $delta,
            trim((string)($body['reason'] ?? '')) ?: null, (int)$payload['sub'],
        ]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    jsonResponse(castItem(fetchItem($db, $itemId)));
}

function fetchItem(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM inventory_items WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castItem(array $i): array {
    return [
        'id'                      => (int)$i['id'],
        'branch_id'               => (int)$i['branch_id'],
        'name'                    => $i['name'],
        'sku'                     => $i['sku'] ?? null,
        'unit'                    => $i['unit'],
        'purchase_unit'           => $i['purchase_unit'] ?? null,
        'purchase_to_base_factor' => isset($i['purchase_to_base_factor']) ? (float)$i['purchase_to_base_factor'] : 1.0,
        'stock'                   => (float)$i['stock'],
        'min_stock'               => (float)$i['min_stock'],
        'cost'                    => (float)$i['cost'],
        'default_warehouse_id'    => isset($i['default_warehouse_id']) ? (int)$i['default_warehouse_id'] : null,
        'low_stock'               => (float)$i['stock'] <= (float)$i['min_stock'] && (float)$i['min_stock'] > 0,
    ];
}

function branchScopeInv(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
