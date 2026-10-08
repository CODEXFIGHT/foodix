<?php
/**
 * RestaurOS — Endpoint de provisión (EJEMPLO DE REFERENCIA)
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo NO se ejecuta desde el repo Next.js. Es una plantilla para tu
 * backend PHP en tallercheck.mx. Recíbelo en la URL que pondrás en la variable
 * BACKEND_PROVISION_URL del frontend (p. ej.:
 *   https://tallercheck.mx/restauros/api/index.php/billing/provision
 * ) y protégelo con el mismo secreto de BACKEND_PROVISION_TOKEN.
 *
 * Lo invocan dos rutas del frontend:
 *   • /api/stripe/webhook  → event=payment.succeeded  (tarjeta, ya cobrada)
 *   • /api/spei-report     → event=spei.reported      (SPEI, en revisión manual)
 *
 * Responsabilidades:
 *   1. Validar el token compartido (Bearer) en tiempo constante.
 *   2. Validar y normalizar el payload.
 *   3. Idempotencia por payment_ref (Stripe reintenta webhooks).
 *   4. Tarjeta pagada  → crear/activar la cuenta + código de activación.
 *      SPEI reportado  → dejar el pago en revisión (sin activar todavía).
 *   5. Enviar accesos / código de activación por correo.
 *
 * ⚠️ Ajusta nombres de tablas/columnas a tu esquema real (tallerch_restauros).
 *    Los CREATE TABLE de más abajo son sugerencias mínimas.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// ─── 0. Solo POST ────────────────────────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

// ─── 1. Autenticación: Bearer token compartido (comparación en tiempo constante)
$expectedToken = getenv('BACKEND_PROVISION_TOKEN') ?: ''; // mismo valor que en el frontend
$authHeader    = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$sentToken     = '';
if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
    $sentToken = trim($m[1]);
}
if ($expectedToken === '' || !hash_equals($expectedToken, $sentToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

// ─── 2. Parseo y validación del payload ──────────────────────────────────────
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'bad_request']);
    exit;
}

$event      = (string)($data['event'] ?? '');       // 'payment.succeeded' | 'spei.reported'
$method     = (string)($data['method'] ?? '');      // 'card' | 'spei'
$status     = (string)($data['status'] ?? '');      // 'paid' | 'pending_review'
$plan       = (string)($data['plan'] ?? '');        // 'lite' | 'pro'
$email      = strtolower(trim((string)($data['email'] ?? '')));
$restaurant = trim((string)($data['restaurant'] ?? ''));
$amount     = (int)($data['amount'] ?? 0);          // MXN (pesos)
$currency   = strtolower((string)($data['currency'] ?? 'mxn'));
$paymentRef = trim((string)($data['payment_ref'] ?? ''));
$paidAt     = (string)($data['paid_at'] ?? gmdate('c'));
$transfer   = $data['transfer'] ?? null;            // datos del reporte SPEI (opcional)

if (!in_array($plan, ['lite', 'pro'], true)
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || $restaurant === ''
    || $paymentRef === ''
) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}

// Monto esperado según el plan (no confiar ciegamente en el monto recibido).
$expectedAmount = ['lite' => 250, 'pro' => 499][$plan];

// ─── 3. Conexión a la base de datos ──────────────────────────────────────────
// Reutiliza tu helper de conexión real. Aquí, ejemplo con PDO:
$pdo = new PDO(
    'mysql:host=localhost;dbname=tallerch_restauros;charset=utf8mb4',
    getenv('DB_USER') ?: 'tallerch_restauros',
    getenv('DB_PASS') ?: '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

/*
  Tablas sugeridas (ajusta a tu esquema):

  CREATE TABLE provisioning_events (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_ref  VARCHAR(64) NOT NULL UNIQUE,   -- idempotencia
    event        VARCHAR(32) NOT NULL,
    method       VARCHAR(16) NOT NULL,
    status       VARCHAR(24) NOT NULL,          -- paid | pending_review | activated
    plan         VARCHAR(16) NOT NULL,
    email        VARCHAR(200) NOT NULL,
    restaurant   VARCHAR(200) NOT NULL,
    amount       INT NOT NULL,
    currency     VARCHAR(8) NOT NULL,
    activation_code VARCHAR(32) NULL,
    payload      JSON NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
*/

// ─── 4. Idempotencia: ¿ya procesamos este pago? ──────────────────────────────
$stmt = $pdo->prepare('SELECT id, status, activation_code FROM provisioning_events WHERE payment_ref = ? LIMIT 1');
$stmt->execute([$paymentRef]);
$existing = $stmt->fetch();
if ($existing) {
    // Ya registrado: responde 200 sin duplicar (Stripe reintenta webhooks).
    http_response_code(200);
    echo json_encode(['ok' => true, 'idempotent' => true, 'status' => $existing['status']]);
    exit;
}

// ─── 5. Generar código de activación legible (ej. 9F3K-7Q2M) ─────────────────
function generateActivationCode(): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        if ($i === 3) $code .= '-';
    }
    return $code;
}
$activationCode = generateActivationCode();

// ─── 6. Lógica según evento ──────────────────────────────────────────────────
try {
    $pdo->beginTransaction();

    if ($event === 'payment.succeeded' && $method === 'card' && $status === 'paid') {
        // Pago con tarjeta ya cobrado → crea/activa la cuenta de inmediato.
        //
        // TODO (con tu esquema real):
        //   1. ¿Existe un tenant con este email? Si no, créalo (restaurante = $restaurant).
        //   2. Crea el usuario admin con una contraseña temporal o exige fijarla con
        //      $activationCode en el primer login.
        //   3. Crea/activa la suscripción del plan $plan con expires_at = +1 mes.
        //   4. Registra el pago (payments) como 'paid', method='card', ref=$paymentRef.
        //
        // provisionTenantAndUser($pdo, $email, $restaurant, $plan, $activationCode);
        // createSubscription($pdo, $email, $plan, $amount, $currency, $paidAt);

        $finalStatus = 'activated';
    } elseif ($event === 'spei.reported' && $method === 'spei') {
        // SPEI reportado → NO actives todavía. Deja el pago en revisión para que un
        // admin confirme el depósito en el banco y luego active la cuenta.
        //
        // TODO:
        //   1. Inserta un lead/pago 'pending_review' con los datos de $transfer.
        //   2. Notifica al admin (correo / panel) para que verifique el SPEI.
        //   3. Al aprobarlo, reutiliza la misma lógica de alta + $activationCode.
        //
        // queueSpeiForReview($pdo, $email, $restaurant, $plan, $paymentRef, $transfer);

        $finalStatus = 'pending_review';
    } else {
        $pdo->rollBack();
        http_response_code(422);
        echo json_encode(['error' => 'unsupported_event']);
        exit;
    }

    // ─── 7. Registrar el evento (idempotencia + auditoría) ───────────────────
    $ins = $pdo->prepare(
        'INSERT INTO provisioning_events
           (payment_ref, event, method, status, plan, email, restaurant, amount, currency, activation_code, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $paymentRef, $event, $method, $finalStatus, $plan, $email, $restaurant,
        $amount, $currency, $activationCode, json_encode($data, JSON_UNESCAPED_UNICODE),
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // 5xx hace que Stripe reintente el webhook (deseable ante fallos transitorios).
    http_response_code(500);
    echo json_encode(['error' => 'provision_failed', 'message' => $e->getMessage()]);
    exit;
}

// ─── 8. Enviar correo (accesos para tarjeta, "en revisión" para SPEI) ────────
// TODO: usa tu mailer real (PHPMailer / SMTP de atomicmail).
//   if ($finalStatus === 'activated') {
//       sendWelcomeEmail($email, $restaurant, $activationCode);   // con liga a /login
//   } else {
//       sendSpeiPendingEmail($email, $restaurant, $paymentRef);   // "estamos verificando"
//   }

// ─── 9. Respuesta ────────────────────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'ok'              => true,
    'status'          => $finalStatus,
    'activation_code' => $finalStatus === 'activated' ? $activationCode : null,
]);
