<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de productos del menú y su override de estación.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleProducts(array $seg, string $method): never {
    $payload   = requireAuth();
    $db        = Database::connect();
    $productId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2      = $seg[2] ?? '';

    // POST /products/{id}/image — subir/reemplazar imagen principal (legado)
    if ($productId && $sub2 === 'image' && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        handleUploadImage($db, $productId, $payload);
    }

    // POST /products/{id}/images — agregar imágenes a la galería (hasta 5)
    if ($productId && $sub2 === 'images' && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        handleUploadGalleryImages($db, $productId, $payload);
    }

    // DELETE /products/{id}/images/{imageId} — quitar una imagen de la galería
    if ($productId && $sub2 === 'images' && $method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $imageId = isset($seg[3]) && is_numeric($seg[3]) ? (int)$seg[3] : 0;
        handleDeleteGalleryImage($db, $productId, $imageId);
    }

    // GET /products
    if (!$productId && $method === 'GET') {
        handleListProducts($db, $payload);
    }

    // POST /products (multipart)
    if (!$productId && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        handleCreateProduct($db, $payload);
    }

    if (!$productId) jsonError(404, 'Ruta no encontrada');

    // GET /products/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare(
            'SELECT p.*, c.station AS category_station FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? LIMIT 1'
        );
        $stmt->execute([$productId]);
        $p = $stmt->fetch();
        if (!$p) jsonError(404, 'Producto no encontrado');
        jsonResponse(attachImages($db, [castProduct($p)])[0]);
    }

    // PATCH /products/{id} (multipart)
    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        handleUpdateProduct($db, $productId, $payload);
    }

    // DELETE /products/{id}
    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM products WHERE id = ?')->execute([$productId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

// ── List ──────────────────────────────────────────────────────────────────────

function handleListProducts(PDO $db, array $payload): never {
    $branchId   = branchScopeP($payload);
    $categoryId = intParam('category_id');
    $barcode    = strParam('barcode');

    // Barcode lookup
    if ($barcode !== '') {
        $stmt = $db->prepare(
            'SELECT p.*, c.station AS category_station 
             FROM products p 
             LEFT JOIN categories c ON c.id = p.category_id 
             WHERE p.barcode = ? AND p.branch_id = ? LIMIT 1'
        );
        $stmt->execute([$barcode, $branchId]);
        $p = $stmt->fetch();
        if (!$p) jsonError(404, 'Producto no encontrado por código de barras');
        jsonResponse(attachImages($db, [castProduct($p)])[0]);
    }

    $sql    = 'SELECT p.*, c.station AS category_station 
               FROM products p 
               LEFT JOIN categories c ON c.id = p.category_id 
               WHERE p.branch_id = ?';
    $params = [$branchId];

    if ($categoryId) {
        $sql    .= ' AND p.category_id = ?';
        $params[] = $categoryId;
    }
    $sql .= ' ORDER BY p.sort_order ASC, p.name ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(attachImages($db, array_map('castProduct', $stmt->fetchAll())));
}

// ── Create ────────────────────────────────────────────────────────────────────

function handleCreateProduct(PDO $db, array $payload): never {
    $branchId   = branchScopeP($payload, $_POST);
    
    $categoryId = null;
    $stationParam = $_POST['station'] ?? null;
    if ($stationParam === 'hot' || $stationParam === 'cold') {
        $catStmt = $db->prepare('SELECT id FROM categories WHERE branch_id = ? AND station = ? LIMIT 1');
        $catStmt->execute([$branchId, $stationParam]);
        $catRow = $catStmt->fetch();
        if ($catRow) {
            $categoryId = (int)$catRow['id'];
        }
    }
    if (!$categoryId && isset($_POST['category_id']) && $_POST['category_id'] !== '') {
        $categoryId = (int)$_POST['category_id'];
    }

    $name       = trim((string)($_POST['name'] ?? ''));
    $price      = isset($_POST['price']) ? (float)$_POST['price'] : null;

    if (!$name)     jsonError(422, 'Nombre requerido');
    if ($price === null || $price < 0) jsonError(422, 'Precio inválido');
    if (!$branchId) jsonError(422, 'branch_id requerido');

    $imageUrl  = processUploadedImage();
    $available = isset($_POST['available']) ? (int)(bool)$_POST['available'] : 1;
    $sortOrder = (int)($_POST['sort_order'] ?? 0);
    $emoji     = mb_substr(trim((string)($_POST['emoji']       ?? '')), 0, 10) ?: null;
    $barcode   = trim((string)($_POST['barcode']     ?? '')) ?: null;
    $desc      = trim((string)($_POST['description'] ?? '')) ?: null;
    $ingredients = trim((string)($_POST['ingredients'] ?? '')) ?: null;
    $allergens = trim((string)($_POST['allergens'] ?? '')) ?: null;
    $badge     = normalizeBadge($_POST['badge'] ?? '');
    $station   = in_array($_POST['station_override'] ?? '', ['hot', 'cold', 'both'], true)
                     ? $_POST['station_override'] : null;
    $priceType = in_array($_POST['price_type'] ?? '', ['fixed', 'open', 'kg', 'variable'], true)
                     ? $_POST['price_type'] : 'fixed';
    $pricePerKg = isset($_POST['price_per_kg']) && $_POST['price_per_kg'] !== ''
                     ? max(0.0, (float)$_POST['price_per_kg']) : null;

    $modifiers = isset($_POST['modifiers']) ? trim((string)$_POST['modifiers']) : null;
    $modifiersJson = null;
    if ($modifiers) {
        $decoded = json_decode($modifiers, true);
        if (is_array($decoded)) {
            $modifiersJson = json_encode($decoded, JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt = $db->prepare(
        'INSERT INTO products
         (branch_id, category_id, name, description, ingredients, allergens, badge, price, price_type, price_per_kg, image_url, emoji, barcode, station_override, available, sort_order, modifiers_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$branchId, $categoryId, $name, $desc, $ingredients, $allergens, $badge, $price, $priceType, $pricePerKg, $imageUrl, $emoji, $barcode, $station, $available, $sortOrder, $modifiersJson]);
    $id = (int)$db->lastInsertId();

    // Si subió la imagen principal, también la registramos en la galería.
    if ($imageUrl) {
        $db->prepare('INSERT INTO product_images (product_id, branch_id, url, sort_order) VALUES (?, ?, ?, 0)')
           ->execute([$id, $branchId, $imageUrl]);
    }

    $stmt = $db->prepare('SELECT p.*, c.station AS category_station FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?');
    $stmt->execute([$id]);
    jsonResponse(attachImages($db, [castProduct($stmt->fetch())])[0], 201);
}

// ── Update ────────────────────────────────────────────────────────────────────

function handleUpdateProduct(PDO $db, int $productId, array $payload): never {
    $stmt = $db->prepare('SELECT id, branch_id FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $prodRow = $stmt->fetch();
    if (!$prodRow) jsonError(404, 'Producto no encontrado');
    $branchId = (int)$prodRow['branch_id'];

    $set    = [];
    $params = [];

    $fields = ['name', 'description', 'ingredients', 'allergens', 'emoji', 'barcode'];
    foreach ($fields as $f) {
        if (isset($_POST[$f])) { $set[] = "$f = ?"; $params[] = trim((string)$_POST[$f]) ?: null; }
    }
    if (isset($_POST['badge']))      { $set[] = 'badge = ?';      $params[] = normalizeBadge($_POST['badge']); }
    if (isset($_POST['price']))      { $set[] = 'price = ?';      $params[] = (float)$_POST['price']; }
    if (isset($_POST['price_type'])) {
        $pt       = $_POST['price_type'];
        $set[]    = 'price_type = ?';
        $params[] = in_array($pt, ['fixed', 'open', 'kg', 'variable'], true) ? $pt : 'fixed';
    }
    if (isset($_POST['price_per_kg'])) {
        $set[]    = 'price_per_kg = ?';
        $params[] = $_POST['price_per_kg'] !== '' ? max(0.0, (float)$_POST['price_per_kg']) : null;
    }
    
    if (isset($_POST['station'])) {
        $stationParam = $_POST['station'];
        if ($stationParam === 'hot' || $stationParam === 'cold') {
            $catStmt = $db->prepare('SELECT id FROM categories WHERE branch_id = ? AND station = ? LIMIT 1');
            $catStmt->execute([$branchId, $stationParam]);
            $catRow = $catStmt->fetch();
            if ($catRow) {
                $set[] = 'category_id = ?';
                $params[] = (int)$catRow['id'];
            }
        }
    } else if (isset($_POST['category_id'])) {
        $set[] = 'category_id = ?';
        $params[] = (int)$_POST['category_id'];
    }
    
    if (isset($_POST['available']))  { $set[] = 'available = ?';  $params[] = (int)(bool)$_POST['available']; }
    if (isset($_POST['sort_order'])) { $set[] = 'sort_order = ?'; $params[] = (int)$_POST['sort_order']; }
    if (isset($_POST['station_override'])) {
        $st       = $_POST['station_override'];
        $set[]    = 'station_override = ?';
        $params[] = in_array($st, ['hot', 'cold', 'both'], true) ? $st : null;
    }

    $newImage = processUploadedImage();
    if ($newImage !== null) {
        $set[]    = 'image_url = ?';
        $params[] = $newImage;
    }

    if (isset($_POST['modifiers'])) {
        $mods = trim((string)$_POST['modifiers']);
        $decoded = json_decode($mods, true);
        $set[] = 'modifiers_json = ?';
        $params[] = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE) : null;
    }

    if (!$set) jsonError(422, 'Sin campos para actualizar');
    $params[] = $productId;

    $db->prepare('UPDATE products SET ' . implode(', ', $set) . ', updated_at = NOW() WHERE id = ?')
       ->execute($params);

    $stmt = $db->prepare('SELECT p.*, c.station AS category_station FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?');
    $stmt->execute([$productId]);
    jsonResponse(attachImages($db, [castProduct($stmt->fetch())])[0]);
}

// ── Upload image only ─────────────────────────────────────────────────────────

function handleUploadImage(PDO $db, int $productId, array $payload): never {
    $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    if (!$stmt->fetch()) jsonError(404, 'Producto no encontrado');

    $imageUrl = processUploadedImage();
    if (!$imageUrl) jsonError(422, 'No se recibió ninguna imagen');

    $db->prepare('UPDATE products SET image_url = ?, updated_at = NOW() WHERE id = ?')
       ->execute([$imageUrl, $productId]);

    jsonResponse(['image_url' => $imageUrl]);
}

// ── Image processing ──────────────────────────────────────────────────────────

function processUploadedImage(): ?string {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    return saveImageFile($_FILES['image']['tmp_name'], (int)$_FILES['image']['size']);
}

// Procesa un archivo temporal de imagen (valida, optimiza a WebP, redimensiona y guarda) y
// devuelve su URL pública. Lanza jsonError si el archivo no es válido.
function saveImageFile(string $tmpPath, int $size): string {
    if ($size > 8 * 1024 * 1024) {
        jsonError(422, 'La imagen no puede superar 8MB');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    $allowed = ['image/jpeg' => 'webp', 'image/png' => 'webp', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        jsonError(422, 'Tipo de imagen no permitido. Use JPG, PNG o WebP');
    }

    if (!is_dir(UPLOAD_PATH)) {
        mkdir(UPLOAD_PATH, 0755, true);
    }

    $uuid     = bin2hex(random_bytes(16));
    $filename = "$uuid.webp";
    $destPath = UPLOAD_PATH . $filename;

    if (!optimizeAndSaveImageWebp($tmpPath, $destPath, 1000, 75)) {
        jsonError(422, 'No se pudo procesar y optimizar la imagen');
    }

    return UPLOAD_URL . $filename;
}

// ── Galería de imágenes (hasta 5 por producto) ──────────────────────────────

const MAX_PRODUCT_IMAGES = 5;

function handleUploadGalleryImages(PDO $db, int $productId, array $payload): never {
    $stmt = $db->prepare('SELECT id, branch_id, image_url FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $prod = $stmt->fetch();
    if (!$prod) jsonError(404, 'Producto no encontrado');
    $branchId = (int)$prod['branch_id'];

    // Recolectar archivos: soporta input único 'image' y múltiple 'images[]'
    $tmpFiles = [];
    if (isset($_FILES['images']) && is_array($_FILES['images']['tmp_name'])) {
        foreach ($_FILES['images']['tmp_name'] as $i => $tmp) {
            if (($_FILES['images']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $tmpFiles[] = [$tmp, (int)$_FILES['images']['size'][$i]];
            }
        }
    }
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $tmpFiles[] = [$_FILES['image']['tmp_name'], (int)$_FILES['image']['size']];
    }

    // Recolectar URLs externas (el admin pega una URL de imagen). Acepta
    // 'urls[]' (múltiple) o 'image_url' (única). Solo http(s) válidas.
    $urls = [];
    $rawUrls = $_POST['urls'] ?? ($_POST['image_url'] ?? null);
    if ($rawUrls !== null) {
        foreach ((array)$rawUrls as $u) {
            $u = trim((string)$u);
            if ($u === '') continue;
            if (!filter_var($u, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $u)) {
                jsonError(422, 'URL de imagen inválida');
            }
            if (mb_strlen($u) > 1000) jsonError(422, 'URL demasiado larga');
            $urls[] = $u;
        }
    }

    if (!$tmpFiles && !$urls) jsonError(422, 'No se recibió ninguna imagen');

    $countStmt = $db->prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ?');
    $countStmt->execute([$productId]);
    $existing = (int)$countStmt->fetchColumn();

    if ($existing + count($tmpFiles) + count($urls) > MAX_PRODUCT_IMAGES) {
        jsonError(422, 'Máximo ' . MAX_PRODUCT_IMAGES . ' imágenes por producto. Ya tienes ' . $existing . '.');
    }

    $maxStmt = $db->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM product_images WHERE product_id = ?');
    $maxStmt->execute([$productId]);
    $sort = (int)$maxStmt->fetchColumn();

    $ins = $db->prepare('INSERT INTO product_images (product_id, branch_id, url, sort_order) VALUES (?, ?, ?, ?)');
    foreach ($tmpFiles as [$tmp, $sz]) {
        $url = saveImageFile($tmp, $sz);
        $ins->execute([$productId, $branchId, $url, ++$sort]);
    }
    // Las URLs externas se guardan tal cual (no se descargan).
    foreach ($urls as $u) {
        $ins->execute([$productId, $branchId, $u, ++$sort]);
    }

    // La imagen principal del producto = primera de la galería (para miniaturas).
    if (empty($prod['image_url'])) {
        $first = $db->prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1');
        $first->execute([$productId]);
        if ($u = $first->fetchColumn()) {
            $db->prepare('UPDATE products SET image_url = ? WHERE id = ?')->execute([$u, $productId]);
        }
    }

    jsonResponse(['images' => productImageList($db, $productId)]);
}

function handleDeleteGalleryImage(PDO $db, int $productId, int $imageId): never {
    if (!$imageId) jsonError(422, 'ID de imagen requerido');

    $stmt = $db->prepare('SELECT url FROM product_images WHERE id = ? AND product_id = ?');
    $stmt->execute([$imageId, $productId]);
    $row = $stmt->fetch();
    if (!$row) jsonError(404, 'Imagen no encontrada');

    $db->prepare('DELETE FROM product_images WHERE id = ?')->execute([$imageId]);

    // Borrar el archivo físico solo si es una subida propia (no una URL externa).
    if (str_starts_with((string)$row['url'], UPLOAD_URL)) {
        $path = UPLOAD_PATH . basename((string)$row['url']);
        if (is_file($path)) @unlink($path);
    }

    // Reasignar la imagen principal a la primera que quede (o vaciar).
    $first = $db->prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1');
    $first->execute([$productId]);
    $newPrimary = $first->fetchColumn() ?: null;
    $db->prepare('UPDATE products SET image_url = ? WHERE id = ?')->execute([$newPrimary, $productId]);

    jsonResponse(['images' => productImageList($db, $productId)]);
}

function productImageList(PDO $db, int $productId): array {
    $stmt = $db->prepare('SELECT id, url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([$productId]);
    return array_map(fn($r) => ['id' => (int)$r['id'], 'url' => $r['url']], $stmt->fetchAll());
}

// Adjunta el arreglo `images` (objetos {id,url}) a cada producto de la lista.
function attachImages(PDO $db, array $products): array {
    if (!$products) return $products;
    $ids = array_map(fn($p) => (int)$p['id'], $products);
    $in  = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("SELECT id, product_id, url FROM product_images WHERE product_id IN ($in) ORDER BY sort_order ASC, id ASC");
    $stmt->execute($ids);

    $map = [];
    foreach ($stmt->fetchAll() as $r) {
        $map[(int)$r['product_id']][] = ['id' => (int)$r['id'], 'url' => $r['url']];
    }
    foreach ($products as &$p) {
        $imgs = $map[(int)$p['id']] ?? [];
        // Respaldo: si no hay galería pero existe imagen principal (legado).
        if (!$imgs && !empty($p['image_url'])) {
            $imgs = [['id' => 0, 'url' => $p['image_url']]];
        }
        $p['images'] = $imgs;
    }
    return $products;
}

function normalizeBadge(mixed $badge): ?string {
    $valid = ['Nuevo', 'Popular', 'Recomendado', 'Especialidad', 'Promo'];
    $badge = trim((string)$badge);
    return in_array($badge, $valid, true) ? $badge : null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function castProduct(array $p): array {
    $p['id']          = (int)$p['id'];
    $p['branch_id']   = (int)$p['branch_id'];
    $p['category_id'] = $p['category_id'] ? (int)$p['category_id'] : null;
    $p['price']       = (float)$p['price'];
    $p['price_type']  = $p['price_type'] ?? 'fixed';
    $p['price_per_kg']= isset($p['price_per_kg']) && $p['price_per_kg'] !== null ? (float)$p['price_per_kg'] : null;
    $p['available']   = (bool)$p['available'];
    $p['sort_order']  = (int)$p['sort_order'];
    $p['modifiers']   = isset($p['modifiers_json']) && !empty($p['modifiers_json'])
                        ? json_decode($p['modifiers_json'], true)
                        : [];
    $p['category_station'] = $p['category_station'] ?? null;
    return $p;
}

function branchScopeP(array $payload, array $data = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($data['branch_id'] ?? $_POST['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
