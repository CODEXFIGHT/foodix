<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Zonas de entrega a domicilio (costo, pedido mínimo, tiempo estimado).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// GET    /delivery-zones?branch_id=  → lista de zonas activas
// POST   /delivery-zones             → crea {name, cost, min_order, estimated_minutes}
// PATCH  /delivery-zones/{id}        → edita
// DELETE /delivery-zones/{id}        → desactiva

function handleDeliveryZones(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    if (!$id && $method === 'GET') {
        $branchId = branchScopeDz($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare('SELECT * FROM delivery_zones WHERE branch_id = ? AND active = 1 ORDER BY name');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castZone', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeDz($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');

        $stmt = $db->prepare(
            'INSERT INTO delivery_zones (branch_id, name, cost, min_order, estimated_minutes) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $name,
            round((float)($body['cost'] ?? 0), 2),
            round((float)($body['min_order'] ?? 0), 2),
            isset($body['estimated_minutes']) && is_numeric($body['estimated_minutes']) ? (int)$body['estimated_minutes'] : null,
        ]);
        jsonResponse(castZone(fetchZone($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        $set = []; $params = [];
        if (array_key_exists('name', $body)) {
            $name = trim((string)$body['name']);
            if ($name === '') jsonError(422, 'Nombre requerido');
            $set[] = 'name = ?'; $params[] = $name;
        }
        foreach (['cost', 'min_order'] as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = round((float)$body[$f], 2); }
        }
        if (array_key_exists('estimated_minutes', $body)) {
            $set[] = 'estimated_minutes = ?';
            $params[] = is_numeric($body['estimated_minutes']) ? (int)$body['estimated_minutes'] : null;
        }
        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $id;
        $db->prepare('UPDATE delivery_zones SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castZone(fetchZone($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('UPDATE delivery_zones SET active = 0 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function fetchZone(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM delivery_zones WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castZone(array $z): array {
    return [
        'id'                => (int)$z['id'],
        'branch_id'         => (int)$z['branch_id'],
        'name'              => $z['name'],
        'cost'              => (float)$z['cost'],
        'min_order'         => (float)$z['min_order'],
        'estimated_minutes' => isset($z['estimated_minutes']) ? (int)$z['estimated_minutes'] : null,
    ];
}

function branchScopeDz(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
