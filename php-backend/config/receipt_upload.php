<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Subida de comprobantes de pago SPEI (imagen JPG/PNG/WebP o PDF).
 *
 * Compartido por dos flujos:
 *   • Dashboard "Mi Suscripción"  → POST /billing/upload-receipt (admin)
 *   • Landing / checkout          → POST /public/spei-receipt (sin auth)
 *
 * Las imágenes se reencodifican con GD (elimina EXIF/metadatos y normaliza);
 * los PDF se validan por MIME real y se mueven tal cual. Devuelve la URL pública.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

const RECEIPT_MAX_BYTES = 6 * 1024 * 1024; // 6 MB (fotos de teléfono + PDF)

/**
 * Toma el archivo subido en $_FILES[$field], lo valida y lo guarda.
 * Devuelve la URL pública del comprobante.
 * Lanza jsonError(...) si falta el archivo o no es válido.
 */
function saveReceiptFromRequest(string $field = 'receipt'): string {
    if (!isset($_FILES[$field]) || ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonError(422, 'No se recibió ningún comprobante');
    }
    return saveReceiptFile($_FILES[$field]['tmp_name'], (int)$_FILES[$field]['size']);
}

/**
 * Valida y persiste un archivo temporal como comprobante. Acepta imagen
 * (jpg/png/webp, reencodificada con GD) o PDF (movido tal cual).
 */
function saveReceiptFile(string $tmpPath, int $size): string {
    if ($size <= 0) {
        jsonError(422, 'El comprobante está vacío');
    }
    if ($size > RECEIPT_MAX_BYTES) {
        jsonError(422, 'El comprobante no puede superar 6MB');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    $imageExt = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $isPdf    = $mime === 'application/pdf';

    if (!$isPdf && !isset($imageExt[$mime])) {
        jsonError(422, 'Formato no permitido. Sube una imagen (JPG, PNG o WebP) o un PDF');
    }

    if (!is_dir(RECEIPT_UPLOAD_PATH)) {
        mkdir(RECEIPT_UPLOAD_PATH, 0755, true);
    }

    $uuid = bin2hex(random_bytes(16));

    if ($isPdf) {
        $filename = "$uuid.pdf";
        $destPath = RECEIPT_UPLOAD_PATH . $filename;
        // move_uploaded_file solo funciona sobre el tmp real de la petición.
        if (is_uploaded_file($tmpPath)) {
            if (!move_uploaded_file($tmpPath, $destPath)) {
                jsonError(500, 'No se pudo guardar el comprobante');
            }
        } elseif (!copy($tmpPath, $destPath)) {
            jsonError(500, 'No se pudo guardar el comprobante');
        }
        return RECEIPT_UPLOAD_URL . $filename;
    }

    // Imagen: reencodificar con GD para eliminar metadatos y normalizar.
    $filename = "$uuid.webp";
    $destPath = RECEIPT_UPLOAD_PATH . $filename;

    if (!optimizeAndSaveImageWebp($tmpPath, $destPath, 1200, 75)) {
        jsonError(422, 'No se pudo procesar y optimizar la imagen del comprobante');
    }

    return RECEIPT_UPLOAD_URL . $filename;
}
