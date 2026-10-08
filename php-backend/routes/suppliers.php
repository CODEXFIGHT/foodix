<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de proveedores.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Proveedores — CRUD.
function handleSuppliers(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    if (!$id && $method === 'GET') {
        $branchId = branchScopeSup($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare('SELECT * FROM suppliers WHERE branch_id = ? AND active = 1 ORDER BY name');
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castSupplier', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeSup($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');

        $stmt = $db->prepare(
            'INSERT INTO suppliers (branch_id, name, contact, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $name,
            trim((string)($body['contact'] ?? '')) ?: null,
            trim((string)($body['phone'] ?? '')) ?: null,
            trim((string)($body['email'] ?? '')) ?: null,
            trim((string)($body['notes'] ?? '')) ?: null,
        ]);
        jsonResponse(castSupplier(fetchSupplier($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        $set = []; $params = [];
        foreach (['name','contact','phone','email','notes'] as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = trim((string)$body[$f]) ?: null; }
        }
        if (!$set) jsonError(422, 'Sin campos');
        $params[] = $id;
        $db->prepare('UPDATE suppliers SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castSupplier(fetchSupplier($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('UPDATE suppliers SET active = 0 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function fetchSupplier(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM suppliers WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castSupplier(array $s): array {
    return [
        'id'        => (int)$s['id'],
        'branch_id' => (int)$s['branch_id'],
        'name'      => $s['name'],
        'contact'   => $s['contact'],
        'phone'     => $s['phone'],
        'email'     => $s['email'],
        'notes'     => $s['notes'],
    ];
}

function branchScopeSup(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
