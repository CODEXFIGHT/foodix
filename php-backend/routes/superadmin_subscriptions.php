<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Administración de suscripciones (superadmin).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';
require_once __DIR__ . '/../config/trial_service.php';

/**
 * Rutas de administración SaaS (solo superadmin).
 *   GET    /superadmin/subscriptions
 *   GET    /superadmin/subscriptions/{branchId}
 *   POST   /superadmin/subscriptions/{branchId}/suspend|reactivate|cancel|terminate
 *   POST   /superadmin/bank-transfers/{paymentId}/approve|reject
 */
function handleSuperadminSubscriptions(array $seg, string $method): never {
    $payload = requireAuth();
    requireRole($payload, 'superadmin');

    $db       = Database::connect();
    $resource = $seg[1] ?? '';

    if ($resource === 'subscriptions') {
        $branchId = isset($seg[2]) ? (int)$seg[2] : 0;
        $action   = $seg[3] ?? '';

        // Lista global
        if (!$branchId && $method === 'GET') {
            superadminListSubscriptions($db);
        }
        // Detalle
        if ($branchId && !$action && $method === 'GET') {
            superadminSubscriptionDetail($db, $branchId);
        }
        // Calendario mensual de pagos (caché híbrido)
        if ($branchId && $action === 'calendar' && $method === 'GET') {
            superadminSubscriptionCalendar($db, $branchId);
        }
        // Registrar pago manual
        if ($branchId && $action === 'register-payment' && $method === 'POST') {
            superadminRegisterManualPayment($db, $branchId, (int)$payload['sub']);
        }
        // Extensión de la prueba gratuita (acción exclusiva del superadmin).
        if ($branchId && $action === 'extend-trial' && $method === 'POST') {
            superadminExtendTrial($db, $branchId, (int)$payload['sub']);
        }
        // Acciones de estado
        if ($branchId && $action && $method === 'POST') {
            superadminBranchAction($db, $branchId, $action, (int)$payload['sub']);
        }
        jsonError(404, 'Ruta no encontrada');
    }

    if ($resource === 'bank-transfers') {
        $paymentId = isset($seg[2]) ? (int)$seg[2] : 0;
        $action    = $seg[3] ?? '';
        if ($paymentId && $action && $method === 'POST') {
            superadminBankTransfer($db, $paymentId, $action, (int)$payload['sub']);
        }
        jsonError(404, 'Ruta no encontrada');
    }

    // Panel de Trials: métricas + tabla filtrable.
    if ($resource === 'trials') {
        if ($method === 'GET') {
            superadminTrials($db);
        }
        jsonError(405, 'Método no permitido');
    }

    if ($resource === 'branch-sales') {
        if ($method === 'GET') {
            superadminBranchSales($db);
        }
        jsonError(405, 'Método no permitido');
    }

    // Dashboard de KPIs del Billing CRM.
    if ($resource === 'dashboard') {
        if ($method === 'GET') {
            superadminDashboardKpis($db);
        }
        jsonError(405, 'Método no permitido');
    }

    jsonError(404, 'Ruta no encontrada');
}

// ── Lista global de suscripciones ───────────────────────────────────────────────
function superadminListSubscriptions(PDO $db): never {
    // Una suscripción (la más reciente) por sucursal + datos del admin + último pago.
    $rows = $db->query(
        "SELECT
            b.id            AS branch_id,
            b.name          AS branch_name,
            b.slug          AS branch_slug,
            b.phone         AS branch_phone,
            b.logo_url      AS branch_logo_url,
            b.active        AS branch_active,
            s.id            AS subscription_id,
            s.plan, s.status, s.starts_at, s.expires_at, s.max_devices,
            s.price_monthly, s.currency, s.payment_method,
            s.stripe_customer_id, s.stripe_subscription_id,
            s.cancel_at_period_end, s.last_payment_at,
            u.name          AS admin_name,
            u.email         AS admin_email,
            DATEDIFF(s.expires_at, NOW()) AS days_remaining
         FROM branches b
         LEFT JOIN subscriptions s
            ON s.id = (SELECT id FROM subscriptions WHERE branch_id = b.id ORDER BY id DESC LIMIT 1)
         LEFT JOIN users u
            ON u.id = (SELECT id FROM users WHERE branch_id = b.id AND role = 'admin' ORDER BY id ASC LIMIT 1)
         ORDER BY b.name ASC"
    )->fetchAll();

    $items = array_map(fn($r) => [
        'branch_id'              => (int)$r['branch_id'],
        'branch_name'            => $r['branch_name'],
        'branch_slug'            => $r['branch_slug'],
        'branch_phone'           => $r['branch_phone'],
        'branch_logo_url'        => $r['branch_logo_url'] ?: null,
        'branch_active'          => (bool)$r['branch_active'],
        'subscription_id'        => $r['subscription_id'] !== null ? (int)$r['subscription_id'] : null,
        'plan'                   => $r['plan'],
        'status'                 => $r['status'],
        'starts_at'              => $r['starts_at'],
        'expires_at'             => $r['expires_at'],
        'max_devices'            => $r['max_devices'] !== null ? (int)$r['max_devices'] : null,
        'price_monthly'          => $r['price_monthly'] !== null ? (float)$r['price_monthly'] : 0,
        'currency'               => $r['currency'] ?? 'MXN',
        'payment_method'         => $r['payment_method'],
        'stripe_customer_id'     => $r['stripe_customer_id'],
        'stripe_subscription_id' => $r['stripe_subscription_id'],
        'cancel_at_period_end'   => (bool)$r['cancel_at_period_end'],
        'last_payment_at'        => $r['last_payment_at'],
        'admin_name'             => $r['admin_name'],
        'admin_email'            => $r['admin_email'],
        'days_remaining'         => $r['days_remaining'] !== null ? (int)$r['days_remaining'] : null,
    ], $rows);

    // Métricas agregadas para el dashboard.
    $metrics = [
        'total'             => count($items),
        'active'            => 0,
        'trial'             => 0,
        'past_due'          => 0,
        'suspended'         => 0,
        'expired'           => 0,
        'canceled'          => 0,
        'terminated'        => 0,
        'pending_transfer'  => 0,
        'monthly_revenue'   => 0.0,
    ];
    foreach ($items as $it) {
        switch ($it['status']) {
            case 'active':    $metrics['active']++;    $metrics['monthly_revenue'] += $it['price_monthly']; break;
            case 'trial':     $metrics['trial']++;     break;
            case 'past_due':  $metrics['past_due']++;  $metrics['monthly_revenue'] += $it['price_monthly']; break;
            case 'suspended': $metrics['suspended']++; break;
            case 'expired':   $metrics['expired']++;   break;
            case 'canceled':  $metrics['canceled']++;  break;
            case 'terminated':$metrics['terminated']++;break;
        }
        if (in_array($it['status'], ['pending_bank_transfer', 'bank_transfer_review'], true)) {
            $metrics['pending_transfer']++;
        }
    }

    jsonResponse(['items' => $items, 'metrics' => $metrics]);
}

// ── Detalle de una sucursal ──────────────────────────────────────────────────────
function superadminSubscriptionDetail(PDO $db, int $branchId): never {
    $stmt = $db->prepare('SELECT * FROM branches WHERE id = ?');
    $stmt->execute([$branchId]);
    $branch = $stmt->fetch();
    if (!$branch) jsonError(404, 'Sucursal no encontrada');

    $sub = latestSubscription($db, $branchId);

    $stmt = $db->prepare("SELECT id, name, email FROM users WHERE branch_id = ? AND role = 'admin' ORDER BY id ASC LIMIT 1");
    $stmt->execute([$branchId]);
    $admin = $stmt->fetch() ?: null;

    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE branch_id = ? ORDER BY id DESC LIMIT 50');
    $stmt->execute([$branchId]);
    $payments = $stmt->fetchAll();

    $stmt = $db->prepare(
        'SELECT a.*, u.name AS performed_by_name
         FROM subscription_audit_log a
         LEFT JOIN users u ON u.id = a.performed_by
         WHERE a.branch_id = ? ORDER BY a.id DESC LIMIT 50'
    );
    $stmt->execute([$branchId]);
    $audit = $stmt->fetchAll();

    $daysRemaining = null;
    if ($sub && !empty($sub['expires_at'])) {
        $daysRemaining = (int) floor((strtotime($sub['expires_at']) - time()) / 86400);
    }

    jsonResponse([
        'branch'         => [
            'id'      => (int)$branch['id'],
            'name'    => $branch['name'],
            'slug'    => $branch['slug'],
            'phone'   => $branch['phone'],
            'address' => $branch['address'],
            'active'  => (bool)$branch['active'],
        ],
        'admin'          => $admin,
        'subscription'   => $sub,
        'days_remaining' => $daysRemaining,
        'payments'       => $payments,
        'audit_log'      => $audit,
    ]);
}

// ── Acciones de estado (suspend/reactivate/cancel/terminate) ─────────────────────
function superadminBranchAction(PDO $db, int $branchId, string $action, int $performedBy): never {
    $body = getBody();
    $sub  = latestSubscription($db, $branchId);
    if (!$sub) jsonError(404, 'Suscripción no encontrada');

    $prev   = $sub['status'];
    $subId  = (int)$sub['id'];
    $now    = date('Y-m-d H:i:s');

    switch ($action) {
        case 'suspend':
            $db->prepare('UPDATE subscriptions SET status = ?, suspended_at = ? WHERE id = ?')
               ->execute(['suspended', $now, $subId]);
            // Cierra la sesión en todos los dispositivos de la sucursal al instante.
            $db->prepare('UPDATE branches SET sessions_revoked_at = ? WHERE id = ?')
               ->execute([$now, $branchId]);
            $new = 'suspended';
            break;

        case 'reactivate':
            // Reactivar: si el periodo ya venció, extender 30 días desde hoy.
            $expired = strtotime($sub['expires_at']) < time();
            if ($expired) {
                $db->prepare('UPDATE subscriptions SET status = ?, suspended_at = NULL, starts_at = ?, expires_at = ? WHERE id = ?')
                   ->execute(['active', $now, date('Y-m-d H:i:s', strtotime('+1 month')), $subId]);
            } else {
                $db->prepare('UPDATE subscriptions SET status = ?, suspended_at = NULL WHERE id = ?')
                   ->execute(['active', $subId]);
            }
            // Reactivar el login de la sucursal y permitir nuevas sesiones.
            $db->prepare('UPDATE branches SET active = 1, sessions_revoked_at = NULL WHERE id = ?')
               ->execute([$branchId]);
            $new = 'active';
            break;

        case 'cancel':
            // Cancelar: no renueva al final del periodo y cierra la sesión en todos
            // los dispositivos al instante (el admin puede re-entrar solo a pagar).
            $db->prepare('UPDATE subscriptions SET status = ?, cancel_at_period_end = 1, canceled_at = ? WHERE id = ?')
               ->execute(['canceled', $now, $subId]);
            $db->prepare('UPDATE branches SET sessions_revoked_at = ? WHERE id = ?')
               ->execute([$now, $branchId]);
            $new = 'canceled';
            break;

        case 'terminate':
            // Baja definitiva (soft delete): bloquea login y operación, conserva historial.
            $name = trim((string)($body['confirm_name'] ?? ''));
            $stmt = $db->prepare('SELECT name FROM branches WHERE id = ?');
            $stmt->execute([$branchId]);
            $branchName = (string)$stmt->fetchColumn();
            if ($name !== $branchName) {
                jsonError(422, 'El nombre de confirmación no coincide con la sucursal');
            }
            $db->prepare('UPDATE subscriptions SET status = ?, terminated_at = ? WHERE id = ?')
               ->execute(['terminated', $now, $subId]);
            // Baja: desactiva el login de la sucursal y cierra todas las sesiones.
            $db->prepare('UPDATE branches SET active = 0, sessions_revoked_at = ? WHERE id = ?')
               ->execute([$now, $branchId]);
            $new = 'terminated';
            break;

        default:
            jsonError(404, 'Acción no válida');
    }

    subscriptionAudit($db, $branchId, $subId, $action, $prev, $new, $performedBy, $body['note'] ?? null);

    $updated = latestSubscription($db, $branchId);
    jsonResponse(['subscription' => $updated]);
}

// ── Aprobar / rechazar transferencia bancaria ────────────────────────────────────
function superadminBankTransfer(PDO $db, int $paymentId, string $action, int $performedBy): never {
    $body = getBody();

    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE id = ?');
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch();
    if (!$payment) jsonError(404, 'Pago no encontrado');

    $branchId = (int)$payment['branch_id'];
    $sub      = latestSubscription($db, $branchId);
    $subId    = $sub ? (int)$sub['id'] : null;
    $prev     = $sub['status'] ?? null;
    $now      = date('Y-m-d H:i:s');

    if ($action === 'approve') {
        $db->prepare(
            'UPDATE subscription_payments
             SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = NULL
             WHERE id = ?'
        )->execute(['paid', $performedBy, $now, $paymentId]);

        if ($subId) {
            $db->prepare(
                'UPDATE subscriptions
                 SET status = ?, payment_method = ?, starts_at = ?, expires_at = ?, last_payment_at = ?
                 WHERE id = ?'
            )->execute(['active', 'bank_transfer', $now, date('Y-m-d H:i:s', strtotime('+1 month')), $now, $subId]);
            // Pago aprobado: reactiva el login y permite nuevas sesiones.
            $db->prepare('UPDATE branches SET active = 1, sessions_revoked_at = NULL WHERE id = ?')
               ->execute([$branchId]);
        }
        subscriptionAudit($db, $branchId, $subId, 'approve_transfer', $prev, 'active', $performedBy, 'Pago #' . $paymentId);
    } elseif ($action === 'reject') {
        $reason = trim((string)($body['rejection_reason'] ?? ''));
        if ($reason === '') jsonError(422, 'Motivo de rechazo requerido');

        $db->prepare(
            'UPDATE subscription_payments
             SET status = ?, reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
             WHERE id = ?'
        )->execute(['rejected', $performedBy, $now, $reason, $paymentId]);

        if ($subId) {
            $db->prepare('UPDATE subscriptions SET status = ? WHERE id = ?')
               ->execute(['pending_bank_transfer', $subId]);
        }
        subscriptionAudit($db, $branchId, $subId, 'reject_transfer', $prev, 'pending_bank_transfer', $performedBy, $reason);
    } else {
        jsonError(404, 'Acción no válida');
    }

    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE id = ?');
    $stmt->execute([$paymentId]);
    jsonResponse(['payment' => $stmt->fetch()]);
}

// ── Ventas del día por sucursal ──────────────────────────────────────────────

function superadminBranchSales(PDO $db): never {
    $date = strParam('date', date('Y-m-d'));

    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonError(422, 'Formato de fecha inválido (YYYY-MM-DD)');
    }

    $stmt = $db->prepare(
        'SELECT
            b.id   AS branch_id,
            b.name AS branch_name,
            b.logo_url AS branch_logo_url,
            b.active AS branch_active,
            COALESCE(SUM(o.total), 0) AS revenue,
            COUNT(o.id) AS order_count,
            CASE WHEN COUNT(o.id) > 0
                 THEN ROUND(SUM(o.total) / COUNT(o.id), 2)
                 ELSE 0
            END AS avg_ticket
         FROM branches b
         LEFT JOIN orders o
           ON o.branch_id = b.id
          AND o.status = \'completed\'
          AND DATE(o.created_at) = ?
         GROUP BY b.id, b.name, b.logo_url
         ORDER BY revenue DESC, b.name ASC'
    );
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    $branches = array_map(fn($r) => [
        'branch_id'       => (int)$r['branch_id'],
        'branch_name'     => $r['branch_name'],
        'branch_logo_url' => $r['branch_logo_url'],
        'branch_active'   => (bool)$r['branch_active'],
        'revenue'         => (float)$r['revenue'],
        'order_count'     => (int)$r['order_count'],
        'avg_ticket'      => (float)$r['avg_ticket'],
    ], $rows);

    $totalRevenue = array_sum(array_column($rows, 'revenue'));
    $totalOrders  = array_sum(array_column($rows, 'order_count'));

    jsonResponse([
        'date'     => $date,
        'branches' => $branches,
        'totals'   => [
            'revenue'     => (float)$totalRevenue,
            'order_count' => (int)$totalOrders,
            'avg_ticket'  => $totalOrders > 0 ? round((float)$totalRevenue / $totalOrders, 2) : 0,
        ],
    ]);
}

// ── Registrar pago manual (1 o varios meses · adelantado) ───────────────────
function superadminRegisterManualPayment(PDO $db, int $branchId, int $performedBy): never {
    $body        = getBody();
    $amount      = round((float)($body['amount'] ?? 0), 2);
    $reference   = trim((string)($body['reference'] ?? ''));
    $notes       = trim((string)($body['notes'] ?? '')) ?: null;
    $receiptUrl  = trim((string)($body['receipt_url'] ?? '')) ?: null;
    $paymentDate = trim((string)($body['payment_date'] ?? '')) ?: date('Y-m-d');
    $monthsCount = max(1, (int)($body['months_count'] ?? 1));

    // Método de pago (Billing CRM). Compatibilidad: 'bank_transfer' → 'transfer'.
    $allowedMethods = ['card','bank_transfer','spei','cash','transfer','mercado_pago','stripe','other'];
    $method = (string)($body['payment_method'] ?? 'transfer');
    if (!in_array($method, $allowedMethods, true)) $method = 'transfer';

    if ($amount <= 0) jsonError(422, 'El monto debe ser mayor a 0');

    $sub   = latestSubscription($db, $branchId);
    $subId = $sub ? (int)$sub['id'] : null;
    $prev  = $sub['status'] ?? null;
    $now   = date('Y-m-d H:i:s');

    // Mes inicial cubierto: el que indique el body, o el que sigue al periodo
    // vigente (encadena pagos sin huecos), o el mes actual si está vencida.
    $coveredFromRaw = trim((string)($body['covered_from'] ?? ''));
    if ($coveredFromRaw !== '') {
        $coveredFrom = firstOfMonth($coveredFromRaw);
    } elseif ($sub && !empty($sub['expires_at']) && strtotime((string)$sub['expires_at']) >= strtotime('today')) {
        // Vigente: el nuevo periodo arranca el mes siguiente al vencimiento actual.
        $coveredFrom = date('Y-m-01', strtotime((string)$sub['expires_at'] . ' +1 day'));
    } else {
        $coveredFrom = date('Y-m-01');
    }

    $coveredMonths = coveredMonthsList($coveredFrom, $monthsCount);
    $coveredTo     = firstOfMonth(end($coveredMonths) . '-01');
    $newExpiresAt  = coveredPeriodEnd($coveredFrom, $monthsCount);

    $db->beginTransaction();
    try {
        // 1) Pago como 'paid' con el rango de meses cubierto.
        $db->prepare(
            'INSERT INTO subscription_payments
                (branch_id, subscription_id, amount, currency, status, payment_method,
                 bank_reference, bank_transfer_date, covered_from, covered_to, months_count,
                 notes, receipt_url, created_by, reviewed_by, reviewed_at)
             VALUES (?, ?, ?, ?, \'paid\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $branchId, $subId, $amount, $sub['currency'] ?? 'MXN', $method,
            $reference ?: null, $paymentDate, $coveredFrom, $coveredTo, $monthsCount,
            $notes, $receiptUrl, $performedBy, $performedBy, $now,
        ]);
        $paymentId = (int)$db->lastInsertId();

        // 2) Actualizar suscripción: extender vencimiento sin acortarlo nunca.
        if ($subId) {
            $startsAt = ($sub && !empty($sub['starts_at'])) ? (string)$sub['starts_at'] : firstOfMonth($coveredFrom) . ' 00:00:00';
            $expires  = ($sub && !empty($sub['expires_at']) && strtotime((string)$sub['expires_at']) > strtotime($newExpiresAt))
                ? (string)$sub['expires_at'] : $newExpiresAt;
            $db->prepare(
                'UPDATE subscriptions
                 SET status = \'active\', payment_method = ?, starts_at = ?, expires_at = ?,
                     last_payment_at = ?, cancel_at_period_end = 0, suspended_at = NULL
                 WHERE id = ?'
            )->execute([
                in_array($method, ['card','stripe'], true) ? 'card' : 'bank_transfer',
                $startsAt, $expires, $now, $subId,
            ]);

            // 3) Reactivar acceso de la sucursal.
            $db->prepare('UPDATE branches SET active = 1, sessions_revoked_at = NULL WHERE id = ?')
               ->execute([$branchId]);
        }

        // 4) Reconstruir el caché del calendario desde la verdad (los pagos).
        rebuildSubscriptionCalendar($db, $branchId);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    // 5) Auditoría con detalle de los meses cubiertos.
    subscriptionAudit(
        $db, $branchId, $subId, 'register_manual_payment', $prev, 'active', $performedBy,
        sprintf('Pago manual #%d · %s · %d mes(es) [%s] · Ref: %s',
            $paymentId, $method, $monthsCount, implode(', ', $coveredMonths), $reference ?: '—')
    );

    jsonResponse([
        'success'        => true,
        'payment_id'     => $paymentId,
        'covered_months' => $coveredMonths,
        'new_expires_at' => $newExpiresAt,
    ], 201);
}

// ── Dashboard de KPIs (Billing CRM) ─────────────────────────────────────────
function superadminDashboardKpis(PDO $db): never {
    // Una suscripción (la más reciente) por sucursal.
    $subs = $db->query(
        "SELECT s.*, DATEDIFF(s.expires_at, NOW()) AS days_remaining
         FROM subscriptions s
         WHERE s.id = (SELECT id FROM subscriptions WHERE branch_id = s.branch_id ORDER BY id DESC LIMIT 1)"
    )->fetchAll();

    $kpi = [
        'active' => 0, 'trial' => 0, 'suspended' => 0, 'canceled' => 0,
        'grace' => 0, 'past_due' => 0, 'expired' => 0, 'pending_transfer' => 0,
        'due_this_week' => 0, 'prepaid_clients' => 0,
        'mrr' => 0.0, 'arr' => 0.0,
    ];

    $today    = strtotime('today');
    $weekAhead = strtotime('+7 day', $today);

    foreach ($subs as $s) {
        $eff   = effectiveSubscriptionStatus($s);          // considera vencida por fecha
        $price = (float)($s['price_monthly'] ?? 0);

        // Periodo de gracia: vencida por fecha pero aún dentro de la gracia.
        if (subscriptionInGrace($s) && in_array($s['status'], ['active','trial','past_due'], true)) {
            $kpi['grace']++;
        }

        switch ($eff) {
            case 'active':     $kpi['active']++;   $kpi['mrr'] += $price; break;
            case 'trial':      $kpi['trial']++;    break;
            case 'past_due':   $kpi['past_due']++; $kpi['mrr'] += $price; break;
            case 'suspended':  $kpi['suspended']++; break;
            case 'expired':    $kpi['expired']++;  break;
            case 'canceled':   $kpi['canceled']++; break;
            case 'terminated': $kpi['canceled']++; break;
        }
        if (in_array($s['status'], ['pending_bank_transfer','bank_transfer_review'], true)) {
            $kpi['pending_transfer']++;
        }

        // Vence esta semana (operable y con vencimiento en los próximos 7 días).
        if (!empty($s['expires_at']) && in_array($eff, ['active','trial','past_due'], true)) {
            $exp = strtotime((string)$s['expires_at']);
            if ($exp !== false && $exp >= $today && $exp <= $weekAhead) $kpi['due_this_week']++;
        }
    }
    $kpi['arr'] = round($kpi['mrr'] * 12, 2);
    $kpi['mrr'] = round($kpi['mrr'], 2);

    // Clientes con meses pagados por adelantado (celdas 'prepaid' en el caché).
    $kpi['prepaid_clients'] = (int)$db->query(
        "SELECT COUNT(DISTINCT branch_id) FROM subscription_calendar WHERE status = 'prepaid'"
    )->fetchColumn();

    // Ingresos del mes y del año (pagos confirmados).
    $rev = $db->query(
        "SELECT
            COALESCE(SUM(CASE WHEN DATE_FORMAT(COALESCE(reviewed_at, created_at), '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                              THEN amount ELSE 0 END), 0) AS month_revenue,
            COALESCE(SUM(CASE WHEN YEAR(COALESCE(reviewed_at, created_at)) = YEAR(NOW())
                              THEN amount ELSE 0 END), 0) AS year_revenue
         FROM subscription_payments WHERE status = 'paid'"
    )->fetch();

    // Próximos cobros (los 8 vencimientos operables más cercanos).
    $upcoming = $db->query(
        "SELECT b.id AS branch_id, b.name AS branch_name, s.expires_at, s.price_monthly, s.currency
         FROM subscriptions s
         JOIN branches b ON b.id = s.branch_id
         WHERE s.id = (SELECT id FROM subscriptions WHERE branch_id = s.branch_id ORDER BY id DESC LIMIT 1)
           AND s.status IN ('active','trial','past_due')
           AND s.expires_at >= NOW()
         ORDER BY s.expires_at ASC LIMIT 8"
    )->fetchAll();

    jsonResponse([
        'kpis' => $kpi,
        'revenue' => [
            'month' => round((float)$rev['month_revenue'], 2),
            'year'  => round((float)$rev['year_revenue'], 2),
        ],
        'upcoming' => array_map(fn($u) => [
            'branch_id'     => (int)$u['branch_id'],
            'branch_name'   => $u['branch_name'],
            'expires_at'    => $u['expires_at'],
            'price_monthly' => (float)$u['price_monthly'],
            'currency'      => $u['currency'] ?? 'MXN',
        ], $upcoming),
    ]);
}

// ── Calendario mensual de pagos de un cliente (caché híbrido) ────────────────
function superadminSubscriptionCalendar(PDO $db, int $branchId): never {
    // Reconstruye el caché si está vacío (p. ej. tras la migración inicial).
    $has = $db->prepare('SELECT COUNT(*) FROM subscription_calendar WHERE branch_id = ?');
    $has->execute([$branchId]);
    if ((int)$has->fetchColumn() === 0) {
        rebuildSubscriptionCalendar($db, $branchId);
    }

    $from = trim((string)($_GET['from'] ?? ''));   // 'YYYY-MM'
    $to   = trim((string)($_GET['to'] ?? ''));

    $sql    = 'SELECT period, status, payment_id, amount, paid_at FROM subscription_calendar WHERE branch_id = ?';
    $params = [$branchId];
    if ($from !== '') { $sql .= ' AND period >= ?'; $params[] = $from; }
    if ($to   !== '') { $sql .= ' AND period <= ?'; $params[] = $to; }
    $sql .= ' ORDER BY period ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $cells = array_map(fn($r) => [
        'period'     => $r['period'],
        'status'     => $r['status'],
        'payment_id' => $r['payment_id'] !== null ? (int)$r['payment_id'] : null,
        'amount'     => $r['amount'] !== null ? (float)$r['amount'] : null,
        'paid_at'    => $r['paid_at'],
    ], $stmt->fetchAll());

    jsonResponse(['branch_id' => $branchId, 'cells' => $cells]);
}

// ── Panel de Trials ─────────────────────────────────────────────────────────────

/**
 * GET /superadmin/trials?filter=active|expired|converted|blocked&q=
 *
 * Devuelve las métricas del embudo y la tabla de pruebas. No expone hashes ni
 * las reglas del antiabuso: solo el nivel de riesgo ya calculado.
 */
function superadminTrials(PDO $db): never {
    $filter = strtolower(trim((string)($_GET['filter'] ?? 'all')));
    $q      = trim((string)($_GET['q'] ?? ''));

    $where  = ["s.trial_seq = 1"];
    $params = [];

    $where[] = match ($filter) {
        'active'    => "s.status = 'trial' AND DATE(s.expires_at) >= CURDATE()",
        'expired'   => "s.plan = 'trial' AND (s.status <> 'trial' OR DATE(s.expires_at) < CURDATE()) AND s.converted_at IS NULL",
        'converted' => "s.converted_at IS NOT NULL",
        'blocked'   => "1 = 0",   // los bloqueos no llegan a crear sucursal (ver trial_attempts)
        default     => '1 = 1',
    };

    if ($q !== '') {
        $where[]  = '(b.name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
        $like     = '%' . $q . '%';
        $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
    }

    $sql = "SELECT b.id AS branch_id, b.name AS branch_name, b.slug, b.active AS branch_active,
                   s.id AS subscription_id, s.plan, s.status, s.trial_started_at, s.trial_ends_at,
                   s.expires_at, s.converted_at, s.trial_source,
                   DATEDIFF(DATE(s.expires_at), CURDATE()) AS days_remaining,
                   u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,
                   (SELECT ta.risk_level FROM trial_attempts ta
                     WHERE ta.branch_id = b.id ORDER BY ta.id DESC LIMIT 1) AS risk_level
            FROM subscriptions s
            JOIN branches b ON b.id = s.branch_id
            LEFT JOIN users u ON u.id = (SELECT id FROM users WHERE branch_id = b.id AND role = 'admin' ORDER BY id ASC LIMIT 1)
            WHERE " . implode(' AND ', $where) . "
            ORDER BY s.trial_started_at DESC, s.id DESC
            LIMIT 500";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $items = array_map(fn($r) => [
        'branch_id'        => (int)$r['branch_id'],
        'branch_name'      => $r['branch_name'],
        'slug'             => $r['slug'],
        'subscription_id'  => $r['subscription_id'] !== null ? (int)$r['subscription_id'] : null,
        'plan'             => $r['plan'],
        'status'           => effectiveSubscriptionStatus($r) ?? $r['status'],
        'trial_started_at' => $r['trial_started_at'],
        'trial_ends_at'    => $r['trial_ends_at'] ?: $r['expires_at'],
        'days_remaining'   => $r['days_remaining'] !== null ? (int)$r['days_remaining'] : null,
        'converted_at'     => $r['converted_at'],
        'trial_source'     => $r['trial_source'],
        'owner_name'       => $r['owner_name'],
        'owner_email'      => $r['owner_email'],
        'owner_phone'      => $r['owner_phone'],
        'risk_level'       => $r['risk_level'] ?: 'low',
    ], $stmt->fetchAll());

    // Métricas del embudo (independientes del filtro de la tabla).
    $m = $db->query(
        "SELECT
            SUM(s.trial_seq = 1) AS started,
            SUM(s.status = 'trial' AND DATE(s.expires_at) >= CURDATE()) AS active,
            SUM(s.plan = 'trial' AND (s.status <> 'trial' OR DATE(s.expires_at) < CURDATE()) AND s.converted_at IS NULL) AS expired,
            SUM(s.converted_at IS NOT NULL) AS converted
         FROM subscriptions s WHERE s.trial_seq = 1"
    )->fetch() ?: [];

    $blocked = (int)$db->query(
        "SELECT COUNT(*) FROM trial_attempts WHERE decision = 'TRIAL_REJECTED'"
    )->fetchColumn();

    $started   = (int)($m['started']   ?? 0);
    $converted = (int)($m['converted'] ?? 0);

    jsonResponse([
        'items'   => $items,
        'metrics' => [
            'started'          => $started,
            'active'           => (int)($m['active']  ?? 0),
            'expired'          => (int)($m['expired'] ?? 0),
            'converted'        => $converted,
            'blocked'          => $blocked,
            'conversion_rate'  => $started > 0 ? round($converted / $started * 100, 1) : 0.0,
        ],
    ]);
}

/**
 * POST /superadmin/subscriptions/{branchId}/extend-trial
 * Body: { days?: 3|7|14|n, until?: 'YYYY-MM-DD', reason?: string }
 *
 * Solo superadmin (ya validado en handleSuperadminSubscriptions). Un admin de
 * sucursal recibe 403 antes de llegar aquí.
 */
function superadminExtendTrial(PDO $db, int $branchId, int $performedBy): never {
    $body   = getBody();
    $days   = isset($body['days'])  ? (int)$body['days'] : null;
    $until  = isset($body['until']) ? trim((string)$body['until']) : null;
    $reason = trim((string)($body['reason'] ?? ''));

    if ($days === null && ($until === null || $until === '')) {
        jsonError(422, 'Indica los días a extender o una fecha exacta');
    }
    if (mb_strlen($reason) > 255) jsonError(422, 'El motivo es demasiado largo');

    $result = extendTrial($db, $branchId, $days, $until ?: null, $performedBy, $reason ?: null);

    jsonResponse(['success' => true] + $result);
}
