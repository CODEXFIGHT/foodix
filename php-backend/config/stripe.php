<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Configuración e integración con la API de Stripe.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// ── Configuración Stripe — reemplaza con tus llaves antes de activar ────────────
// Usa llaves de TEST (sk_test_…, whsec_…) mientras pruebas. NUNCA expongas la
// secret key en el frontend. La publishable key vive en el .env de Next.js.
if (!defined('STRIPE_SECRET_KEY'))               define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_PLACEHOLDER');
if (!defined('STRIPE_WEBHOOK_SECRET'))           define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET') ?: 'whsec_PLACEHOLDER');
if (!defined('STRIPE_PRICE_ID_MONTHLY_RESTAUROS')) define('STRIPE_PRICE_ID_MONTHLY_RESTAUROS', getenv('STRIPE_PRICE_ID_MONTHLY_RESTAUROS') ?: 'price_PLACEHOLDER');
if (!defined('APP_URL'))                          define('APP_URL', getenv('APP_URL') ?: 'https://foodix.app');

/** True si Stripe está realmente configurado (no placeholders). */
function stripeConfigured(): bool {
    return str_starts_with(STRIPE_SECRET_KEY, 'sk_')
        && !str_contains(STRIPE_SECRET_KEY, 'PLACEHOLDER');
}

/**
 * Llamada a la API REST de Stripe vía cURL (sin SDK).
 * $params se envía como application/x-www-form-urlencoded (notación de Stripe).
 * Lanza RuntimeException con el mensaje de Stripe si la respuesta no es 2xx.
 */
function stripeRequest(string $method, string $path, array $params = []): array {
    $ch = curl_init('https://api.stripe.com/v1/' . ltrim($path, '/'));

    $headers = [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Content-Type: application/x-www-form-urlencoded',
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    if ($method !== 'GET' && $params) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    }

    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException('Error de conexión con Stripe: ' . $err);
    }

    $data = json_decode($raw, true) ?? [];
    if ($code < 200 || $code >= 300) {
        $msg = $data['error']['message'] ?? 'Error de Stripe';
        throw new RuntimeException($msg, $code);
    }
    return $data;
}

/**
 * Verifica la firma del webhook de Stripe (cabecera Stripe-Signature),
 * formato "t=timestamp,v1=signature". Devuelve el evento decodificado o null.
 * Sin dependencia del SDK. Tolerancia por defecto: 5 minutos.
 */
function stripeVerifyWebhook(string $payload, string $sigHeader, string $secret, int $tolerance = 300): ?array {
    if ($sigHeader === '' || $secret === '') return null;

    $timestamp = null;
    $signatures = [];
    foreach (explode(',', $sigHeader) as $part) {
        $kv = explode('=', $part, 2);
        if (count($kv) !== 2) continue;
        [$k, $v] = $kv;
        if ($k === 't')  $timestamp = $v;
        if ($k === 'v1') $signatures[] = $v;
    }

    if ($timestamp === null || !$signatures) return null;

    // Anti-replay
    if (abs(time() - (int)$timestamp) > $tolerance) return null;

    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    $valid = false;
    foreach ($signatures as $sig) {
        if (hash_equals($expected, $sig)) { $valid = true; break; }
    }
    if (!$valid) return null;

    return json_decode($payload, true) ?: null;
}
