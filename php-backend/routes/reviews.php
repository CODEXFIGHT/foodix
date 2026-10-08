<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Opiniones de clientes (calificación de comida, servicio, entrega).
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// GET  /reviews?branch_id=  → lista + promedio de la sucursal
// POST /reviews             → captura una opinión {order_id?, customer_id?, rating, food_rating?, service_rating?, delivery_rating?, comment?}

function handleReviews(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();

    if ($method === 'GET') {
        $branchId = branchScopeRev($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $stmt = $db->prepare(
            'SELECT r.*, c.name AS customer_name FROM customer_reviews r
             LEFT JOIN customers c ON c.id = r.customer_id
             WHERE r.branch_id = ? ORDER BY r.id DESC LIMIT 200'
        );
        $stmt->execute([$branchId]);
        $rows = $stmt->fetchAll();

        $avgStmt = $db->prepare(
            'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM customer_reviews WHERE branch_id = ?'
        );
        $avgStmt->execute([$branchId]);
        $avg = $avgStmt->fetch();

        jsonResponse([
            'avg_rating' => $avg['avg_rating'] !== null ? round((float)$avg['avg_rating'], 2) : null,
            'total'      => (int)$avg['total'],
            'reviews'    => array_map('castReview', $rows),
        ]);
    }

    if ($method === 'POST') {
        $body     = getBody();
        $branchId = branchScopeRev($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');

        $rating = isset($body['rating']) ? (int)$body['rating'] : 0;
        if ($rating < 1 || $rating > 5) jsonError(422, 'rating debe ser de 1 a 5');

        $ratingField = fn($f) => isset($body[$f]) && is_numeric($body[$f]) && $body[$f] >= 1 && $body[$f] <= 5
            ? (int)$body[$f] : null;

        $stmt = $db->prepare(
            'INSERT INTO customer_reviews
               (branch_id, order_id, customer_id, rating, food_rating, service_rating, delivery_rating, comment, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId,
            isset($body['order_id']) && is_numeric($body['order_id']) ? (int)$body['order_id'] : null,
            isset($body['customer_id']) && is_numeric($body['customer_id']) ? (int)$body['customer_id'] : null,
            $rating,
            $ratingField('food_rating'),
            $ratingField('service_rating'),
            $ratingField('delivery_rating'),
            trim((string)($body['comment'] ?? '')) ?: null,
            (int)$payload['sub'],
        ]);
        jsonResponse(castReview(fetchReview($db, (int)$db->lastInsertId())), 201);
    }

    jsonError(405, 'Método no permitido');
}

function fetchReview(PDO $db, int $id): ?array {
    $stmt = $db->prepare(
        'SELECT r.*, c.name AS customer_name FROM customer_reviews r
         LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?'
    );
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castReview(array $r): array {
    return [
        'id'              => (int)$r['id'],
        'branch_id'       => (int)$r['branch_id'],
        'order_id'        => $r['order_id'] ? (int)$r['order_id'] : null,
        'customer_id'     => $r['customer_id'] ? (int)$r['customer_id'] : null,
        'customer_name'   => $r['customer_name'] ?? null,
        'rating'          => (int)$r['rating'],
        'food_rating'     => isset($r['food_rating']) ? (int)$r['food_rating'] : null,
        'service_rating'  => isset($r['service_rating']) ? (int)$r['service_rating'] : null,
        'delivery_rating' => isset($r['delivery_rating']) ? (int)$r['delivery_rating'] : null,
        'comment'         => $r['comment'],
        'created_at'      => $r['created_at'],
    ];
}

function branchScopeRev(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
