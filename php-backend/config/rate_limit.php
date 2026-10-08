<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Rate limiting por ventana fija, respaldado en MySQL (hosting compartido:
 * no hay Redis ni memoria compartida entre procesos).
 *
 * La clave se guarda hasheada (nunca la IP ni el teléfono en claro) y la
 * ventana se ancla al inicio del bloque (p. ej. la hora en curso), de modo que
 * el conteo es atómico con un solo INSERT ... ON DUPLICATE KEY UPDATE.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/trial_identity.php';

/**
 * Límites por ámbito: [máximo de eventos, tamaño de la ventana en segundos].
 * Valores deliberadamente holgados: un restaurante real nunca los alcanza,
 * pero cortan el registro automatizado en volumen.
 */
const RATE_LIMITS = [
    'register_ip'      => [8,  3600],    //  8 registros por IP / hora
    'register_ip_day'  => [20, 86400],   // 20 registros por IP / día
    'register_device'  => [5,  86400],   //  5 registros por dispositivo / día
    'otp_phone'        => [5,  3600],    //  5 envíos de código por teléfono / hora
    'otp_phone_day'    => [10, 86400],   // 10 envíos por teléfono / día
    'otp_ip'           => [15, 3600],    // 15 envíos por IP / hora
    'otp_verify'       => [10, 3600],    // 10 intentos de validar código / hora
    'email_resend'     => [5,  3600],    //  5 reenvíos de correo / hora
    'email_verify_ip'  => [30, 3600],    // 30 intentos de token por IP / hora
    'activate_ip'      => [10, 3600],    // 10 activaciones por IP / hora
];

/**
 * Registra un evento y dice si la clave YA superó su límite.
 *
 * @return array{allowed: bool, remaining: int, retry_after: int}
 */
function rateLimitHit(PDO $db, string $scope, string $key): array {
    [$max, $window] = RATE_LIMITS[$scope] ?? [30, 3600];

    $now         = time();
    $windowStart = date('Y-m-d H:i:s', $now - ($now % $window));
    $keyHash     = trialHash('ratelimit:' . $scope, $key);

    $db->prepare(
        'INSERT INTO trial_rate_limits (scope, key_hash, window_start, hits)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE hits = hits + 1'
    )->execute([$scope, $keyHash, $windowStart]);

    $stmt = $db->prepare(
        'SELECT hits FROM trial_rate_limits WHERE scope = ? AND key_hash = ? AND window_start = ?'
    );
    $stmt->execute([$scope, $keyHash, $windowStart]);
    $hits = (int)$stmt->fetchColumn();

    // Limpieza oportunista de ventanas viejas (1 de cada 50 peticiones).
    if (random_int(1, 50) === 1) {
        $db->exec('DELETE FROM trial_rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 2 DAY)');
    }

    $retryAfter = ($now - ($now % $window)) + $window - $now;

    return [
        'allowed'     => $hits <= $max,
        'remaining'   => max(0, $max - $hits),
        'retry_after' => $retryAfter,
    ];
}

/**
 * Consulta sin incrementar (para decidir riesgo sin gastar cuota).
 */
function rateLimitCount(PDO $db, string $scope, string $key): int {
    [, $window]  = RATE_LIMITS[$scope] ?? [30, 3600];
    $now         = time();
    $windowStart = date('Y-m-d H:i:s', $now - ($now % $window));
    $keyHash     = trialHash('ratelimit:' . $scope, $key);

    $stmt = $db->prepare(
        'SELECT hits FROM trial_rate_limits WHERE scope = ? AND key_hash = ? AND window_start = ?'
    );
    $stmt->execute([$scope, $keyHash, $windowStart]);
    return (int)$stmt->fetchColumn();
}

/**
 * Aplica el límite y corta la petición con 429 si se excedió. El mensaje es
 * genérico a propósito: no revela cuál de los límites se alcanzó.
 */
function enforceRateLimit(PDO $db, string $scope, string $key): void {
    $r = rateLimitHit($db, $scope, $key);
    if (!$r['allowed']) {
        if (!headers_sent()) header('Retry-After: ' . $r['retry_after']);
        jsonError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', [
            'error'       => 'rate_limited',
            'retry_after' => $r['retry_after'],
        ]);
    }
}
