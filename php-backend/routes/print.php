<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Cola e impresión de tickets y comandas.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// POST /print  → manda bytes crudos (ESC/POS) a una impresora de red por el
// puerto 9100 (RAW/JetDirect), el estándar que entienden prácticamente todas
// las impresoras térmicas de tickets con interfaz Ethernet/WiFi.
//
// Sirve tanto para imprimir el ticket como para abrir el cajón de dinero
// (el cajón se conecta a la impresora, así que es el mismo canal de bytes).
//
// Nota: el servidor PHP debe poder ALCANZAR la IP de la impresora. Si el
// backend está hospedado fuera de la LAN del restaurante, usa el modo USB
// (WebUSB) desde la caja. Este endpoint es para backend en la misma red.

function handlePrint(array $seg, string $method): never {
    requireAuth();

    if ($method !== 'POST') {
        jsonError(405, 'Método no permitido');
    }

    $body = getBody();
    $ip   = trim((string)($body['ip'] ?? ''));
    $port = (int)($body['port'] ?? 9100);
    $b64  = (string)($body['data'] ?? '');

    if ($ip === '' || $b64 === '') {
        jsonError(422, 'Se requieren ip y data (base64)');
    }

    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        jsonError(422, 'IP inválida');
    }

    // Bloquea link-local / metadata de nube (anti-SSRF).
    if (str_starts_with($ip, '169.254.')) {
        jsonError(422, 'IP no permitida');
    }

    if ($port < 1 || $port > 65535) {
        jsonError(422, 'Puerto inválido');
    }

    $data = base64_decode($b64, true);
    if ($data === false) {
        jsonError(422, 'data no es base64 válido');
    }

    // Conexión TCP cruda a la impresora.
    $errno  = 0;
    $errstr = '';
    $fp = @fsockopen($ip, $port, $errno, $errstr, 4.0);
    if (!$fp) {
        jsonError(502, "No se pudo conectar con la impresora ($ip:$port): $errstr");
    }

    stream_set_timeout($fp, 4);
    $written = @fwrite($fp, $data);
    @fflush($fp);
    @fclose($fp);

    if ($written === false) {
        jsonError(502, 'Error al enviar datos a la impresora');
    }

    jsonResponse(['ok' => true, 'bytes' => $written]);
}
