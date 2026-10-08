<?php
/**
 * FoodIX — Preferencias de accesibilidad del POS.
 *
 * GET/PATCH/DELETE /accessibility/pos?user_id={id}
 * - Sin user_id opera sobre el usuario autenticado.
 * - Admin puede gestionar usuarios de su sucursal.
 * - Superadmin puede gestionar cualquier usuario.
 */
declare(strict_types=1);

function handleAccessibility(array $seg, string $method): never {
    $payload = requireAuth();
    $db = Database::connect();
    $resource = $seg[1] ?? '';

    if ($resource !== 'pos') {
        jsonError(404, 'Ruta no encontrada');
    }

    $targetUserId = intParam('user_id', (int)$payload['sub']);
    $target = findAccessibilityTargetUser($db, $targetUserId);
    authorizeAccessibilityTarget($payload, $target);

    if ($method === 'GET') {
        jsonResponse(getPosAccessibilitySettings($db, $target));
    }

    if ($method === 'PATCH') {
        $body = getBody();
        $settings = sanitizePosAccessibilityBody($body);

        $stmt = $db->prepare(
            'INSERT INTO user_pos_accessibility_settings
              (user_id, branch_id, role, mode, font_scale, control_scale, icon_scale, high_contrast, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              branch_id = VALUES(branch_id),
              role = VALUES(role),
              mode = VALUES(mode),
              font_scale = VALUES(font_scale),
              control_scale = VALUES(control_scale),
              icon_scale = VALUES(icon_scale),
              high_contrast = VALUES(high_contrast),
              updated_by = VALUES(updated_by),
              updated_at = CURRENT_TIMESTAMP'
        );
        $stmt->execute([
            (int)$target['id'],
            $target['branch_id'] !== null ? (int)$target['branch_id'] : null,
            (string)$target['role'],
            $settings['mode'],
            $settings['font_scale'],
            $settings['control_scale'],
            $settings['icon_scale'],
            $settings['high_contrast'],
            (int)$payload['sub'],
        ]);

        logAudit($db, $payload, 'user.pos_accessibility.updated', 'user', (int)$target['id']);
        jsonResponse(getPosAccessibilitySettings($db, $target));
    }

    if ($method === 'DELETE') {
        $stmt = $db->prepare('DELETE FROM user_pos_accessibility_settings WHERE user_id = ?');
        $stmt->execute([(int)$target['id']]);
        logAudit($db, $payload, 'user.pos_accessibility.reset', 'user', (int)$target['id']);
        jsonResponse(getDefaultPosAccessibilitySettings($target, true));
    }

    jsonError(405, 'Método no permitido');
}

function findAccessibilityTargetUser(PDO $db, int $userId): array {
    $stmt = $db->prepare('SELECT id, branch_id, role FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) jsonError(404, 'Usuario no encontrado');
    return $user;
}

function authorizeAccessibilityTarget(array $payload, array $target): void {
    $actorRole = (string)$payload['role'];
    $actorId = (int)$payload['sub'];
    $targetId = (int)$target['id'];

    if ($actorId === $targetId) return;
    if ($actorRole === 'superadmin') return;
    if ($actorRole === 'admin' && (int)$payload['branch_id'] === (int)$target['branch_id'] && $target['role'] !== 'superadmin') return;

    jsonError(403, 'Sin acceso a la configuración de este usuario');
}

function getPosAccessibilitySettings(PDO $db, array $target): array {
    $stmt = $db->prepare(
        'SELECT mode, font_scale, control_scale, icon_scale, high_contrast, updated_at
         FROM user_pos_accessibility_settings WHERE user_id = ?'
    );
    $stmt->execute([(int)$target['id']]);
    $row = $stmt->fetch();
    if (!$row) return getDefaultPosAccessibilitySettings($target);

    return [
        'user_id' => (int)$target['id'],
        'branch_id' => $target['branch_id'] !== null ? (int)$target['branch_id'] : null,
        'role' => (string)$target['role'],
        'mode' => (string)$row['mode'],
        'font_scale' => (float)$row['font_scale'],
        'control_scale' => (float)$row['control_scale'],
        'icon_scale' => (float)$row['icon_scale'],
        'high_contrast' => (bool)$row['high_contrast'],
        'source' => 'database',
        'updated_at' => $row['updated_at'],
    ];
}

function getDefaultPosAccessibilitySettings(array $target, bool $reset = false): array {
    return [
        'user_id' => (int)$target['id'],
        'branch_id' => $target['branch_id'] !== null ? (int)$target['branch_id'] : null,
        'role' => (string)$target['role'],
        'mode' => 'default',
        'font_scale' => 1.0,
        'control_scale' => 1.0,
        'icon_scale' => 1.0,
        'high_contrast' => false,
        'source' => $reset ? 'reset' : 'default',
        'updated_at' => null,
    ];
}

function sanitizePosAccessibilityBody(array $body): array {
    $mode = (string)($body['mode'] ?? 'default');
    if (!in_array($mode, ['default', 'mobile', 'tablet', 'kiosk'], true)) {
        jsonError(422, 'Modo de accesibilidad inválido');
    }

    return [
        'mode' => $mode,
        'font_scale' => clampPosScale($body['fontScale'] ?? $body['font_scale'] ?? 1.0),
        'control_scale' => clampPosScale($body['controlScale'] ?? $body['control_scale'] ?? 1.0),
        'icon_scale' => clampPosScale($body['iconScale'] ?? $body['icon_scale'] ?? 1.0),
        'high_contrast' => !empty($body['highContrast'] ?? $body['high_contrast'] ?? false) ? 1 : 0,
    ];
}

function clampPosScale(mixed $value): float {
    $n = is_numeric($value) ? (float)$value : 1.0;
    return max(0.9, min(1.45, $n));
}
