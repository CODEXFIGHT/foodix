<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Registro, aprobación y revocación de dispositivos.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';

function handleDevices(array $seg, string $method): never {
    $db = Database::connect();

    // POST /devices/register — público (no requiere auth)
    if (($seg[1] ?? '') === 'register' && $method === 'POST') {
        handleRegisterDevice($db);
    }

    // GET /devices/gate?device_uid=XXX — público. La app Android consulta aquí
    // si puede operar (dispositivo aprobado + suscripción vigente). También
    // actualiza last_seen_at (heartbeat). No expone datos sensibles.
    if (($seg[1] ?? '') === 'gate' && $method === 'GET') {
        handleDeviceGate($db);
    }

    // Rutas protegidas
    $payload  = requireAuth();
    $deviceId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2     = $seg[2] ?? '';

    // PATCH /devices/{id}/approve
    if ($deviceId && $sub2 === 'approve' && $method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        handleApproveDevice($db, $deviceId, $payload);
    }

    // PATCH /devices/{id} — renombrar / asignar usuario / rol
    if ($deviceId && $sub2 === '' && $method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        handleUpdateDevice($db, $deviceId, $payload);
    }

    // PATCH /devices/{id}/disable — el admin desactiva el dispositivo (= revoked)
    if ($deviceId && $sub2 === 'disable' && $method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        handleSetDeviceStatus($db, $deviceId, $payload, 'revoked');
    }

    // PATCH /devices/{id}/enable — el admin reactiva el dispositivo (= approved)
    if ($deviceId && $sub2 === 'enable' && $method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        handleSetDeviceStatus($db, $deviceId, $payload, 'approved');
    }

    // GET /devices
    if (!$deviceId && $method === 'GET') {
        requireRole($payload, 'admin', 'superadmin');
        handleListDevices($db, $payload);
    }

    // DELETE /devices/{id} — superadmin (cualquiera) o admin (solo su sucursal)
    if ($deviceId && $method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');

        if ($payload['role'] === 'admin') {
            $stmt = $db->prepare('SELECT branch_id FROM devices WHERE id = ?');
            $stmt->execute([$deviceId]);
            $dev = $stmt->fetch();
            if (!$dev) jsonError(404, 'Dispositivo no encontrado');
            if ((int)$dev['branch_id'] !== (int)$payload['branch_id']) {
                jsonError(403, 'Sin acceso a este dispositivo');
            }
        }

        $db->prepare('DELETE FROM devices WHERE id = ?')->execute([$deviceId]);
        jsonResponse(['success' => true]);
    }

    jsonError(404, 'Ruta no encontrada');
}

function handleRegisterDevice(PDO $db): never {
    $body      = getBody();
    $branchId  = (int)($body['branch_id']   ?? 0);
    $deviceUid = trim((string)($body['device_uid']  ?? ''));
    $name      = trim((string)($body['device_name'] ?? 'Dispositivo'));
    $type      = (string)($body['device_type'] ?? 'web');

    if (!$branchId || !$deviceUid) jsonError(422, 'branch_id y device_uid son requeridos');

    $validTypes = ['android', 'web', 'tablet', 'desktop'];
    $safeType   = in_array($type, $validTypes, true) ? $type : 'web';
    $safeName   = mb_substr($name ?: 'Dispositivo', 0, 100);

    $stmt = $db->prepare('SELECT id, status FROM devices WHERE device_uid = ? AND branch_id = ? LIMIT 1');
    $stmt->execute([$deviceUid, $branchId]);
    $device = $stmt->fetch();

    if ($device) {
        jsonResponse(['status' => $device['status'], 'device_id' => (int)$device['id']]);
    }

    $db->prepare(
        'INSERT INTO devices (branch_id, name, device_type, device_uid, status) VALUES (?, ?, ?, ?, \'pending\')'
    )->execute([$branchId, $safeName, $safeType, $deviceUid]);

    jsonResponse(['status' => 'pending', 'device_id' => (int)$db->lastInsertId()], 201);
}

function handleUpdateDevice(PDO $db, int $deviceId, array $payload): never {
    $body = getBody();

    $stmt = $db->prepare('SELECT id, branch_id, name, assigned_user_id, device_role FROM devices WHERE id = ?');
    $stmt->execute([$deviceId]);
    $device = $stmt->fetch();
    if (!$device) jsonError(404, 'Dispositivo no encontrado');

    if ($payload['role'] === 'admin' && (int)$device['branch_id'] !== (int)$payload['branch_id']) {
        jsonError(403, 'Sin acceso a este dispositivo');
    }

    $set = []; $params = [];
    if (array_key_exists('name', $body)) {
        $name = mb_substr(trim((string)$body['name']), 0, 100);
        if ($name === '') jsonError(422, 'El nombre no puede estar vacío');
        $set[] = 'name = ?'; $params[] = $name;
    }
    if (array_key_exists('assigned_user_id', $body)) {
        $uid = is_numeric($body['assigned_user_id']) ? (int)$body['assigned_user_id'] : null;
        if ($uid !== null) {
            // Validar que el usuario pertenezca a la misma sucursal.
            $u = $db->prepare('SELECT id FROM users WHERE id = ? AND (branch_id = ? OR ? = 0)');
            $u->execute([$uid, (int)$device['branch_id'], $payload['role'] === 'superadmin' ? 0 : 1]);
            if (!$u->fetch()) jsonError(422, 'Usuario inválido para esta sucursal');
        }
        $set[] = 'assigned_user_id = ?'; $params[] = $uid;
    }
    if (array_key_exists('device_role', $body)) {
        $role = mb_substr(trim((string)$body['device_role']), 0, 30) ?: null;
        $set[] = 'device_role = ?'; $params[] = $role;
    }
    if (!$set) jsonError(422, 'Sin campos para actualizar');
    $params[] = $deviceId;

    $db->prepare('UPDATE devices SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
    logAudit($db, $payload, 'device.renamed', 'device', $deviceId,
        ['name' => $device['name']], $body);

    $stmt = $db->prepare(
        'SELECT d.id, d.branch_id, d.name, d.assigned_user_id, d.device_role, d.device_type,
                d.device_uid, d.status, d.last_seen_at, d.approved_by, d.approved_at, d.created_at,
                u.name AS assigned_user_name
         FROM devices d LEFT JOIN users u ON u.id = d.assigned_user_id WHERE d.id = ?'
    );
    $stmt->execute([$deviceId]);
    jsonResponse($stmt->fetch());
}

function handleListDevices(PDO $db, array $payload): never {
    $branchId = intParam('branch_id');

    if ($payload['role'] === 'admin') {
        $branchId = (int)$payload['branch_id'];
    }

    if ($branchId) {
        $stmt = $db->prepare(
            'SELECT d.id, d.branch_id, d.name, d.assigned_user_id, d.device_role, d.device_type, d.device_uid,
                    d.status, d.last_seen_at, d.approved_by, d.approved_at, d.created_at,
                    b.name AS branch_name, b.logo_url AS branch_logo_url,
                    u.name AS assigned_user_name
             FROM devices d
             LEFT JOIN branches b ON b.id = d.branch_id
             LEFT JOIN users u ON u.id = d.assigned_user_id
             WHERE d.branch_id = ? ORDER BY d.created_at DESC'
        );
        $stmt->execute([$branchId]);
    } else {
        $stmt = $db->query(
            'SELECT d.id, d.branch_id, d.name, d.assigned_user_id, d.device_role, d.device_type, d.device_uid,
                    d.status, d.last_seen_at, d.approved_by, d.approved_at, d.created_at,
                    b.name AS branch_name, b.logo_url AS branch_logo_url,
                    u.name AS assigned_user_name
             FROM devices d
             LEFT JOIN branches b ON b.id = d.branch_id
             LEFT JOIN users u ON u.id = d.assigned_user_id
             ORDER BY d.created_at DESC'
        );
    }

    jsonResponse($stmt->fetchAll());
}

/**
 * Gate público para la app Android: dado un device_uid, indica si puede operar.
 * Combina estado del dispositivo + suscripción de su sucursal. Heartbeat incluido.
 */
function handleDeviceGate(PDO $db): never {
    $deviceUid = trim((string)($_GET['device_uid'] ?? ''));
    if ($deviceUid === '') jsonError(422, 'device_uid es requerido');

    $stmt = $db->prepare(
        'SELECT d.id, d.branch_id, d.name, d.device_type, d.device_uid, d.status,
                b.name AS branch_name, b.active AS branch_active
         FROM devices d
         LEFT JOIN branches b ON b.id = d.branch_id
         WHERE d.device_uid = ? LIMIT 1'
    );
    $stmt->execute([$deviceUid]);
    $device = $stmt->fetch();

    // Dispositivo no registrado aún.
    if (!$device) {
        jsonResponse([
            'allowed'      => false,
            'reason'       => 'device_not_registered',
            'device'       => null,
            'subscription' => null,
        ]);
    }

    // Heartbeat: marca el último acceso.
    $db->prepare('UPDATE devices SET last_seen_at = NOW() WHERE id = ?')
       ->execute([(int)$device['id']]);

    $branchId   = (int)$device['branch_id'];
    $sub        = latestSubscription($db, $branchId);
    $subState   = subscriptionOperable($sub);
    $deviceOk   = $device['status'] === 'approved';
    $branchOk   = $device['branch_active'] === null || (int)$device['branch_active'] === 1;

    // Determina el motivo de bloqueo (orden de prioridad).
    $reason = null;
    if (!$branchOk)            $reason = 'branch_inactive';
    elseif (!$deviceOk)        $reason = 'device_' . $device['status']; // device_pending / device_revoked ...
    elseif (!$subState['active']) $reason = $subState['reason'];

    $allowed = $branchOk && $deviceOk && $subState['active'];

    jsonResponse([
        'allowed' => $allowed,
        'reason'  => $reason,
        'device'  => [
            'device_id'   => (int)$device['id'],
            'device_uid'  => $device['device_uid'],
            'name'        => $device['name'],
            'device_type' => $device['device_type'],
            'status'      => $device['status'],
            'active'      => $deviceOk,
            'blocked'     => $device['status'] === 'revoked' || $device['status'] === 'rejected',
            'branch_id'   => $branchId,
            'branch_name' => $device['branch_name'],
        ],
        'subscription' => $sub ? [
            'active'         => $subState['active'],
            'status'         => $sub['status'],
            'plan'           => $sub['plan'],
            'expires_at'     => $sub['expires_at'],
            'business_status'=> $branchOk ? 'active' : 'inactive',
            'payment_status' => in_array($sub['status'], ['active', 'trial'], true) ? 'paid' : $sub['status'],
        ] : null,
    ]);
}

/**
 * Fija el estado de un dispositivo a un valor concreto (disable→revoked,
 * enable→approved) respetando los permisos de sucursal del admin.
 */
function handleSetDeviceStatus(PDO $db, int $deviceId, array $payload, string $newStatus): never {
    $stmt = $db->prepare('SELECT id, branch_id, status FROM devices WHERE id = ?');
    $stmt->execute([$deviceId]);
    $device = $stmt->fetch();
    if (!$device) jsonError(404, 'Dispositivo no encontrado');

    if ($payload['role'] === 'admin' && (int)$device['branch_id'] !== (int)$payload['branch_id']) {
        jsonError(403, 'Sin acceso a este dispositivo');
    }

    $approvedBy = $newStatus === 'approved' ? (int)$payload['sub'] : null;
    $approvedAt = $newStatus === 'approved' ? date('Y-m-d H:i:s') : null;

    $db->prepare('UPDATE devices SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?')
       ->execute([$newStatus, $approvedBy, $approvedAt, $deviceId]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, name, device_type, device_uid, status, last_seen_at, approved_by, approved_at, created_at FROM devices WHERE id = ?'
    );
    $stmt->execute([$deviceId]);
    jsonResponse($stmt->fetch());
}

function handleApproveDevice(PDO $db, int $deviceId, array $payload): never {
    $body      = getBody();
    $newStatus = (string)($body['status'] ?? '');
    $allowed   = ['approved', 'rejected', 'revoked'];

    if (!in_array($newStatus, $allowed, true)) {
        jsonError(422, 'Estado inválido. Use: approved, rejected, revoked');
    }

    $stmt = $db->prepare('SELECT id, branch_id FROM devices WHERE id = ?');
    $stmt->execute([$deviceId]);
    $device = $stmt->fetch();
    if (!$device) jsonError(404, 'Dispositivo no encontrado');

    // Admin solo puede gestionar dispositivos de su sucursal
    if ($payload['role'] === 'admin' && (int)$device['branch_id'] !== (int)$payload['branch_id']) {
        jsonError(403, 'Sin acceso a este dispositivo');
    }

    // Límite del plan: el admin no puede aprobar más dispositivos de los que
    // permite su suscripción. El superadmin puede sobrepasarlo (controla el plan).
    if ($newStatus === 'approved' && $payload['role'] === 'admin' && $device['status'] !== 'approved') {
        $sub = latestSubscription($db, (int)$device['branch_id']);
        $maxDevices = $sub && $sub['max_devices'] !== null ? (int)$sub['max_devices'] : null;
        if ($maxDevices !== null) {
            $cnt = $db->prepare("SELECT COUNT(*) FROM devices WHERE branch_id = ? AND status = 'approved'");
            $cnt->execute([(int)$device['branch_id']]);
            $activeCount = (int)$cnt->fetchColumn();
            if ($activeCount >= $maxDevices) {
                jsonError(409, "Límite de dispositivos alcanzado ($maxDevices de tu plan). Revoca uno antes de aprobar otro o contacta a soporte para ampliar tu plan.");
            }
        }
    }

    $approvedBy  = $newStatus === 'approved' ? (int)$payload['sub'] : null;
    $approvedAt  = $newStatus === 'approved' ? date('Y-m-d H:i:s') : null;

    $db->prepare(
        'UPDATE devices SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?'
    )->execute([$newStatus, $approvedBy, $approvedAt, $deviceId]);

    $stmt = $db->prepare(
        'SELECT id, branch_id, name, device_type, device_uid, status, last_seen_at, approved_by, approved_at, created_at FROM devices WHERE id = ?'
    );
    $stmt->execute([$deviceId]);
    jsonResponse($stmt->fetch());
}
