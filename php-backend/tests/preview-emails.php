<?php
/**
 * FoodIX — Vista previa de los correos del alta y la prueba gratuita.
 *
 * Renderiza cada plantilla a un archivo HTML para revisarla en el navegador
 * SIN enviar nada. Útil al ajustar el copy o el diseño.
 *
 *   php php-backend/tests/preview-emails.php [carpeta-destino]
 *
 * @package FoodIX
 */
declare(strict_types=1);

date_default_timezone_set('America/Mexico_City');

// La capa HTTP no existe aquí: solo se necesitan las plantillas.
if (!function_exists('sendHtmlMail')) {
    require_once __DIR__ . '/../config/mailer.php';
}
require_once __DIR__ . '/../config/trial_notify.php';

$outDir = rtrim($argv[1] ?? sys_get_temp_dir() . '/foodix-emails', '/');
if (!is_dir($outDir) && !mkdir($outDir, 0775, true) && !is_dir($outDir)) {
    fwrite(STDERR, "No se pudo crear {$outDir}\n");
    exit(1);
}

$start = date('Y-m-d H:i:s');
$end   = date('Y-m-d H:i:s', strtotime('+14 days'));

$templates = [
    'codigo-verificacion' => verificationCodeEmailHtml(
        'ana.ramirez@example.com', 'Ana', '482913', 10, '+52 *** *** 5678'
    ),
];

// El resto de plantillas comparten la envoltura; se rearman aquí con el mismo
// contenido que produce cada envío, para poder revisarlas de un vistazo.
$templates['confirma-tu-correo'] = mailShell(
    'Confirma tu correo y activa tus 14 días gratis de FoodIX.',
    '<h1 style="margin:0 0 6px;font-family:' . MAIL_FONT . ';font-size:23px;line-height:1.25;font-weight:800;color:' . MAIL_INK . ';">Confirma tu correo</h1>'
    . '<p style="margin:0;font-family:' . MAIL_FONT . ';font-size:15px;line-height:1.65;color:' . MAIL_BODY . ';">'
    . 'Ana, ya casi terminas. Confirma este correo para continuar con la creación de tu cuenta y activar tus '
    . '<strong style="color:' . MAIL_INK . ';">14 días gratis</strong> de FoodIX — sin tarjeta y sin compromiso.</p>'
    . mailButton(rtrim(APP_PUBLIC_URL, '/') . '/register/verificar?token=ejemplo', 'Confirmar mi correo')
    . mailNotice('Si no creaste una cuenta en FoodIX, ignora este mensaje: sin confirmar el correo no se activa nada.'),
    'ana.ramirez@example.com'
);

foreach ($templates as $name => $html) {
    file_put_contents("{$outDir}/{$name}.html", $html);
    echo "  ✓ {$outDir}/{$name}.html\n";
}

echo "\nVista previa generada (inicio de prueba: {$start} · fin: {$end}).\n";
