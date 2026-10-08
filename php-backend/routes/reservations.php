<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Reservaciones de mesas.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Reservaciones.
// GET    /reservations?branch_id=&date=  → reservas (de un día si se da date)
// POST   /reservations                   → crear
// PATCH  /reservations/{id}              → cambiar estado / datos
// DELETE /reservations/{id}              → eliminar

function handleReservations(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    if (!$id && $method === 'GET') {
        $branchId = branchScopeRes($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $date = strParam('date');
        $sql = 'SELECT * FROM reservations WHERE branch_id = ?';
        $params = [$branchId];
        if ($date !== '') { $sql .= ' AND DATE(reserved_at) = ?'; $params[] = $date; }
        $sql .= ' ORDER BY reserved_at ASC LIMIT 200';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse(array_map('castReservation', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        $body     = getBody();
        $branchId = branchScopeRes($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['customer_name'] ?? ''));
        $at   = trim((string)($body['reserved_at'] ?? ''));
        if ($name === '' || $at === '') jsonError(422, 'Nombre y fecha/hora requeridos');

        $stmt = $db->prepare(
            'INSERT INTO reservations (branch_id, customer_id, customer_name, phone, party_size, table_id, reserved_at, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'pending\')'
        );
        $stmt->execute([
            $branchId,
            isset($body['customer_id']) && is_numeric($body['customer_id']) ? (int)$body['customer_id'] : null,
            $name,
            trim((string)($body['phone'] ?? '')) ?: null,
            max(1, (int)($body['party_size'] ?? 2)),
            isset($body['table_id']) && is_numeric($body['table_id']) ? (int)$body['table_id'] : null,
            $at,
            trim((string)($body['notes'] ?? '')) ?: null,
        ]);
        jsonResponse(castReservation(fetchReservation($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        $body = getBody();
        $set = []; $params = [];
        if (isset($body['status'])) {
            $allowed = ['pending','confirmed','seated','cancelled','no_show'];
            if (!in_array($body['status'], $allowed, true)) jsonError(422, 'Estado inválido');
            $set[] = 'status = ?'; $params[] = $body['status'];
        }
        foreach (['customer_name','phone','notes'] as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = trim((string)$body[$f]) ?: null; }
        }
        if (isset($body['party_size'])) { $set[] = 'party_size = ?'; $params[] = max(1, (int)$body['party_size']); }
        if (isset($body['reserved_at'])) { $set[] = 'reserved_at = ?'; $params[] = (string)$body['reserved_at']; }
        if (!$set) jsonError(422, 'Sin campos');
        $params[] = $id;
        $db->prepare('UPDATE reservations SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castReservation(fetchReservation($db, $id)));
    }

    if ($method === 'DELETE') {
        $db->prepare('DELETE FROM reservations WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function fetchReservation(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM reservations WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castReservation(array $r): array {
    return [
        'id'            => (int)$r['id'],
        'branch_id'     => (int)$r['branch_id'],
        'customer_id'   => $r['customer_id'] ? (int)$r['customer_id'] : null,
        'customer_name' => $r['customer_name'],
        'phone'         => $r['phone'],
        'party_size'    => (int)$r['party_size'],
        'table_id'      => $r['table_id'] ? (int)$r['table_id'] : null,
        'reserved_at'   => $r['reserved_at'],
        'status'        => $r['status'],
        'notes'         => $r['notes'],
    ];
}

function branchScopeRes(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
