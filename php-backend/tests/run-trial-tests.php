<?php
/**
 * FoodIX — Pruebas de integración del alta autoservicio y la prueba de 14 días.
 *
 * Corren contra una base de datos MySQL/MariaDB REAL (la de pruebas), usando
 * los mismos archivos del backend que se despliegan en producción.
 *
 *   1. crear la base:   mysql -e "CREATE DATABASE foodix_test"
 *   2. cargar schema.sql + migrations/*.sql en ella
 *   3. correr:          php php-backend/tests/run-trial-tests.php
 *
 * @package FoodIX
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$db = Database::connect();

// ── Mini framework ───────────────────────────────────────────────────────────
$passed = 0; $failed = 0; $failures = [];

function test(string $name, callable $fn): void {
    global $db, $passed, $failed, $failures;
    resetDatabase($db);
    try {
        $fn($db);
        $passed++;
        echo "  \033[32m✓\033[0m $name\n";
    } catch (Throwable $e) {
        $failed++;
        $failures[] = "$name → " . $e->getMessage();
        echo "  \033[31m✗\033[0m $name\n     " . $e->getMessage() . "\n";
    }
}

function check(bool $cond, string $msg): void {
    if (!$cond) throw new RuntimeException($msg);
}

function same(mixed $expected, mixed $actual, string $msg): void {
    if ($expected !== $actual) {
        throw new RuntimeException($msg . ' — esperado: ' . var_export($expected, true) . ', obtenido: ' . var_export($actual, true));
    }
}

// ── Helpers del flujo de alta ────────────────────────────────────────────────

function registerBody(array $over = []): array {
    return array_merge([
        'first_name'       => 'Carlos',
        'last_name'        => 'Lopez',
        'business_name'    => 'Taqueria El Buen Sabor',
        'email'            => 'carlos@example.com',
        'phone'            => '7734090058',
        'password'         => 'FoodIX2026',
        'password_confirm' => 'FoodIX2026',
        'accept_terms'     => true,
        'accept_privacy'   => true,
    ], $over);
}

/** Recorre registro → correo → teléfono → activación. Devuelve la respuesta final. */
function fullSignup(array $over = [], string $ip = '187.190.10.10'): array {
    $srv = ['REMOTE_ADDR' => $ip];

    $r = request('signupRegister', registerBody($over), [], $srv);
    same(201, $r['status'], 'el registro debe responder 201: ' . json_encode($r['body']));
    $token = $r['body']['signup_token'];

    $mail = outboxLast('email_verify');
    check($mail !== null, 'debe enviarse el correo de verificación');

    $r = request('signupVerifyEmail', ['token' => $mail['token']], [], $srv);
    same(200, $r['status'], 'verificar el correo debe responder 200: ' . json_encode($r['body']));
    $token = $r['body']['signup_token'];

    $r = request('signupSendPhoneCode', ['signup_token' => $token], [], $srv);
    if ($r['status'] !== 200) return ['step' => 'send_phone', 'status' => $r['status'], 'body' => $r['body'], 'token' => $token];

    $otp = outboxLast('otp');
    check($otp !== null, 'debe enviarse el código del teléfono');

    $r = request('signupVerifyPhone', ['signup_token' => $token, 'code' => $otp['code']], [], $srv);
    same(200, $r['status'], 'verificar el teléfono debe responder 200: ' . json_encode($r['body']));

    $r = request('signupActivate', ['signup_token' => $token], [], $srv);
    return ['step' => 'activate', 'status' => $r['status'], 'body' => $r['body'], 'token' => $token];
}

echo "\nFoodIX · pruebas del trial de 14 días\n";
echo str_repeat('─', 60) . "\n";

// ── Caso 1 · Usuario completamente nuevo ─────────────────────────────────────
test('Caso 1 · alta completa → cuenta creada y trial de 14 días', function (PDO $db) {
    $r = fullSignup();
    same(201, $r['status'], 'la activación debe responder 201: ' . json_encode($r['body']));

    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    check($branchId > 0, 'debe crearse la sucursal (workspace)');

    $user = $db->query('SELECT * FROM users')->fetch();
    check($user !== false, 'debe crearse el usuario propietario');
    same('admin', $user['role'], 'el propietario es admin');
    check($user['email_verified_at'] !== null, 'el correo queda verificado');
    check($user['phone_verified_at'] !== null, 'el teléfono queda verificado');
    check(password_verify('FoodIX2026', $user['password']), 'la contraseña se guarda hasheada y verificable');
    check($user['password'] !== 'FoodIX2026', 'la contraseña NUNCA se guarda en claro');

    $sub = $db->query('SELECT * FROM subscriptions')->fetch();
    same('trial', $sub['plan'], 'el plan es trial');
    same('trial', $sub['status'], 'el estado es trial');

    $days = (int)$db->query(
        'SELECT DATEDIFF(DATE(trial_ends_at), DATE(trial_started_at)) FROM subscriptions'
    )->fetchColumn();
    same(14, $days, 'el trial dura exactamente 14 días');

    same('trialing', trialStateForBranch($db, $branchId)['trial_status'], 'el estado del trial es trialing');
    check((bool)$db->query('SELECT trial_used_at FROM branches')->fetchColumn(), 'la sucursal queda marcada con trial usado');

    // El correo de bienvenida sale con las fechas reales.
    check(outboxLast('trial_started') !== null, 'se envía el correo de bienvenida del trial');
});

// ── Caso 2 · Mismo correo ────────────────────────────────────────────────────
test('Caso 2 · mismo correo → no se crea una segunda cuenta', function (PDO $db) {
    fullSignup();
    newBrowser();

    $r = request('signupRegister', registerBody(['phone' => '5544332211']), [], ['REMOTE_ADDR' => '200.1.1.1']);
    same(409, $r['status'], 'el correo repetido debe responder 409');
    same('email_taken', $r['body']['error'] ?? null, 'el motivo es correo ya registrado');
    check(str_contains($r['body']['message'], 'Ya existe una cuenta'), 'mensaje al usuario correcto');
    same(1, (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(), 'sigue habiendo un solo usuario');
});

// ── Caso 3 · Correo distinto + mismo teléfono verificado ─────────────────────
test('Caso 3 · otro correo con el MISMO teléfono verificado → sin segundo trial', function (PDO $db) {
    fullSignup();
    newBrowser();
    outboxClear();

    $r = fullSignup(['email' => 'otro@example.com', 'business_name' => 'Otro Negocio'], '201.2.2.2');
    same('send_phone', $r['step'], 'debe cortarse al pedir el código del teléfono');
    same(403, $r['status'], 'el teléfono ya usado responde 403');
    same('phone_trial_used', $r['body']['error'] ?? null, 'el motivo es teléfono ya usado');
    check(str_contains($r['body']['message'], 'ya fue utilizado'), 'mensaje sin datos privados de la otra cuenta');
    check(!str_contains($r['body']['message'], 'carlos@example.com'), 'no revela el correo de la cuenta anterior');

    same(1, (int)$db->query('SELECT COUNT(*) FROM branches')->fetchColumn(), 'no se crea otra sucursal');
    same(1, (int)$db->query("SELECT COUNT(*) FROM subscriptions WHERE plan = 'trial'")->fetchColumn(), 'sigue habiendo un solo trial');
    check(outboxLast('otp') === null, 'ni siquiera se gasta un mensaje OTP');
});

// ── Caso 4 · Correo y teléfono distintos, MISMO dispositivo ──────────────────
test('Caso 4 · mismo dispositivo con datos distintos → sube el riesgo, no bloquea', function (PDO $db) {
    useDevice(str_repeat('a', 32));
    fullSignup();
    outboxClear();

    // Mismo dispositivo (no se llama newBrowser): la cookie se conserva.
    $r = fullSignup([
        'email'         => 'segundo@example.com',
        'phone'         => '5599887766',
        'business_name' => 'Segunda Sucursal Independiente',
    ], '190.3.3.3');

    same(201, $r['status'], 'un dueño con dos negocios desde la misma computadora SÍ puede activar');

    $attempt = $db->query("SELECT * FROM trial_attempts WHERE decision = 'TRIAL_GRANTED' ORDER BY id DESC LIMIT 1")->fetch();
    check((int)$attempt['risk_score'] >= 40, 'el dispositivo repetido suma riesgo (>=40)');
    same('medium', $attempt['risk_level'], 'el nivel de riesgo es medio, no bloqueo');
    same(2, (int)$db->query('SELECT COUNT(*) FROM branches')->fetchColumn(), 'se crean las dos sucursales');
});

// ── Caso 5 · Misma IP, teléfonos distintos ───────────────────────────────────
test('Caso 5 · misma IP con teléfonos distintos → NO se bloquea solo por IP', function (PDO $db) {
    $ip = '189.203.44.7';   // p.ej. la red de una plaza comercial

    for ($i = 1; $i <= 3; $i++) {
        newBrowser();
        outboxClear();
        $r = fullSignup([
            'email'         => "negocio{$i}@example.com",
            'phone'         => '55112233' . str_pad((string)$i, 2, '0', STR_PAD_LEFT),
            'business_name' => "Negocio Independiente {$i}",
        ], $ip);
        same(201, $r['status'], "el negocio {$i} de la misma IP debe poder activar su trial");
    }

    same(3, (int)$db->query('SELECT COUNT(*) FROM branches')->fetchColumn(), 'las 3 sucursales existen');
    same(3, (int)$db->query("SELECT COUNT(*) FROM subscriptions WHERE status = 'trial'")->fetchColumn(), 'los 3 trials están activos');
});

// ── Caso 6 · Empleado invitado ───────────────────────────────────────────────
test('Caso 6 · empleado dado de alta en la sucursal → no genera otro trial', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $before   = $db->query('SELECT trial_started_at, trial_ends_at FROM subscriptions')->fetch();

    // Alta de empleado tal como la hace /users (mismo workspace, sin suscripción).
    $db->prepare(
        "INSERT INTO users (branch_id, name, email, username, password, role)
         VALUES (?, 'Mesero Uno', 'mesero@example.com', 'mesero_uno', ?, 'mesero')"
    )->execute([$branchId, password_hash('Mesero2026', PASSWORD_BCRYPT)]);

    same(1, (int)$db->query('SELECT COUNT(*) FROM subscriptions')->fetchColumn(), 'sigue habiendo una sola suscripción');
    $after = $db->query('SELECT trial_started_at, trial_ends_at FROM subscriptions')->fetch();
    same($before['trial_started_at'], $after['trial_started_at'], 'el inicio del trial no cambia');
    same($before['trial_ends_at'], $after['trial_ends_at'], 'el fin del trial no cambia');
    same(2, (int)$db->query('SELECT COUNT(*) FROM users WHERE branch_id IS NOT NULL')->fetchColumn(), 'ambos usuarios comparten el workspace');
});

// ── Caso 7 · Cerrar y volver a iniciar sesión ────────────────────────────────
test('Caso 7 · logout + login → la fecha original del trial permanece', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $before   = trialStateForBranch($db, $branchId);

    // Varias lecturas de sesión (lo que hace /auth/login y /auth/me).
    for ($i = 0; $i < 3; $i++) {
        buildSubscriptionData($db, $branchId, false);
    }

    $after = trialStateForBranch($db, $branchId);
    same($before['trial_started_at'], $after['trial_started_at'], 'trial_started_at es inmutable');
    same($before['trial_ends_at'], $after['trial_ends_at'], 'trial_ends_at es inmutable');
});

// ── Caso 8 · Borrar cookies ──────────────────────────────────────────────────
test('Caso 8 · limpiar cookies → el trial del workspace no se altera', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $before   = trialStateForBranch($db, $branchId);

    newBrowser();                       // el visitante borra sus cookies
    resolveDeviceHash('otro-device-uid'); // y llega con otro identificador

    $after = trialStateForBranch($db, $branchId);
    same($before['trial_ends_at'], $after['trial_ends_at'], 'la fecha de fin no depende del navegador');
    check($after['trial_used'], 'la sucursal sigue marcada como "trial usado"');
});

// ── Caso 9 · Reloj del navegador manipulado ──────────────────────────────────
test('Caso 9 · reloj del cliente manipulado → el trial no cambia', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $before   = trialStateForBranch($db, $branchId);

    // El cliente jura que estamos en 2030 y que su trial dura hasta entonces.
    $r = request('signupStatus', [], ['token' => str_repeat('f', 64)]);
    check(in_array($r['status'], [404, 422], true), 'un token inventado no da acceso a nada');

    $after = trialStateForBranch($db, $branchId);
    same($before['trial_ends_at'], $after['trial_ends_at'], 'la fecha la fija el servidor, no el cliente');
});

// ── Caso 10 · Intento de fijar trial_ends_at desde el front ──────────────────
test('Caso 10 · el front intenta enviar trial_ends_at → se ignora', function (PDO $db) {
    $srv = ['REMOTE_ADDR' => '187.190.10.10'];

    $r = request('signupRegister', registerBody([
        'trial_ends_at'    => '2030-01-01 00:00:00',
        'trial_started_at' => '2030-01-01 00:00:00',
        'trial_days'       => 3650,
        'status'           => 'active',
        'plan'             => 'multisucursal',
    ]), [], $srv);
    same(201, $r['status'], 'el registro se acepta ignorando los campos de más');
    $token = $r['body']['signup_token'];

    $r = request('signupVerifyEmail', ['token' => outboxLast('email_verify')['token']], [], $srv);
    $token = $r['body']['signup_token'];
    request('signupSendPhoneCode', ['signup_token' => $token], [], $srv);
    request('signupVerifyPhone', ['signup_token' => $token, 'code' => outboxLast('otp')['code']], [], $srv);

    $r = request('signupActivate', [
        'signup_token'  => $token,
        'trial_ends_at' => '2030-01-01 00:00:00',
        'trial_days'    => 3650,
        'plan'          => 'multisucursal',
    ], [], $srv);
    same(201, $r['status'], 'la activación responde 201');

    $sub = $db->query('SELECT * FROM subscriptions')->fetch();
    same('trial', $sub['plan'], 'el plan sigue siendo trial, no el que mandó el cliente');
    same(14, (int)$sub['trial_days'], 'los días siguen siendo 14');
    check(strtotime((string)$sub['trial_ends_at']) < strtotime('+15 days'), 'la fecha de fin no se movió a 2030');
    same(14, (int)$db->query('SELECT DATEDIFF(DATE(trial_ends_at), DATE(trial_started_at)) FROM subscriptions')->fetchColumn(), 'siguen siendo 14 días exactos');
});

// ── Caso 11 · Dos activaciones simultáneas ───────────────────────────────────
test('Caso 11 · doble activación concurrente → un solo trial', function (PDO $db) {
    $srv = ['REMOTE_ADDR' => '187.190.10.10'];

    $r     = request('signupRegister', registerBody(), [], $srv);
    $token = $r['body']['signup_token'];
    $r     = request('signupVerifyEmail', ['token' => outboxLast('email_verify')['token']], [], $srv);
    $token = $r['body']['signup_token'];
    request('signupSendPhoneCode', ['signup_token' => $token], [], $srv);
    request('signupVerifyPhone', ['signup_token' => $token, 'code' => outboxLast('otp')['code']], [], $srv);

    // Dos peticiones al mismo endpoint con el mismo handle.
    $a = request('signupActivate', ['signup_token' => $token], [], $srv);
    $b = request('signupActivate', ['signup_token' => $token], [], $srv);

    check(in_array($a['status'], [200, 201], true), 'la primera activación funciona');
    check(in_array($b['status'], [200, 201], true), 'la segunda es idempotente, no falla: ' . json_encode($b['body']));

    same(1, (int)$db->query('SELECT COUNT(*) FROM branches')->fetchColumn(), 'una sola sucursal');
    same(1, (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(), 'un solo usuario');
    same(1, (int)$db->query('SELECT COUNT(*) FROM subscriptions')->fetchColumn(), 'un solo trial');

    // Y la base de datos impide por sí sola un segundo trial en la sucursal.
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $duplicated = false;
    try {
        $db->prepare(
            "INSERT INTO subscriptions (branch_id, plan, status, starts_at, expires_at, trial_seq)
             VALUES (?, 'trial', 'trial', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), 1)"
        )->execute([$branchId]);
        $duplicated = true;
    } catch (PDOException) { /* esperado: viola UNIQUE(branch_id, trial_seq) */ }
    check(!$duplicated, 'la base de datos rechaza un segundo trial en la misma sucursal');
});

// ── Caso 12 · Día 13 ─────────────────────────────────────────────────────────
test('Caso 12 · día 13 del trial → acceso permitido', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();

    // Se retrasa el inicio 13 días: quedan 1 día de prueba.
    $db->exec("UPDATE subscriptions SET trial_started_at = DATE_SUB(NOW(), INTERVAL 13 DAY),
               starts_at = DATE_SUB(NOW(), INTERVAL 13 DAY),
               expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY),
               trial_ends_at = DATE_ADD(NOW(), INTERVAL 1 DAY)");

    $sub = latestSubscription($db, $branchId);
    check(subscriptionOperable($sub)['active'], 'el día 13 la operación sigue permitida');
    same('trialing', trialStateForBranch($db, $branchId)['trial_status'], 'el trial sigue vigente');
    same(1, trialStateForBranch($db, $branchId)['days_remaining'], 'queda 1 día');
});

// ── Caso 13 · Justo después de trial_ends_at ─────────────────────────────────
test('Caso 13 · pasado trial_ends_at → operación bloqueada', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();

    $db->exec("UPDATE subscriptions SET trial_started_at = DATE_SUB(NOW(), INTERVAL 15 DAY),
               starts_at = DATE_SUB(NOW(), INTERVAL 15 DAY),
               expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY),
               trial_ends_at = DATE_SUB(NOW(), INTERVAL 1 DAY)");

    $sub = latestSubscription($db, $branchId);
    check(!subscriptionOperable($sub)['active'], 'la operación queda bloqueada');
    same('expired', effectiveSubscriptionStatus($sub), 'el estado efectivo es vencido de inmediato (sin esperar al cron)');
    same('trial_expired', trialStateForBranch($db, $branchId)['trial_status'], 'el trial figura como terminado');
});

// ── Caso 14 · Trial expirado: datos y acceso ─────────────────────────────────
test('Caso 14 · trial expirado → login permitido, datos intactos, módulos restringidos', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $userId   = (int)$db->query('SELECT id FROM users')->fetchColumn();

    // Datos del cliente creados durante la prueba.
    $db->prepare("INSERT INTO products (branch_id, category_id, name, price) VALUES (?, NULL, 'Taco de pastor', 25.00)")
       ->execute([$branchId]);
    $db->prepare("INSERT INTO orders (branch_id, table_name, status, subtotal, total) VALUES (?, 'Mesa 1', 'completed', 100, 100)")
       ->execute([$branchId]);

    $db->exec("UPDATE subscriptions SET expires_at = DATE_SUB(NOW(), INTERVAL 2 DAY),
               trial_ends_at = DATE_SUB(NOW(), INTERVAL 2 DAY), status = 'expired'");

    $sub = latestSubscription($db, $branchId);
    same('expired', $sub['status'], 'el estado es vencido');
    check($sub['status'] !== 'terminated', 'NO es baja definitiva: el login sigue permitido (auth.php solo bloquea terminated)');
    check(!subscriptionOperable($sub)['active'], 'los módulos operativos quedan bloqueados');

    same(1, (int)$db->query('SELECT COUNT(*) FROM products')->fetchColumn(), 'los productos se conservan');
    same(1, (int)$db->query('SELECT COUNT(*) FROM orders')->fetchColumn(), 'los pedidos se conservan');
    same(2, (int)$db->query('SELECT COUNT(*) FROM categories')->fetchColumn(), 'las categorías se conservan');
    check((bool)$db->query('SELECT COUNT(*) FROM branches')->fetchColumn(), 'la sucursal se conserva');
    same(1, (int)$db->query('SELECT COUNT(*) FROM users WHERE id = ' . $userId)->fetchColumn(), 'el usuario se conserva');

    // Conversión a plan de pago: conserva todo y marca la conversión.
    $db->exec("UPDATE subscriptions SET plan = 'pro', status = 'active', expires_at = DATE_ADD(NOW(), INTERVAL 1 MONTH)");
    markTrialConverted($db, $branchId);
    check($db->query('SELECT converted_at FROM subscriptions')->fetchColumn() !== null, 'queda registrada la conversión');
    same('converted', trialStateForBranch($db, $branchId)['trial_status'], 'el trial figura como convertido');
});

// ── Caso 15 · SuperAdmin extiende el trial ───────────────────────────────────
test('Caso 15 · el superadmin extiende el trial → nueva fecha + auditoría', function (PDO $db) {
    fullSignup();
    $branchId = (int)$db->query('SELECT id FROM branches')->fetchColumn();
    $before   = (string)$db->query('SELECT trial_ends_at FROM subscriptions')->fetchColumn();

    $result = extendTrial($db, $branchId, 7, null, 999, 'Cliente pidió más tiempo');

    $after = (string)$db->query('SELECT trial_ends_at FROM subscriptions')->fetchColumn();
    check(strtotime($after) > strtotime($before), 'la fecha de fin se movió hacia adelante');
    same(7, (int)round((strtotime($after) - strtotime($before)) / 86400), 'se sumaron exactamente 7 días');
    same((string)$db->query('SELECT expires_at FROM subscriptions')->fetchColumn(), $after, 'expires_at queda sincronizado');

    $audit = $db->query('SELECT * FROM trial_admin_audit ORDER BY id DESC LIMIT 1')->fetch();
    check($audit !== false, 'se registra la auditoría');
    same('extend_trial', $audit['action'], 'la acción auditada es la extensión');
    same(999, (int)$audit['changed_by'], 'queda quién la hizo');
    same($before, (string)$audit['previous_trial_end'], 'queda la fecha anterior');
    same($after, (string)$audit['new_trial_end'], 'queda la fecha nueva');
    check($audit['reason'] !== null, 'queda el motivo');

    same($before, (string)$result['previous_trial_end'], 'la respuesta reporta la fecha previa');
});

// ── Caso 16 · Usuario normal intenta extender ────────────────────────────────
test('Caso 16 · un usuario normal no puede extender el trial → 403', function (PDO $db) {
    foreach (['admin', 'mesero', 'cocina'] as $role) {
        $r = request(fn() => requireRole(['role' => $role, 'sub' => 1], 'superadmin'));
        same(403, $r['status'], "el rol {$role} recibe 403 al intentar una acción de superadmin");
    }
    $r = request(fn() => requireRole(['role' => 'superadmin', 'sub' => 1], 'superadmin'));
    same(0, $r['status'], 'el superadmin sí pasa el control de rol');
});

// ── Extra · Normalización antiabuso de correo y teléfono ─────────────────────
test('Extra · alias de correo y formatos de teléfono se colapsan al mismo hash', function (PDO $db) {
    same(emailIdentityHash('juan@gmail.com'), emailIdentityHash('J.U.A.N+trial2@Gmail.com'),
        'los puntos y el +alias de Gmail no crean una identidad nueva');
    same(emailIdentityHash('juan@gmail.com'), emailIdentityHash('juan@googlemail.com'),
        'googlemail.com es el mismo buzón que gmail.com');
    check(emailIdentityHash('juan@outlook.com') !== emailIdentityHash('juan@gmail.com'),
        'dominios distintos son identidades distintas');

    same('+527734090058', normalizePhoneE164('773 409 0058'), 'teléfono nacional a E.164');
    same('+527734090058', normalizePhoneE164('+52 773 409 0058'), 'ya en E.164 se conserva');
    same('+527734090058', normalizePhoneE164('+521 773 409 0058'), 'el "1" histórico de celular se descarta');
    same('+527734090058', normalizePhoneE164('0052 773-409-0058'), 'prefijo internacional 00');
    same(null, normalizePhoneE164('123'), 'un número imposible se rechaza');
});

// ── Extra · Rate limiting ────────────────────────────────────────────────────
test('Extra · rate limiting de registro responde 429', function (PDO $db) {
    $ip     = '45.45.45.45';
    $blocked = false;

    for ($i = 1; $i <= 12; $i++) {
        newBrowser();
        $r = request('signupRegister', registerBody([
            'email' => "spam{$i}@example.com",
            'phone' => '5500000' . str_pad((string)$i, 3, '0', STR_PAD_LEFT),
        ]), [], ['REMOTE_ADDR' => $ip]);
        if ($r['status'] === 429) { $blocked = true; break; }
    }
    check($blocked, 'tras varios registros seguidos desde la misma IP se responde 429');
});

// ── Extra · El OTP nunca se guarda en claro ──────────────────────────────────
test('Extra · el código OTP y los tokens se guardan hasheados', function (PDO $db) {
    $srv   = ['REMOTE_ADDR' => '187.190.10.10'];
    $r     = request('signupRegister', registerBody(), [], $srv);
    $token = $r['body']['signup_token'];

    $mailToken = outboxLast('email_verify')['token'];
    $stored    = (string)$db->query('SELECT token_hash FROM signup_verifications')->fetchColumn();
    check($stored !== $mailToken, 'el token del correo no se guarda en claro');
    same(hash('sha256', $mailToken), $stored, 'se guarda su SHA-256');

    $r     = request('signupVerifyEmail', ['token' => $mailToken], [], $srv);
    $token = $r['body']['signup_token'];
    request('signupSendPhoneCode', ['signup_token' => $token], [], $srv);

    $code       = outboxLast('otp')['code'];
    $storedCode = (string)$db->query('SELECT code_hash FROM signup_otp_codes')->fetchColumn();
    check($storedCode !== $code, 'el OTP no se guarda en claro');
    same(trialHash('otp', $code), $storedCode, 'se guarda su HMAC');

    // Un código equivocado no verifica y descuenta intentos.
    $wrong = str_pad((string)((int)$code + 1 % 1000000), 6, '0', STR_PAD_LEFT);
    $r = request('signupVerifyPhone', ['signup_token' => $token, 'code' => $wrong], [], $srv);
    same(401, $r['status'], 'un código incorrecto responde 401');

    // Un token de correo ya usado no se puede reutilizar.
    $r = request('signupVerifyEmail', ['token' => $mailToken], [], $srv);
    same(410, $r['status'], 'el enlace de verificación es de un solo uso');
});

// ── Extra · Estado del registro nunca filtra datos sensibles ─────────────────
test('Extra · las respuestas del alta no exponen hashes, riesgo ni contraseñas', function (PDO $db) {
    $r    = request('signupRegister', registerBody(), [], ['REMOTE_ADDR' => '187.190.10.10']);
    $json = json_encode($r['body']);

    foreach (['risk', 'hash', 'password', 'FoodIX2026', 'device'] as $needle) {
        check(!str_contains(strtolower($json), strtolower($needle)), "la respuesta no debe contener «{$needle}»: {$json}");
    }
    check(str_contains($json, '***'), 'el correo se devuelve enmascarado');
    check(!str_contains($json, 'carlos@example.com'), 'el correo completo no se repite en la respuesta');
});

// ── Extra · El código solo se envía por correo ───────────────────────────────
test('Extra · el código de verificación se envía únicamente por correo', function (PDO $db) {
    $srv   = ['REMOTE_ADDR' => '187.190.10.10'];
    $r     = request('signupRegister', registerBody(), [], $srv);
    $token = $r['body']['signup_token'];
    $r     = request('signupVerifyEmail', ['token' => outboxLast('email_verify')['token']], [], $srv);
    $token = $r['body']['signup_token'];

    $r = request('signupSendPhoneCode', ['signup_token' => $token], [], $srv);
    same(200, $r['status'], 'el envío del código responde 200');
    same('email', $r['body']['channel'], 'el canal reportado es el correo');
    check(isset($r['body']['email_masked']), 'la respuesta dice a qué correo llegó (enmascarado)');

    // El destinatario del código es el correo del registro, no el teléfono.
    $otp = outboxLast('otp');
    same('carlos@example.com', $otp['to'], 'el código va al correo ya verificado');

    same('email', (string)$db->query('SELECT channel FROM signup_otp_codes ORDER BY id DESC LIMIT 1')->fetchColumn(),
        'la base de datos registra el canal correo');
});

// ── Extra · Plantilla del correo del código ──────────────────────────────────
test('Extra · el correo del código se arma completo y con la marca', function (PDO $db) {
    $html = verificationCodeEmailHtml('ana@example.com', 'Ana', '482913', 10, '+52 *** *** 5678');

    // Contenido
    check(str_contains($html, 'Tu código de verificación'), 'lleva el título del código');
    check(str_contains($html, '482'), 'muestra el código (primer grupo)');
    check(str_contains($html, '913'), 'muestra el código (segundo grupo)');
    check(str_contains($html, 'Vence en 10 minutos'), 'indica la caducidad');
    check(str_contains($html, 'Ana,'), 'saluda por nombre');
    check(str_contains($html, '+52 *** *** 5678'), 'muestra el teléfono enmascarado, nunca completo');

    // Diseño
    check(str_contains($html, '2px dashed'), 'el código va en un recuadro punteado');
    check(str_contains($html, 'text-align:center') || str_contains($html, 'align="center"'), 'el bloque del código está centrado');
    check(str_contains($html, 'font-size:40px'), 'el código se muestra en grande');
    check(str_contains($html, 'Food<span style="color:#D1400F;">IX</span>'), 'lleva el logo/wordmark de FoodIX');
    check(!str_contains($html, '<img'), 'el logo no depende de imágenes externas');

    // Pie
    check(str_contains($html, 'DevHive Software'), 'el pie acredita a DevHive Software');
    check(str_contains($html, mailLongDate()), 'el pie lleva la fecha actual: ' . mailLongDate());
    check(str_contains($html, date('Y')), 'el pie lleva el año en curso');
    check(str_contains($html, '/terminos') && str_contains($html, '/privacidad'), 'el pie enlaza términos y privacidad');
    check(str_contains($html, 'ana@example.com'), 'el pie explica por qué se recibió el mensaje');

    // Seguridad y compatibilidad
    check(str_contains($html, 'No lo compartas'), 'incluye el aviso de no compartir el código');
    check(str_contains($html, 'role="presentation"'), 'usa tablas de maquetación compatibles con Outlook');
    check(str_contains($html, 'x-apple-disable-message-reformatting'), 'evita el reformateo de Apple Mail');
    check(!str_contains(strtolower($html), 'sms') && !str_contains(strtolower($html), 'whatsapp')
        || str_contains($html, 'ni correo'), 'no promete envíos por SMS/WhatsApp');
});

// ── Extra · Escapado de la plantilla ─────────────────────────────────────────
test('Extra · los datos del usuario se escapan en el correo (sin XSS)', function (PDO $db) {
    $html = verificationCodeEmailHtml('x@example.com', '<script>alert(1)</script>', '000111', 10, null);
    check(!str_contains($html, '<script>alert(1)</script>'), 'el nombre no se inyecta como HTML');
    check(str_contains($html, '&lt;script&gt;'), 'el nombre viaja escapado');
});

echo str_repeat('─', 60) . "\n";
echo ($failed === 0 ? "\033[32m" : "\033[31m") . "$passed pasaron · $failed fallaron\033[0m\n\n";

if ($failed > 0) {
    foreach ($failures as $f) echo "  · $f\n";
    echo "\n";
    exit(1);
}
exit(0);
