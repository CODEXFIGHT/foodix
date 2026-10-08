<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Grupos de modificadores y opciones de productos.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Grupos de modificadores y sus opciones, más la asignación a productos.
// GET    /modifiers?branch_id=        → grupos con options[] y product_ids[]
// POST   /modifiers                   → crea grupo (con options y product_ids)
// PATCH  /modifiers/{id}              → reemplaza grupo, options y product_ids
// DELETE /modifiers/{id}              → elimina grupo (cascade a options/asignación)

function handleModifiers(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $groupId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    if (!$groupId && $method === 'GET') {
        $branchId = branchScopeM($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $stmt = $db->prepare(
            'SELECT id, branch_id, name, min_select, max_select, required, sort_order
             FROM modifier_groups WHERE branch_id = ? ORDER BY sort_order, id'
        );
        $stmt->execute([$branchId]);
        $groups = $stmt->fetchAll();

        jsonResponse(array_map(fn($g) => castGroup($db, $g), $groups));
    }

    if (!$groupId && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeM($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');

        $db->beginTransaction();
        try {
            $stmt = $db->prepare(
                'INSERT INTO modifier_groups (branch_id, name, min_select, max_select, required, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $branchId, $name,
                (int)($body['min_select'] ?? 0),
                (int)($body['max_select'] ?? 1),
                (int)(!empty($body['required'])),
                (int)($body['sort_order'] ?? 0),
            ]);
            $gid = (int)$db->lastInsertId();
            saveOptions($db, $gid, $body['options'] ?? []);
            saveProductLinks($db, $gid, $body['product_ids'] ?? []);
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); throw $e; }

        jsonResponse(fetchGroup($db, $gid), 201);
    }

    if (!$groupId) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();

        $set = []; $params = [];
        foreach (['name', 'min_select', 'max_select', 'required', 'sort_order'] as $f) {
            if (array_key_exists($f, $body)) {
                $set[] = "$f = ?";
                $params[] = $f === 'name' ? trim((string)$body[$f]) : (int)$body[$f];
            }
        }

        $db->beginTransaction();
        try {
            if ($set) {
                $params[] = $groupId;
                $db->prepare('UPDATE modifier_groups SET ' . implode(', ', $set) . ' WHERE id = ?')
                   ->execute($params);
            }
            if (array_key_exists('options', $body)) {
                $db->prepare('DELETE FROM modifiers WHERE group_id = ?')->execute([$groupId]);
                saveOptions($db, $groupId, $body['options']);
            }
            if (array_key_exists('product_ids', $body)) {
                $db->prepare('DELETE FROM product_modifier_groups WHERE group_id = ?')->execute([$groupId]);
                saveProductLinks($db, $groupId, $body['product_ids']);
            }
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); throw $e; }

        jsonResponse(fetchGroup($db, $groupId));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM modifier_groups WHERE id = ?')->execute([$groupId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function saveOptions(PDO $db, int $groupId, mixed $options): void {
    if (!is_array($options)) return;
    $stmt = $db->prepare(
        'INSERT INTO modifiers (group_id, name, price_delta, sort_order) VALUES (?, ?, ?, ?)'
    );
    $i = 0;
    foreach ($options as $opt) {
        $name = trim((string)($opt['name'] ?? ''));
        if ($name === '') continue;
        $stmt->execute([$groupId, $name, (float)($opt['price_delta'] ?? 0), $i++]);
    }
}

function saveProductLinks(PDO $db, int $groupId, mixed $productIds): void {
    if (!is_array($productIds)) return;
    $stmt = $db->prepare(
        'INSERT IGNORE INTO product_modifier_groups (product_id, group_id) VALUES (?, ?)'
    );
    foreach ($productIds as $pid) {
        if (is_numeric($pid)) $stmt->execute([(int)$pid, $groupId]);
    }
}

function fetchGroup(PDO $db, int $groupId): array {
    $stmt = $db->prepare(
        'SELECT id, branch_id, name, min_select, max_select, required, sort_order
         FROM modifier_groups WHERE id = ?'
    );
    $stmt->execute([$groupId]);
    return castGroup($db, $stmt->fetch());
}

function castGroup(PDO $db, array $g): array {
    $gid = (int)$g['id'];

    $opt = $db->prepare('SELECT id, name, price_delta FROM modifiers WHERE group_id = ? ORDER BY sort_order, id');
    $opt->execute([$gid]);
    $options = array_map(fn($o) => [
        'id'          => (int)$o['id'],
        'name'        => $o['name'],
        'price_delta' => (float)$o['price_delta'],
    ], $opt->fetchAll());

    $lnk = $db->prepare('SELECT product_id FROM product_modifier_groups WHERE group_id = ?');
    $lnk->execute([$gid]);
    $productIds = array_map(fn($r) => (int)$r['product_id'], $lnk->fetchAll());

    return [
        'id'          => $gid,
        'branch_id'   => (int)$g['branch_id'],
        'name'        => $g['name'],
        'min_select'  => (int)$g['min_select'],
        'max_select'  => (int)$g['max_select'],
        'required'    => (bool)$g['required'],
        'sort_order'  => (int)$g['sort_order'],
        'options'     => $options,
        'product_ids' => $productIds,
    ];
}

function branchScopeM(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
