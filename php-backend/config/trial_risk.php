<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Evaluación de riesgo de abuso de la prueba gratuita.
 *
 * Reglas en capas, sin machine learning y sin fingerprinting invasivo:
 *
 *   señal                                   peso    racional
 *   ────────────────────────────────────────────────────────────────────────
 *   teléfono verificado ya usó un trial     BLOCK   identidad fuerte
 *   correo (canónico) ya usó un trial       BLOCK   identidad fuerte
 *   método de pago ya usó un trial          BLOCK   identidad fuerte (si existe)
 *   mismo dispositivo con trial previo       40     legítimo en consultorías/
 *                                                   dueños con 2 negocios → no bloquea solo
 *   3+ cuentas desde la misma IP / 24 h      20     oficinas y redes móviles comparten IP
 *   6+ cuentas desde la misma IP / 24 h     +15     ya no parece una red compartida normal
 *   velocidad de registro del dispositivo    20     3+ altas en 1 h desde el mismo equipo
 *
 *   score  <30  LOW    → trial automático
 *   30–59  MEDIUM      → trial automático, marcado para revisión del superadmin
 *   60–99  HIGH        → NO se activa solo; queda en revisión manual
 *   >=100  BLOCK       → no elegible
 *
 * El detalle (qué regla se disparó) NUNCA se devuelve al cliente: solo se
 * guarda en `trial_attempts` para auditoría del superadmin.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/trial_identity.php';
require_once __DIR__ . '/rate_limit.php';

const RISK_SCORE_BLOCK  = 100;
const RISK_SCORE_HIGH   = 60;
const RISK_SCORE_MEDIUM = 30;

/** ¿Esta identidad ya consumió un trial en alguna sucursal? */
function identityUsedTrial(PDO $db, string $type, string $hash, ?int $exceptBranchId = null): bool {
    $sql    = 'SELECT 1 FROM trial_identities WHERE identity_type = ? AND identity_hash = ?';
    $params = [$type, $hash];
    if ($exceptBranchId !== null) {
        $sql .= ' AND branch_id <> ?';
        $params[] = $exceptBranchId;
    }
    $stmt = $db->prepare($sql . ' LIMIT 1');
    $stmt->execute($params);
    return (bool)$stmt->fetchColumn();
}

/** Cuántas sucursales distintas iniciaron trial desde esta IP en las últimas 24 h. */
function trialsFromIpLast24h(PDO $db, string $ipHash): int {
    $stmt = $db->prepare(
        'SELECT COUNT(DISTINCT branch_id) FROM trial_identities
         WHERE identity_type = \'ip\' AND identity_hash = ?
           AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    $stmt->execute([$ipHash]);
    return (int)$stmt->fetchColumn();
}

/**
 * Evalúa el riesgo de otorgar un trial a un conjunto de señales.
 *
 * @param array{email_hash?:?string, phone_hash?:?string, device_hash?:?string,
 *              ip_hash?:?string, payment_fingerprint_hash?:?string} $signals
 * @return array{score:int, level:string, reason_code:?string, reasons:string[]}
 */
function evaluateTrialRisk(PDO $db, array $signals): array {
    $score   = 0;
    $reasons = [];
    $reason  = null;

    $emailHash   = $signals['email_hash']   ?? null;
    $phoneHash   = $signals['phone_hash']   ?? null;
    $deviceHash  = $signals['device_hash']  ?? null;
    $ipHash      = $signals['ip_hash']      ?? null;
    $paymentHash = $signals['payment_fingerprint_hash'] ?? null;

    // ── Identidades fuertes: bloqueo ──────────────────────────────────────────
    if ($phoneHash && identityUsedTrial($db, 'phone', $phoneHash)) {
        $score  += RISK_SCORE_BLOCK;
        $reason  = $reason ?? 'phone_trial_used';
        $reasons[] = 'phone_trial_used';
    }
    if ($emailHash && identityUsedTrial($db, 'email', $emailHash)) {
        $score  += RISK_SCORE_BLOCK;
        $reason  = $reason ?? 'email_trial_used';
        $reasons[] = 'email_trial_used';
    }
    if ($paymentHash && identityUsedTrial($db, 'payment_method', $paymentHash)) {
        $score  += RISK_SCORE_BLOCK;
        $reason  = $reason ?? 'payment_trial_used';
        $reasons[] = 'payment_trial_used';
    }

    // ── Señales medias: suman, no bloquean por sí solas ───────────────────────
    if ($deviceHash && identityUsedTrial($db, 'device', $deviceHash)) {
        $score += 40;
        $reasons[] = 'device_trial_used';
        $reason = $reason ?? 'device_trial_used';
    }

    if ($ipHash) {
        // La IP es SOLO una señal de riesgo: oficinas, plazas comerciales,
        // universidades y redes móviles (CGNAT) comparten una misma IP entre
        // muchos negocios legítimos. Nunca bloquea por sí misma.
        $fromIp = trialsFromIpLast24h($db, $ipHash);
        if ($fromIp >= 6) {
            $score += 35;
            $reasons[] = 'ip_velocity_high';
        } elseif ($fromIp >= 3) {
            $score += 20;
            $reasons[] = 'ip_velocity';
        }
    }

    if ($deviceHash) {
        // Velocidad de registro: a partir del TERCER alta desde el mismo equipo
        // dentro de la ventana. Con dos no basta: un dueño que abre su segundo
        // restaurante desde la misma computadora es un caso legítimo y frecuente
        // (ver la regla de "no bloquear solo por dispositivo").
        $recent = rateLimitCount($db, 'register_device', $deviceHash);
        if ($recent >= 3) {
            $score += 20;
            $reasons[] = 'device_velocity';
        }
    }

    $level = match (true) {
        $score >= RISK_SCORE_BLOCK  => 'block',
        $score >= RISK_SCORE_HIGH   => 'high',
        $score >= RISK_SCORE_MEDIUM => 'medium',
        default                     => 'low',
    };

    return [
        'score'       => $score,
        'level'       => $level,
        'reason_code' => $reason ?? ($reasons[0] ?? null),
        'reasons'     => $reasons,
    ];
}

/**
 * Deja constancia de la decisión. Solo hashes: la tabla es auditable sin
 * exponer datos personales.
 */
function logTrialAttempt(
    PDO $db,
    string $decision,
    array $signals,
    array $risk,
    ?int $signupId = null,
    ?int $branchId = null,
    ?int $userId = null
): void {
    $db->prepare(
        'INSERT INTO trial_attempts
            (signup_id, branch_id, user_id, email_hash, phone_hash, device_hash, ip_hash,
             risk_score, risk_level, decision, reason_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $signupId,
        $branchId,
        $userId,
        $signals['email_hash']  ?? null,
        $signals['phone_hash']  ?? null,
        $signals['device_hash'] ?? null,
        $signals['ip_hash']     ?? null,
        (int)$risk['score'],
        $risk['level'],
        $decision,
        $risk['reason_code'] ?? null,
    ]);
}
