<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Recepción y procesamiento de webhooks de Stripe.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../../config/stripe.php';
require_once __DIR__ . '/../../config/subscription_helpers.php';

/**
 * Webhook de Stripe — POST /webhooks/stripe
 * SIN autenticación: se valida con la firma (Stripe-Signature).
 * Sincroniza el estado real de las suscripciones y registra pagos.
 */
function handleWebhooks(array $seg, string $method): never {
    if (($seg[1] ?? '') !== 'stripe') jsonError(404, 'Webhook no encontrado');
    if ($method !== 'POST') jsonError(405, 'Método no permitido');

    $payload   = file_get_contents('php://input') ?: '';
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    $event = stripeVerifyWebhook($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
    if ($event === null) {
        jsonError(400, 'Firma de webhook inválida');
    }

    $db   = Database::connect();
    $type = $event['type'] ?? '';
    $obj  = $event['data']['object'] ?? [];

    try {
        switch ($type) {
            case 'checkout.session.completed':
                webhookCheckoutCompleted($db, $obj);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                webhookSubscriptionUpdated($db, $obj);
                break;
            case 'customer.subscription.deleted':
                webhookSubscriptionDeleted($db, $obj);
                break;
            case 'invoice.paid':
                webhookInvoicePaid($db, $obj);
                break;
            case 'invoice.payment_failed':
                webhookInvoiceFailed($db, $obj);
                break;
            case 'invoice.payment_action_required':
                webhookPaymentActionRequired($db, $obj);
                break;
            default:
                // Evento no manejado: responder 200 para que Stripe no reintente.
                break;
        }
    } catch (Throwable $e) {
        error_log('[FoodIX Stripe webhook] ' . $e->getMessage());
        // 200 igualmente para evitar tormenta de reintentos por errores no recuperables.
    }

    jsonResponse(['received' => true]);
}

// ── Resolución de la suscripción local a partir del objeto Stripe ────────────────
function resolveSubscriptionByStripe(PDO $db, array $obj): ?array {
    // 1) metadata.branch_id (lo enviamos en checkout/subscription_data)
    $branchId = (int)($obj['metadata']['branch_id'] ?? 0);
    if ($branchId) {
        $s = latestSubscription($db, $branchId);
        if ($s) return $s;
    }
    // 2) por stripe_subscription_id
    $subId = $obj['subscription'] ?? ((($obj['object'] ?? '') === 'subscription') ? ($obj['id'] ?? null) : null);
    if ($subId) {
        $stmt = $db->prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$subId]);
        $row = $stmt->fetch();
        if ($row) return $row;
    }
    // 3) por stripe_customer_id
    $customer = $obj['customer'] ?? null;
    if ($customer) {
        $stmt = $db->prepare('SELECT * FROM subscriptions WHERE stripe_customer_id = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$customer]);
        $row = $stmt->fetch();
        if ($row) return $row;
    }
    return null;
}

/** Mapea el estado de Stripe a nuestro ENUM. */
function mapStripeStatus(string $stripeStatus): string {
    return match ($stripeStatus) {
        'active'             => 'active',
        'trialing'           => 'trial',
        'past_due'           => 'past_due',
        'unpaid'             => 'payment_failed',
        'incomplete',
        'incomplete_expired' => 'payment_failed',
        'canceled'           => 'canceled',
        default              => 'past_due',
    };
}

function webhookCheckoutCompleted(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $db->prepare(
        'UPDATE subscriptions
         SET stripe_customer_id = COALESCE(?, stripe_customer_id),
             stripe_subscription_id = COALESCE(?, stripe_subscription_id),
             payment_method = ?, status = ?
         WHERE id = ?'
    )->execute([
        $obj['customer']     ?? null,
        $obj['subscription'] ?? null,
        'card', 'active', (int)$sub['id'],
    ]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_checkout_completed', $sub['status'], 'active', null, null);
    $db->prepare('UPDATE branches SET active = 1, sessions_revoked_at = NULL WHERE id = ?')
       ->execute([(int)$sub['branch_id']]);
}

function webhookSubscriptionUpdated(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $newStatus = mapStripeStatus((string)($obj['status'] ?? ''));
    $priceId   = $obj['items']['data'][0]['price']['id'] ?? null;
    $periodStart = isset($obj['current_period_start']) ? date('Y-m-d H:i:s', (int)$obj['current_period_start']) : $sub['starts_at'];
    $periodEnd   = isset($obj['current_period_end'])   ? date('Y-m-d H:i:s', (int)$obj['current_period_end'])   : $sub['expires_at'];
    $cancelAtEnd = !empty($obj['cancel_at_period_end']) ? 1 : 0;

    $db->prepare(
        'UPDATE subscriptions
         SET stripe_subscription_id = ?, stripe_price_id = COALESCE(?, stripe_price_id),
             status = ?, payment_method = ?, starts_at = ?, expires_at = ?,
             cancel_at_period_end = ?
         WHERE id = ?'
    )->execute([
        $obj['id'] ?? $sub['stripe_subscription_id'],
        $priceId, $newStatus, 'card', $periodStart, $periodEnd, $cancelAtEnd, (int)$sub['id'],
    ]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_subscription_updated', $sub['status'], $newStatus, null, null);
}

function webhookSubscriptionDeleted(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $db->prepare('UPDATE subscriptions SET status = ?, canceled_at = NOW(), cancel_at_period_end = 1 WHERE id = ?')
       ->execute(['canceled', (int)$sub['id']]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_subscription_deleted', $sub['status'], 'canceled', null, null);
}

function webhookInvoicePaid(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $invoiceId = $obj['id'] ?? null;
    $amount    = isset($obj['amount_paid']) ? ((int)$obj['amount_paid']) / 100 : (float)$sub['price_monthly'];
    $currency  = strtoupper((string)($obj['currency'] ?? ($sub['currency'] ?? 'MXN')));

    // Idempotencia: no duplicar el mismo invoice.
    if ($invoiceId) {
        $stmt = $db->prepare('SELECT id FROM subscription_payments WHERE stripe_invoice_id = ? LIMIT 1');
        $stmt->execute([$invoiceId]);
        if ($stmt->fetch()) return;
    }

    $db->prepare(
        "INSERT INTO subscription_payments
            (branch_id, subscription_id, amount, currency, status, payment_method, stripe_invoice_id, stripe_payment_intent_id)
         VALUES (?, ?, ?, ?, 'paid', 'card', ?, ?)"
    )->execute([
        (int)$sub['branch_id'], (int)$sub['id'], $amount, $currency,
        $invoiceId, $obj['payment_intent'] ?? null,
    ]);

    $db->prepare('UPDATE subscriptions SET status = ?, payment_method = ?, last_payment_at = NOW() WHERE id = ?')
       ->execute(['active', 'card', (int)$sub['id']]);
    $db->prepare('UPDATE branches SET active = 1, sessions_revoked_at = NULL WHERE id = ?')
       ->execute([(int)$sub['branch_id']]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_invoice_paid', $sub['status'], 'active', null, $invoiceId);
}

function webhookInvoiceFailed(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $invoiceId = $obj['id'] ?? null;
    $amount    = isset($obj['amount_due']) ? ((int)$obj['amount_due']) / 100 : (float)$sub['price_monthly'];
    $currency  = strtoupper((string)($obj['currency'] ?? ($sub['currency'] ?? 'MXN')));

    $db->prepare(
        "INSERT INTO subscription_payments
            (branch_id, subscription_id, amount, currency, status, payment_method, stripe_invoice_id, stripe_payment_intent_id)
         VALUES (?, ?, ?, ?, 'failed', 'card', ?, ?)"
    )->execute([
        (int)$sub['branch_id'], (int)$sub['id'], $amount, $currency,
        $invoiceId, $obj['payment_intent'] ?? null,
    ]);

    $db->prepare('UPDATE subscriptions SET status = ? WHERE id = ?')
       ->execute(['payment_failed', (int)$sub['id']]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_invoice_failed', $sub['status'], 'payment_failed', null, $invoiceId);
}

function webhookPaymentActionRequired(PDO $db, array $obj): void {
    $sub = resolveSubscriptionByStripe($db, $obj);
    if (!$sub) return;

    $db->prepare('UPDATE subscriptions SET status = ? WHERE id = ?')
       ->execute(['past_due', (int)$sub['id']]);
    subscriptionAudit($db, (int)$sub['branch_id'], (int)$sub['id'], 'stripe_payment_action_required', $sub['status'], 'past_due', null, null);
}
