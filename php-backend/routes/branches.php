<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de sucursales del sistema.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/trial_identity.php';

function handleBranches(array $seg, string $method): never {
    $payload = requireAuth();

    $db       = Database::connect();
    $branchId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2     = $seg[2] ?? '';

    // POST /branches/{id}/logo — logo de la sucursal (admin de la propia o superadmin)
    if ($branchId && $sub2 === 'logo' && $method === 'POST') {
        $own = ((int)($payload['branch_id'] ?? 0) === $branchId);
        if ($payload['role'] !== 'superadmin' && !($payload['role'] === 'admin' && $own)) {
            jsonError(403, 'No autorizado');
        }
        handleBranchLogo($db, $branchId);
    }

    // GET /branches/{id} — cualquier usuario de la sucursal (admin, mesero, cocina)
    // puede consultar la info básica de su propia sucursal (incl. pos_count para el KDS).
    if ($branchId && !$sub2 && $method === 'GET'
        && $payload['role'] !== 'superadmin' && (int)($payload['branch_id'] ?? 0) === $branchId) {
        $stmt = $db->prepare('SELECT id, name, slug, address, phone, logo_url, active, pos_count, tax_enabled, tax_rate, wa_default_order_type, created_at FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        $b = $stmt->fetch();
        if (!$b) jsonError(404, 'Sucursal no encontrada');
        jsonResponse($b);
    }

    // PATCH /branches/{id} — admin (de su propia sucursal) o superadmin
    if ($branchId && !$sub2 && $method === 'PATCH') {
        $own = ((int)($payload['branch_id'] ?? 0) === $branchId);
        if ($payload['role'] !== 'superadmin' && !($payload['role'] === 'admin' && $own)) {
            jsonError(403, 'No autorizado');
        }

        $body    = getBody();
        // El admin no puede desactivar su sucursal
        $allowed = $payload['role'] === 'superadmin'
            ? ['name', 'address', 'phone', 'logo_url', 'active', 'pos_count', 'tax_enabled', 'tax_rate', 'wa_default_order_type']
            : ['name', 'address', 'phone', 'logo_url', 'pos_count', 'tax_enabled', 'tax_rate', 'wa_default_order_type'];

        // pos_count solo admite 1 o 2.
        if (array_key_exists('pos_count', $body) && !in_array((int)$body['pos_count'], [1, 2], true)) {
            jsonError(422, 'pos_count debe ser 1 o 2');
        }

        // tax_rate: porcentaje válido entre 0 y 100.
        if (array_key_exists('tax_rate', $body)) {
            $rate = (float)$body['tax_rate'];
            if ($rate < 0 || $rate > 100) jsonError(422, 'tax_rate debe estar entre 0 y 100');
        }

        // wa_default_order_type: tipo de entrega por defecto para el bot de WhatsApp.
        if (array_key_exists('wa_default_order_type', $body)
            && !in_array($body['wa_default_order_type'], ['pickup', 'delivery'], true)) {
            jsonError(422, 'wa_default_order_type debe ser "pickup" o "delivery"');
        }

        $set     = [];
        $params  = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $set[]    = "$field = ?";
                $params[] = match ($field) {
                    'active'      => (int)(bool)$body[$field],
                    'pos_count'   => (int)$body[$field],
                    'tax_enabled' => (int)(bool)$body[$field],
                    'tax_rate'    => round((float)$body[$field], 2),
                    default       => $body[$field],
                };
            }
        }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $branchId;

        $db->prepare('UPDATE branches SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT id, name, slug, address, phone, logo_url, active, pos_count, tax_enabled, tax_rate, wa_default_order_type, created_at FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        jsonResponse($stmt->fetch());
    }

    // Todo lo demás del módulo de sucursales es exclusivo de superadmin
    requireRole($payload, 'superadmin');

    // GET /branches
    if (!$branchId && $method === 'GET') {
        $stmt = $db->query(
            'SELECT id, name, slug, address, phone, logo_url, active, pos_count, tax_enabled, tax_rate, wa_default_order_type, created_at
             FROM branches ORDER BY name ASC'
        );
        jsonResponse($stmt->fetchAll());
    }

    // POST /branches — registra un cliente: sucursal + suscripción trial + admin
    if (!$branchId && $method === 'POST') {
        $body = getBody();
        $name = trim((string)($body['name'] ?? ''));
        $slug = trim((string)($body['slug'] ?? ''));

        if (!$name || !$slug) jsonError(422, 'Nombre y slug son requeridos');
        if (!preg_match('/^[a-z0-9-]+$/', $slug)) jsonError(422, 'Slug inválido: solo minúsculas, números y guiones');

        // Datos opcionales de la cuenta admin del cliente
        $adminName  = trim((string)($body['admin_name']     ?? ''));
        $adminUser  = trim((string)($body['admin_username'] ?? ''));
        $adminEmail = trim((string)($body['admin_email']    ?? ''));
        $adminPass  =       (string)($body['admin_password'] ?? '');
        $withAdmin  = $adminName !== '' || $adminUser !== '' || $adminEmail !== '' || $adminPass !== '';

        if ($withAdmin) {
            if (!$adminName || !$adminUser || !$adminEmail || !$adminPass) {
                jsonError(422, 'Datos de la cuenta admin incompletos');
            }
            if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) jsonError(422, 'Email del admin inválido');
            if (!preg_match('/^[a-zA-Z0-9_.-]{3,60}$/', $adminUser)) jsonError(422, 'Usuario del admin inválido');
            if (strlen($adminPass) < 6) jsonError(422, 'La contraseña del admin debe tener al menos 6 caracteres');
        }

        // Validaciones de unicidad ANTES de la transacción
        $st = $db->prepare('SELECT id FROM branches WHERE slug = ?');
        $st->execute([$slug]);
        if ($st->fetch()) jsonError(409, 'El slug ya está en uso');

        if ($withAdmin) {
            $st = $db->prepare('SELECT id FROM users WHERE email = ?');
            $st->execute([$adminEmail]);
            if ($st->fetch()) jsonError(409, 'El email del admin ya está registrado');
            $st = $db->prepare('SELECT id FROM users WHERE username = ?');
            $st->execute([$adminUser]);
            if ($st->fetch()) jsonError(409, 'El usuario del admin ya está en uso');
        }

        $db->beginTransaction();
        try {
            $db->prepare('INSERT INTO branches (name, slug, address, phone) VALUES (?, ?, ?, ?)')
               ->execute([
                   $name,
                   $slug,
                   trim((string)($body['address'] ?? '')) ?: null,
                   trim((string)($body['phone']   ?? '')) ?: null,
               ]);
            $id = (int)$db->lastInsertId();

            // Auto-crear la prueba gratuita de 14 días (mismo periodo que el
            // alta autoservicio: una sola promesa comercial en todo el producto).
            // `trial_seq = 1` + UNIQUE(branch_id, trial_seq) garantizan un único
            // trial por sucursal; `trial_used_at` deja la marca histórica.
            $db->prepare(
                'INSERT INTO subscriptions
                    (branch_id, plan, status, starts_at, expires_at, max_devices,
                     trial_ends_at, trial_started_at, trial_days, trial_source, trial_seq)
                 VALUES (?, \'trial\', \'trial\', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 2,
                         DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), ?, \'superadmin\', 1)'
            )->execute([$id, TRIAL_DAYS, TRIAL_DAYS, TRIAL_DAYS]);

            $db->prepare('UPDATE branches SET trial_used_at = NOW() WHERE id = ?')->execute([$id]);

            // Seed default categories
            $db->prepare(
                'INSERT INTO categories (branch_id, name, emoji, color, station, menu_group, sort_order)
                 VALUES (?, \'MESA CALIENTE\', \'🔥\', \'#E85D04\', \'hot\', \'alimento\', 0)'
            )->execute([$id]);

            $db->prepare(
                'INSERT INTO categories (branch_id, name, emoji, color, station, menu_group, sort_order)
                 VALUES (?, \'MESA FRIA\', \'🥗\', \'#3B82F6\', \'cold\', \'alimento\', 1)'
            )->execute([$id]);

            // Crear la cuenta admin para que el cliente pueda iniciar sesión
            if ($withAdmin) {
                $hash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 12]);
                $db->prepare(
                    'INSERT INTO users (branch_id, name, email, username, password, role)
                     VALUES (?, ?, ?, ?, ?, \'admin\')'
                )->execute([$id, $adminName, $adminEmail, $adminUser, $hash]);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }

        $stmt = $db->prepare('SELECT id, name, slug, address, phone, logo_url, active, pos_count, created_at FROM branches WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse($stmt->fetch(), 201);
    }

    if (!$branchId) jsonError(404, 'Ruta no encontrada');

    // GET /branches/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT id, name, slug, address, phone, logo_url, active, pos_count, created_at FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        $branch = $stmt->fetch();
        if (!$branch) jsonError(404, 'Sucursal no encontrada');
        jsonResponse($branch);
    }


    // DELETE /branches/{id} — soft delete
    if ($method === 'DELETE') {
        $db->prepare('UPDATE branches SET active = 0 WHERE id = ?')->execute([$branchId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// ── Logo de la sucursal ─────────────────────────────────────────────────────

function handleBranchLogo(PDO $db, int $branchId): never {
    $stmt = $db->prepare('SELECT id FROM branches WHERE id = ?');
    $stmt->execute([$branchId]);
    if (!$stmt->fetch()) jsonError(404, 'Sucursal no encontrada');

    // Quitar logo (volver al ícono por defecto)
    if (($_POST['remove'] ?? '') === '1') {
        $db->prepare('UPDATE branches SET logo_url = NULL WHERE id = ?')->execute([$branchId]);
        jsonResponse(['logo_url' => null]);
    }

    $url = saveBranchLogoFile();
    if (!$url) jsonError(422, 'No se recibió ninguna imagen');

    $db->prepare('UPDATE branches SET logo_url = ? WHERE id = ?')->execute([$url, $branchId]);
    jsonResponse(['logo_url' => $url]);
}

// Procesa el archivo de logo (campo 'logo' o 'image'), lo optimiza a WebP, redimensiona y
// devuelve su URL pública. Reutiliza la carpeta de uploads de productos.
function saveBranchLogoFile(): ?string {
    $file = $_FILES['logo'] ?? $_FILES['image'] ?? null;
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }

    if ((int)$file['size'] > 6 * 1024 * 1024) {
        jsonError(422, 'El logo no puede superar 6MB');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowed = ['image/jpeg' => 'webp', 'image/png' => 'webp', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        jsonError(422, 'Tipo de imagen no permitido. Use JPG, PNG o WebP');
    }

    if (!is_dir(UPLOAD_PATH)) {
        mkdir(UPLOAD_PATH, 0755, true);
    }

    $filename = 'logo_' . bin2hex(random_bytes(12)) . '.webp';
    $destPath = UPLOAD_PATH . $filename;

    if (!optimizeAndSaveImageWebp($file['tmp_name'], $destPath, 500, 80)) {
        jsonError(422, 'No se pudo procesar y optimizar el logo');
    }

    return UPLOAD_URL . $filename;
}
