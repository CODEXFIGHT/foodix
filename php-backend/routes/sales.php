<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Reportes y resúmenes de ventas.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handleSales(array $seg, string $method): never {
    $payload  = requireAuth();
    requireRole($payload, 'admin', 'superadmin');

    if ($method !== 'GET') jsonError(405, 'Método no permitido');

    $db       = Database::connect();
    $endpoint = $seg[1] ?? '';
    $branchId = branchScopeS($payload);

    if (!$branchId) jsonError(422, 'branch_id requerido');

    match ($endpoint) {
        'summary'      => handleSalesSummary($db, $branchId),
        'daily'        => handleSalesDaily($db, $branchId),
        'by-category'  => handleSalesByCategory($db, $branchId),
        'insights'     => handleSalesInsights($db, $branchId),
        default        => jsonError(404, 'Endpoint de ventas no encontrado'),
    };
}

// ── GET /sales/summary?branch_id=&from=&to= ───────────────────────────────────

function handleSalesSummary(PDO $db, int $branchId): never {
    $from = strParam('from', date('Y-m-d'));
    $to   = strParam('to',   date('Y-m-d'));

    $today = date('Y-m-d');
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');

    $stmt = $db->prepare(
        'SELECT
           COALESCE(SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END), 0) AS today_revenue,
           COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) AS today_orders,
           COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total ELSE 0 END), 0) AS week_revenue,
           COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) AS week_orders,
           COALESCE(SUM(CASE WHEN DATE(created_at) >= ? THEN total ELSE 0 END), 0) AS month_revenue,
           COUNT(CASE WHEN DATE(created_at) >= ? THEN 1 END) AS month_orders
         FROM orders
         WHERE branch_id = ? AND status = \'completed\''
    );
    $stmt->execute([$today, $today, $weekStart, $weekStart, $monthStart, $monthStart, $branchId]);
    $row = $stmt->fetch();

    jsonResponse([
        'today' => [
            'revenue'     => (float)$row['today_revenue'],
            'order_count' => (int)$row['today_orders'],
        ],
        'week' => [
            'revenue'     => (float)$row['week_revenue'],
            'order_count' => (int)$row['week_orders'],
        ],
        'month' => [
            'revenue'     => (float)$row['month_revenue'],
            'order_count' => (int)$row['month_orders'],
        ],
    ]);
}

// ── GET /sales/daily?branch_id=&days=30 ──────────────────────────────────────

function handleSalesDaily(PDO $db, int $branchId): never {
    $days = max(1, min(365, intParam('days', 30)));

    $stmt = $db->prepare(
        'SELECT DATE(created_at) AS date,
                COALESCE(SUM(total), 0) AS revenue,
                COUNT(*) AS order_count
         FROM orders
         WHERE branch_id = ?
           AND status = \'completed\'
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC'
    );
    $stmt->execute([$branchId, $days]);
    $rows = $stmt->fetchAll();

    jsonResponse(array_map(fn($r) => [
        'date'        => $r['date'],
        'revenue'     => (float)$r['revenue'],
        'order_count' => (int)$r['order_count'],
    ], $rows));
}

// ── GET /sales/by-category?branch_id=&from=&to= ──────────────────────────────

function handleSalesByCategory(PDO $db, int $branchId): never {
    $from = strParam('from', date('Y-m-01'));
    $to   = strParam('to',   date('Y-m-d'));

    $stmt = $db->prepare(
        'SELECT
           COALESCE(c.name, \'Sin categoría\') AS category_name,
           COALESCE(c.color, \'#78716C\') AS color,
           COALESCE(SUM(oi.subtotal), 0) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE o.branch_id = ?
           AND o.status = \'completed\'
           AND DATE(o.created_at) BETWEEN ? AND ?
         GROUP BY c.id, c.name, c.color
         ORDER BY revenue DESC'
    );
    $stmt->execute([$branchId, $from, $to]);
    $rows = $stmt->fetchAll();

    $totalRevenue = array_sum(array_column($rows, 'revenue'));

    jsonResponse(array_map(fn($r) => [
        'category_name' => $r['category_name'],
        'color'         => $r['color'],
        'revenue'       => (float)$r['revenue'],
        'percentage'    => $totalRevenue > 0 ? round((float)$r['revenue'] / $totalRevenue * 100, 1) : 0,
    ], $rows));
}

// ── GET /sales/insights?branch_id=&from=&to= ─────────────────────────────────
// Dashboard de rentabilidad (Módulo 3): ticket promedio, productos top/bottom,
// ventas por canal, horas pico, cancelados/completados y tiempo de preparación.
function handleSalesInsights(PDO $db, int $branchId): never {
    $from = strParam('from', date('Y-m-01'));
    $to   = strParam('to',   date('Y-m-d'));

    // Ticket promedio + pedidos completados/cancelados del rango.
    $stmt = $db->prepare(
        "SELECT
           COALESCE(AVG(CASE WHEN status = 'completed' THEN total END), 0) AS avg_ticket,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
           COALESCE(AVG(CASE WHEN status = 'completed' AND completed_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) END), NULL) AS avg_prep_minutes
         FROM orders
         WHERE branch_id = ? AND DATE(created_at) BETWEEN ? AND ?"
    );
    $stmt->execute([$branchId, $from, $to]);
    $summary = $stmt->fetch();

    // Top 5 productos por ingreso.
    $stmt = $db->prepare(
        "SELECT oi.product_id, oi.product_name AS name,
                SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.branch_id = ? AND o.status = 'completed' AND DATE(o.created_at) BETWEEN ? AND ?
         GROUP BY oi.product_id, oi.product_name
         ORDER BY revenue DESC
         LIMIT 5"
    );
    $stmt->execute([$branchId, $from, $to]);
    $topProducts = $stmt->fetchAll();

    // Bottom 5: productos con menos unidades vendidas (que sí tuvieron al menos 1 venta).
    $stmt = $db->prepare(
        "SELECT oi.product_id, oi.product_name AS name,
                SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.branch_id = ? AND o.status = 'completed' AND DATE(o.created_at) BETWEEN ? AND ?
         GROUP BY oi.product_id, oi.product_name
         ORDER BY qty ASC
         LIMIT 5"
    );
    $stmt->execute([$branchId, $from, $to]);
    $bottomProducts = $stmt->fetchAll();

    // Ventas por canal real (columna `source`; no se asume un set fijo de valores).
    $stmt = $db->prepare(
        "SELECT COALESCE(source, 'pos') AS channel, COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE branch_id = ? AND status = 'completed' AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY channel
         ORDER BY revenue DESC"
    );
    $stmt->execute([$branchId, $from, $to]);
    $byChannel = $stmt->fetchAll();

    // Ventas por hora del día (0-23) — para detectar horas pico.
    $stmt = $db->prepare(
        "SELECT HOUR(created_at) AS hour, COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE branch_id = ? AND status = 'completed' AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY HOUR(created_at)
         ORDER BY hour ASC"
    );
    $stmt->execute([$branchId, $from, $to]);
    $byHour = $stmt->fetchAll();

    jsonResponse([
        'avg_ticket'        => round((float)$summary['avg_ticket'], 2),
        'completed_orders'  => (int)$summary['completed_count'],
        'cancelled_orders'  => (int)$summary['cancelled_count'],
        'avg_prep_minutes'  => $summary['avg_prep_minutes'] !== null ? round((float)$summary['avg_prep_minutes'], 1) : null,
        'top_products'      => array_map(fn($r) => [
            'product_id' => (int)$r['product_id'], 'name' => $r['name'],
            'qty' => (int)$r['qty'], 'revenue' => (float)$r['revenue'],
        ], $topProducts),
        'bottom_products'   => array_map(fn($r) => [
            'product_id' => (int)$r['product_id'], 'name' => $r['name'],
            'qty' => (int)$r['qty'], 'revenue' => (float)$r['revenue'],
        ], $bottomProducts),
        'by_channel'        => array_map(fn($r) => [
            'channel' => $r['channel'], 'order_count' => (int)$r['order_count'], 'revenue' => (float)$r['revenue'],
        ], $byChannel),
        'by_hour'           => array_map(fn($r) => [
            'hour' => (int)$r['hour'], 'order_count' => (int)$r['order_count'], 'revenue' => (float)$r['revenue'],
        ], $byHour),
    ]);
}

function branchScopeS(array $payload): int {
    if ($payload['role'] === 'superadmin') {
        return intParam('branch_id');
    }
    return (int)$payload['branch_id'];
}
