<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Utilidades para el manejo de suscripciones.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Helpers compartidos por las rutas de suscripción/billing (superadmin, billing, webhooks).

/**
 * Registra un cambio de estado de suscripción en subscription_audit_log.
 */
function subscriptionAudit(
    PDO $db,
    int $branchId,
    ?int $subscriptionId,
    string $action,
    ?string $prevStatus,
    ?string $newStatus,
    ?int $performedBy = null,
    ?string $note = null
): void {
    $db->prepare(
        'INSERT INTO subscription_audit_log
            (branch_id, subscription_id, action, previous_status, new_status, performed_by, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$branchId, $subscriptionId, $action, $prevStatus, $newStatus, $performedBy, $note]);
}

/**
 * Devuelve la suscripción más reciente de una sucursal (o null).
 */
function latestSubscription(PDO $db, int $branchId): ?array {
    $stmt = $db->prepare('SELECT * FROM subscriptions WHERE branch_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$branchId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Decide si una suscripción permite operar la app (POS, cocina, etc.).
 * Bloquea estados terminales/morosos y suscripciones vencidas por fecha.
 *
 * @return array{active: bool, reason: ?string}
 */
function subscriptionOperable(?array $sub): array {
    if (!$sub) {
        return ['active' => false, 'reason' => 'no_subscription'];
    }

    $blocked = ['suspended', 'canceled', 'terminated', 'expired', 'payment_failed'];
    if (in_array($sub['status'], $blocked, true)) {
        return ['active' => false, 'reason' => $sub['status']];
    }

    // Vencida por fecha aunque el estado no se haya actualizado aún.
    // El corte es a nivel de día: el día completo de `expires_at` sigue activo;
    // el bloqueo empieza al día siguiente.
    if (subscriptionExpiredByDate($sub)) {
        return ['active' => false, 'reason' => 'expired'];
    }

    return ['active' => true, 'reason' => null];
}

/**
 * ¿El periodo ya venció a nivel de día calendario? El día de `expires_at` se
 * considera vigente; solo se bloquea cuando ese día ya pasó.
 */
function subscriptionExpiredByDate(?array $sub): bool {
    if (!$sub || empty($sub['expires_at'])) return false;
    $ts = strtotime((string)$sub['expires_at']);
    if ($ts === false) return false;
    return date('Y-m-d', $ts) < date('Y-m-d');
}

/**
 * Estado "efectivo" de la suscripción para el cliente. Si el periodo ya venció
 * por fecha pero el estado seguía siendo operativo (active/trial/past_due),
 * reporta 'expired' para que el SubscriptionGuard bloquee de inmediato — sin
 * esperar al cron que actualiza la columna `status`.
 */
function effectiveSubscriptionStatus(?array $sub): ?string {
    if (!$sub) return null;
    $status = (string)($sub['status'] ?? '');

    if (in_array($status, ['active', 'trial', 'past_due'], true) && subscriptionExpiredByDate($sub)) {
        return 'expired';
    }
    return $status;
}

// ─── Billing CRM · meses cubiertos, calendario, licencia y gracia ────────────────

/** Normaliza una fecha al primer día de su mes: 'YYYY-MM-01'. */
function firstOfMonth(string $date): string {
    $ts = strtotime($date) ?: time();
    return date('Y-m-01', $ts);
}

/** Siguiente periodo 'YYYY-MM' (suma 1 mes). */
function nextPeriod(string $period): string {
    return date('Y-m', strtotime($period . '-01 +1 month'));
}

/**
 * Lista de periodos 'YYYY-MM' que cubre un pago: $count meses desde el mes de
 * $from (inclusive). Ancla al día 1, por lo que solo importa el mes de $from.
 */
function coveredMonthsList(string $from, int $count): array {
    $count = max(1, $count);
    $p = date('Y-m', strtotime($from) ?: time());
    $out = [];
    for ($i = 0; $i < $count; $i++) {
        $out[] = $p;
        $p = nextPeriod($p);
    }
    return $out;
}

/**
 * Fin del periodo cubierto (renovación anclada al día 1): último día del último
 * mes cubierto, a las 23:59:59. Ese día completo sigue vigente.
 */
function coveredPeriodEnd(string $coveredFrom, int $months): string {
    $months = max(1, $months);
    $lastMonth = date('Y-m-01', strtotime(firstOfMonth($coveredFrom) . ' +' . ($months - 1) . ' month'));
    return date('Y-m-t 23:59:59', strtotime($lastMonth));
}

/** Días de gracia configurados (default 5). */
function subscriptionGraceDays(?array $sub): int {
    if (!$sub) return 5;
    return isset($sub['grace_days']) ? max(0, (int)$sub['grace_days']) : 5;
}

/**
 * ¿Venció ya incluyendo el periodo de gracia? Hasta expires_at + grace_days el
 * cliente conserva acceso (estado "periodo de gracia"); después se suspende.
 */
function subscriptionExpiredWithGrace(?array $sub): bool {
    if (!$sub || empty($sub['expires_at'])) return false;
    $ts = strtotime((string)$sub['expires_at']);
    if ($ts === false) return false;
    $graceEnd = strtotime('+' . subscriptionGraceDays($sub) . ' day', $ts);
    return date('Y-m-d', $graceEnd) < date('Y-m-d');
}

/** ¿Está dentro del periodo de gracia (vencido por fecha pero aún con acceso)? */
function subscriptionInGrace(?array $sub): bool {
    return subscriptionExpiredByDate($sub) && !subscriptionExpiredWithGrace($sub);
}

/**
 * Licencia derivada del plan (Fase 1: sin tabla dedicada). Define límites y
 * funciones; la expiración real es subscriptions.expires_at. Mapea 1:1 a una
 * futura tabla `licenses` sin recrear el sistema.
 *
 * -1 = ilimitado.
 */
function licenseForPlan(string $plan): array {
    $starter = ['pos','products','sales_today','cash_basic','carta_qr_simple'];
    $pro     = array_merge($starter, ['tables','kds','carta_qr_premium','reports_advanced','modifiers','internal_notifications','inventory','customers','promotions']);
    $ai      = array_merge($pro, ['whatsapp_ai_waiter','whatsapp_orders','ai_recommendations','customer_analytics']);
    $multi   = array_merge($ai, ['multi_branch','centralized_dashboard','consolidated_reports','remote_config','priority_support']);

    // Espejo de LICENSE_BY_PLAN en lib/constants/subscription.ts — mantener en sync.
    $map = [
        'trial'         => ['max_users' => 3,  'max_pos' => 1, 'max_branches' => 1,  'features' => ['pos','kds','reports']],
        'starter'       => ['max_users' => 5,  'max_pos' => 1, 'max_branches' => 1,  'features' => $starter],
        'pro'           => ['max_users' => 10, 'max_pos' => 2, 'max_branches' => 1,  'features' => $pro],
        'ai'            => ['max_users' => 15, 'max_pos' => 3, 'max_branches' => 2,  'features' => $ai],
        'multisucursal' => ['max_users' => -1, 'max_pos' => 5, 'max_branches' => 10, 'features' => $multi],
    ];
    return $map[$plan] ?? $map['trial'];
}

/**
 * Interrumpe la petición con el envelope de error humanizado (ver
 * lib/errors/errorCatalog.ts en el front) cuando el plan actual no alcanza
 * para un límite numérico o no incluye una función.
 */
function jsonPlanError(int $status, string $code, string $messageTecnico, array $context = []): never {
    http_response_code($status);
    echo json_encode([
        'error' => [
            'code'            => $code,
            'message_tecnico' => $messageTecnico,
            'context'         => $context,
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Plan vigente de una sucursal (por defecto 'trial' si no tiene suscripción). */
function currentPlanForBranch(PDO $db, int $branchId): string {
    $stmt = $db->prepare('SELECT plan FROM subscriptions WHERE branch_id = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$branchId]);
    return (string)($stmt->fetchColumn() ?: 'trial');
}

/**
 * Corta la petición si la sucursal ya alcanzó el límite numérico del recurso
 * en su plan actual (ej. usuarios, POS, sucursales). -1 = ilimitado.
 */
function requirePlanLimit(PDO $db, int $branchId, string $limitKey, int $currentCount, string $recursoLabel): void {
    $plan    = currentPlanForBranch($db, $branchId);
    $license = licenseForPlan($plan);
    $max     = $license[$limitKey] ?? -1;

    if ($max !== -1 && $currentCount >= $max) {
        jsonPlanError(
            403,
            'LIMITE_SUSCRIPCION_ALCANZADO',
            "Branch {$branchId} reached {$limitKey}={$max} on plan '{$plan}'",
            ['recurso' => $recursoLabel, 'limite' => $max, 'plan' => $plan, 'viewerRole' => null],
        );
    }
}

/**
 * Corta la petición si el plan actual de la sucursal no incluye la función
 * dada (ej. 'whatsapp_ai_waiter', 'inventory').
 */
function requirePlanFeature(PDO $db, int $branchId, string $feature, string $featureLabel): void {
    $plan    = currentPlanForBranch($db, $branchId);
    $license = licenseForPlan($plan);

    if (!in_array($feature, $license['features'], true)) {
        jsonPlanError(
            403,
            'FUNCION_NO_DISPONIBLE_PLAN',
            "Branch {$branchId} on plan '{$plan}' attempted feature '{$feature}'",
            ['funcion' => $featureLabel, 'plan' => $plan, 'planSugerido' => cheapestPlanWithFeature($feature)],
        );
    }
}

/** Plan más económico que incluye la función dada (para el CTA de upgrade). */
function cheapestPlanWithFeature(string $feature): ?string {
    foreach (['starter', 'pro', 'ai', 'multisucursal'] as $plan) {
        if (in_array($feature, licenseForPlan($plan)['features'], true)) return $plan;
    }
    return null;
}

/**
 * Precio de lista vigente por plan (MXN/mes). Única fuente de verdad para el
 * backend — debe coincidir con SUPERADMIN_PLANS (lib/constants/subscription.ts)
 * y PLANS (app/landing/plans.ts) en el frontend. Se usa para sincronizar
 * subscriptions.price_monthly cuando el superadmin asigna/cambia un plan.
 */
function listPriceForPlan(string $plan): float {
    $map = [
        'trial'         => 0.0,
        'starter'       => 350.0,
        'pro'           => 700.0,
        'ai'            => 1100.0,
        'multisucursal' => 1900.0,
    ];
    return $map[$plan] ?? 0.0;
}

/**
 * Reconstruye el caché del calendario mensual de una sucursal desde la verdad
 * (subscription_payments con meses cubiertos) + el estado de la suscripción.
 * Idempotente: borra y regenera las filas de esa sucursal.
 */
function rebuildSubscriptionCalendar(PDO $db, int $branchId): void {
    $sub   = latestSubscription($db, $branchId);
    $subId = $sub ? (int)$sub['id'] : null;

    // Mapa periodo => datos del pago que lo cubre.
    $pst = $db->prepare(
        "SELECT id, amount, covered_from, months_count, reviewed_at, created_at
         FROM subscription_payments
         WHERE branch_id = ? AND status = 'paid' AND covered_from IS NOT NULL"
    );
    $pst->execute([$branchId]);

    $covered = [];
    foreach ($pst->fetchAll() as $p) {
        $months = max(1, (int)$p['months_count']);
        $share  = round((float)$p['amount'] / $months, 2);
        foreach (coveredMonthsList((string)$p['covered_from'], $months) as $period) {
            $covered[$period] = [
                'payment_id' => (int)$p['id'],
                'amount'     => $share,
                'paid_at'    => $p['reviewed_at'] ?: $p['created_at'],
            ];
        }
    }

    $nowP   = date('Y-m');
    $startP = $sub && !empty($sub['starts_at']) ? date('Y-m', strtotime((string)$sub['starts_at'])) : $nowP;
    $keys   = array_keys($covered);
    $minP   = $keys ? min(array_merge($keys, [$startP])) : $startP;
    $maxP   = $keys ? max(array_merge($keys, [$nowP]))   : $nowP;

    $status     = $sub['status'] ?? null;
    $suspendedP = $sub && !empty($sub['suspended_at'])  ? date('Y-m', strtotime((string)$sub['suspended_at']))  : null;
    $canceledP  = $sub && !empty($sub['terminated_at']) ? date('Y-m', strtotime((string)$sub['terminated_at']))
                : ($sub && !empty($sub['canceled_at'])  ? date('Y-m', strtotime((string)$sub['canceled_at']))   : null);

    $db->prepare('DELETE FROM subscription_calendar WHERE branch_id = ?')->execute([$branchId]);
    $ins = $db->prepare(
        'INSERT INTO subscription_calendar (branch_id, subscription_id, period, status, payment_id, amount, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for ($p = $minP; $p <= $maxP; $p = nextPeriod($p)) {
        if (isset($covered[$p])) {
            $cell = $p > $nowP ? 'prepaid' : 'paid';   // futuro pagado = adelantado
            $ins->execute([$branchId, $subId, $p, $cell, $covered[$p]['payment_id'], $covered[$p]['amount'], $covered[$p]['paid_at']]);
            continue;
        }
        // Mes sin pago.
        if ($canceledP !== null && $p >= $canceledP) {
            $cell = 'canceled';
        } elseif ($suspendedP !== null && $p >= $suspendedP && $status === 'suspended') {
            $cell = 'suspended';
        } elseif ($p <= $nowP) {
            $cell = 'pending';   // mes pasado/actual no cubierto
        } else {
            continue;            // futuro sin cubrir → sin fila
        }
        $ins->execute([$branchId, $subId, $p, $cell, null, null, null]);
    }
}

