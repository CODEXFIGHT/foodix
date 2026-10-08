<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Almacenes por sucursal, existencia por almacén y catálogo de unidades.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// GET    /inventory-warehouses?branch_id=          → lista de almacenes de la sucursal
// POST   /inventory-warehouses                     → crear almacén {name, type}
// PATCH  /inventory-warehouses/{id}                → editar almacén
// DELETE /inventory-warehouses/{id}                → desactivar almacén
// GET    /inventory-warehouses/{id}/stocks         → existencia por insumo en ese almacén
// PUT    /inventory-warehouses/{id}/stocks/{itemId} → fija existencia de un insumo en ese almacén
// GET    /inventory-warehouses/units                → catálogo global de unidades de medida

const INV_WAREHOUSE_TYPES = ['principal','cocina','barra','refrigerador','congelador','seco','personalizado'];

function handleInventoryWarehouses(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();

    if (($seg[1] ?? '') === 'units' && $method === 'GET') {
        $stmt = $db->query('SELECT id, code, name FROM inventory_units WHERE active = 1 ORDER BY name');
        jsonResponse(array_map(fn($u) => [
            'id' => (int)$u['id'], 'code' => $u['code'], 'name' => $u['name'],
        ], $stmt->fetchAll()));
    }

    $id   = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2 = $seg[2] ?? '';

    if ($id && $sub2 === 'stocks' && $method === 'GET') {
        handleListStocks($db, $payload, $id);
    }

    if ($id && $sub2 === 'stocks' && isset($seg[3]) && is_numeric($seg[3]) && $method === 'PUT') {
        handleSetStock($db, $payload, $id, (int)$seg[3]);
    }

    if (!$id && $method === 'GET') {
        $branchId = branchScopeWh($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare('SELECT * FROM inventory_warehouses WHERE branch_id = ? AND active = 1 ORDER BY FIELD(type, "principal") DESC, name');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castWarehouse', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeWh($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');
        $type = (string)($body['type'] ?? 'personalizado');
        if (!in_array($type, INV_WAREHOUSE_TYPES, true)) jsonError(422, 'Tipo de almacén inválido');

        $stmt = $db->prepare('INSERT INTO inventory_warehouses (branch_id, name, type) VALUES (?, ?, ?)');
        $stmt->execute([$branchId, $name, $type]);
        jsonResponse(castWarehouse(fetchWarehouse($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    $warehouse = fetchWarehouse($db, $id);
    if (!$warehouse) jsonError(404, 'Almacén no encontrado');
    requireBranchMatchWh($payload, (int)$warehouse['branch_id']);

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        $set = []; $params = [];
        if (array_key_exists('name', $body)) {
            $name = trim((string)$body['name']);
            if ($name === '') jsonError(422, 'Nombre requerido');
            $set[] = 'name = ?'; $params[] = $name;
        }
        if (array_key_exists('type', $body)) {
            $type = (string)$body['type'];
            if (!in_array($type, INV_WAREHOUSE_TYPES, true)) jsonError(422, 'Tipo de almacén inválido');
            $set[] = 'type = ?'; $params[] = $type;
        }
        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $id;
        $db->prepare('UPDATE inventory_warehouses SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castWarehouse(fetchWarehouse($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        if ($warehouse['type'] === 'principal') jsonError(422, 'No se puede desactivar el almacén principal');
        $db->prepare('UPDATE inventory_warehouses SET active = 0 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function handleListStocks(PDO $db, array $payload, int $warehouseId): never {
    $warehouse = fetchWarehouse($db, $warehouseId);
    if (!$warehouse) jsonError(404, 'Almacén no encontrado');
    requireBranchMatchWh($payload, (int)$warehouse['branch_id']);

    $stmt = $db->prepare(
        'SELECT ii.id AS inventory_item_id, ii.name, ii.unit, COALESCE(ws.stock, 0) AS stock
         FROM inventory_items ii
         LEFT JOIN inventory_warehouse_stocks ws
           ON ws.inventory_item_id = ii.id AND ws.warehouse_id = ?
         WHERE ii.branch_id = ? AND ii.active = 1
         ORDER BY ii.name'
    );
    $stmt->execute([$warehouseId, (int)$warehouse['branch_id']]);
    jsonResponse(array_map(fn($r) => [
        'inventory_item_id' => (int)$r['inventory_item_id'],
        'name'              => $r['name'],
        'unit'              => $r['unit'],
        'stock'             => (float)$r['stock'],
    ], $stmt->fetchAll()));
}

// Fija (no suma) la existencia de un insumo en un almacén — usado para captura
// inicial y conteos. Deja rastro en el kardex como tipo 'count'.
function handleSetStock(PDO $db, array $payload, int $warehouseId, int $itemId): never {
    requireRole($payload, 'admin', 'superadmin');
    $warehouse = fetchWarehouse($db, $warehouseId);
    if (!$warehouse) jsonError(404, 'Almacén no encontrado');
    requireBranchMatchWh($payload, (int)$warehouse['branch_id']);

    $item = $db->prepare('SELECT id, branch_id FROM inventory_items WHERE id = ? AND branch_id = ?');
    $item->execute([$itemId, (int)$warehouse['branch_id']]);
    if (!$item->fetch()) jsonError(404, 'Insumo no encontrado en esta sucursal');

    $body = getBody();
    $newStock = round((float)($body['stock'] ?? -1), 3);
    if ($newStock < 0) jsonError(422, 'stock inválido');

    $prev = $db->prepare('SELECT stock FROM inventory_warehouse_stocks WHERE warehouse_id = ? AND inventory_item_id = ?');
    $prev->execute([$warehouseId, $itemId]);
    $prevRow = $prev->fetch();
    $previousQty = $prevRow ? (float)$prevRow['stock'] : 0.0;

    $db->beginTransaction();
    try {
        $db->prepare(
            'INSERT INTO inventory_warehouse_stocks (warehouse_id, inventory_item_id, stock)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock = VALUES(stock)'
        )->execute([$warehouseId, $itemId, $newStock]);

        $db->prepare(
            'INSERT INTO inventory_movements
               (branch_id, inventory_item_id, warehouse_id, type, quantity, previous_qty, resulting_qty, reason, created_by)
             VALUES (?, ?, ?, \'count\', ?, ?, ?, ?, ?)'
        )->execute([
            (int)$warehouse['branch_id'], $itemId, $warehouseId,
            round($newStock - $previousQty, 3), $previousQty, $newStock,
            trim((string)($body['reason'] ?? '')) ?: 'Conteo de almacén', (int)$payload['sub'],
        ]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }

    jsonResponse(['inventory_item_id' => $itemId, 'warehouse_id' => $warehouseId, 'stock' => $newStock]);
}

function fetchWarehouse(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM inventory_warehouses WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castWarehouse(array $w): array {
    return [
        'id'        => (int)$w['id'],
        'branch_id' => (int)$w['branch_id'],
        'name'      => $w['name'],
        'type'      => $w['type'],
        'active'    => (bool)$w['active'],
    ];
}

function branchScopeWh(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}

function requireBranchMatchWh(array $payload, int $branchId): void {
    if ($payload['role'] !== 'superadmin' && (int)$payload['branch_id'] !== $branchId) {
        jsonError(403, 'Sin acceso a este almacén');
    }
}
