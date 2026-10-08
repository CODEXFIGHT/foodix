<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Endpoints de facturación y pago de suscripciones.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/subscription_helpers.php';
require_once __DIR__ . '/../config/stripe.php';
require_once __DIR__ . '/../config/receipt_upload.php';

/**
 * Billing del admin de sucursal.
 *   GET  /billing/me                     → suscripción + pagos + datos SPEI
 *   POST /billing/bank-transfer-intent   → genera referencia y deja la suscripción pendiente de pago
 *   POST /billing/bank-transfer-submit   → el admin reporta su transferencia (queda en revisión)
 *
 * (Fase 3 añadirá aquí create-checkout-session / create-portal-session de Stripe.)
 */
function handleBilling(array $seg, string $method): never {
    $payload = requireAuth();
    requireRole($payload, 'admin');

    $branchId = (int)($payload['branch_id'] ?? 0);
    if (!$branchId) jsonError(403, 'El usuario no pertenece a una sucursal');

    $db     = Database::connect();
    $action = $seg[1] ?? 'me';

    if ($action === 'me' && $method === 'GET') {
        billingMe($db, $branchId);
    }
    if ($action === 'bank-transfer-intent' && $method === 'POST') {
        billingBankTransferIntent($db, $branchId);
    }
    if ($action === 'bank-transfer-submit' && $method === 'POST') {
        billingBankTransferSubmit($db, $branchId);
    }
    if ($action === 'upload-receipt' && $method === 'POST') {
        billingUploadReceipt();
    }
    if ($action === 'create-checkout-session' && $method === 'POST') {
        billingCreateCheckout($db, $branchId, (int)$payload['sub']);
    }
    if ($action === 'create-portal-session' && $method === 'POST') {
        billingCreatePortal($db, $branchId);
    }
    if ($action === 'create-subscription' && $method === 'POST') {
        billingCreateSubscription($db, $branchId, (int)$payload['sub']);
    }

    jsonError(404, 'Ruta no encontrada');
}

// ── Stripe Elements: crear suscripción embebida (Payment Element) ─────────────────
function billingCreateSubscription(PDO $db, int $branchId, int $userId): never {
    if (!stripeConfigured()) {
        jsonError(503, 'El pago con tarjeta aún no está disponible. Usa transferencia.');
    }

    $sub = latestSubscription($db, $branchId);
    if (!$sub) jsonError(404, 'Suscripción no encontrada');

    // Evitar duplicar una suscripción activa de Stripe.
    if (!empty($sub['stripe_subscription_id']) && in_array($sub['status'], ['active', 'trial', 'past_due'], true)) {
        jsonError(409, 'Ya tienes una suscripción activa. Usa "Actualizar método de pago".');
    }

    // Reutilizar o crear Stripe Customer.
    $customerId = $sub['stripe_customer_id'] ?: null;
    if (!$customerId) {
        $stmt = $db->prepare('SELECT email, name FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch() ?: [];
        $customer = stripeRequest('POST', 'customers', [
            'email'               => $user['email'] ?? '',
            'name'                => $user['name']  ?? '',
            'metadata[branch_id]' => (string)$branchId,
        ]);
        $customerId = $customer['id'];
        $db->prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE id = ?')
           ->execute([$customerId, (int)$sub['id']]);
    }

    // Crear la suscripción incompleta y exponer el PaymentIntent para el Payment Element.
    $subscription = stripeRequest('POST', 'subscriptions', [
        'customer'                                   => $customerId,
        'items[0][price]'                            => STRIPE_PRICE_ID_MONTHLY_RESTAUROS,
        'payment_behavior'                           => 'default_incomplete',
        'payment_settings[save_default_payment_method]' => 'on_subscription',
        'expand[0]'                                  => 'latest_invoice.payment_intent',
        'metadata[branch_id]'                        => (string)$branchId,
    ]);

    $clientSecret = $subscription['latest_invoice']['payment_intent']['client_secret'] ?? null;
    if (!$clientSecret) jsonError(502, 'No se pudo iniciar el pago con Stripe');

    // Guardar referencias (el webhook confirmará el estado final al pagar).
    $db->prepare('UPDATE subscriptions SET stripe_subscription_id = ?, stripe_price_id = ? WHERE id = ?')
       ->execute([$subscription['id'], STRIPE_PRICE_ID_MONTHLY_RESTAUROS, (int)$sub['id']]);

    jsonResponse([
        'subscription_id' => $subscription['id'],
        'client_secret'   => $clientSecret,
    ]);
}

// ── Stripe: crear sesión de Checkout (suscripción con tarjeta) ───────────────────
function billingCreateCheckout(PDO $db, int $branchId, int $userId): never {
    if (!stripeConfigured()) {
        jsonError(503, 'El pago con tarjeta aún no está disponible. Usa transferencia.');
    }

    $sub = latestSubscription($db, $branchId);
    if (!$sub) jsonError(404, 'Suscripción no encontrada');

    // Evitar duplicar una suscripción activa de Stripe.
    if (!empty($sub['stripe_subscription_id']) && in_array($sub['status'], ['active', 'trial', 'past_due'], true)) {
        jsonError(409, 'Ya tienes una suscripción activa. Usa "Actualizar método de pago".');
    }

    // Reutilizar o crear Stripe Customer.
    $customerId = $sub['stripe_customer_id'] ?: null;
    if (!$customerId) {
        $stmt = $db->prepare('SELECT email, name FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch() ?: [];

        $customer = stripeRequest('POST', 'customers', [
            'email'              => $user['email'] ?? '',
            'name'               => $user['name']  ?? '',
            'metadata[branch_id]' => (string)$branchId,
        ]);
        $customerId = $customer['id'];
        $db->prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE id = ?')
           ->execute([$customerId, (int)$sub['id']]);
    }

    $session = stripeRequest('POST', 'checkout/sessions', [
        'mode'                          => 'subscription',
        'customer'                      => $customerId,
        'line_items[0][price]'          => STRIPE_PRICE_ID_MONTHLY_RESTAUROS,
        'line_items[0][quantity]'       => '1',
        'success_url'                   => rtrim(APP_URL, '/') . '/billing?checkout=success',
        'cancel_url'                    => rtrim(APP_URL, '/') . '/billing?checkout=cancel',
        'metadata[branch_id]'           => (string)$branchId,
        'subscription_data[metadata][branch_id]' => (string)$branchId,
    ]);

    jsonResponse(['url' => $session['url']]);
}

// ── Stripe: portal de facturación (actualizar método / ver facturas) ─────────────
function billingCreatePortal(PDO $db, int $branchId): never {
    if (!stripeConfigured()) {
        jsonError(503, 'El portal de facturación aún no está disponible.');
    }

    $sub = latestSubscription($db, $branchId);
    if (!$sub || empty($sub['stripe_customer_id'])) {
        jsonError(409, 'No tienes un cliente de Stripe asociado.');
    }

    $session = stripeRequest('POST', 'billing_portal/sessions', [
        'customer'   => $sub['stripe_customer_id'],
        'return_url' => rtrim(APP_URL, '/') . '/billing',
    ]);

    jsonResponse(['url' => $session['url']]);
}

// ── Datos para "Mi Suscripción" ──────────────────────────────────────────────────
function billingMe(PDO $db, int $branchId): never {
    $sub = latestSubscription($db, $branchId);

    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE branch_id = ? ORDER BY id DESC LIMIT 30');
    $stmt->execute([$branchId]);
    $payments = $stmt->fetchAll();

    $config = bankTransferConfig($db);

    $daysRemaining = null;
    if ($sub && !empty($sub['expires_at'])) {
        $daysRemaining = (int) floor((strtotime($sub['expires_at']) - time()) / 86400);
    }

    jsonResponse([
        'subscription'   => $sub,
        'days_remaining' => $daysRemaining,
        'payments'       => $payments,
        'bank_config'    => $config,
    ]);
}

// ── Generar intención de pago por transferencia ──────────────────────────────────
function billingBankTransferIntent(PDO $db, int $branchId): never {
    $sub = latestSubscription($db, $branchId);
    if (!$sub) jsonError(404, 'Suscripción no encontrada');

    $config = bankTransferConfig($db);
    if (!$config) jsonError(409, 'El pago por transferencia no está disponible. Contacta a soporte.');

    // Monto SIEMPRE server-side: config.amount_default o, si es 0, price_monthly.
    $amount = (float)$config['amount_default'] > 0
        ? (float)$config['amount_default']
        : (float)$sub['price_monthly'];

    $reference = sprintf('RESTAUROS-%d-%s', $branchId, date('Ym'));

    // Reutilizar un pago abierto con la misma referencia (evita duplicados del periodo).
    $stmt = $db->prepare(
        "SELECT * FROM subscription_payments
         WHERE branch_id = ? AND bank_reference = ?
           AND status IN ('pending_bank_transfer','bank_transfer_review')
         ORDER BY id DESC LIMIT 1"
    );
    $stmt->execute([$branchId, $reference]);
    $payment = $stmt->fetch();

    if (!$payment) {
        $db->prepare(
            "INSERT INTO subscription_payments
                (branch_id, subscription_id, amount, currency, status, payment_method, bank_reference)
             VALUES (?, ?, ?, ?, 'pending_bank_transfer', 'bank_transfer', ?)"
        )->execute([$branchId, (int)$sub['id'], $amount, $sub['currency'] ?? 'MXN', $reference]);
        $paymentId = (int)$db->lastInsertId();
    } else {
        $paymentId = (int)$payment['id'];
    }

    // Marcar pendiente SOLO si la suscripción no está vigente. Generar la
    // referencia de pago no debe bloquear a un admin con suscripción
    // activa/trial/past_due vigente (antes lo dejaba fuera del sistema).
    $vigentes = ['active', 'trial', 'past_due', 'bank_transfer_review'];
    if (!in_array($sub['status'] ?? '', $vigentes, true)) {
        $db->prepare('UPDATE subscriptions SET status = ? WHERE id = ?')
           ->execute(['pending_bank_transfer', (int)$sub['id']]);
        subscriptionAudit($db, $branchId, (int)$sub['id'], 'bank_transfer_intent', $sub['status'], 'pending_bank_transfer', null, $reference);
    }

    jsonResponse([
        'payment_id' => $paymentId,
        'reference'  => $reference,
        'amount'     => $amount,
        'currency'   => $sub['currency'] ?? 'MXN',
        'due_date'   => date('Y-m-d', strtotime('+5 days')),
        'bank'       => [
            'bank_name'        => $config['bank_name'],
            'clabe'            => $config['clabe'],
            'beneficiary_name' => $config['beneficiary_name'],
            'instructions'     => $config['instructions'],
        ],
    ]);
}

// ── Reportar transferencia realizada ─────────────────────────────────────────────
function billingBankTransferSubmit(PDO $db, int $branchId): never {
    $body      = getBody();
    $paymentId = (int)($body['payment_id'] ?? 0);
    if (!$paymentId) jsonError(422, 'payment_id requerido');

    // El pago debe pertenecer a la sucursal del usuario.
    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE id = ? AND branch_id = ?');
    $stmt->execute([$paymentId, $branchId]);
    $payment = $stmt->fetch();
    if (!$payment) jsonError(404, 'Pago no encontrado');

    $transferDate = trim((string)($body['bank_transfer_date'] ?? ''));
    $senderName   = trim((string)($body['bank_sender_name'] ?? ''));
    $bankName     = trim((string)($body['bank_name'] ?? ''));
    $trackingRef  = trim((string)($body['tracking_reference'] ?? ''));
    $receiptUrl   = trim((string)($body['receipt_url'] ?? ''));

    if ($transferDate === '' || $senderName === '') {
        jsonError(422, 'Fecha de transferencia y nombre del emisor son requeridos');
    }

    $db->prepare(
        "UPDATE subscription_payments
         SET status = 'bank_transfer_review',
             bank_transfer_date = ?, bank_sender_name = ?, bank_name = ?,
             receipt_url = ?,
             bank_reference = CONCAT(bank_reference, ?)
         WHERE id = ?"
    )->execute([
        $transferDate ?: null,
        $senderName,
        $bankName ?: null,
        $receiptUrl ?: null,
        $trackingRef !== '' ? ' / ' . $trackingRef : '',
        $paymentId,
    ]);

    $sub = latestSubscription($db, $branchId);
    if ($sub) {
        $db->prepare('UPDATE subscriptions SET status = ? WHERE id = ?')
           ->execute(['bank_transfer_review', (int)$sub['id']]);
        subscriptionAudit($db, $branchId, (int)$sub['id'], 'bank_transfer_submit', $sub['status'], 'bank_transfer_review', null, 'Pago #' . $paymentId);
    }

    $stmt = $db->prepare('SELECT * FROM subscription_payments WHERE id = ?');
    $stmt->execute([$paymentId]);
    jsonResponse(['payment' => $stmt->fetch()]);
}

// ── Subir comprobante de pago (imagen o PDF) ─────────────────────────────────────
// Devuelve la URL pública; el front la manda luego en bank-transfer-submit.
function billingUploadReceipt(): never {
    $url = saveReceiptFromRequest('receipt');
    jsonResponse(['receipt_url' => $url]);
}

// ── Helper: configuración SPEI activa ────────────────────────────────────────────
function bankTransferConfig(PDO $db): ?array {
    $row = $db->query('SELECT * FROM bank_transfer_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1')->fetch();
    return $row ?: null;
}
