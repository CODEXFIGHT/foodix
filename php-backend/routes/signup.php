<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Alta autoservicio con prueba gratuita de 14 días.
 *
 *   POST /signup/register          — crea el registro y envía el correo
 *   GET  /signup/status            — estado del registro en curso
 *   POST /signup/verify-email      — canjea el token del correo (un solo uso)
 *   POST /signup/resend-email      — reenvía el correo de verificación
 *   POST /signup/send-phone-code   — envía el código de verificación por correo
 *   POST /signup/verify-phone      — valida el OTP
 *   POST /signup/activate          — crea sucursal + admin + trial (transacción)
 *
 * Todo endpoint es PÚBLICO (sin JWT), por eso todos llevan rate limiting, y el
 * "handle" del registro es un token opaco de 32 bytes que solo sirve para este
 * flujo: no autentica nada dentro de la aplicación.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/trial_identity.php';
require_once __DIR__ . '/../config/trial_risk.php';
require_once __DIR__ . '/../config/trial_service.php';
require_once __DIR__ . '/../config/trial_notify.php';
require_once __DIR__ . '/../config/rate_limit.php';

/** Minutos de validez del enlace de verificación de correo. */
const SIGNUP_EMAIL_TOKEN_MINUTES = 60;
/** Minutos de validez del código del teléfono. */
const SIGNUP_OTP_MINUTES = 10;
/** Horas que vive un registro sin completarse. */
const SIGNUP_TTL_HOURS = 48;
/** Intentos máximos para un mismo código OTP. */
const SIGNUP_OTP_MAX_ATTEMPTS = 5;

function handleSignup(array $seg, string $method): never {
    $action = $seg[1] ?? '';

    match ("$method $action") {
        'POST register'        => signupRegister(),
        'GET status'           => signupStatus(),
        'POST verify-email'    => signupVerifyEmail(),
        'POST resend-email'    => signupResendEmail(),
        'POST send-phone-code' => signupSendPhoneCode(),
        'POST verify-phone'    => signupVerifyPhone(),
        'POST activate'        => signupActivate(),
        default                => jsonError(404, 'Ruta de registro no encontrada'),
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Señales de identidad de la petición actual. */
function signupSignals(?array $signup = null, ?string $clientDeviceUid = null): array {
    return [
        'email_hash'  => $signup && $signup['email_hash']  ? $signup['email_hash']  : null,
        'phone_hash'  => $signup && $signup['phone_hash']  ? $signup['phone_hash']  : null,
        'device_hash' => $signup && $signup['device_hash'] ? $signup['device_hash'] : resolveDeviceHash($clientDeviceUid),
        'ip_hash'     => ipIdentityHash(),
    ];
}

/** Localiza el registro por su token opaco. Corta con 404 si no existe/expiró. */
function signupFromToken(PDO $db, string $token, bool $required = true): ?array {
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        if (!$required) return null;
        jsonError(422, 'Sesión de registro inválida. Vuelve a empezar.', ['error' => 'signup_invalid']);
    }

    $stmt = $db->prepare('SELECT * FROM signups WHERE session_token_hash = ? LIMIT 1');
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();

    if (!$row) {
        if (!$required) return null;
        jsonError(404, 'No encontramos tu registro. Vuelve a empezar.', ['error' => 'signup_not_found']);
    }
    if ($row['status'] !== 'activated' && strtotime((string)$row['expires_at']) < time()) {
        jsonError(410, 'Tu registro caducó. Vuelve a crear tu cuenta.', ['error' => 'signup_expired']);
    }
    return $row;
}

/** Oculta el correo para mostrarlo en la UI: ju****@gmail.com */
function maskEmail(string $email): string {
    $at = strrpos($email, '@');
    if ($at === false || $at < 1) return '***';
    $local  = substr($email, 0, $at);
    $domain = substr($email, $at);
    $keep   = min(2, strlen($local));
    return substr($local, 0, $keep) . str_repeat('*', max(3, strlen($local) - $keep)) . $domain;
}

/** Oculta el teléfono: +52 *** *** 4578 */
function maskPhone(string $e164): string {
    return substr($e164, 0, 3) . ' *** *** ' . substr($e164, -4);
}

/** Respuesta uniforme del estado del registro (nunca expone hashes ni riesgo). */
function signupPayload(array $s, ?string $token = null): array {
    $next = match (true) {
        $s['status'] === 'activated'      => 'done',
        $s['status'] === 'review'         => 'review',
        $s['status'] === 'rejected'       => 'rejected',
        $s['email_verified_at'] === null  => 'verify_email',
        $s['phone_verified_at'] === null  => 'verify_phone',
        default                           => 'activate',
    };

    $out = [
        'status'          => $s['status'],
        'next_step'       => $next,
        'email_masked'    => maskEmail((string)$s['email']),
        'phone_masked'    => $s['phone_e164'] ? maskPhone((string)$s['phone_e164']) : null,
        'email_verified'  => $s['email_verified_at'] !== null,
        'phone_verified'  => $s['phone_verified_at'] !== null,
        'business_name'   => $s['business_name'],
        'first_name'      => $s['first_name'],
    ];
    if ($token !== null) $out['signup_token'] = $token;
    return $out;
}

/** Mensaje único para cualquier motivo de no elegibilidad (no revela la regla). */
function trialNotEligible(): never {
    jsonError(403, 'Esta cuenta no es elegible para otra prueba gratuita. '
        . 'Detectamos que ya se utilizó una prueba gratuita asociada a esta cuenta o negocio. '
        . 'Puedes elegir un plan para continuar utilizando FoodIX.', [
        'error' => 'trial_not_eligible',
    ]);
}

// ── POST /signup/register ────────────────────────────────────────────────────

function signupRegister(): never {
    $db   = Database::connect();
    $body = getBody();

    $ip         = clientIp();
    $deviceHash = resolveDeviceHash((string)($body['device_uid'] ?? ''));

    enforceRateLimit($db, 'register_ip',     $ip);
    enforceRateLimit($db, 'register_ip_day', $ip);
    enforceRateLimit($db, 'register_device', $deviceHash);

    $firstName = trim((string)($body['first_name']    ?? ''));
    $lastName  = trim((string)($body['last_name']     ?? ''));
    $business  = trim((string)($body['business_name'] ?? ''));
    $emailRaw  = trim((string)($body['email']         ?? ''));
    $phoneRaw  = trim((string)($body['phone']         ?? ''));
    $password  =      (string)($body['password']      ?? '');
    $confirm   =      (string)($body['password_confirm'] ?? '');
    $terms     = (bool)($body['accept_terms']   ?? false);
    $privacy   = (bool)($body['accept_privacy'] ?? false);
    $marketing = (bool)($body['marketing_opt_in'] ?? false);

    // ── Validación ───────────────────────────────────────────────────────────
    if (mb_strlen($firstName) < 2 || mb_strlen($firstName) > 60) jsonError(422, 'Escribe tu nombre (mínimo 2 caracteres).', ['field' => 'first_name']);
    if (mb_strlen($lastName)  < 2 || mb_strlen($lastName)  > 60) jsonError(422, 'Escribe tus apellidos.', ['field' => 'last_name']);
    if (mb_strlen($business)  < 2 || mb_strlen($business)  > 100) jsonError(422, 'Escribe el nombre de tu restaurante.', ['field' => 'business_name']);

    $email = normalizeEmail($emailRaw);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
        jsonError(422, 'Escribe un correo electrónico válido.', ['field' => 'email']);
    }

    $phone = normalizePhoneE164($phoneRaw);
    if ($phone === null) {
        jsonError(422, 'Escribe un teléfono válido a 10 dígitos (o con lada internacional).', ['field' => 'phone']);
    }

    if (strlen($password) < 8)  jsonError(422, 'La contraseña debe tener al menos 8 caracteres.', ['field' => 'password']);
    if (strlen($password) > 100) jsonError(422, 'La contraseña es demasiado larga.', ['field' => 'password']);
    if (!preg_match('/[A-Za-zÁÉÍÓÚáéíóúÑñ]/', $password) || !preg_match('/\d/', $password)) {
        jsonError(422, 'La contraseña debe combinar letras y números.', ['field' => 'password']);
    }
    if ($password !== $confirm) jsonError(422, 'Las contraseñas no coinciden.', ['field' => 'password_confirm']);
    if (!$terms || !$privacy)   jsonError(422, 'Debes aceptar los términos y el aviso de privacidad.', ['field' => 'accept_terms']);

    // ── Cuenta ya existente (mensaje explícito, sin filtrar datos privados) ──
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonError(409, 'Ya existe una cuenta asociada a este correo. Intenta iniciar sesión o recuperar tu contraseña.', [
            'error' => 'email_taken',
        ]);
    }

    $emailHash = emailIdentityHash($email);
    $phoneHash = phoneIdentityHash($phone);
    $ipHash    = ipIdentityHash($ip);
    $signals   = ['email_hash' => $emailHash, 'phone_hash' => $phoneHash,
                  'device_hash' => $deviceHash, 'ip_hash' => $ipHash];

    // ── Riesgo (evaluación temprana: ahorra correos y OTP a los abusos claros) ─
    // El teléfono se EXCLUYE aquí a propósito: todavía no está verificado, así
    // que rechazar el alta por él (a) permitiría averiguar qué números tienen
    // cuenta probándolos en el formulario, y (b) castigaría un simple error de
    // dedo. La comprobación fuerte del teléfono ocurre en /send-phone-code, ya
    // con el correo confirmado.
    $risk = evaluateTrialRisk($db, ['email_hash' => $emailHash,
                                    'device_hash' => $deviceHash,
                                    'ip_hash' => $ipHash]);
    if ($risk['level'] === 'block') {
        logTrialAttempt($db, 'TRIAL_REJECTED', $signals, $risk);
        trialNotEligible();
    }

    // Un registro en curso con el mismo correo se reemplaza (reintento del usuario).
    $db->prepare("DELETE FROM signups WHERE email_hash = ? AND status IN ('pending_verification','verified')")
       ->execute([$emailHash]);

    $token = bin2hex(random_bytes(32));

    $db->prepare(
        'INSERT INTO signups
            (session_token_hash, first_name, last_name, business_name, email, email_hash,
             phone_e164, phone_hash, password_hash, device_hash, ip_hash, user_agent,
             status, risk_score, risk_level, reason_code, marketing_opt_in, terms_accepted_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR))'
    )->execute([
        hash('sha256', $token), $firstName, $lastName, $business, $email, $emailHash,
        $phone, $phoneHash, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        $deviceHash, $ipHash, substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null,
        'pending_verification', (int)$risk['score'], $risk['level'], $risk['reason_code'],
        $marketing ? 1 : 0, SIGNUP_TTL_HOURS,
    ]);
    $signupId = (int)$db->lastInsertId();

    issueEmailVerification($db, $signupId, $email, $firstName);

    $stmt = $db->prepare('SELECT * FROM signups WHERE id = ?');
    $stmt->execute([$signupId]);

    jsonResponse(signupPayload($stmt->fetch(), $token), 201);
}

/** Genera y envía el token de verificación de correo. */
function issueEmailVerification(PDO $db, int $signupId, string $email, string $firstName): void {
    // Los tokens anteriores del mismo registro dejan de ser válidos.
    $db->prepare('UPDATE signup_verifications SET used_at = NOW() WHERE signup_id = ? AND used_at IS NULL')
       ->execute([$signupId]);

    $token = bin2hex(random_bytes(32));
    $db->prepare(
        'INSERT INTO signup_verifications (signup_id, purpose, token_hash, expires_at)
         VALUES (?, \'email_verify\', ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))'
    )->execute([$signupId, hash('sha256', $token), SIGNUP_EMAIL_TOKEN_MINUTES]);

    sendVerificationEmail($email, $firstName, $token, SIGNUP_EMAIL_TOKEN_MINUTES);
}

// ── GET /signup/status?token= ────────────────────────────────────────────────

function signupStatus(): never {
    $db = Database::connect();
    $s  = signupFromToken($db, (string)($_GET['token'] ?? ''));
    jsonResponse(signupPayload($s));
}

// ── POST /signup/verify-email ────────────────────────────────────────────────

function signupVerifyEmail(): never {
    $db   = Database::connect();
    $body = getBody();
    $raw  = trim((string)($body['token'] ?? ''));

    enforceRateLimit($db, 'email_verify_ip', clientIp());

    if (!preg_match('/^[a-f0-9]{64}$/', $raw)) {
        jsonError(422, 'El enlace de verificación no es válido.', ['error' => 'token_invalid']);
    }

    $stmt = $db->prepare(
        'SELECT v.id, v.signup_id, v.expires_at, v.used_at
         FROM signup_verifications v
         WHERE v.token_hash = ? AND v.purpose = \'email_verify\' LIMIT 1'
    );
    $stmt->execute([hash('sha256', $raw)]);
    $ver = $stmt->fetch();

    if (!$ver || $ver['used_at'] !== null) {
        jsonError(410, 'Este enlace ya se usó o no es válido. Solicita uno nuevo.', ['error' => 'token_used']);
    }
    if (strtotime((string)$ver['expires_at']) < time()) {
        jsonError(410, 'El enlace caducó. Te enviaremos uno nuevo.', ['error' => 'token_expired']);
    }

    // Consumo atómico: un solo uso aunque se abra el enlace dos veces.
    $consume = $db->prepare('UPDATE signup_verifications SET used_at = NOW() WHERE id = ? AND used_at IS NULL');
    $consume->execute([(int)$ver['id']]);
    if ($consume->rowCount() === 0) {
        jsonError(410, 'Este enlace ya se usó. Solicita uno nuevo.', ['error' => 'token_used']);
    }

    $db->prepare('UPDATE signups SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?')
       ->execute([(int)$ver['signup_id']]);

    // Se emite un handle nuevo: el correo puede abrirse en otro dispositivo.
    $token = bin2hex(random_bytes(32));
    $db->prepare('UPDATE signups SET session_token_hash = ? WHERE id = ?')
       ->execute([hash('sha256', $token), (int)$ver['signup_id']]);

    $stmt = $db->prepare('SELECT * FROM signups WHERE id = ?');
    $stmt->execute([(int)$ver['signup_id']]);

    jsonResponse(signupPayload($stmt->fetch(), $token));
}

// ── POST /signup/resend-email ────────────────────────────────────────────────

function signupResendEmail(): never {
    $db = Database::connect();
    $s  = signupFromToken($db, (string)(getBody()['signup_token'] ?? ''));

    enforceRateLimit($db, 'email_resend', (string)$s['id']);

    if ($s['email_verified_at'] !== null) {
        jsonResponse(signupPayload($s));
    }

    issueEmailVerification($db, (int)$s['id'], (string)$s['email'], (string)$s['first_name']);
    jsonResponse(['ok' => true, 'email_masked' => maskEmail((string)$s['email'])]);
}

// ── POST /signup/send-phone-code ─────────────────────────────────────────────

function signupSendPhoneCode(): never {
    $db   = Database::connect();
    $body = getBody();
    $s    = signupFromToken($db, (string)($body['signup_token'] ?? ''));

    if ($s['email_verified_at'] === null) {
        jsonError(409, 'Primero confirma tu correo electrónico.', ['error' => 'email_not_verified']);
    }
    if ($s['phone_verified_at'] !== null) {
        jsonResponse(signupPayload($s));
    }

    // Permite corregir el teléfono durante el alta.
    $phone = $s['phone_e164'];
    if (!empty($body['phone'])) {
        $candidate = normalizePhoneE164((string)$body['phone']);
        if ($candidate === null) jsonError(422, 'Escribe un teléfono válido.', ['field' => 'phone']);
        $phone = $candidate;
        $db->prepare('UPDATE signups SET phone_e164 = ?, phone_hash = ? WHERE id = ?')
           ->execute([$phone, phoneIdentityHash($phone), (int)$s['id']]);
        $s['phone_e164'] = $phone;
        $s['phone_hash'] = phoneIdentityHash($phone);
    }

    enforceRateLimit($db, 'otp_phone',     (string)$s['phone_hash']);
    enforceRateLimit($db, 'otp_phone_day', (string)$s['phone_hash']);
    enforceRateLimit($db, 'otp_ip',        clientIp());

    // El teléfono es una señal fuerte del antiabuso: si ya consumió un trial,
    // no se gasta un envío ni se avanza.
    if (identityUsedTrial($db, 'phone', (string)$s['phone_hash'])) {
        $risk = ['score' => RISK_SCORE_BLOCK, 'level' => 'block', 'reason_code' => 'phone_trial_used'];
        logTrialAttempt($db, 'TRIAL_REJECTED', signupSignals($s), $risk, (int)$s['id']);
        $db->prepare("UPDATE signups SET status = 'rejected', reason_code = 'phone_trial_used' WHERE id = ?")
           ->execute([(int)$s['id']]);
        jsonError(403, 'Este número ya fue utilizado para una prueba gratuita. '
            . 'Puedes iniciar sesión con tu cuenta existente o elegir un plan para continuar.', [
            'error' => 'phone_trial_used',
        ]);
    }

    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    // Solo el hash del código toca la base de datos.
    $db->prepare('UPDATE signup_otp_codes SET expires_at = NOW() WHERE signup_id = ? AND verified_at IS NULL')
       ->execute([(int)$s['id']]);

    // Canal único: correo electrónico (no se envían SMS ni WhatsApp). El código
    // llega al buzón que el usuario ya confirmó en el paso anterior.
    $channel = sendVerificationCodeEmail(
        (string)$s['email'],
        (string)$s['first_name'],
        $code,
        SIGNUP_OTP_MINUTES,
        maskPhone((string)$phone),
    );

    $db->prepare(
        'INSERT INTO signup_otp_codes (signup_id, phone_hash, code_hash, channel, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))'
    )->execute([
        (int)$s['id'], (string)$s['phone_hash'],
        trialHash('otp', $code), $channel, SIGNUP_OTP_MINUTES,
    ]);

    jsonResponse([
        'ok'           => true,
        'channel'      => $channel,          // siempre 'email'
        'phone_masked' => maskPhone((string)$phone),
        'email_masked' => maskEmail((string)$s['email']),
        'expires_in'   => SIGNUP_OTP_MINUTES * 60,
    ]);
}

// ── POST /signup/verify-phone ────────────────────────────────────────────────

function signupVerifyPhone(): never {
    $db   = Database::connect();
    $body = getBody();
    $s    = signupFromToken($db, (string)($body['signup_token'] ?? ''));
    $code = preg_replace('/\D+/', '', (string)($body['code'] ?? '')) ?? '';

    enforceRateLimit($db, 'otp_verify', (string)$s['id']);

    if ($s['phone_verified_at'] !== null) {
        jsonResponse(signupPayload($s));
    }
    if (strlen($code) !== 6) {
        jsonError(422, 'El código son 6 dígitos.', ['field' => 'code']);
    }

    $stmt = $db->prepare(
        'SELECT * FROM signup_otp_codes
         WHERE signup_id = ? AND verified_at IS NULL
         ORDER BY id DESC LIMIT 1'
    );
    $stmt->execute([(int)$s['id']]);
    $otp = $stmt->fetch();

    if (!$otp || strtotime((string)$otp['expires_at']) < time()) {
        jsonError(410, 'El código caducó. Solicita uno nuevo.', ['error' => 'otp_expired']);
    }
    if ((int)$otp['attempts'] >= SIGNUP_OTP_MAX_ATTEMPTS) {
        jsonError(429, 'Demasiados intentos con este código. Solicita uno nuevo.', ['error' => 'otp_locked']);
    }

    if (!hash_equals((string)$otp['code_hash'], trialHash('otp', $code))) {
        $db->prepare('UPDATE signup_otp_codes SET attempts = attempts + 1 WHERE id = ?')->execute([(int)$otp['id']]);
        $left = SIGNUP_OTP_MAX_ATTEMPTS - ((int)$otp['attempts'] + 1);
        jsonError(401, 'El código no coincide.', ['error' => 'otp_invalid', 'attempts_left' => max(0, $left)]);
    }

    $db->prepare('UPDATE signup_otp_codes SET verified_at = NOW() WHERE id = ?')->execute([(int)$otp['id']]);
    $db->prepare(
        "UPDATE signups
            SET phone_verified_at = COALESCE(phone_verified_at, NOW()),
                status = CASE WHEN status = 'pending_verification' THEN 'verified' ELSE status END
          WHERE id = ?"
    )->execute([(int)$s['id']]);

    $stmt = $db->prepare('SELECT * FROM signups WHERE id = ?');
    $stmt->execute([(int)$s['id']]);
    jsonResponse(signupPayload($stmt->fetch()));
}

// ── POST /signup/activate ────────────────────────────────────────────────────

function signupActivate(): never {
    $db   = Database::connect();
    $body = getBody();
    $s    = signupFromToken($db, (string)($body['signup_token'] ?? ''));

    enforceRateLimit($db, 'activate_ip', clientIp());

    if ($s['status'] === 'activated' && $s['branch_id']) {
        jsonResponse(trialActivationResponse($db, $s));
    }
    if ($s['email_verified_at'] === null) jsonError(409, 'Primero confirma tu correo electrónico.', ['error' => 'email_not_verified']);
    if ($s['phone_verified_at'] === null) jsonError(409, 'Primero verifica tu teléfono.', ['error' => 'phone_not_verified']);

    // Nombre definitivo del negocio (el usuario puede afinarlo en el onboarding).
    $business = trim((string)($body['business_name'] ?? $s['business_name']));
    if (mb_strlen($business) < 2 || mb_strlen($business) > 100) {
        jsonError(422, 'Escribe el nombre de tu restaurante.', ['field' => 'business_name']);
    }
    $address = trim((string)($body['address'] ?? ''));
    if (mb_strlen($address) > 255) jsonError(422, 'La dirección es demasiado larga.', ['field' => 'address']);

    if ($business !== $s['business_name']) {
        $db->prepare('UPDATE signups SET business_name = ? WHERE id = ?')->execute([$business, (int)$s['id']]);
        $s['business_name'] = $business;
    }

    // ── Última evaluación de riesgo, ya con el teléfono verificado ───────────
    $signals = signupSignals($s);
    $risk    = evaluateTrialRisk($db, $signals);

    if ($risk['level'] === 'block') {
        logTrialAttempt($db, 'TRIAL_REJECTED', $signals, $risk, (int)$s['id']);
        $db->prepare("UPDATE signups SET status = 'rejected', reason_code = ? WHERE id = ?")
           ->execute([$risk['reason_code'], (int)$s['id']]);
        trialNotEligible();
    }
    if ($risk['level'] === 'high') {
        logTrialAttempt($db, 'TRIAL_REVIEW', $signals, $risk, (int)$s['id']);
        $db->prepare("UPDATE signups SET status = 'review', risk_score = ?, risk_level = ?, reason_code = ? WHERE id = ?")
           ->execute([(int)$risk['score'], $risk['level'], $risk['reason_code'], (int)$s['id']]);
        jsonError(202, 'Estamos validando tu solicitud. Te avisaremos por correo en cuanto quede lista.', [
            'error' => 'trial_under_review',
        ]);
    }

    $db->prepare('UPDATE signups SET risk_score = ?, risk_level = ?, reason_code = ? WHERE id = ?')
       ->execute([(int)$risk['score'], $risk['level'], $risk['reason_code'], (int)$s['id']]);

    $result = activateTrialForSignup($db, $s, $signals, $risk);

    if ($address !== '') {
        $db->prepare('UPDATE branches SET address = ? WHERE id = ?')->execute([$address, $result['branch_id']]);
    }

    sendTrialStartedEmail(
        (string)$s['email'], (string)$s['first_name'], (string)$s['business_name'],
        $result['trial_started_at'], $result['trial_ends_at']
    );

    $stmt = $db->prepare('SELECT * FROM signups WHERE id = ?');
    $stmt->execute([(int)$s['id']]);
    jsonResponse(trialActivationResponse($db, $stmt->fetch()), 201);
}

/** Respuesta de activación: fechas leídas de la base de datos, nunca del cliente. */
function trialActivationResponse(PDO $db, array $s): array {
    $trial = trialStateForBranch($db, (int)$s['branch_id']);

    return [
        'activated'     => true,
        'username'      => $s['username'],
        'business_name' => $s['business_name'],
        'branch_slug'   => (string)($db->query('SELECT slug FROM branches WHERE id = ' . (int)$s['branch_id'])->fetchColumn() ?: ''),
        'trial'         => [
            'status'           => $trial['trial_status'] ?? 'trialing',
            'trial_started_at' => $trial['trial_started_at'] ?? null,
            'trial_ends_at'    => $trial['trial_ends_at'] ?? null,
            'days_remaining'   => $trial['days_remaining'] ?? null,
            'trial_days'       => TRIAL_DAYS,
        ],
    ];
}
