<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Punto de entrada y router principal de la API REST.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Toda la API opera en horario de la Ciudad de México (UTC-06:00, sin horario
// de verano desde 2022). Esto garantiza que date()/strtotime() en PHP coincidan
// con NOW()/CURDATE()/CURRENT_TIMESTAMP de MySQL (ver config/database.php, que
// fija el time_zone de la sesión). Evita cortes de día/semana/mes desfasados.
date_default_timezone_set('America/Mexico_City');

// Compresión gzip de la respuesta JSON (si el cliente la acepta y el servidor
// no la está comprimiendo ya). Reduce ~70-80% el tamaño transferido.
if (!ini_get('zlib.output_compression')
    && extension_loaded('zlib')
    && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip')) {
    ob_start('ob_gzhandler');
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/jwt.php';
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/config/audit.php';
require_once __DIR__ . '/config/cash_guard.php';

setCorsHeaders();
header('Content-Type: application/json; charset=utf-8');
// API dinámica: nunca cachear respuestas (evita listas/datos obsoletos).
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(int $status, string $message, array $extra = []): never {
    http_response_code($status);
    echo json_encode(
        array_merge(['error' => true, 'message' => $message], $extra),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw ?: '{}', true) ?? [];
}

function intParam(string $key, int $default = 0): int {
    return isset($_GET[$key]) ? (int) $_GET[$key] : $default;
}

function strParam(string $key, string $default = ''): string {
    return isset($_GET[$key]) ? trim((string) $_GET[$key]) : $default;
}

/**
 * Optimiza y redimensiona una imagen a formato WebP conservando relación de aspecto y transparencia.
 */
function optimizeAndSaveImageWebp(string $tmpPath, string $destPath, int $maxDimension = 1200, int $quality = 80): bool {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    $img = match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($tmpPath),
        'image/png'  => @imagecreatefrompng($tmpPath),
        'image/webp' => @imagecreatefromwebp($tmpPath),
        default      => null,
    };

    if (!$img) {
        return false;
    }

    $width  = imagesx($img);
    $height = imagesy($img);

    // Calcular nuevas dimensiones manteniendo aspect ratio
    $newWidth  = $width;
    $newHeight = $height;

    if ($width > $maxDimension || $height > $maxDimension) {
        if ($width > $height) {
            $newWidth  = $maxDimension;
            $newHeight = (int) round(($height * $maxDimension) / $width);
        } else {
            $newHeight = $maxDimension;
            $newWidth  = (int) round(($width * $maxDimension) / $height);
        }
    }

    // Crear la nueva imagen con dimensiones optimizadas
    $newImg = imagecreatetruecolor($newWidth, $newHeight);
    if (!$newImg) {
        imagedestroy($img);
        return false;
    }

    // Soporte para transparencia (PNG / WebP)
    imagealphablending($newImg, false);
    imagesavealpha($newImg, true);
    
    // Rellenar con color transparente
    $transparent = imagecolorallocatealpha($newImg, 0, 0, 0, 127);
    imagefill($newImg, 0, 0, $transparent);

    // Redimensionar
    if (!imagecopyresampled($newImg, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height)) {
        imagedestroy($img);
        imagedestroy($newImg);
        return false;
    }

    // Guardar como WebP
    $success = imagewebp($newImg, $destPath, $quality);

    imagedestroy($img);
    imagedestroy($newImg);

    return $success;
}

// ── Router ────────────────────────────────────────────────────────────────────

$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$base   = '/foodix/api';

// Soporte para PATH_INFO (cuando se llama index.php directamente sin mod_rewrite)
if (!empty($_SERVER['PATH_INFO'])) {
    $path = ltrim($_SERVER['PATH_INFO'], '/');
} else {
    $path = ltrim(substr($uri, strlen($base)), '/');
    // Quitar "index.php/" si viene en la URI
    $path = preg_replace('#^index\.php/?#', '', $path);
}

$segments = $path !== '' ? explode('/', $path) : [];
$method   = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── Health-check (keep-warm / monitoreo) ────────────────────────────────────
// Responde al instante SIN tocar la base de datos: su único fin es mantener
// caliente el hosting/opcache y dejar lista la conexión (DNS+TLS) para que el
// primer login/consulta sea rápido. Lo usan el warm-up del cliente y UptimeRobot.
if (($segments[0] ?? '') === 'health') {
    jsonResponse(['ok' => true, 'app' => 'FoodIX API', 'ts' => time()]);
}

// Method override: PHP no parsea multipart en PATCH/PUT, así que el cliente
// envía POST + _method (o header X-HTTP-Method-Override) para esas operaciones.
if ($method === 'POST') {
    $override = strtoupper(trim((string)($_POST['_method'] ?? ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ''))));
    if (in_array($override, ['PATCH', 'PUT', 'DELETE'], true)) {
        $method = $override;
    }
}

try {
    if (empty($segments)) {
        jsonResponse(['status' => 'ok', 'version' => '1.0', 'app' => 'FoodIX API']);
    }

    match ($segments[0]) {
        'public'       => (require_once __DIR__ . '/routes/public.php')       && handlePublic($segments, $method),
        'leads'        => (require_once __DIR__ . '/routes/leads.php')         && handleLeads($segments, $method),
        'auth'         => (require_once __DIR__ . '/routes/auth.php')         && handleAuth($segments, $method),
        'signup'       => (require_once __DIR__ . '/routes/signup.php')       && handleSignup($segments, $method),
        'subscription' => (require_once __DIR__ . '/routes/subscription.php') && handleSubscription($segments, $method),
        'subscription-cron' => (require_once __DIR__ . '/routes/subscription_cron.php') && handleSubscriptionCron($segments, $method),
        'superadmin'   => (require_once __DIR__ . '/routes/superadmin_subscriptions.php') && handleSuperadminSubscriptions($segments, $method),
        'billing'      => (require_once __DIR__ . '/routes/billing.php')       && handleBilling($segments, $method),
        'webhooks'     => (require_once __DIR__ . '/routes/webhooks/stripe.php') && handleWebhooks($segments, $method),
        'branches'     => (require_once __DIR__ . '/routes/branches.php')     && handleBranches($segments, $method),
        'devices'      => (require_once __DIR__ . '/routes/devices.php')      && handleDevices($segments, $method),
        'device-monitor' => (require_once __DIR__ . '/routes/device_monitor.php') && handleDeviceMonitor($segments, $method),
        'users'        => (require_once __DIR__ . '/routes/users.php')        && handleUsers($segments, $method),
        'categories'   => (require_once __DIR__ . '/routes/categories.php')   && handleCategories($segments, $method),
        'products'     => (require_once __DIR__ . '/routes/products.php')     && handleProducts($segments, $method),
        'modifiers'    => (require_once __DIR__ . '/routes/modifiers.php')    && handleModifiers($segments, $method),
        'promotions'   => (require_once __DIR__ . '/routes/promotions.php')   && handlePromotions($segments, $method),
        'tables'       => (require_once __DIR__ . '/routes/tables.php')       && handleTables($segments, $method),
        'orders'       => (require_once __DIR__ . '/routes/orders.php')       && handleOrders($segments, $method),
        'ordenes'      => (require_once __DIR__ . '/routes/ordenes.php')      && handleOrdenes($segments, $method),
        'sales'        => (require_once __DIR__ . '/routes/sales.php')        && handleSales($segments, $method),
        'stations'     => (require_once __DIR__ . '/routes/stations.php')    && handleStations($segments, $method),
        'cash'         => (require_once __DIR__ . '/routes/cash.php')         && handleCash($segments, $method),
        'inventory'    => (require_once __DIR__ . '/routes/inventory.php')    && handleInventory($segments, $method),
        'inventory-warehouses' => (require_once __DIR__ . '/routes/inventory_warehouses.php') && handleInventoryWarehouses($segments, $method),
        'inventory-transfers' => (require_once __DIR__ . '/routes/inventory_transfers.php') && handleInventoryTransfers($segments, $method),
        'recipes'      => (require_once __DIR__ . '/routes/recipes.php')      && handleRecipes($segments, $method),
        'suppliers'    => (require_once __DIR__ . '/routes/suppliers.php')    && handleSuppliers($segments, $method),
        'purchases'    => (require_once __DIR__ . '/routes/purchases.php')    && handlePurchases($segments, $method),
        'customers'    => (require_once __DIR__ . '/routes/customers.php')    && handleCustomers($segments, $method),
        'reviews'      => (require_once __DIR__ . '/routes/reviews.php')      && handleReviews($segments, $method),
        'reservations' => (require_once __DIR__ . '/routes/reservations.php') && handleReservations($segments, $method),
        'drivers'      => (require_once __DIR__ . '/routes/drivers.php')      && handleDrivers($segments, $method),
        'delivery-zones' => (require_once __DIR__ . '/routes/delivery_zones.php') && handleDeliveryZones($segments, $method),
        'print'        => (require_once __DIR__ . '/routes/print.php')       && handlePrint($segments, $method),
        'push'         => (require_once __DIR__ . '/routes/push.php')         && handlePush($segments, $method),
        'whatsapp'     => (require_once __DIR__ . '/routes/whatsapp.php')     && handleWhatsapp($segments, $method),
        'accessibility' => (require_once __DIR__ . '/routes/accessibility.php') && handleAccessibility($segments, $method),
        default        => jsonError(404, 'Ruta no encontrada'),
    };

} catch (PDOException $e) {
    error_log('[FoodIX DB] ' . $e->getMessage());
    jsonError(500, 'Error de base de datos: ' . $e->getMessage());
} catch (Throwable $e) {
    error_log('[FoodIX] ' . $e->getMessage());
    jsonError(500, 'Error interno del servidor');
}
