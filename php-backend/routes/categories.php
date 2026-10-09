<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de categorías del menú y su estación de cocina.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleCategories(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $catId   = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;

    // GET /categories?branch_id=
    if (!$catId && $method === 'GET') {
        $branchId = branchScope($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $stmt = $db->prepare(
            'SELECT id, branch_id, name, emoji, color, station, menu_group, sort_order, active
             FROM categories WHERE branch_id = ? ORDER BY sort_order ASC, name ASC'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castCategory', $stmt->fetchAll()));
    }

    // POST /categories
    if (!$catId && $method === 'POST') {
        requireRole($payload, 'admin', 'superadmin');
        $body     = getBody();
        $branchId = branchScope($payload, $body);
        $name     = trim((string)($body['name'] ?? ''));

        if (!$name)     jsonError(422, 'Nombre requerido');
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $color     = preg_match('/^#[0-9A-Fa-f]{6}$/', (string)($body['color'] ?? ''))
                         ? $body['color'] : '#D1400F';
        $emoji     = mb_substr(trim((string)($body['emoji'] ?? '')), 0, 10) ?: null;
        $sortOrder = (int)($body['sort_order'] ?? 0);
        $station   = in_array($body['station'] ?? '', ['hot', 'cold', 'both'], true) ? $body['station'] : 'hot';
        $menuGroup = in_array($body['menu_group'] ?? '', ['alimento', 'bebida'], true) ? $body['menu_group'] : 'alimento';

        $stmt = $db->prepare(
            'INSERT INTO categories (branch_id, name, emoji, color, station, menu_group, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$branchId, $name, $emoji, $color, $station, $menuGroup, $sortOrder]);
        $id = (int)$db->lastInsertId();

        $stmt = $db->prepare('SELECT id, branch_id, name, emoji, color, station, menu_group, sort_order, active FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(castCategory($stmt->fetch()), 201);
    }

    if (!$catId) jsonError(404, 'Ruta no encontrada');

    // GET /categories/{id}
    if ($method === 'GET') {
        $stmt = $db->prepare('SELECT id, branch_id, name, emoji, color, station, menu_group, sort_order, active FROM categories WHERE id = ?');
        $stmt->execute([$catId]);
        $cat = $stmt->fetch();
        if (!$cat) jsonError(404, 'Categoría no encontrada');
        jsonResponse(castCategory($cat));
    }

    // PATCH /categories/{id}
    if ($method === 'PATCH') {
        requireRole($payload, 'admin', 'superadmin');
        $body    = getBody();
        $set     = [];
        $params  = [];

        if (isset($body['name']))       { $set[] = 'name = ?';       $params[] = trim((string)$body['name']); }
        if (isset($body['emoji']))      { $set[] = 'emoji = ?';      $params[] = mb_substr(trim((string)$body['emoji']), 0, 10) ?: null; }
        if (isset($body['color']))      { $set[] = 'color = ?';      $params[] = $body['color']; }
        if (isset($body['station']) && in_array($body['station'], ['hot', 'cold', 'both'], true)) {
                                          $set[] = 'station = ?';     $params[] = $body['station']; }
        if (isset($body['menu_group']) && in_array($body['menu_group'], ['alimento', 'bebida'], true)) {
                                          $set[] = 'menu_group = ?';  $params[] = $body['menu_group']; }
        if (isset($body['sort_order'])) { $set[] = 'sort_order = ?'; $params[] = (int)$body['sort_order']; }
        if (isset($body['active']))     { $set[] = 'active = ?';     $params[] = (int)(bool)$body['active']; }

        if (!$set) jsonError(422, 'Sin campos para actualizar');
        $params[] = $catId;

        $db->prepare('UPDATE categories SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);

        $stmt = $db->prepare('SELECT id, branch_id, name, emoji, color, station, menu_group, sort_order, active FROM categories WHERE id = ?');
        $stmt->execute([$catId]);
        jsonResponse(castCategory($stmt->fetch()));
    }

    // DELETE /categories/{id}
    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('DELETE FROM categories WHERE id = ?')->execute([$catId]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

/** Normaliza tipos: los enteros que PDO devuelve como string se castean a int. */
function castCategory(array $c): array {
    $c['id']         = (int)$c['id'];
    $c['branch_id']  = isset($c['branch_id']) ? (int)$c['branch_id'] : null;
    $c['sort_order'] = isset($c['sort_order']) ? (int)$c['sort_order'] : 0;
    $c['active']     = isset($c['active']) ? (int)$c['active'] : 1;
    return $c;
}

function branchScope(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
