<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Monitoreo de dispositivos conectados en tiempo real (heartbeat, periféricos,
 * eventos). Independiente de routes/devices.php (registro/aprobación de accesos).
 *
 * Ruta base: /device-monitor
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// ── Umbrales (deben coincidir con lib/devices/constants.ts) ───────────────────
const DM_IDLE_AFTER_SECONDS    = 60;   // sin actividad → idle
const DM_OFFLINE_AFTER_SECONDS = 120;  // sin heartbeat → offline
const DM_EVENTS_PER_DEVICE_MAX = 50;   // historial máximo por dispositivo

const DM_DEVICE_TYPES = [
    'kiosk', 'waiter_tablet', 'kitchen_screen', 'cash_register', 'barcode_scanner',
    'thermal_printer', 'pos_terminal', 'pos_8360', 'admin_computer', 'mobile', 'unknown',
];
const DM_MODULES = ['superadmin', 'admin', 'kiosk', 'waiter', 'kitchen', 'pos', 'unknown'];

function handleDeviceMonitor(array $seg, string $method): never {
    $db = Database::connect();

    $sub1 = $seg[1] ?? '';

    // POST /device-monitor/heartbeat — registra o actualiza un dispositivo vivo.
    // Acepta auth (deriva sucursal/usuario del token) o, para kioskos sin sesión,
    // branch_id + unique_device_id en el cuerpo.
    if ($sub1 === 'heartbeat' && $method === 'POST') {
        dmHeartbeat($db);
    }

    // POST /device-monitor/peripheral — alta manual de periférico (admin/superadmin).
    if ($sub1 === 'peripheral' && $method === 'POST') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmRegisterPeripheral($db, $payload);
    }

    // Rutas con id numérico
    $deviceId = is_numeric($sub1) ? (int)$sub1 : null;
    $sub2     = $seg[2] ?? '';

    // GET /device-monitor/{id}/events
    if ($deviceId && $sub2 === 'events' && $method === 'GET') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmListEvents($db, $deviceId, $payload);
    }

    // POST /device-monitor/{id}/events
    if ($deviceId && $sub2 === 'events' && $method === 'POST') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmCreateEvent($db, $deviceId, $payload);
    }

    // PATCH /device-monitor/{id}/status
    if ($deviceId && $sub2 === 'status' && $method === 'PATCH') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmSetStatus($db, $deviceId, $payload);
    }

    // PATCH /device-monitor/{id} — renombrar / cambiar tipo / notas
    if ($deviceId && $sub2 === '' && $method === 'PATCH') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmUpdate($db, $deviceId, $payload);
    }

    // DELETE /device-monitor/{id}
    if ($deviceId && $method === 'DELETE') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmDelete($db, $deviceId, $payload);
    }

    // GET /device-monitor — lista (superadmin: todas; admin: su sucursal)
    if (!$deviceId && $sub1 === '' && $method === 'GET') {
        $payload = requireAuth();
        requireRole($payload, 'admin', 'superadmin');
        dmList($db, $payload);
    }

    jsonError(404, 'Ruta no encontrada');
}

// ── Helpers de dominio ────────────────────────────────────────────────────────

/** Deriva el estado efectivo a partir de timestamps + estado persistido. */
function dmEffectiveStatus(array $d): string {
    // Periféricos manuales: el estado lo gobierna el operador.
    if ((int)$d['is_peripheral'] === 1) {
        return $d['status'] ?: 'unknown';
    }
    $hb = $d['last_heartbeat_at'] ? strtotime((string)$d['last_heartbeat_at']) : null;
    if ($hb === null) return 'unknown';

    $now = time();
    $hbAge = $now - $hb;

    // Sin heartbeat dentro de la ventana → offline (gana sobre cualquier otro).
    if ($hbAge > DM_OFFLINE_AFTER_SECONDS) return 'offline';

    // Error reportado y aún "vivo" → se mantiene como error.
    if ($d['status'] === 'error') return 'error';

    $act = $d['last_activity_at'] ? strtotime((string)$d['last_activity_at']) : $hb;
    if (($now - $act) > DM_IDLE_AFTER_SECONDS) return 'idle';

    return 'online';
}

/** Normaliza una fila de BD a la forma de respuesta de la API. */
function dmShape(array $d): array {
    $d['status']          = dmEffectiveStatus($d);
    $d['is_peripheral']   = (int)$d['is_peripheral'] === 1;
    $d['branch_id']       = (int)$d['branch_id'];
    $d['id']              = (int)$d['id'];
    $d['parent_device_id']= $d['parent_device_id'] !== null ? (int)$d['parent_device_id'] : null;
    $d['user_id']         = $d['user_id'] !== null ? (int)$d['user_id'] : null;
    if (isset($d['metadata']) && is_string($d['metadata'])) {
        $d['metadata'] = json_decode($d['metadata'], true) ?: null;
    }
    return $d;
}

const DM_SELECT =
    'SELECT cd.id, cd.branch_id, cd.unique_device_id, cd.name, cd.type, cd.status,
            cd.module, cd.is_peripheral, cd.parent_device_id, cd.model, cd.serial_number,
            cd.notes, cd.ip_address, cd.user_agent, cd.os, cd.browser, cd.app_version,
            cd.kiosk_version, cd.user_id, cd.user_name, cd.role, cd.metadata,
            cd.last_heartbeat_at, cd.last_activity_at, cd.connected_at, cd.disconnected_at,
            cd.created_at, b.name AS branch_name, b.logo_url AS branch_logo_url
     FROM connected_devices cd
     LEFT JOIN branches b ON b.id = cd.branch_id';

/** Inserta un evento y poda el historial a los últimos N por dispositivo. */
function dmLogEvent(PDO $db, int $deviceId, int $branchId, string $type, string $message, ?array $metadata = null): void {
    try {
        $db->prepare(
            'INSERT INTO device_events (device_id, branch_id, type, message, metadata) VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $deviceId, $branchId, $type, mb_substr($message, 0, 255),
            $metadata !== null ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null,
        ]);

        // Poda: conserva solo los DM_EVENTS_PER_DEVICE_MAX más recientes.
        $db->prepare(
            'DELETE FROM device_events
             WHERE device_id = ? AND id NOT IN (
               SELECT id FROM (
                 SELECT id FROM device_events WHERE device_id = ? ORDER BY id DESC LIMIT ?
               ) keep
             )'
        )->execute([$deviceId, $deviceId, DM_EVENTS_PER_DEVICE_MAX]);
    } catch (Throwable $e) {
        error_log('[device_monitor] event: ' . $e->getMessage());
    }
}

/** Verifica que el dispositivo exista y que el admin solo toque su sucursal. */
function dmFindOwned(PDO $db, int $deviceId, array $payload): array {
    $stmt = $db->prepare('SELECT id, branch_id, name, type, status, is_peripheral FROM connected_devices WHERE id = ?');
    $stmt->execute([$deviceId]);
    $device = $stmt->fetch();
    if (!$device) jsonError(404, 'Dispositivo no encontrado');
    if ($payload['role'] === 'admin' && (int)$device['branch_id'] !== (int)($payload['branch_id'] ?? 0)) {
        jsonError(403, 'Sin acceso a este dispositivo');
    }
    return $device;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

function dmHeartbeat(PDO $db): never {
    $body = getBody();

    // Identidad: por token si existe; si no, por branch_id del cuerpo (kiosko).
    $payload = null;
    $token   = tokenFromHeader();
    if ($token) {
        $decoded = jwtDecode($token, JWT_SECRET);
        if ($decoded) $payload = $decoded;
    }

    $uid = trim((string)($body['unique_device_id'] ?? ''));
    if ($uid === '') jsonError(422, 'unique_device_id es requerido');

    $branchId = $payload['branch_id'] ?? null
        ? (int)$payload['branch_id']
        : (int)($body['branch_id'] ?? 0);
    if (!$branchId) jsonError(422, 'branch_id es requerido');

    $type   = in_array(($body['type'] ?? ''), DM_DEVICE_TYPES, true) ? $body['type'] : 'unknown';
    $module = in_array(($body['module'] ?? ''), DM_MODULES, true) ? $body['module'] : 'unknown';
    $name   = mb_substr(trim((string)($body['name'] ?? 'Dispositivo')) ?: 'Dispositivo', 0, 100);
    // Estado reportado por el cliente: solo 'error' o vacío (el resto se deriva).
    $reportedError = ($body['status'] ?? '') === 'error';
    $hadActivity   = !empty($body['activity']);

    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if ($ip) $ip = mb_substr(trim(explode(',', (string)$ip)[0]), 0, 64);

    $userId   = $payload['sub'] ?? null ? (int)$payload['sub'] : ($body['user_id'] ?? null);
    $userName = $payload['name'] ?? ($body['user_name'] ?? null);
    $role     = $payload['role'] ?? ($body['role'] ?? null);

    $stmt = $db->prepare('SELECT id, status, last_heartbeat_at FROM connected_devices WHERE unique_device_id = ? AND branch_id = ? LIMIT 1');
    $stmt->execute([$uid, $branchId]);
    $existing = $stmt->fetch();

    $newStatus = $reportedError ? 'error' : 'online';

    if ($existing) {
        $deviceId = (int)$existing['id'];
        $db->prepare(
            'UPDATE connected_devices SET
               name = ?, type = ?, module = ?, status = ?,
               ip_address = COALESCE(?, ip_address),
               user_agent = COALESCE(?, user_agent), os = COALESCE(?, os), browser = COALESCE(?, browser),
               app_version = COALESCE(?, app_version), kiosk_version = COALESCE(?, kiosk_version),
               user_id = ?, user_name = ?, role = ?,
               last_heartbeat_at = NOW(),
               last_activity_at = CASE WHEN ? THEN NOW() ELSE COALESCE(last_activity_at, NOW()) END,
               disconnected_at = NULL
             WHERE id = ?'
        )->execute([
            $name, $type, $module, $newStatus,
            $ip,
            $body['user_agent'] ?? null, $body['os'] ?? null, $body['browser'] ?? null,
            $body['app_version'] ?? null, $body['kiosk_version'] ?? null,
            $userId !== null ? (int)$userId : null, $userName, $role,
            $hadActivity ? 1 : 0,
            $deviceId,
        ]);

        // Reconexión: estaba offline y vuelve.
        $prevHb = $existing['last_heartbeat_at'] ? strtotime((string)$existing['last_heartbeat_at']) : 0;
        if ($prevHb && (time() - $prevHb) > DM_OFFLINE_AFTER_SECONDS) {
            dmLogEvent($db, $deviceId, $branchId, 'device_connected', "$name volvió a conectarse");
        }
        if ($reportedError) {
            dmLogEvent($db, $deviceId, $branchId, 'device_error', "$name reportó un error", $body['error'] ?? null);
        }
    } else {
        $db->prepare(
            'INSERT INTO connected_devices
               (branch_id, unique_device_id, name, type, status, module, ip_address,
                user_agent, os, browser, app_version, kiosk_version, user_id, user_name, role,
                last_heartbeat_at, last_activity_at, connected_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())'
        )->execute([
            $branchId, $uid, $name, $type, $newStatus, $module, $ip,
            $body['user_agent'] ?? null, $body['os'] ?? null, $body['browser'] ?? null,
            $body['app_version'] ?? null, $body['kiosk_version'] ?? null,
            $userId !== null ? (int)$userId : null, $userName, $role,
        ]);
        $deviceId = (int)$db->lastInsertId();
        dmLogEvent($db, $deviceId, $branchId, 'device_connected', "$name se conectó");
    }

    jsonResponse(['ok' => true, 'device_id' => $deviceId, 'status' => $newStatus]);
}

function dmList(PDO $db, array $payload): never {
    $branchId = intParam('branch_id');
    if ($payload['role'] === 'admin') {
        $branchId = (int)($payload['branch_id'] ?? 0);
    }

    if ($branchId) {
        $stmt = $db->prepare(DM_SELECT . ' WHERE cd.branch_id = ? ORDER BY cd.last_heartbeat_at DESC, cd.id DESC');
        $stmt->execute([$branchId]);
    } else {
        $stmt = $db->query(DM_SELECT . ' ORDER BY cd.last_heartbeat_at DESC, cd.id DESC');
    }

    jsonResponse(array_map('dmShape', $stmt->fetchAll()));
}

function dmRegisterPeripheral(PDO $db, array $payload): never {
    $body = getBody();

    $branchId = $payload['role'] === 'admin'
        ? (int)($payload['branch_id'] ?? 0)
        : (int)($body['branch_id'] ?? 0);
    if (!$branchId) jsonError(422, 'branch_id es requerido');

    $name = mb_substr(trim((string)($body['name'] ?? '')), 0, 100);
    if ($name === '') jsonError(422, 'El nombre del periférico es requerido');

    $type   = in_array(($body['type'] ?? ''), DM_DEVICE_TYPES, true) ? $body['type'] : 'unknown';
    $status = in_array(($body['status'] ?? ''), ['online', 'offline', 'error', 'in_test', 'unknown'], true)
        ? $body['status'] : 'unknown';
    $parentId = is_numeric($body['parent_device_id'] ?? null) ? (int)$body['parent_device_id'] : null;

    // unique_device_id estable para periféricos manuales (sin heartbeat propio).
    $uid = 'peripheral-' . bin2hex(random_bytes(8));

    $db->prepare(
        'INSERT INTO connected_devices
           (branch_id, unique_device_id, name, type, status, module, is_peripheral,
            parent_device_id, model, serial_number, notes, connected_at)
         VALUES (?, ?, ?, ?, ?, \'kiosk\', 1, ?, ?, ?, ?, NOW())'
    )->execute([
        $branchId, $uid, $name, $type, $status, $parentId,
        mb_substr(trim((string)($body['model'] ?? '')), 0, 120) ?: null,
        mb_substr(trim((string)($body['serial_number'] ?? '')), 0, 120) ?: null,
        mb_substr(trim((string)($body['notes'] ?? '')), 0, 500) ?: null,
    ]);
    $deviceId = (int)$db->lastInsertId();
    dmLogEvent($db, $deviceId, $branchId, 'peripheral_registered', "Periférico '$name' registrado manualmente");

    $stmt = $db->prepare(DM_SELECT . ' WHERE cd.id = ?');
    $stmt->execute([$deviceId]);
    jsonResponse(dmShape($stmt->fetch()), 201);
}

function dmUpdate(PDO $db, int $deviceId, array $payload): never {
    $device = dmFindOwned($db, $deviceId, $payload);
    $body   = getBody();

    $set = []; $params = [];
    if (array_key_exists('name', $body)) {
        $name = mb_substr(trim((string)$body['name']), 0, 100);
        if ($name === '') jsonError(422, 'El nombre no puede estar vacío');
        $set[] = 'name = ?'; $params[] = $name;
    }
    if (array_key_exists('type', $body) && in_array($body['type'], DM_DEVICE_TYPES, true)) {
        $set[] = 'type = ?'; $params[] = $body['type'];
    }
    foreach (['model', 'serial_number', 'notes'] as $f) {
        if (array_key_exists($f, $body)) {
            $set[] = "$f = ?";
            $params[] = mb_substr(trim((string)$body[$f]), 0, $f === 'notes' ? 500 : 120) ?: null;
        }
    }
    if (!$set) jsonError(422, 'Sin campos para actualizar');
    $params[] = $deviceId;

    $db->prepare('UPDATE connected_devices SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
    dmLogEvent($db, $deviceId, (int)$device['branch_id'], 'device_renamed',
        "Dispositivo actualizado (antes: {$device['name']})", ['changes' => array_keys($body)]);

    $stmt = $db->prepare(DM_SELECT . ' WHERE cd.id = ?');
    $stmt->execute([$deviceId]);
    jsonResponse(dmShape($stmt->fetch()));
}

function dmSetStatus(PDO $db, int $deviceId, array $payload): never {
    $device = dmFindOwned($db, $deviceId, $payload);
    $body   = getBody();
    $status = (string)($body['status'] ?? '');
    $allowed = ['online', 'offline', 'idle', 'error', 'in_test', 'unknown'];
    if (!in_array($status, $allowed, true)) {
        jsonError(422, 'Estado inválido');
    }

    // "Marcar como desconectado" / reinicio lógico: ajusta timestamps coherentes.
    if ($status === 'offline') {
        $db->prepare('UPDATE connected_devices SET status = ?, disconnected_at = NOW() WHERE id = ?')
           ->execute([$status, $deviceId]);
        dmLogEvent($db, $deviceId, (int)$device['branch_id'], 'device_disconnected', "{$device['name']} marcado como desconectado");
    } else {
        $db->prepare('UPDATE connected_devices SET status = ?, disconnected_at = NULL WHERE id = ?')
           ->execute([$status, $deviceId]);
        $evt = $status === 'error' ? 'device_error'
             : ((int)$device['is_peripheral'] === 1 ? 'peripheral_status_changed' : 'device_connected');
        dmLogEvent($db, $deviceId, (int)$device['branch_id'], $evt, "{$device['name']} → $status");
    }

    $stmt = $db->prepare(DM_SELECT . ' WHERE cd.id = ?');
    $stmt->execute([$deviceId]);
    jsonResponse(dmShape($stmt->fetch()));
}

function dmDelete(PDO $db, int $deviceId, array $payload): never {
    $device = dmFindOwned($db, $deviceId, $payload);
    $db->prepare('DELETE FROM device_events WHERE device_id = ?')->execute([$deviceId]);
    $db->prepare('DELETE FROM connected_devices WHERE id = ?')->execute([$deviceId]);
    jsonResponse(['success' => true]);
}

function dmListEvents(PDO $db, int $deviceId, array $payload): never {
    dmFindOwned($db, $deviceId, $payload);
    $stmt = $db->prepare(
        'SELECT id, device_id, branch_id, type, message, metadata, created_at
         FROM device_events WHERE device_id = ? ORDER BY id DESC LIMIT ?'
    );
    $stmt->bindValue(1, $deviceId, PDO::PARAM_INT);
    $stmt->bindValue(2, DM_EVENTS_PER_DEVICE_MAX, PDO::PARAM_INT);
    $stmt->execute();
    $rows = array_map(function (array $e): array {
        $e['id'] = (int)$e['id'];
        $e['device_id'] = (int)$e['device_id'];
        $e['branch_id'] = (int)$e['branch_id'];
        if (isset($e['metadata']) && is_string($e['metadata'])) {
            $e['metadata'] = json_decode($e['metadata'], true) ?: null;
        }
        return $e;
    }, $stmt->fetchAll());
    jsonResponse($rows);
}

function dmCreateEvent(PDO $db, int $deviceId, array $payload): never {
    $device = dmFindOwned($db, $deviceId, $payload);
    $body   = getBody();
    $valid  = ['device_connected','device_disconnected','device_heartbeat','device_idle',
               'device_error','peripheral_registered','peripheral_status_changed','device_removed','device_renamed'];
    $type   = in_array(($body['type'] ?? ''), $valid, true) ? $body['type'] : null;
    if (!$type) jsonError(422, 'Tipo de evento inválido');
    dmLogEvent($db, $deviceId, (int)$device['branch_id'], $type,
        (string)($body['message'] ?? ''), $body['metadata'] ?? null);
    jsonResponse(['ok' => true], 201);
}
