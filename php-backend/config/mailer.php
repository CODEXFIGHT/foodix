<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Envío de correo simple (mail() de PHP) para notificaciones de la marca.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Buzón que recibe las notificaciones del sistema (cotizaciones/contacto).
if (!defined('MAIL_NOTIFY_TO')) {
    define('MAIL_NOTIFY_TO', 'foodix@atomicmail.io');
}
// Remitente: debe ser una dirección del propio dominio para no caer en spam.
if (!defined('MAIL_FROM')) {
    define('MAIL_FROM', 'no-reply@tallercheck.mx');
}
if (!defined('MAIL_FROM_NAME')) {
    define('MAIL_FROM_NAME', 'FoodIX');
}

/**
 * Envía un correo HTML. Devuelve true si mail() aceptó el mensaje para entrega.
 * No lanza excepciones: el guardado del lead nunca debe fallar por el correo.
 */
function sendHtmlMail(string $to, string $subject, string $html, ?string $replyTo = null): bool {
    $fromName = mb_encode_mimeheader(MAIL_FROM_NAME, 'UTF-8');

    $headers   = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'From: ' . $fromName . ' <' . MAIL_FROM . '>';
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }
    $headers[] = 'X-Mailer: FoodIX';

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    try {
        return @mail($to, $encodedSubject, $html, implode("\r\n", $headers), '-f' . MAIL_FROM);
    } catch (\Throwable $e) {
        error_log('[FoodIX mail] ' . $e->getMessage());
        return false;
    }
}
