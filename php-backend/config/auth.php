<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Autenticación JWT, verificación de roles y control de acceso.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function requireAuth(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        jsonError(401, 'Token no proporcionado');
    }

    $token   = $m[1];
    $payload = jwtDecode($token, JWT_SECRET);
    if (!$payload) {
        jsonError(401, 'Token inválido o expirado');
    }

    // Check revocation
    $db   = Database::connect();
    $hash = hash('sha256', $token);
    $stmt = $db->prepare('SELECT id FROM revoked_tokens WHERE token_hash = ?');
    $stmt->execute([$hash]);
    if ($stmt->fetch()) {
        jsonError(401, 'Sesión cerrada. Inicia sesión de nuevo.');
    }

    // Revocación masiva por sucursal: cuando el superadmin suspende/cancela/da de
    // baja una suscripción, se marca branches.sessions_revoked_at = NOW(). Todo
    // token emitido ANTES de ese instante queda invalidado → cierre de sesión en
    // TODOS los dispositivos de la sucursal. Las sesiones nuevas (re-login tras el
    // corte) tienen iat posterior y sí pasan, para que el admin pueda ir a pagar.
    $branchId = $payload['branch_id'] ?? null;
    if ($branchId && ($payload['role'] ?? '') !== 'superadmin') {
        $stmt = $db->prepare('SELECT sessions_revoked_at FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        $revokedAt = $stmt->fetchColumn();
        if ($revokedAt && (int)($payload['iat'] ?? 0) < strtotime((string)$revokedAt)) {
            jsonError(401, 'Sesión cerrada por cambio en la suscripción. Inicia sesión de nuevo.', [
                'error' => 'session_revoked',
            ]);
        }
    }

    // Cleanup expired revoked tokens occasionally
    if (random_int(1, 100) === 1) {
        $db->exec('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
    }

    return $payload;
}

function requireRole(array $payload, string ...$roles): void {
    if (!in_array($payload['role'], $roles, true)) {
        jsonError(403, 'Sin permisos para esta acción');
    }
}

function tokenFromHeader(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        return $m[1];
    }
    return null;
}
