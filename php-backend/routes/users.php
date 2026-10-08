<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de usuarios, roles y estaciones asignadas.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';

function handleUsers(array $seg, string $method): never {
    $payload = requireAuth();
    requireRole($payload, 'admin', 'superadmin');

    $db     = Database::connect();
    $userId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2   = $seg[2] ?? '';

    // PATCH /users/{id}/pin — fijar / cambiar / quitar PIN de acceso rápido
    if ($userId && $sub2 === 'pin' && $method === 'PATCH') {
        handleSetUserPin($db, $userId, $payload);
    }

    // GET /users
    if (!$userId && $method === 'GET') {
        $branchId = $payload['role'] === 'superadmin' ? intParam('branch_id') : (int)$payload['branch_id'];

        if ($branchId) {
            $stmt = $db->prepare(
                'SELECT id, branch_id, name, email, username, role, active, created_at, (pin_hash IS NOT NULL) AS has_pin
                 FROM users WHERE branch_id = ? ORDER BY name ASC'
            );
            $stmt->execute([$branchId]);
        } else {
            $stmt = $db->query(
                'SELECT id, branch_id, name, email, username, role, active, created_at, (pin_hash IS NOT NULL) AS has_pin FROM users ORDER BY name ASC'
            );
        }
        jsonResponse(array_map(function ($u) {
            $u['has_pin'] = (bool)$u['has_pin'];
            return $u;
        }, $stmt->fetchAll()));
    }

    // POST /users
    if (!$userId && $method === 'POST') {
        $body     = getBody();
        $name     = trim((string)($body['name']     ?? ''));
        $email    = trim((string)($body['email']    ?? ''));
        $username = trim((string)($body['username'] ?? ''));
        $password =       (string)($body['password'] ?? '');
        $role     =       (string)($body['role']     ?? 'mesero');
        $branchId = isset($body['branch_id']) ? (int)$body['branch_id'] : (int)$payload['branch_id'];

        if (!$name || !$email || !$username || !$password) jsonError(422, 'Nombre, email, usuario y contraseña son requeridos');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError(422, 'Email inválido');
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,60}$/', $username)) jsonError(422, 'Usuario inválido: 3-60 caracteres (letras, números, . _ -)');

        $validRoles = ['admin', 'mesero', 'cocina'];
        if ($payload['role'] === 'superadmin') $validRoles[] = 'superadmin';
        if (!in_array($role, $validRoles, true)) jsonError(422, 'Rol inválido');

        if (strlen($password) < 6) jsonError(422, 'La contraseña debe tener al menos 6 caracteres');

        if ($branchId && $payload['role'] !== 'superadmin') {
            $countStmt = $db->prepare('SELECT COUNT(*) FROM users WHERE branch_id = ? AND active = 1');
            $countStmt->execute([$branchId]);
            requirePlanLimit($db, $branchId, 'max_users', (int)$countStmt->fetchColumn(), 'usuarios');
        }

        $st = $db->prepare('SELECT id FROM users WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) jsonError(409, 'El email ya está registrado');

        $st = $db->prepare('SELECT id FROM users WHERE username = ?');
        $st->execute([$username]);
        if ($st->fetch()) jsonError(409, 'El usuario ya está en uso');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare(
            'INSERT INTO users (branch_id, name, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$branchId ?: null, $name, $email, $username, $hash, $role]);
        $id = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT id, branch_id, name, email, username, role, active, created_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse($stmt->fetch(), 201);
    }

    if (!$userId) jsonError(404, 'Ruta no encontrada');

    // GET /users/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT id, branch_id, name, email, username, role, active, created_at FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $u = $stmt->fetch();
        if (!$u) jsonError(404, 'Usuario no encontrado');
        jsonResponse($u);
    }

    // PATCH /users/{id}
    if ($method === 'PATCH') {
        $body    = getBody();
        $set     = [];
        $params  = [];

        if (isset($body['name']))   { $set[] = 'name = ?';   $params[] = trim((string)$body['name']); }
        if (isset($body['email']))  { $set[] = 'email = ?';  $params[] = trim((string)$body['email']); }
        if (isset($body['username'])) {
            $uname = trim((string)$body['username']);
            if (!preg_match('/^[a-zA-Z0-9_.-]{3,60}$/', $uname)) jsonError(422, 'Usuario inválido');
            $st = $db->prepare('SELECT id FROM users WHERE username = ? AND id <> ?');
            $st->execute([$uname, $userId]);
            if ($st->fetch()) jsonError(409, 'El usuario ya está en uso');
            $set[] = 'username = ?'; $params[] = $uname;
        }
        if (isset($body['role']))   { $set[] = 'role = ?';   $params[] = $body['role']; }
        if (isset($body['active'])) { $set[] = 'active = ?'; $params[] = (int)(bool)$body['active']; }
        if (isset($body['password']) && strlen((string)$body['password']) >= 6) {
            $set[]    = 'password = ?';
            $params[] = password_hash((string)$body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $userId;

        $db->prepare('UPDATE users SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT id, branch_id, name, email, username, role, active, created_at FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse($stmt->fetch());
    }

    // DELETE /users/{id}
    if ($method === 'DELETE') {
        requireRole($payload, 'superadmin');
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// PATCH /users/{id}/pin — fija, cambia o quita el PIN (hash bcrypt, nunca texto plano)
function handleSetUserPin(PDO $db, int $userId, array $payload): never {
    $body = getBody();
    $stmt = $db->prepare('SELECT id, branch_id FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $u = $stmt->fetch();
    if (!$u) jsonError(404, 'Usuario no encontrado');
    if ($payload['role'] === 'admin' && (int)$u['branch_id'] !== (int)$payload['branch_id']) {
        jsonError(403, 'Sin acceso a este usuario');
    }

    $pin = array_key_exists('pin', $body) ? trim((string)$body['pin']) : null;

    if ($pin === null || $pin === '') {
        $db->prepare('UPDATE users SET pin_hash = NULL, pin_attempts = 0, pin_locked_until = NULL WHERE id = ?')
           ->execute([$userId]);
        logAudit($db, $payload, 'user.pin.removed', 'user', $userId);
        jsonResponse(['success' => true, 'has_pin' => false]);
    }

    if (!preg_match('/^\d{4,6}$/', $pin)) jsonError(422, 'El PIN debe tener de 4 a 6 dígitos');

    $hash = password_hash($pin, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET pin_hash = ?, pin_attempts = 0, pin_locked_until = NULL WHERE id = ?')
       ->execute([$hash, $userId]);
    logAudit($db, $payload, 'user.pin.changed', 'user', $userId);
    jsonResponse(['success' => true, 'has_pin' => true]);
}
