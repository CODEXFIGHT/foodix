<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Bitácora de auditoría: registra quién cambió qué, desde qué dispositivo y cuándo.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

/**
 * Registra un evento de auditoría. NUNCA lanza: si la tabla no existe o falla,
 * solo deja un log de error para no romper la operación principal.
 *
 * El device/versión llegan por cabeceras opcionales que envía la app:
 *   X-Device-Uid, X-App-Version, X-Build-Number.
 *
 * @param mixed $old Estado anterior (array/escalares) — se serializa a JSON.
 * @param mixed $new Estado nuevo.
 */
function logAudit(
    PDO $db,
    array $payload,
    string $action,
    string $entityType,
    ?int $entityId = null,
    $old = null,
    $new = null,
): void {
    try {
        $userId   = isset($payload['sub']) ? (int)$payload['sub'] : null;
        $branchId = isset($payload['branch_id']) && $payload['branch_id'] ? (int)$payload['branch_id'] : null;

        $deviceUid   = $_SERVER['HTTP_X_DEVICE_UID']  ?? null;
        $appVersion  = $_SERVER['HTTP_X_APP_VERSION'] ?? null;
        $buildNumber = $_SERVER['HTTP_X_BUILD_NUMBER'] ?? null;
        $ip          = $_SERVER['REMOTE_ADDR'] ?? null;

        $oldJson = $old === null ? null : json_encode($old, JSON_UNESCAPED_UNICODE);
        $newJson = $new === null ? null : json_encode($new, JSON_UNESCAPED_UNICODE);

        $stmt = $db->prepare(
            'INSERT INTO audit_logs
               (branch_id, user_id, device_uid, action, entity_type, entity_id,
                old_data, new_data, app_version, build_number, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $userId,
            $deviceUid ? substr((string)$deviceUid, 0, 120) : null,
            $action, $entityType, $entityId,
            $oldJson, $newJson,
            $appVersion ? substr((string)$appVersion, 0, 20) : null,
            $buildNumber ? substr((string)$buildNumber, 0, 20) : null,
            $ip ? substr((string)$ip, 0, 45) : null,
        ]);
    } catch (Throwable $e) {
        error_log('[audit] ' . $e->getMessage());
    }
}
