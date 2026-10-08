<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Estado de la suscripción de la sucursal.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';

function handleSubscription(array $seg, string $method): never {
    $branchId = isset($seg[1]) ? (int)$seg[1] : 0;
    if (!$branchId) jsonError(404, 'branch_id requerido');

    $payload = requireAuth();
    requireRole($payload, 'admin', 'superadmin');

    // Admin solo puede ver su propia sucursal
    if ($payload['role'] === 'admin' && (int)$payload['branch_id'] !== $branchId) {
        jsonError(403, 'Sin acceso a esta sucursal');
    }

    $db = Database::connect();

    if ($method === 'GET') {
        $stmt = $db->prepare(
            'SELECT s.id, s.plan, s.status, s.starts_at, s.expires_at, s.max_devices,
                    s.price_monthly, s.currency, s.payment_method,
                    s.stripe_customer_id, s.stripe_subscription_id, s.stripe_price_id,
                    s.cancel_at_period_end, s.canceled_at, s.suspended_at,
                    s.terminated_at, s.trial_ends_at, s.last_payment_at,
                    (SELECT COUNT(*) FROM devices d
                     WHERE d.branch_id = s.branch_id AND d.status = \'approved\') AS active_devices_count
             FROM subscriptions s WHERE s.branch_id = ? ORDER BY s.id DESC LIMIT 1'
        );
        $stmt->execute([$branchId]);
        $sub = $stmt->fetch();
        if (!$sub) jsonError(404, 'Suscripción no encontrada');

        // Estado efectivo: refleja el vencimiento por fecha de inmediato.
        require_once __DIR__ . '/../config/subscription_helpers.php';

        jsonResponse([
            'id'                   => (int)$sub['id'],
            'plan'                 => $sub['plan'],
            'status'               => effectiveSubscriptionStatus($sub) ?? $sub['status'],
            'starts_at'            => $sub['starts_at'],
            'expires_at'           => $sub['expires_at'],
            'max_devices'          => (int)$sub['max_devices'],
            'active_devices_count' => (int)$sub['active_devices_count'],
            'price_monthly'        => (float)$sub['price_monthly'],
            'currency'             => $sub['currency'],
            'payment_method'       => $sub['payment_method'],
            'stripe_customer_id'   => $sub['stripe_customer_id'],
            'stripe_subscription_id' => $sub['stripe_subscription_id'],
            'stripe_price_id'      => $sub['stripe_price_id'],
            'cancel_at_period_end' => (bool)$sub['cancel_at_period_end'],
            'canceled_at'          => $sub['canceled_at'],
            'suspended_at'         => $sub['suspended_at'],
            'terminated_at'        => $sub['terminated_at'],
            'trial_ends_at'        => $sub['trial_ends_at'],
            'last_payment_at'      => $sub['last_payment_at'],
        ]);
    }

    if ($method === 'PATCH') {
        requireRole($payload, 'superadmin');
        $body = getBody();

        $allowed = ['plan', 'status', 'expires_at', 'max_devices', 'starts_at', 'price_monthly'];
        $set     = [];
        $params  = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $set[]    = "$field = ?";
                $params[] = $body[$field];
            }
        }

        // Al cambiar de plan sin especificar precio explícito, sincroniza
        // price_monthly con el precio de lista vigente (misma fuente que la
        // landing/superadmin) — evita que quede desfasado, ej. un plan "Pro"
        // mostrando $700 cuando la tarifa actual es $1,100.
        if (array_key_exists('plan', $body) && !array_key_exists('price_monthly', $body)) {
            $set[]    = 'price_monthly = ?';
            $params[] = listPriceForPlan((string)$body['plan']);
        }

        if (!$set) jsonError(422, 'Sin campos para actualizar');

        // Conversión trial → plan de pago: se marca ANTES de escribir el nuevo
        // plan, para poder detectar el estado anterior. Solo deja la marca de
        // conversión (converted_at) — no reinicia ni reabre el trial.
        $wasTrial = (string)($db->query('SELECT plan FROM subscriptions WHERE branch_id = ' . $branchId . ' ORDER BY id DESC LIMIT 1')->fetchColumn() ?: '');
        $newPlan  = array_key_exists('plan', $body) ? (string)$body['plan'] : null;

        $params[] = $branchId;

        // Upsert: update si existe, insert si no
        $stmt = $db->prepare('SELECT id FROM subscriptions WHERE branch_id = ? LIMIT 1');
        $stmt->execute([$branchId]);
        $exists = $stmt->fetch();

        if ($exists) {
            $db->prepare('UPDATE subscriptions SET ' . implode(', ', $set) . ', updated_at = NOW() WHERE branch_id = ?')
               ->execute($params);

            if ($wasTrial === 'trial' && $newPlan !== null && $newPlan !== 'trial') {
                require_once __DIR__ . '/../config/trial_service.php';
                markTrialConverted($db, $branchId);
            }
        } else {
            // Insert con defaults
            $starts  = $body['starts_at']  ?? date('Y-m-d H:i:s');
            $expires = $body['expires_at'] ?? date('Y-m-d H:i:s', strtotime('+30 days'));
            $plan    = $body['plan']       ?? 'trial';
            $status  = $body['status']     ?? 'active';
            $maxDev  = (int)($body['max_devices'] ?? 2);
            $price   = array_key_exists('price_monthly', $body)
                ? (float)$body['price_monthly'] : listPriceForPlan((string)$plan);

            $db->prepare(
                'INSERT INTO subscriptions (branch_id, plan, status, starts_at, expires_at, max_devices, price_monthly)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$branchId, $plan, $status, $starts, $expires, $maxDev, $price]);
        }

        // Fetch updated
        $stmt = $db->prepare(
            'SELECT plan, status, starts_at, expires_at, max_devices FROM subscriptions WHERE branch_id = ? ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$branchId]);
        jsonResponse($stmt->fetch());
    }

    jsonError(405, 'Método no permitido');
}
