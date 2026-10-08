<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de mesas y su estado.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleTables(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $tableId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    // PATCH /tables/{id}/status
    if ($tableId && $sub2 === 'status' && $method === 'PATCH') {
        handleUpdateTableStatus($db, $tableId, $payload);
    }

    // GET /tables?branch_id=
    if (!$tableId && $method === 'GET') {
        $branchId = branchScopeT($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $stmt = $db->prepare(
            'SELECT id, branch_id, name, seats, status, current_order_id, qr_code
             FROM tables WHERE branch_id = ? ORDER BY name ASC'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castTable', $stmt->fetchAll()));
    }

    // POST /tables
    if (!$tableId && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeT($payload, $body);
        $name     = trim((string)($body['name'] ?? ''));

        if (!$name)     jsonError(422, 'Nombre de mesa requerido');
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $stmt = $db->prepare(
            'INSERT INTO tables (branch_id, name, seats, status) VALUES (?, ?, ?, \'libre\')'
        );
        $stmt->execute([$branchId, $name, (int)($body['seats'] ?? 4)]);
        $id = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT id, branch_id, name, seats, status, current_order_id, qr_code FROM tables WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(castTable($stmt->fetch()), 201);
    }

    if (!$tableId) jsonError(404, 'Ruta no encontrada');

    // GET /tables/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT id, branch_id, name, seats, status, current_order_id, qr_code FROM tables WHERE id = ?');
        $stmt->execute([$tableId]);
        $t = $stmt->fetch();
        if (!$t) jsonError(404, 'Mesa no encontrada');
        jsonResponse(castTable($t));
    }

    // PATCH /tables/{id}
    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body    = getBody();
        $set     = [];
        $params  = [];

        if (isset($body['name']))  { $set[] = 'name = ?';  $params[] = trim((string)$body['name']); }
        if (isset($body['seats'])) { $set[] = 'seats = ?'; $params[] = (int)$body['seats']; }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $tableId;

        $db->prepare('UPDATE tables SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT id, branch_id, name, seats, status, current_order_id, qr_code FROM tables WHERE id = ?');
        $stmt->execute([$tableId]);
        jsonResponse(castTable($stmt->fetch()));
    }

    // DELETE /tables/{id}
    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM tables WHERE id = ?')->execute([$tableId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function handleUpdateTableStatus(PDO $db, int $tableId, array $payload): never {
    $body      = getBody();
    $newStatus = (string)($body['status'] ?? '');
    $allowed   = ['libre', 'ocupada', 'reservada'];

    if (!in_array($newStatus, $allowed, true)) {
        jsonError(422, 'Estado inválido: libre, ocupada, reservada');
    }

    $stmt = $db->prepare('SELECT id FROM tables WHERE id = ?');
    $stmt->execute([$tableId]);
    if (!$stmt->fetch()) jsonError(404, 'Mesa no encontrada');

    $db->prepare('UPDATE tables SET status = ? WHERE id = ?')->execute([$newStatus, $tableId]);

    $stmt = $db->prepare('SELECT id, branch_id, name, seats, status, current_order_id, qr_code FROM tables WHERE id = ?');
    $stmt->execute([$tableId]);
    jsonResponse(castTable($stmt->fetch()));
}

function castTable(array $t): array {
    $t['id']               = (int)$t['id'];
    $t['branch_id']        = (int)$t['branch_id'];
    $t['seats']            = (int)$t['seats'];
    $t['current_order_id'] = $t['current_order_id'] ? (int)$t['current_order_id'] : null;
    return $t;
}

function branchScopeT(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
