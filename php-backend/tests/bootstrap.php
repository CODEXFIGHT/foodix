<?php
/**
 * FoodIX — Arranque de las pruebas del backend PHP.
 *
 * Levanta el backend REAL (mismos archivos que corren en producción) contra
 * una base de datos de pruebas, sustituyendo únicamente la capa HTTP:
 *   · jsonResponse()/jsonError() lanzan una excepción en vez de hacer exit
 *   · getBody() lee el cuerpo simulado en vez de php://input
 *   · los envíos de correo/OTP se capturan en memoria (TRIAL_NOTIFY_CAPTURE)
 *
 * Uso:
 *   ROS_DB_USER=root ROS_DB_PASS=... php php-backend/tests/run-trial-tests.php
 *
 * @package FoodIX
 */
declare(strict_types=1);

date_default_timezone_set('America/Mexico_City');
error_reporting(E_ALL);
ini_set('display_errors', '1');

putenv('ROS_DB_NAME=' . (getenv('ROS_DB_NAME') ?: 'foodix_test'));
if (!getenv('ROS_DB_USER')) putenv('ROS_DB_USER=' . (get_current_user() ?: 'root'));
if (getenv('ROS_DB_PASS') === false) putenv('ROS_DB_PASS=');

define('TRIAL_NOTIFY_CAPTURE', true);
$GLOBALS['__trial_outbox'] = [];

// ── Capa HTTP simulada ───────────────────────────────────────────────────────

/** Excepción que sustituye al `exit` de la API real. */
final class ApiExit extends RuntimeException {
    public function __construct(public readonly int $status, public readonly array $payload) {
        parent::__construct('api exit ' . $status);
    }
}

function jsonResponse(mixed $data, int $status = 200): never {
    throw new ApiExit($status, is_array($data) ? $data : ['data' => $data]);
}

function jsonError(int $status, string $message, array $extra = []): never {
    throw new ApiExit($status, array_merge(['error' => true, 'message' => $message], $extra));
}

function getBody(): array {
    return $GLOBALS['__test_body'] ?? [];
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/subscription_helpers.php';
require_once __DIR__ . '/../config/trial_identity.php';
require_once __DIR__ . '/../config/trial_risk.php';
require_once __DIR__ . '/../config/trial_service.php';
require_once __DIR__ . '/../config/trial_notify.php';
require_once __DIR__ . '/../config/rate_limit.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../routes/auth.php';
require_once __DIR__ . '/../routes/signup.php';

// ── Utilidades de prueba ─────────────────────────────────────────────────────

/**
 * Ejecuta un endpoint simulando una petición HTTP.
 *
 * @return array{status:int, body:array}
 */
function request(callable $handler, array $body = [], array $query = [], array $server = []): array {
    $GLOBALS['__test_body'] = $body;
    $_GET    = $query;
    $_SERVER = array_merge([
        'REMOTE_ADDR'     => '187.190.10.10',
        'HTTP_USER_AGENT' => 'FoodIX-Tests/1.0',
        'REQUEST_METHOD'  => 'POST',
        'SERVER_NAME'     => 'tests.local',
    ], $server);

    try {
        $handler();
    } catch (ApiExit $e) {
        return ['status' => $e->status, 'body' => $e->payload];
    }
    return ['status' => 0, 'body' => []];
}

/** Vacía y devuelve los mensajes capturados (correos/OTP). */
function outbox(?string $kind = null): array {
    $items = $GLOBALS['__trial_outbox'];
    return $kind === null ? $items : array_values(array_filter($items, fn($m) => $m['kind'] === $kind));
}

function outboxLast(string $kind): ?array {
    $items = outbox($kind);
    return $items ? $items[count($items) - 1] : null;
}

function outboxClear(): void {
    $GLOBALS['__trial_outbox'] = [];
}

/** Simula un navegador nuevo: borra la cookie de dispositivo. */
function newBrowser(): void {
    unset($_COOKIE['ros_did']);
}

/** Simula el MISMO dispositivo entre registros. */
function useDevice(string $did): void {
    $_COOKIE['ros_did'] = $did;
}

/** Reinicia la base de datos de pruebas a un estado limpio. */
function resetDatabase(PDO $db): void {
    $db->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach ([
        'signup_otp_codes', 'signup_verifications', 'signups',
        'trial_identities', 'trial_attempts', 'trial_rate_limits', 'trial_admin_audit',
        'subscription_audit_log', 'subscriptions',
        'order_items', 'orders', 'products', 'categories', 'users', 'branches',
    ] as $t) {
        $db->exec("TRUNCATE TABLE `$t`");
    }
    $db->exec('SET FOREIGN_KEY_CHECKS = 1');
    outboxClear();
    newBrowser();
}
