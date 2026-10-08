<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Servicio del trial: activación transaccional, estado y acciones
 * administrativas sobre la prueba gratuita de 14 días.
 *
 * REGLAS INVIOLABLES (todas se cumplen del lado del servidor):
 *   · El trial pertenece a la SUCURSAL (workspace), no al usuario.
 *   · Una sucursal solo puede tener UN trial inicial (UNIQUE en base de datos).
 *   · `trial_started_at` / `trial_ends_at` se calculan con el reloj del
 *     servidor (NOW() de MySQL) y jamás se leen del cuerpo de la petición.
 *   · Iniciar sesión, cambiar correo/contraseña, borrar usuarios o limpiar
 *     cookies no reinicia nada: no hay ninguna ruta que reescriba
 *     `trial_started_at` salvo la acción administrativa auditada.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/trial_identity.php';
require_once __DIR__ . '/trial_risk.php';
require_once __DIR__ . '/subscription_helpers.php';

/**
 * Crea sucursal + usuario admin + suscripción trial + historial antiabuso en
 * UNA transacción. Idempotente por `signups.status`: si dos peticiones entran a
 * la vez, la segunda encuentra el registro ya activado y devuelve lo mismo.
 *
 * @return array{branch_id:int, user_id:int, username:string, slug:string,
 *               trial_started_at:string, trial_ends_at:string}
 */
function activateTrialForSignup(PDO $db, array $signup, array $signals, array $risk): array {
    $signupId = (int)$signup['id'];

    // Cierre optimista: solo UNA petición logra pasar de 'verified' a 'activated'.
    $claim = $db->prepare("UPDATE signups SET status = 'activated' WHERE id = ? AND status = 'verified'");
    $claim->execute([$signupId]);

    if ($claim->rowCount() === 0) {
        // Otra petición ya lo activó (o el registro no estaba verificado).
        $stmt = $db->prepare('SELECT * FROM signups WHERE id = ?');
        $stmt->execute([$signupId]);
        $fresh = $stmt->fetch();

        if ($fresh && $fresh['status'] === 'activated' && $fresh['branch_id']) {
            return trialActivationResult($db, (int)$fresh['branch_id'], (int)$fresh['user_id'], (string)$fresh['username']);
        }
        jsonError(409, 'Este registro no está listo para activarse.', ['error' => 'signup_not_ready']);
    }

    $email    = normalizeEmail((string)$signup['email']);
    $fullName = trim($signup['first_name'] . ' ' . $signup['last_name']);
    $business = (string)$signup['business_name'];
    $phone    = $signup['phone_e164'] ?: null;

    $db->beginTransaction();
    try {
        $slug     = suggestBranchSlug($db, $business);
        $username = $signup['username'] ?: suggestUsername($db, $signup['first_name'] . '_' . $signup['last_name']);

        // ── Sucursal (workspace) ─────────────────────────────────────────────
        $db->prepare(
            "INSERT INTO branches (name, slug, phone, trial_used_at, onboarding_status)
             VALUES (?, ?, ?, NOW(), 'pending')"
        )->execute([$business, $slug, $phone]);
        $branchId = (int)$db->lastInsertId();

        // ── Usuario propietario (rol admin) ──────────────────────────────────
        $db->prepare(
            "INSERT INTO users (branch_id, name, email, email_verified_at, phone, phone_verified_at,
                                username, password, role)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin')"
        )->execute([
            $branchId, $fullName, $email,
            $signup['email_verified_at'], $phone, $signup['phone_verified_at'],
            $username, $signup['password_hash'],
        ]);
        $userId = (int)$db->lastInsertId();

        // ── Suscripción en prueba ────────────────────────────────────────────
        // Fechas SIEMPRE del reloj del servidor. `trial_seq = 1` + el índice
        // UNIQUE(branch_id, trial_seq) hacen imposible un segundo trial.
        $db->prepare(
            "INSERT INTO subscriptions
                (branch_id, plan, status, starts_at, expires_at, max_devices, price_monthly,
                 payment_method, trial_ends_at, trial_started_at, trial_days, trial_source, trial_seq)
             VALUES (?, 'trial', 'trial', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 2, 0,
                     'none', DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), ?, 'self_signup', 1)"
        )->execute([$branchId, TRIAL_DAYS, TRIAL_DAYS, TRIAL_DAYS]);
        $subscriptionId = (int)$db->lastInsertId();

        // ── Semilla mínima de catálogo (igual que el alta del superadmin) ────
        $seed = $db->prepare(
            'INSERT INTO categories (branch_id, name, emoji, color, station, menu_group, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $seed->execute([$branchId, 'MESA CALIENTE', '🔥', '#E85D04', 'hot',  'alimento', 0]);
        $seed->execute([$branchId, 'MESA FRIA',     '🥗', '#3B82F6', 'cold', 'alimento', 1]);

        // ── Historial antiabuso: estas identidades ya consumieron su trial ───
        $ident = $db->prepare(
            'INSERT IGNORE INTO trial_identities
                (branch_id, user_id, identity_type, identity_hash, trial_started_at, trial_ended_at)
             SELECT ?, ?, ?, ?, s.trial_started_at, s.trial_ends_at
             FROM subscriptions s WHERE s.id = ?'
        );
        foreach (['email' => $signals['email_hash'] ?? null,
                  'phone' => $signals['phone_hash'] ?? null,
                  'device'=> $signals['device_hash'] ?? null,
                  'ip'    => $signals['ip_hash'] ?? null] as $type => $hash) {
            if ($hash) $ident->execute([$branchId, $userId, $type, $hash, $subscriptionId]);
        }

        // ── Cierre del registro ──────────────────────────────────────────────
        $db->prepare('UPDATE signups SET branch_id = ?, user_id = ?, username = ? WHERE id = ?')
           ->execute([$branchId, $userId, $username, $signupId]);

        subscriptionAudit(
            $db, $branchId, $subscriptionId, 'trial_granted', null, 'trial', null,
            'Alta autoservicio: prueba gratuita de ' . TRIAL_DAYS . ' días'
        );

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        // Se devuelve el registro a 'verified' para que el cliente pueda reintentar.
        $db->prepare("UPDATE signups SET status = 'verified' WHERE id = ? AND status = 'activated'")
           ->execute([$signupId]);
        throw $e;
    }

    logTrialAttempt($db, 'TRIAL_GRANTED', $signals, $risk, $signupId, $branchId, $userId);

    return trialActivationResult($db, $branchId, $userId, $username);
}

/** Lee de la base de datos el resultado de la activación (fuente de verdad). */
function trialActivationResult(PDO $db, int $branchId, int $userId, string $username): array {
    $stmt = $db->prepare(
        'SELECT s.trial_started_at, s.trial_ends_at, b.slug
         FROM subscriptions s JOIN branches b ON b.id = s.branch_id
         WHERE s.branch_id = ? AND s.trial_seq = 1 LIMIT 1'
    );
    $stmt->execute([$branchId]);
    $row = $stmt->fetch() ?: [];

    return [
        'branch_id'        => $branchId,
        'user_id'          => $userId,
        'username'         => $username,
        'slug'             => (string)($row['slug'] ?? ''),
        'trial_started_at' => (string)($row['trial_started_at'] ?? ''),
        'trial_ends_at'    => (string)($row['trial_ends_at'] ?? ''),
    ];
}

/**
 * Estado del trial de una sucursal, calculado 100 % en el servidor.
 * `days_remaining` es informativo (para la UI); la autorización real la decide
 * `subscriptionOperable()` sobre `expires_at`.
 *
 * @return array{is_trial:bool, trial_status:string, trial_started_at:?string,
 *               trial_ends_at:?string, days_remaining:?int, trial_used:bool}|null
 */
function trialStateForBranch(PDO $db, ?int $branchId): ?array {
    if (!$branchId) return null;

    $stmt = $db->prepare(
        'SELECT s.plan, s.status, s.trial_started_at, s.trial_ends_at, s.expires_at,
                s.converted_at, b.trial_used_at,
                DATEDIFF(DATE(s.expires_at), CURDATE()) AS days_remaining
         FROM branches b
         LEFT JOIN subscriptions s ON s.branch_id = b.id
         WHERE b.id = ?
         ORDER BY s.id DESC LIMIT 1'
    );
    $stmt->execute([$branchId]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $isTrial = ($row['plan'] ?? null) === 'trial';
    $status  = effectiveSubscriptionStatus($row) ?? (string)($row['status'] ?? '');

    $trialStatus = match (true) {
        !$isTrial && $row['converted_at'] !== null => 'converted',
        !$isTrial                                  => 'not_trial',
        $status === 'trial'                        => 'trialing',
        default                                    => 'trial_expired',
    };

    return [
        'is_trial'         => $isTrial,
        'trial_status'     => $trialStatus,
        'trial_started_at' => $row['trial_started_at'] ?? null,
        'trial_ends_at'    => $row['trial_ends_at'] ?? ($isTrial ? ($row['expires_at'] ?? null) : null),
        'days_remaining'   => $isTrial && $row['days_remaining'] !== null ? (int)$row['days_remaining'] : null,
        'trial_used'       => $row['trial_used_at'] !== null,
    ];
}

/**
 * Acción administrativa (solo superadmin): mueve la fecha de fin del trial.
 * Queda auditada en `trial_admin_audit` con el valor anterior y el nuevo.
 *
 * @param int|null    $days   días a sumar sobre la fecha actual de fin
 * @param string|null $until  fecha exacta 'YYYY-MM-DD' (tiene prioridad si viene)
 */
function extendTrial(PDO $db, int $branchId, ?int $days, ?string $until, int $changedBy, ?string $reason): array {
    $sub = latestSubscription($db, $branchId);
    if (!$sub) jsonError(404, 'La sucursal no tiene suscripción');
    if ($sub['plan'] !== 'trial') jsonError(409, 'Esta sucursal ya no está en periodo de prueba');

    $previous = (string)($sub['trial_ends_at'] ?: $sub['expires_at']);

    if ($until !== null) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $until)) jsonError(422, 'Fecha inválida');
        $newEnd = $until . ' 23:59:59';
    } else {
        $d = (int)$days;
        if ($d < 1 || $d > 365) jsonError(422, 'Los días deben estar entre 1 y 365');
        // Si el trial ya venció, se extiende desde hoy; si no, desde su fin actual.
        $base   = strtotime($previous) > time() ? $previous : date('Y-m-d H:i:s');
        $newEnd = date('Y-m-d H:i:s', strtotime($base . ' +' . $d . ' day'));
    }

    $db->beginTransaction();
    try {
        $db->prepare(
            "UPDATE subscriptions
                SET trial_ends_at = ?, expires_at = ?, status = 'trial', suspended_at = NULL, updated_at = NOW()
              WHERE id = ?"
        )->execute([$newEnd, $newEnd, (int)$sub['id']]);

        $db->prepare(
            'INSERT INTO trial_admin_audit
                (branch_id, subscription_id, action, previous_trial_end, new_trial_end, changed_by, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$branchId, (int)$sub['id'], 'extend_trial', $previous ?: null, $newEnd, $changedBy, $reason]);

        subscriptionAudit(
            $db, $branchId, (int)$sub['id'], 'extend_trial', (string)$sub['status'], 'trial', $changedBy,
            'Extensión de prueba hasta ' . $newEnd
        );

        // Las sesiones cortadas por vencimiento deben poder volver a entrar.
        $db->prepare('UPDATE branches SET sessions_revoked_at = NOW() WHERE id = ?')->execute([$branchId]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    return ['previous_trial_end' => $previous ?: null, 'new_trial_end' => $newEnd];
}

/**
 * Marca la conversión trial → plan de pago. La llama el flujo de facturación
 * cuando la sucursal pasa de `plan='trial'` a un plan de pago.
 */
function markTrialConverted(PDO $db, int $branchId): void {
    $db->prepare(
        'UPDATE subscriptions SET converted_at = COALESCE(converted_at, NOW())
         WHERE branch_id = ? AND trial_seq = 1'
    )->execute([$branchId]);

    $db->prepare(
        "INSERT INTO trial_attempts (branch_id, decision, risk_level, reason_code)
         VALUES (?, 'TRIAL_CONVERTED', 'low', 'converted')"
    )->execute([$branchId]);
}
