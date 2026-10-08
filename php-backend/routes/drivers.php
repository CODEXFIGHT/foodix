<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de repartidores para pedidos a domicilio.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Repartidores (para domicilios) — CRUD simple.
function handleDrivers(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    if (!$id && $method === 'GET') {
        $branchId = branchScopeDrv($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $stmt = $db->prepare(
            "SELECT d.*,
                    (SELECT COUNT(*) FROM orders o
                     WHERE o.driver_id = d.id AND o.delivery_status IN ('assigned','on_route')) AS active_orders
             FROM drivers d WHERE d.branch_id = ? AND d.active = 1 ORDER BY d.name"
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castDriver', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScopeDrv($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');
        $stmt = $db->prepare('INSERT INTO drivers (branch_id, name, phone, vehicle) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $branchId, $name,
            trim((string)($body['phone'] ?? '')) ?: null,
            trim((string)($body['vehicle'] ?? '')) ?: null,
        ]);
        jsonResponse(castDriver(fetchDriver($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body = getBody();
        $set = []; $params = [];
        foreach (['name','phone','vehicle'] as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = trim((string)$body[$f]) ?: null; }
        }
        if (array_key_exists('status', $body)) {
            $status = (string)$body['status'];
            if (!in_array($status, ['disponible', 'en_ruta', 'fuera_de_servicio'], true)) {
                jsonError(422, 'Estado de repartidor inválido');
            }
            $set[] = 'status = ?'; $params[] = $status;
        }
        if (!$set) jsonError(422, 'Sin campos');
        $params[] = $id;
        $db->prepare('UPDATE drivers SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castDriver(fetchDriver($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('UPDATE drivers SET active = 0 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function fetchDriver(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM drivers WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castDriver(array $d): array {
    return [
        'id'            => (int)$d['id'],
        'branch_id'     => (int)$d['branch_id'],
        'name'          => $d['name'],
        'phone'         => $d['phone'],
        'vehicle'       => $d['vehicle'] ?? null,
        'status'        => $d['status'] ?? 'disponible',
        'active_orders' => isset($d['active_orders']) ? (int)$d['active_orders'] : 0,
    ];
}

function branchScopeDrv(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
