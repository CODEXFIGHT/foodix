<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Codificación y verificación de tokens JWT.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwtEncode(array $payload, string $secret): string {
    $header  = base64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $body    = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$body", $secret, true));
    return "$header.$body.$sig";
}

function jwtDecode(string $token, string $secret): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $body, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", $secret, true));

    // Timing-safe comparison
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode(base64url_decode($body), true);
    if (!is_array($payload)) return null;

    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}
