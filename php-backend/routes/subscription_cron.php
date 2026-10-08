<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Tarea programada de suscripciones (servidor-a-servidor).
 *
 *   POST /subscription-cron
 *     1) Auto-expira las suscripciones cuyo periodo ya venció.
 *     2) Devuelve los recordatorios de "por vencer" (0–3 días) con las
 *        suscripciones push de los destinatarios (admin de la sucursal +
 *        superadmins) para que la capa Next.js los firme y entregue.
 *
 * No usa JWT: se autentica con el secreto compartido PUSH_INTERNAL_SECRET
 * (lo invoca el cron de Vercel a través de /api/cron/subscription-check).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleSubscriptionCron(array $seg, string $method): never {
    if ($method !== 'POST') {
        jsonError(405, 'Método no permitido');
    }

    // Autenticación servidor-a-servidor por secreto compartido (header o body).
    $body     = getBody();
    $provided = $_SERVER['HTTP_X_INTERNAL_SECRET'] ?? (string)($body['secret'] ?? '');
    if (!defined('PUSH_INTERNAL_SECRET') || $provided === '' || !hash_equals(PUSH_INTERNAL_SECRET, $provided)) {
        jsonError(401, 'No autorizado');
    }

    $db = Database::connect();
    require_once __DIR__ . '/../config/subscription_helpers.php';
    require_once __DIR__ . '/../config/trial_notify.php';

    // ── 1) Auto-expirar suscripciones vencidas ───────────────────────────────
    // Corte a nivel de día: el día completo de `expires_at` sigue vigente; se
    // expira al día siguiente. Solo afecta a las que estaban operando o en mora;
    // no toca estados terminales ni las que esperan un pago en proceso.
    // Renovación anclada al día 1 + periodo de gracia configurable (default 5):
    //   · expires_at < hoy pero dentro de la gracia → 'past_due' (conserva acceso).
    //   · pasada la gracia (expires_at + grace_days < hoy) → 'suspended' (corta acceso,
    //     conserva datos). El cliente reactiva al registrar un nuevo pago.
    $expSel = $db->query(
        "SELECT id, branch_id, plan, status, grace_days,
                DATE_ADD(DATE(expires_at), INTERVAL grace_days DAY) AS grace_end
         FROM subscriptions
         WHERE status IN ('active','trial','past_due','payment_failed')
           AND DATE(expires_at) < CURDATE()"
    );
    $toReview = $expSel->fetchAll(PDO::FETCH_ASSOC);

    $toGrace   = $db->prepare("UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = ?");
    $toSuspend = $db->prepare("UPDATE subscriptions SET status = 'suspended', suspended_at = NOW(), updated_at = NOW() WHERE id = ?");
    $toExpired = $db->prepare("UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = ?");
    $revoke    = $db->prepare("UPDATE branches SET sessions_revoked_at = NOW() WHERE id = ?");

    $expiredTrials = 0;

    foreach ($toReview as $s) {
        // ── Prueba gratuita: sin periodo de gracia ───────────────────────────
        // Al terminar los 14 días pasa a 'expired' (no a 'suspended'): el
        // cliente CONSERVA todos sus datos, puede iniciar sesión y llegar a
        // /billing para elegir un plan; solo se bloquean los módulos operativos
        // (ver SubscriptionGuard). No se revocan sesiones para no dejarlo fuera.
        if (($s['plan'] ?? '') === 'trial') {
            if ($s['status'] !== 'expired') {
                $toExpired->execute([(int)$s['id']]);
                subscriptionAudit(
                    $db, (int)$s['branch_id'], (int)$s['id'],
                    'trial_expired', $s['status'], 'expired', null,
                    'Fin automático de la prueba gratuita'
                );
                $db->prepare(
                    "INSERT INTO trial_attempts (branch_id, decision, risk_level, reason_code)
                     VALUES (?, 'TRIAL_EXPIRED', 'low', 'trial_period_ended')"
                )->execute([(int)$s['branch_id']]);
                trialNotifyOwner($db, (int)$s['branch_id'], 'expired', 0);
                $expiredTrials++;
            }
            continue;
        }

        $pastGrace = $s['grace_end'] !== null && $s['grace_end'] < date('Y-m-d');
        if ($pastGrace) {
            $toSuspend->execute([(int)$s['id']]);
            $revoke->execute([(int)$s['branch_id']]);
            subscriptionAudit(
                $db, (int)$s['branch_id'], (int)$s['id'],
                'auto_suspend', $s['status'], 'suspended', null,
                'Suspensión automática: venció el periodo de gracia'
            );
        } elseif ($s['status'] !== 'past_due') {
            // Entró en periodo de gracia: marca past_due (conserva acceso con banner).
            $toGrace->execute([(int)$s['id']]);
            subscriptionAudit(
                $db, (int)$s['branch_id'], (int)$s['id'],
                'auto_grace', $s['status'], 'past_due', null,
                'Periodo de gracia: venció por fecha, acceso conservado'
            );
        }
    }

    // ── 2) Recordatorios "por vencer" (3, 2 y 1 días antes) ───────────────────
    // El día de vencimiento NO se avisa: sigue normal y no muestra nada. Una vez
    // al día por suscripción (dedupe vía subscription_audit_log).
    $remSel = $db->query(
        "SELECT s.id, s.branch_id, s.expires_at,
                DATEDIFF(s.expires_at, CURDATE()) AS days_remaining
         FROM subscriptions s
         WHERE s.status IN ('active','trial','past_due')
           AND DATEDIFF(s.expires_at, CURDATE()) BETWEEN 1 AND 3
           AND NOT EXISTS (
                 SELECT 1 FROM subscription_audit_log al
                 WHERE al.subscription_id = s.id
                   AND al.action = 'renewal_reminder'
                   AND al.created_at >= CURDATE())"
    );
    $rows = $remSel->fetchAll(PDO::FETCH_ASSOC);

    // Destinatarios push: admin(es) de la sucursal + todos los superadmins.
    $psStmt = $db->prepare(
        "SELECT ps.endpoint, ps.p256dh, ps.auth
         FROM push_subscriptions ps
         JOIN users u ON u.id = ps.user_id
         WHERE u.active = 1
           AND ( (u.role = 'admin' AND u.branch_id = ?) OR u.role = 'superadmin' )"
    );
    $branchStmt = $db->prepare('SELECT name FROM branches WHERE id = ? LIMIT 1');

    $reminders = [];
    foreach ($rows as $s) {
        $branchId = (int)$s['branch_id'];
        $days     = (int)$s['days_remaining'];

        $psStmt->execute([$branchId]);
        $subscriptions = $psStmt->fetchAll(PDO::FETCH_ASSOC);

        $branchStmt->execute([$branchId]);
        $branchName = trim((string)($branchStmt->fetchColumn() ?: '')) ?: "Sucursal #{$branchId}";

        $when = $days === 1 ? 'mañana' : "en {$days} días";

        // Se registra el aviso aunque no haya dispositivos suscritos (evita
        // recalcular a diario); el envío real es best-effort en Next.
        subscriptionAudit(
            $db, $branchId, (int)$s['id'],
            'renewal_reminder', null, null, null,
            "Aviso de vencimiento ({$days} día(s))"
        );

        if (!$subscriptions) continue;

        $reminders[] = [
            'branch_id'      => $branchId,
            'days_remaining' => $days,
            'title'          => "⚠️ Tu suscripción vence {$when}",
            'body'           => "{$branchName}: renueva tu suscripción para no perder el acceso al sistema.",
            'url'            => '/billing',
            'tag'            => "sub-reminder-{$branchId}",
            'subscriptions'  => $subscriptions,
        ];
    }

    // ── 3) Avisos por correo del trial (7, 3 y 1 días antes) ─────────────────
    // Una sola vez por día y por suscripción (dedupe con subscription_audit_log).
    $trialSel = $db->query(
        "SELECT s.id, s.branch_id, s.expires_at,
                DATEDIFF(DATE(s.expires_at), CURDATE()) AS days_remaining
         FROM subscriptions s
         WHERE s.plan = 'trial' AND s.status = 'trial'
           AND DATEDIFF(DATE(s.expires_at), CURDATE()) IN (7, 3, 1)
           AND NOT EXISTS (
                 SELECT 1 FROM subscription_audit_log al
                 WHERE al.subscription_id = s.id
                   AND al.action = 'trial_reminder'
                   AND al.created_at >= CURDATE())"
    );

    $trialReminders = 0;
    foreach ($trialSel->fetchAll(PDO::FETCH_ASSOC) as $t) {
        $days = (int)$t['days_remaining'];
        subscriptionAudit(
            $db, (int)$t['branch_id'], (int)$t['id'],
            'trial_reminder', 'trial', 'trial', null,
            "Aviso de fin de prueba ({$days} día(s))"
        );
        trialNotifyOwner($db, (int)$t['branch_id'], 'reminder', $days, (string)$t['expires_at']);
        $trialReminders++;
    }

    jsonResponse([
        'ok'              => true,
        // `expired_count` cuenta las suscripciones procesadas por vencimiento
        // (gracia, suspensión o fin de prueba). Antes leía una variable
        // inexistente y reventaba el cron con un 500.
        'expired_count'   => count($toReview),
        'expired_trials'  => $expiredTrials,
        'trial_reminders' => $trialReminders,
        'reminders'       => $reminders,
    ]);
}

/**
 * Avisa por correo al propietario (admin) de la sucursal sobre su prueba.
 * Best-effort: si el correo falla, el cron continúa sin romperse.
 */
function trialNotifyOwner(PDO $db, int $branchId, string $kind, int $days, ?string $endsAt = null): void {
    $stmt = $db->prepare(
        "SELECT name, email FROM users
         WHERE branch_id = ? AND role = 'admin' AND active = 1 AND email IS NOT NULL
         ORDER BY id ASC LIMIT 1"
    );
    $stmt->execute([$branchId]);
    $owner = $stmt->fetch();
    if (!$owner || !$owner['email']) return;

    $firstName = trim(explode(' ', (string)$owner['name'])[0]) ?: 'Hola';

    try {
        if ($kind === 'expired') {
            sendTrialExpiredEmail((string)$owner['email'], $firstName);
        } else {
            sendTrialReminderEmail((string)$owner['email'], $firstName, $days, $endsAt ?? date('Y-m-d'));
        }
    } catch (Throwable $e) {
        error_log('[FoodIX trial mail] ' . $e->getMessage());
    }
}
