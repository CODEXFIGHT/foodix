<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Envío de correo por SMTP autenticado, en PHP puro (sin Composer ni
 * dependencias externas) para hosting compartido tipo Neubox.
 *
 * ¿Por qué no solo mail()?  En hosting compartido mail() entrega "a veces":
 * sin SPF/DKIM alineados los correos de verificación caen en spam y el alta
 * se rompe. Con una cuenta de correo del propio dominio (la que ya incluye
 * Neubox) y SMTP autenticado, la entrega es fiable.
 *
 * Configuración (en config/secrets.local.php, NUNCA versionado):
 *   define('SMTP_HOST',   'mail.tudominio.mx');
 *   define('SMTP_PORT',   587);           // 587 STARTTLS · 465 SSL
 *   define('SMTP_SECURE', 'tls');         // 'tls' | 'ssl' | ''
 *   define('SMTP_USER',   'no-reply@tudominio.mx');
 *   define('SMTP_PASS',   '...');
 *
 * Si SMTP_HOST no está definido o el envío falla, se cae automáticamente a
 * mail() (config/mailer.php), que es lo que ya usa el sistema para leads.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/mailer.php';

/** ¿Hay SMTP configurado? */
function smtpConfigured(): bool {
    return defined('SMTP_HOST') && SMTP_HOST !== '' && defined('SMTP_USER') && defined('SMTP_PASS');
}

/**
 * Envía un correo HTML: SMTP autenticado si está configurado, mail() si no.
 * Nunca lanza excepciones ni escribe el cuerpo del mensaje en los logs.
 */
function sendTransactionalMail(string $to, string $subject, string $html): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;

    if (smtpConfigured()) {
        try {
            if (smtpSend($to, $subject, $html)) return true;
        } catch (Throwable $e) {
            error_log('[FoodIX smtp] ' . $e->getMessage());
        }
    }

    return sendHtmlMail($to, $subject, $html);
}

/**
 * Diálogo SMTP mínimo: EHLO → STARTTLS → AUTH LOGIN → MAIL FROM → RCPT TO → DATA.
 */
function smtpSend(string $to, string $subject, string $html): bool {
    $host   = SMTP_HOST;
    $port   = defined('SMTP_PORT') ? (int)SMTP_PORT : 587;
    $secure = defined('SMTP_SECURE') ? strtolower((string)SMTP_SECURE) : 'tls';
    $from   = defined('SMTP_FROM') ? SMTP_FROM : (defined('MAIL_FROM') ? MAIL_FROM : SMTP_USER);

    $transport = $secure === 'ssl' ? 'ssl://' . $host : $host;

    $ctx = stream_context_create(['ssl' => [
        'verify_peer'       => true,
        'verify_peer_name'  => true,
        'SNI_enabled'       => true,
    ]]);

    $fp = @stream_socket_client(
        $transport . ':' . $port,
        $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx
    );
    if (!$fp) {
        error_log("[FoodIX smtp] conexión fallida: $errno $errstr");
        return false;
    }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp): string {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            // La última línea de una respuesta multilínea usa espacio, no guion.
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $data;
    };
    $cmd = function (string $line, string $expect) use ($fp, $read): bool {
        fwrite($fp, $line . "\r\n");
        $res = $read();
        return str_starts_with(trim($res), $expect);
    };

    $greeting = $read();
    if (!str_starts_with(trim($greeting), '220')) { fclose($fp); return false; }

    $ehloHost = $_SERVER['SERVER_NAME'] ?? 'foodix.local';
    if (!$cmd('EHLO ' . $ehloHost, '250')) { fclose($fp); return false; }

    if ($secure === 'tls') {
        if (!$cmd('STARTTLS', '220')) { fclose($fp); return false; }
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            return false;
        }
        if (!$cmd('EHLO ' . $ehloHost, '250')) { fclose($fp); return false; }
    }

    if (!$cmd('AUTH LOGIN', '334'))                        { fclose($fp); return false; }
    if (!$cmd(base64_encode(SMTP_USER), '334'))            { fclose($fp); return false; }
    if (!$cmd(base64_encode(SMTP_PASS), '235'))            { fclose($fp); return false; }
    if (!$cmd('MAIL FROM:<' . $from . '>', '250'))         { fclose($fp); return false; }
    if (!$cmd('RCPT TO:<' . $to . '>', '250'))             { fclose($fp); return false; }
    if (!$cmd('DATA', '354'))                              { fclose($fp); return false; }

    $fromName = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'FoodIX';
    $headers  = [
        'From: ' . mb_encode_mimeheader($fromName, 'UTF-8') . ' <' . $from . '>',
        'To: <' . $to . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Date: ' . date('r'),
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        'X-Mailer: FoodIX',
    ];

    $body = chunk_split(base64_encode($html));
    // Protección contra inyección de comandos SMTP: una línea que empiece con
    // '.' se escapa duplicando el punto (RFC 5321 §4.5.2).
    $body = preg_replace('/^\./m', '..', $body) ?? $body;

    fwrite($fp, implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.\r\n");
    $res = $read();
    $ok  = str_starts_with(trim($res), '250');

    $cmd('QUIT', '221');
    fclose($fp);

    return $ok;
}
