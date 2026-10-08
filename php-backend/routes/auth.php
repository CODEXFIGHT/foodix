<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Endpoints de autenticación (login, sesión actual, logout).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleAuth(array $seg, string $method): never {
    match ($seg[1] ?? '') {
        'login'     => ($method === 'POST'  ? handleLogin()    : jsonError(405, 'Método no permitido')),
        'check-pin' => ($method === 'POST'  ? handleCheckPin() : jsonError(405, 'Método no permitido')),
        'pin-login' => ($method === 'POST'  ? handlePinLogin() : jsonError(405, 'Método no permitido')),
        'pin-users' => ($method === 'GET'   ? handlePinUsers() : jsonError(405, 'Método no permitido')),
        'me'        => ($method === 'GET'   ? handleMe()       : ($method === 'PATCH' ? handleUpdateMe() : jsonError(405, 'Método no permitido'))),
        'logout'    => ($method === 'POST'  ? handleLogout()   : jsonError(405, 'Método no permitido')),
        default     => jsonError(404, 'Ruta de auth no encontrada'),
    };
}

// ── POST /auth/login ──────────────────────────────────────────────────────────

function handleLogin(): never {
    $body = getBody();
    $username   = trim((string)($body['username']     ?? ''));
    $password   =       (string)($body['password']   ?? '');
    $deviceUid  = trim((string)($body['device_uid']  ?? ''));
    $deviceType =       (string)($body['device_type'] ?? 'web');
    $deviceName = trim((string)($body['device_name'] ?? 'Dispositivo'));

    if (!$username || !$password) jsonError(422, 'Usuario y contraseña son requeridos');

    // Rate limiting: 5 intentos / IP / minuto
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $db = Database::connect();

    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE ip_address = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)'
    );
    $stmt->execute([$ip]);
    if ((int)$stmt->fetchColumn() >= 5) {
        jsonError(429, 'Demasiados intentos. Espera un momento.');
    }
    $db->prepare('INSERT INTO login_attempts (ip_address) VALUES (?)')->execute([$ip]);

    // Buscar usuario
    $stmt = $db->prepare(
        'SELECT id, branch_id, name, username, email, password, role, station, active FROM users WHERE username = ? LIMIT 1'
    );
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonError(401, 'Credenciales incorrectas');
    }
    if (!$user['active']) jsonError(403, 'Cuenta desactivada');

    // Permite que empleados (meseros, cocina) también inicien sesión por login tradicional.

    issueSession($db, $user, $deviceUid, $deviceType, $deviceName, true);
}

/**
 * Verifica suscripción + dispositivo, emite el JWT y responde. Compartido por
 * login tradicional y login por PIN.
 *
 * @param bool $autoCreateDevice  true en login normal (registra el dispositivo
 *        nuevo); false en PIN (el dispositivo ya debe existir y estar aprobado).
 */
function issueSession(PDO $db, array $user, string $deviceUid, string $deviceType, string $deviceName, bool $autoCreateDevice): never {
    $isSuperAdmin = $user['role'] === 'superadmin';

    if (!$isSuperAdmin) {
        // Verificar suscripción
        $stmt = $db->prepare(
            'SELECT plan, status, expires_at FROM subscriptions
             WHERE branch_id = ? ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$user['branch_id']]);
        $sub = $stmt->fetch();

        // Baja definitiva: bloqueo duro (no puede entrar al sistema).
        if ($sub && $sub['status'] === 'terminated') {
            jsonError(403, 'Tu sucursal fue dada de baja definitivamente. Contacta al equipo de FoodIX.', [
                'error'      => 'subscription_terminated',
                'expires_at' => $sub['expires_at'],
            ]);
        }
        // Resto de estados (suspended, expired, past_due, pending_bank_transfer, etc.):
        // se permite el login para que el admin llegue a "Mi Suscripción" y pueda pagar.
        // El SubscriptionGuard del frontend bloquea/permite según el estado.

        // Verificar dispositivo.
        // Auto-autorización: cualquier dispositivo nuevo se aprueba en su primer
        // login (sin importar el rol), para que el cliente no tenga que aprobar
        // manualmente desde superadmin. El admin/superadmin SÍ puede bloquear
        // después un dispositivo (revoked/rejected); esos bloqueos se respetan.
        if ($deviceUid !== '') {
            $stmt = $db->prepare(
                'SELECT id, status FROM devices WHERE device_uid = ? AND branch_id = ? LIMIT 1'
            );
            $stmt->execute([$deviceUid, $user['branch_id']]);
            $device = $stmt->fetch();

            if (!$device) {
                $validTypes = ['android', 'web', 'tablet', 'desktop'];
                $safeType   = in_array($deviceType, $validTypes, true) ? $deviceType : 'web';
                $safeName   = mb_substr($deviceName ?: 'Dispositivo', 0, 100);

                $db->prepare(
                    'INSERT INTO devices (branch_id, name, device_type, device_uid, status, approved_at)
                     VALUES (?, ?, ?, ?, \'approved\', ?)'
                )->execute([
                    $user['branch_id'], $safeName, $safeType, $deviceUid,
                    date('Y-m-d H:i:s'),
                ]);

                // Nuevo dispositivo: aprobado automáticamente, continúa sin bloqueo.
                $device = ['id' => (int)$db->lastInsertId(), 'status' => 'approved'];
            }

            // Solo se bloquea si un admin/superadmin lo bloqueó explícitamente.
            match ($device['status']) {
                'rejected','revoked' => jsonError(403, 'Dispositivo bloqueado', ['error' => 'device_rejected']),
                default              => null,
            };

            // Un dispositivo que quedó 'pending' (de versiones anteriores) se
            // aprueba automáticamente al volver a iniciar sesión.
            if ($device['status'] === 'pending') {
                $db->prepare('UPDATE devices SET status = \'approved\', approved_at = NOW() WHERE id = ?')
                   ->execute([$device['id']]);
            }

            $db->prepare('UPDATE devices SET last_seen_at = NOW() WHERE id = ?')
               ->execute([$device['id']]);
        }
    }

    // Datos de suscripción y de la sucursal (logo/nombre) para la respuesta
    $subscription = buildSubscriptionData($db, (int)$user['branch_id'], $isSuperAdmin);
    $branch       = buildBranchData($db, $user['branch_id'] ? (int)$user['branch_id'] : null);

    // JWT 24h
    $now     = time();
    $payload = [
        'sub'       => $user['id'],
        'username'  => $user['username'],
        'role'      => $user['role'],
        'branch_id' => $user['branch_id'],
        'iat'       => $now,
        'exp'       => $now + 86400,
    ];
    $token = jwtEncode($payload, JWT_SECRET);

    jsonResponse([
        'token' => $token,
        'user'  => [
            'id'        => (int)$user['id'],
            'name'      => $user['name'],
            'username'  => $user['username'],
            'role'      => $user['role'],
            'station'   => $user['station'] ?? null,
            'branch_id' => $user['branch_id'] ? (int)$user['branch_id'] : null,
        ],
        'subscription' => $subscription,
        'branch'       => $branch,
    ]);
}

// ── GET /auth/pin-users?branch_id= ──────────────────────────────────────────
// Lista de usuarios con PIN para el teclado. Solo desde un dispositivo aprobado
// de la sucursal (evita enumeración pública de usuarios).

function handlePinUsers(): never {
    $db        = Database::connect();
    $branchId  = (int)($_GET['branch_id'] ?? 0);
    $deviceUid = trim((string)($_SERVER['HTTP_X_DEVICE_UID'] ?? ($_GET['device_uid'] ?? '')));
    if (!$branchId) jsonError(422, 'branch_id requerido');

    $stmt = $db->prepare("SELECT status FROM devices WHERE device_uid = ? AND branch_id = ? LIMIT 1");
    $stmt->execute([$deviceUid, $branchId]);
    $dev = $stmt->fetch();
    if (!$dev || $dev['status'] !== 'approved') {
        jsonError(403, 'Dispositivo no autorizado', ['error' => 'device_pending']);
    }

    $stmt = $db->prepare(
        "SELECT id, name, role FROM users
         WHERE branch_id = ? AND active = 1 AND pin_hash IS NOT NULL
         ORDER BY name ASC"
    );
    $stmt->execute([$branchId]);
    jsonResponse(array_map(fn($u) => [
        'id'   => (int)$u['id'],
        'name' => $u['name'],
        'role' => $u['role'],
    ], $stmt->fetchAll()));
}

// ── POST /auth/pin-login ────────────────────────────────────────────────────

function handlePinLogin(): never {
    $body       = getBody();
    $db         = Database::connect();
    $branchId   = (int)($body['branch_id'] ?? 0);
    $userId     = (int)($body['user_id']   ?? 0);
    $pin        = trim((string)($body['pin'] ?? ''));
    $deviceUid  = trim((string)($body['device_uid']  ?? ($_SERVER['HTTP_X_DEVICE_UID'] ?? '')));
    $deviceType =       (string)($body['device_type'] ?? 'web');
    $deviceName = trim((string)($body['device_name'] ?? 'Dispositivo'));

    if (!$branchId || !$userId || $pin === '') jsonError(422, 'branch_id, user_id y pin requeridos');
    if (!preg_match('/^\d{4,6}$/', $pin)) jsonError(422, 'El PIN debe tener de 4 a 6 dígitos');

    $stmt = $db->prepare(
        'SELECT id, branch_id, name, username, email, role, station, active, pin_hash, pin_attempts, pin_locked_until
         FROM users WHERE id = ? AND branch_id = ? LIMIT 1'
    );
    $stmt->execute([$userId, $branchId]);
    $user = $stmt->fetch();

    if (!$user || !$user['pin_hash']) jsonError(401, 'Usuario o PIN incorrecto');
    if (!$user['active']) jsonError(403, 'Cuenta desactivada');

    // Bloqueo temporal por intentos fallidos.
    if ($user['pin_locked_until'] && strtotime((string)$user['pin_locked_until']) > time()) {
        jsonError(429, 'Demasiados intentos. Intenta de nuevo en unos minutos.', ['error' => 'pin_locked']);
    }

    if (!password_verify($pin, $user['pin_hash'])) {
        $attempts = (int)$user['pin_attempts'] + 1;
        if ($attempts >= 5) {
            $db->prepare("UPDATE users SET pin_attempts = 0, pin_locked_until = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?")
               ->execute([$userId]);
            jsonError(429, 'Demasiados intentos. PIN bloqueado 5 minutos.', ['error' => 'pin_locked']);
        }
        $db->prepare('UPDATE users SET pin_attempts = ? WHERE id = ?')->execute([$attempts, $userId]);
        jsonError(401, 'PIN incorrecto', ['attempts_left' => 5 - $attempts]);
    }

    // Éxito: limpiar contador/bloqueo y emitir sesión.
    $db->prepare('UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?')->execute([$userId]);
    issueSession($db, $user, $deviceUid, $deviceType, $deviceName, false);
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

function handleMe(): never {
    $payload = requireAuth();
    $db      = Database::connect();

    $stmt = $db->prepare(
        'SELECT id, branch_id, name, username, email, role, station FROM users WHERE id = ? AND active = 1'
    );
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();
    if (!$user) jsonError(401, 'Usuario no encontrado');

    $subscription = buildSubscriptionData($db, (int)$user['branch_id'], $user['role'] === 'superadmin');
    $branch       = buildBranchData($db, $user['branch_id'] ? (int)$user['branch_id'] : null);

    jsonResponse([
        'user' => [
            'id'        => (int)$user['id'],
            'name'      => $user['name'],
            'email'     => $user['email'],
            'username'  => $user['username'],
            'role'      => $user['role'],
            'station'   => $user['station'] ?? null,
            'branch_id' => $user['branch_id'] ? (int)$user['branch_id'] : null,
        ],
        'subscription' => $subscription,
        'branch'       => $branch,
    ]);
}

// ── PATCH /auth/me ───────────────────────────────────────────────────────────

function handleUpdateMe(): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $body    = getBody();

    $name  = trim((string)($body['name'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));

    if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
        jsonError(422, 'El nombre debe tener entre 2 y 100 caracteres');
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError(422, 'Email inválido');
    }

    if ($email !== '') {
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $stmt->execute([$email, (int)$payload['sub']]);
        if ($stmt->fetch()) {
            jsonError(409, 'Ese email ya está en uso por otro usuario');
        }
    }

    $db->prepare('UPDATE users SET name = ?, email = ? WHERE id = ? AND active = 1')
       ->execute([$name, $email ?: null, (int)$payload['sub']]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, name, username, email, role, station FROM users WHERE id = ? AND active = 1'
    );
    $stmt->execute([(int)$payload['sub']]);
    $user = $stmt->fetch();
    if (!$user) jsonError(401, 'Usuario no encontrado');

    jsonResponse([
        'user' => [
            'id'        => (int)$user['id'],
            'name'      => $user['name'],
            'email'     => $user['email'],
            'username'  => $user['username'],
            'role'      => $user['role'],
            'station'   => $user['station'] ?? null,
            'branch_id' => $user['branch_id'] ? (int)$user['branch_id'] : null,
        ],
    ]);
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

function handleLogout(): never {
    $token = tokenFromHeader();
    if ($token) {
        $parts = explode('.', $token);
        $exp   = 0;
        if (count($parts) === 3) {
            $p   = json_decode(base64url_decode($parts[1]), true);
            $exp = (int)($p['exp'] ?? 0);
        }

        $db   = Database::connect();
        $hash = hash('sha256', $token);
        try {
            $db->prepare(
                'INSERT IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?, FROM_UNIXTIME(?))'
            )->execute([$hash, $exp ?: time() + 86400]);
        } catch (PDOException) { /* ignorar duplicados */ }
    }
    jsonResponse(['success' => true]);
}

// ── Helper ────────────────────────────────────────────────────────────────────

// Datos de marca de la sucursal (logo y nombre) para mostrarlos en la app
// (sidebar, topbar y pantallas de cocina). Null para superadmin / sin sucursal.
function buildBranchData(PDO $db, ?int $branchId): ?array {
    if (!$branchId) return null;

    $stmt = $db->prepare('SELECT id, name, slug, logo_url FROM branches WHERE id = ?');
    $stmt->execute([$branchId]);
    $b = $stmt->fetch();
    if (!$b) return null;

    return [
        'id'       => (int)$b['id'],
        'name'     => $b['name'],
        'slug'     => $b['slug'],
        'logo_url' => $b['logo_url'] ?: null,
    ];
}

function buildSubscriptionData(PDO $db, ?int $branchId, bool $isSuperAdmin): ?array {
    if ($isSuperAdmin || !$branchId) return null;

    $stmt = $db->prepare(
        'SELECT s.plan, s.status, s.starts_at, s.expires_at, s.max_devices,
                s.price_monthly, s.currency, s.payment_method, s.last_payment_at,
                s.cancel_at_period_end, s.trial_started_at, s.trial_ends_at, s.trial_days,
                DATEDIFF(DATE(s.expires_at), CURDATE()) AS days_remaining,
                (SELECT COUNT(*) FROM devices d
                 WHERE d.branch_id = s.branch_id AND d.status = \'approved\') AS active_devices_count
         FROM subscriptions s WHERE s.branch_id = ? ORDER BY s.id DESC LIMIT 1'
    );
    $stmt->execute([$branchId]);
    $row = $stmt->fetch();
    if (!$row) return null;

    // Estado efectivo: si el periodo ya venció por fecha, reportar 'expired'
    // aunque la columna `status` no se haya actualizado todavía (el cron lo hace
    // a diario). Así el SubscriptionGuard bloquea de inmediato.
    require_once __DIR__ . '/../config/subscription_helpers.php';

    // Estado del trial calculado en el servidor y entregado junto con la sesión:
    // el front NUNCA lo recalcula ni lo consulta aparte (ver TrialBanner).
    $status  = effectiveSubscriptionStatus($row) ?? $row['status'];
    $isTrial = $row['plan'] === 'trial';

    return [
        'is_trial'         => $isTrial,
        'trial_status'     => $isTrial ? ($status === 'trial' ? 'trialing' : 'trial_expired') : 'not_trial',
        'trial_started_at' => $row['trial_started_at'],
        'trial_ends_at'    => $row['trial_ends_at'],
        'trial_days'       => (int)($row['trial_days'] ?? 14),
        'days_remaining'   => $row['days_remaining'] !== null ? (int)$row['days_remaining'] : null,
        'plan'                 => $row['plan'],
        'status'               => $status,
        'starts_at'            => $row['starts_at'],
        'expires_at'           => $row['expires_at'],
        'max_devices'          => (int)$row['max_devices'],
        'active_devices_count' => (int)$row['active_devices_count'],
        'price_monthly'        => (float)$row['price_monthly'],
        'currency'             => $row['currency'],
        'payment_method'       => $row['payment_method'],
        'last_payment_at'      => $row['last_payment_at'],
        'cancel_at_period_end' => (bool)$row['cancel_at_period_end'],
    ];
}

function handleCheckPin(): never {
    $body = getBody();
    $db = Database::connect();
    $identity = trim((string)($body['identity'] ?? ''));

    if ($identity === '') {
        jsonError(422, 'Identidad (usuario/correo/teléfono) requerida');
    }

    $stmt = $db->prepare(
        'SELECT u.id, u.branch_id, u.name, u.username, u.email, u.pin_hash, u.role, b.logo_url, b.name AS branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE (u.username = ? OR u.email = ?) AND u.active = 1 LIMIT 1'
    );
    $stmt->execute([$identity, $identity]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse([
            'exists' => false,
            'has_pin' => false,
            'logo_url' => null,
            'branch_name' => null,
        ]);
    }

    jsonResponse([
        'exists' => true,
        'has_pin' => !empty($user['pin_hash']),
        'user_id' => (int)$user['id'],
        'branch_id' => $user['branch_id'] ? (int)$user['branch_id'] : null,
        'name' => $user['name'],
        'role' => $user['role'],
        'logo_url' => $user['logo_url'] ?: null,
        'branch_name' => $user['branch_name'] ?: null,
    ]);
}
