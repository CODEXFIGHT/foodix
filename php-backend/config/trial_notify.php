<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Correos del alta y de la prueba gratuita: verificación de cuenta, código de
 * verificación, bienvenida, recordatorios y fin de prueba.
 *
 * CANAL ÚNICO: CORREO ELECTRÓNICO.
 * No se usa SMS ni WhatsApp para los códigos. El envío va por SMTP autenticado
 * en PHP puro (config/smtp_mailer.php) sobre la cuenta de correo del propio
 * dominio incluida en el hosting — sin proveedores externos, sin Composer y sin
 * costo por mensaje. Si no hay SMTP configurado, cae a mail().
 *
 * Los códigos y los tokens viajan SOLO dentro del correo: nunca se escriben en
 * los logs ni se devuelven por la API.
 *
 * Las plantillas usan tablas y estilos en línea (lo único que renderizan bien
 * Gmail, Outlook y Apple Mail) y no dependen de imágenes externas: el logo es
 * HTML+CSS, así que se ve igual aunque el cliente bloquee las imágenes.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/smtp_mailer.php';

/** URL pública del front (para armar los enlaces de los correos). */
if (!defined('APP_PUBLIC_URL')) {
    define('APP_PUBLIC_URL', getenv('APP_PUBLIC_URL') ?: 'https://foodix.app');
}

/** Buzón de soporte que se muestra en los correos. */
if (!defined('SUPPORT_EMAIL')) {
    define('SUPPORT_EMAIL', 'foodix@atomicmail.io');
}

// ── Paleta de marca (una sola fuente para todas las plantillas) ──────────────
const MAIL_BRAND       = '#D1400F';
const MAIL_BRAND_DARK  = '#B03508';
const MAIL_INK         = '#1C1917';
const MAIL_BODY        = '#44403C';
const MAIL_MUTED       = '#78716C';
const MAIL_FAINT       = '#A8A29E';
const MAIL_LINE        = '#E7E5E4';
const MAIL_CANVAS      = '#FAF9F7';
const MAIL_FONT        = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Modo captura para pruebas automatizadas. Con la constante
 * TRIAL_NOTIFY_CAPTURE definida (solo en tests/bootstrap.php), ningún envío
 * sale a la red: se acumula en $GLOBALS['__trial_outbox'] para que las pruebas
 * puedan leer el token o el código. En producción esa constante no existe.
 */
function trialNotifyCaptureEnabled(): bool {
    return defined('TRIAL_NOTIFY_CAPTURE') && TRIAL_NOTIFY_CAPTURE;
}

function trialNotifyCapture(string $kind, array $data): bool {
    $GLOBALS['__trial_outbox'][] = ['kind' => $kind] + $data;
    return true;
}

// ── Utilidades de plantilla ──────────────────────────────────────────────────

function e(string $v): string {
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

/** Fecha larga en español: "20 de agosto de 2026". */
function mailLongDate(?string $date = null): string {
    $ts     = $date ? (strtotime($date) ?: time()) : time();
    $meses  = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return (int)date('j', $ts) . ' de ' . $meses[(int)date('n', $ts) - 1] . ' de ' . date('Y', $ts);
}

/** Fecha corta en español: "20 ago 2026". */
function mailShortDate(?string $date = null): string {
    $ts    = $date ? (strtotime($date) ?: time()) : time();
    $meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return date('j', $ts) . ' ' . $meses[(int)date('n', $ts) - 1] . ' ' . date('Y', $ts);
}

/**
 * Logo de FoodIX en HTML+CSS: cuadro naranja con la "R" y el wordmark.
 * Sin imágenes: no se rompe si el cliente de correo las bloquea.
 */
function mailLogo(): string {
    $b = MAIL_BRAND; $ink = MAIL_INK; $muted = MAIL_MUTED; $font = MAIL_FONT;
    return <<<HTML
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-right:10px;vertical-align:middle;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="40" height="40" align="center" valign="middle"
              style="width:40px;height:40px;background:{$b};border-radius:11px;
                     font-family:{$font};font-size:21px;font-weight:800;color:#ffffff;line-height:40px;">F</td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:middle;">
      <div style="font-family:{$font};font-size:20px;font-weight:800;color:{$ink};letter-spacing:-0.4px;line-height:1.1;">
        Food<span style="color:{$b};">IX</span>
      </div>
      <div style="font-family:{$font};font-size:11px;color:{$muted};line-height:1.4;margin-top:2px;">
        Tu restaurante, en orden
      </div>
    </td>
  </tr>
</table>
HTML;
}

/**
 * Pie de todos los correos: marca, fecha de envío, avisos legales y soporte.
 */
function mailFooter(string $recipient = ''): string {
    $font   = MAIL_FONT;
    $faint  = MAIL_FAINT;
    $muted  = MAIL_MUTED;
    $line   = MAIL_LINE;
    $brand  = MAIL_BRAND;
    $app    = rtrim(APP_PUBLIC_URL, '/');
    $year   = date('Y');
    $today  = mailLongDate();
    $to     = $recipient !== '' ? e($recipient) : '';
    $support = e(SUPPORT_EMAIL);

    $sentTo = $to !== ''
        ? "<p style=\"margin:0 0 10px;font-family:{$font};font-size:11px;line-height:1.6;color:{$faint};\">
             Este mensaje se envió a <span style=\"color:{$muted};\">{$to}</span> porque se usó
             este correo para crear una cuenta en FoodIX. Si no fuiste tú, puedes ignorarlo.
           </p>"
        : '';

    return <<<HTML
<tr>
  <td style="padding:0 32px;">
    <div style="height:1px;background:{$line};line-height:1px;font-size:0;">&nbsp;</div>
  </td>
</tr>
<tr>
  <td style="padding:20px 32px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:{$font};font-size:12px;color:{$muted};line-height:1.6;">
          <strong style="color:#1C1917;">FoodIX</strong> · Software de gestión para restaurantes
        </td>
        <td align="right" style="font-family:{$font};font-size:11px;color:{$faint};white-space:nowrap;">
          {$today}
        </td>
      </tr>
    </table>

    <p style="margin:14px 0 10px;font-family:{$font};font-size:11px;line-height:1.6;color:{$faint};">
      <a href="{$app}/terminos" style="color:{$muted};text-decoration:underline;">Términos y condiciones</a>
      &nbsp;·&nbsp;
      <a href="{$app}/privacidad" style="color:{$muted};text-decoration:underline;">Aviso de privacidad</a>
      &nbsp;·&nbsp;
      <a href="mailto:{$support}" style="color:{$muted};text-decoration:underline;">Soporte</a>
    </p>

    {$sentTo}

    <p style="margin:0;font-family:{$font};font-size:11px;line-height:1.6;color:{$faint};">
      &copy; {$year} <a href="https://devhivesoftware.com" style="color:{$brand};text-decoration:none;font-weight:600;">DevHive Software</a>.
      Todos los derechos reservados.
    </p>
  </td>
</tr>
HTML;
}

/**
 * Envoltura común: fondo, tarjeta, cabecera con logo y pie.
 *
 * @param string $preheader Texto de vista previa (bandeja de entrada). Va oculto.
 */
function mailShell(string $preheader, string $contentHtml, string $recipient = ''): string {
    $font   = MAIL_FONT;
    $canvas = MAIL_CANVAS;
    $line   = MAIL_LINE;
    $logo   = mailLogo();
    $footer = mailFooter($recipient);
    $pre    = e($preheader);

    return <<<HTML
<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>FoodIX</title>
</head>
<body style="margin:0;padding:0;background:{$canvas};-webkit-font-smoothing:antialiased;">
  <!-- Vista previa en la bandeja de entrada -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{$pre}</div>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{$canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background:#ffffff;border:1px solid {$line};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 0;">{$logo}</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;font-family:{$font};">{$contentHtml}</td>
          </tr>
          {$footer}
        </table>

        <p style="max-width:560px;margin:14px auto 0;font-family:{$font};font-size:11px;line-height:1.6;color:#B7B2AD;text-align:center;">
          Este es un correo automático, por favor no respondas a esta dirección.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/** Botón principal (bulletproof: tabla + relleno, sin depender de CSS avanzado). */
function mailButton(string $url, string $label): string {
    $font  = MAIL_FONT;
    $brand = MAIL_BRAND;
    $u     = e($url);
    $l     = e($label);

    return <<<HTML
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
  <tr>
    <td align="center" bgcolor="{$brand}" style="border-radius:12px;">
      <a href="{$u}"
         style="display:inline-block;padding:14px 30px;font-family:{$font};font-size:15px;font-weight:700;
                color:#ffffff;text-decoration:none;border-radius:12px;">{$l}</a>
    </td>
  </tr>
</table>
HTML;
}

/** Aviso de seguridad discreto (fondo suave + borde). */
function mailNotice(string $text, string $tone = 'neutral'): string {
    $font = MAIL_FONT;
    [$bg, $border, $color] = match ($tone) {
        'success' => ['#F0FDF4', '#BBF7D0', '#166534'],
        'warning' => ['#FFFBEB', '#FDE68A', '#92400E'],
        default   => ['#FAF9F7', '#E7E5E4', '#57534E'],
    };
    $t = e($text);

    return <<<HTML
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:22px 0 0;background:{$bg};border:1px solid {$border};border-radius:12px;">
  <tr>
    <td style="padding:12px 16px;font-family:{$font};font-size:12.5px;line-height:1.6;color:{$color};">{$t}</td>
  </tr>
</table>
HTML;
}

// ── 1) Código de verificación (canal único: correo) ──────────────────────────

/**
 * Envía el código de verificación de 6 dígitos. Devuelve el canal utilizado,
 * que siempre es 'email' (el sistema no envía SMS ni WhatsApp).
 */
function sendVerificationCodeEmail(
    string $to,
    string $firstName,
    string $code,
    int $minutes,
    ?string $phoneMasked = null
): string {
    if (trialNotifyCaptureEnabled()) {
        trialNotifyCapture('otp', ['to' => $to, 'code' => $code]);
        return 'email';
    }

    $sent = sendTransactionalMail(
        $to,
        'Tu código de verificación es ' . $code . ' · FoodIX',
        verificationCodeEmailHtml($to, $firstName, $code, $minutes, $phoneMasked)
    );

    if (!$sent) {
        // Se registra el fallo de entrega, NUNCA el código.
        error_log('[FoodIX otp] no se pudo entregar el código de verificación');
    }

    return 'email';
}

/**
 * Cuerpo del correo del código. Separado del envío para poder renderizarlo y
 * revisarlo (o probarlo) sin mandar nada a la red.
 */
function verificationCodeEmailHtml(
    string $to,
    string $firstName,
    string $code,
    int $minutes,
    ?string $phoneMasked = null
): string {
    $font  = MAIL_FONT;
    $ink   = MAIL_INK;
    $body  = MAIL_BODY;
    $muted = MAIL_MUTED;
    $brand = MAIL_BRAND;
    $name  = e(trim($firstName) !== '' ? trim($firstName) : 'Hola');

    // El código se parte en dos grupos de 3 para leerlo y teclearlo más fácil.
    $codeDisplay = e(substr($code, 0, 3)) . '<span style="display:inline-block;width:14px;"></span>' . e(substr($code, 3));

    $forPhone = $phoneMasked
        ? 'confirmar el teléfono <strong style="color:' . $ink . ';">' . e($phoneMasked) . '</strong> de tu cuenta'
        : 'confirmar tu cuenta';

    $content = <<<HTML
<h1 style="margin:0 0 6px;font-family:{$font};font-size:23px;line-height:1.25;font-weight:800;color:{$ink};">
  Tu código de verificación
</h1>
<p style="margin:0 0 18px;font-family:{$font};font-size:15px;line-height:1.65;color:{$body};">
  {$name}, usa este código para {$forPhone} y activar tus
  <strong style="color:{$ink};">14 días gratis</strong> de FoodIX.
</p>

<!-- Código: recuadro punteado, centrado y grande -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:6px 0 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             style="border:2px dashed {$brand};border-radius:16px;background:#FFF8F3;">
        <tr>
          <td align="center" style="padding:22px 34px;">
            <div style="font-family:{$font};font-size:10px;font-weight:700;letter-spacing:1.6px;
                        text-transform:uppercase;color:{$brand};margin-bottom:10px;">
              Código de verificación
            </div>
            <div style="font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,'Courier New',monospace;
                        font-size:40px;line-height:1.1;font-weight:800;color:{$ink};letter-spacing:8px;">
              {$codeDisplay}
            </div>
            <div style="font-family:{$font};font-size:12px;color:{$muted};margin-top:12px;">
              Vence en {$minutes} minutos · un solo uso
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin:22px 0 0;font-family:{$font};font-size:13px;line-height:1.65;color:{$muted};">
  Escribe el código en la pantalla de registro que dejaste abierta. Si caducó, puedes
  pedir uno nuevo desde ahí mismo.
</p>
HTML;

    $content .= mailNotice(
        'Por tu seguridad: nadie del equipo de FoodIX te pedirá este código por teléfono, '
        . 'WhatsApp ni correo. No lo compartas con nadie.',
        'warning'
    );

    $content .= '<p style="margin:18px 0 0;font-family:' . $font . ';font-size:13px;line-height:1.65;color:' . $muted . ';">'
              . '¿No solicitaste este código? Ignora este mensaje: sin él, la cuenta no se activa.</p>';

    return mailShell(
        'Tu código de verificación de FoodIX vence en ' . $minutes . ' minutos.',
        $content,
        $to
    );
}

// ── 2) Verificación del correo (enlace) ──────────────────────────────────────

/**
 * Envía el enlace de verificación. El token viaja SOLO en este correo y nunca
 * se escribe en los logs ni se devuelve por la API.
 */
function sendVerificationEmail(string $to, string $firstName, string $token, int $minutes): bool {
    if (trialNotifyCaptureEnabled()) return trialNotifyCapture('email_verify', ['to' => $to, 'token' => $token]);

    $font  = MAIL_FONT;
    $ink   = MAIL_INK;
    $body  = MAIL_BODY;
    $muted = MAIL_MUTED;
    $faint = MAIL_FAINT;
    $name  = e(trim($firstName) !== '' ? trim($firstName) : 'Hola');
    $url   = rtrim(APP_PUBLIC_URL, '/') . '/register/verificar?token=' . urlencode($token);
    $safe  = e($url);

    $content = '<h1 style="margin:0 0 6px;font-family:' . $font . ';font-size:23px;line-height:1.25;font-weight:800;color:' . $ink . ';">'
             . 'Confirma tu correo</h1>'
             . '<p style="margin:0;font-family:' . $font . ';font-size:15px;line-height:1.65;color:' . $body . ';">'
             . $name . ', ya casi terminas. Confirma este correo para continuar con la creación de tu cuenta '
             . 'y activar tus <strong style="color:' . $ink . ';">14 días gratis</strong> de FoodIX — '
             . 'sin tarjeta y sin compromiso.</p>'
             . mailButton($url, 'Confirmar mi correo')
             . '<p style="margin:0;font-family:' . $font . ';font-size:13px;line-height:1.65;color:' . $muted . ';">'
             . 'El enlace es de un solo uso y caduca en ' . $minutes . ' minutos. '
             . 'Si el botón no funciona, copia y pega esta dirección en tu navegador:</p>'
             . '<p style="margin:8px 0 0;font-family:' . $font . ';font-size:12px;line-height:1.6;color:' . $faint . ';word-break:break-all;">'
             . $safe . '</p>'
             . mailNotice('Si no creaste una cuenta en FoodIX, ignora este mensaje: sin confirmar el correo no se activa nada.');

    return sendTransactionalMail(
        $to,
        'Confirma tu correo · FoodIX',
        mailShell('Confirma tu correo y activa tus 14 días gratis de FoodIX.', $content, $to)
    );
}

// ── 3) Bienvenida: prueba activada ───────────────────────────────────────────

function sendTrialStartedEmail(string $to, string $firstName, string $businessName, string $startsAt, string $endsAt): bool {
    if (trialNotifyCaptureEnabled()) return trialNotifyCapture('trial_started', ['to' => $to, 'ends_at' => $endsAt]);

    $font  = MAIL_FONT;
    $ink   = MAIL_INK;
    $body  = MAIL_BODY;
    $muted = MAIL_MUTED;
    $line  = MAIL_LINE;
    $name  = e(trim($firstName) !== '' ? trim($firstName) : 'Hola');
    $biz   = e($businessName);
    $ini   = e(mailShortDate($startsAt));
    $fin   = e(mailShortDate($endsAt));

    $content = <<<HTML
<h1 style="margin:0 0 6px;font-family:{$font};font-size:23px;line-height:1.25;font-weight:800;color:{$ink};">
  Tu prueba gratuita está activa
</h1>
<p style="margin:0;font-family:{$font};font-size:15px;line-height:1.65;color:{$body};">
  Listo {$name}: <strong style="color:{$ink};">{$biz}</strong> ya tiene acceso completo a FoodIX
  durante 14 días.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;">
  <tr>
    <td width="50%" style="padding-right:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border:1px solid {$line};border-radius:12px;">
        <tr><td style="padding:14px 16px;font-family:{$font};">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:{$muted};">Inicio</div>
          <div style="font-size:17px;font-weight:800;color:{$ink};margin-top:4px;">{$ini}</div>
        </td></tr>
      </table>
    </td>
    <td width="50%" style="padding-left:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border:1px solid {$line};border-radius:12px;">
        <tr><td style="padding:14px 16px;font-family:{$font};">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:{$muted};">Finaliza</div>
          <div style="font-size:17px;font-weight:800;color:{$ink};margin-top:4px;">{$fin}</div>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
HTML;

    $content .= mailButton(rtrim(APP_PUBLIC_URL, '/') . '/login', 'Entrar a FoodIX')
              . '<p style="margin:0;font-family:' . $font . ';font-size:13px;line-height:1.65;color:' . $muted . ';">'
              . 'Primeros pasos: carga tu menú, da de alta a tu equipo y toma tu primer pedido. '
              . 'Al terminar la prueba tus datos se conservan, así que si eliges un plan después, '
              . 'sigues justo donde te quedaste.</p>';

    return sendTransactionalMail(
        $to,
        'Tu prueba gratuita de 14 días está activa · FoodIX',
        mailShell('Ya tienes acceso completo a FoodIX durante 14 días.', $content, $to)
    );
}

// ── 4) Recordatorios (7, 3 y 1 días) ─────────────────────────────────────────

function sendTrialReminderEmail(string $to, string $firstName, int $daysRemaining, string $endsAt): bool {
    if (trialNotifyCaptureEnabled()) return trialNotifyCapture('trial_reminder', ['to' => $to, 'days' => $daysRemaining]);

    $font  = MAIL_FONT;
    $ink   = MAIL_INK;
    $body  = MAIL_BODY;
    $muted = MAIL_MUTED;
    $name  = e(trim($firstName) !== '' ? trim($firstName) : 'Hola');
    $when  = $daysRemaining === 1 ? 'mañana' : "en {$daysRemaining} días";
    $title = $daysRemaining === 1 ? 'Tu prueba termina mañana' : "Te quedan {$daysRemaining} días de prueba";
    $fin   = e(mailLongDate($endsAt));

    $content = '<h1 style="margin:0 0 6px;font-family:' . $font . ';font-size:23px;line-height:1.25;font-weight:800;color:' . $ink . ';">'
             . e($title) . '</h1>'
             . '<p style="margin:0;font-family:' . $font . ';font-size:15px;line-height:1.65;color:' . $body . ';">'
             . $name . ', tu prueba gratuita de FoodIX termina <strong style="color:' . $ink . ';">' . $when . '</strong> ('
             . $fin . '). Elige un plan para seguir operando sin interrupciones.</p>'
             . mailButton(rtrim(APP_PUBLIC_URL, '/') . '/billing', 'Ver planes')
             . mailNotice('Tu información permanece intacta: productos, pedidos, clientes y configuración '
                        . 'siguen ahí aunque la prueba termine.', 'success');

    return sendTransactionalMail(
        $to,
        $title . ' · FoodIX',
        mailShell($title . '. Elige un plan para continuar sin interrupciones.', $content, $to)
    );
}

// ── 5) Fin de la prueba ──────────────────────────────────────────────────────

function sendTrialExpiredEmail(string $to, string $firstName): bool {
    if (trialNotifyCaptureEnabled()) return trialNotifyCapture('trial_expired', ['to' => $to]);

    $font  = MAIL_FONT;
    $ink   = MAIL_INK;
    $body  = MAIL_BODY;
    $muted = MAIL_MUTED;
    $name  = e(trim($firstName) !== '' ? trim($firstName) : 'Hola');

    $content = '<h1 style="margin:0 0 6px;font-family:' . $font . ';font-size:23px;line-height:1.25;font-weight:800;color:' . $ink . ';">'
             . 'Tu prueba gratuita ha terminado</h1>'
             . '<p style="margin:0;font-family:' . $font . ';font-size:15px;line-height:1.65;color:' . $body . ';">'
             . $name . ', tus 14 días de prueba gratuita de FoodIX han finalizado. '
             . '<strong style="color:' . $ink . ';">Tus datos permanecen seguros</strong>: productos, pedidos, '
             . 'clientes y configuración siguen guardados. Elige un plan para continuar utilizando FoodIX.</p>'
             . mailButton(rtrim(APP_PUBLIC_URL, '/') . '/billing', 'Elegir un plan')
             . '<p style="margin:0;font-family:' . $font . ';font-size:13px;line-height:1.65;color:' . $muted . ';">'
             . '¿Dudas sobre qué plan te conviene? Escríbenos a '
             . '<a href="mailto:' . e(SUPPORT_EMAIL) . '" style="color:' . MAIL_BRAND . ';text-decoration:none;font-weight:600;">'
             . e(SUPPORT_EMAIL) . '</a> y te ayudamos a elegir.</p>';

    return sendTransactionalMail(
        $to,
        'Tu prueba gratuita ha terminado · FoodIX',
        mailShell('Tu prueba terminó. Tus datos siguen seguros: elige un plan para continuar.', $content, $to)
    );
}
