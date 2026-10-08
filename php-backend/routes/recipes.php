<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Recetas de productos y consumo de insumos.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Recetas / escandallos por producto.
// GET /recipes?product_id=       → insumos que consume el producto (con costo)
// PUT /recipes/{product_id}      → reemplaza la receta {items:[{inventory_item_id, quantity, waste_percent}]}
// GET /recipes/{product_id}/cost → costeo total {total_cost, price, food_cost_percent, margin_percent}

function handleRecipes(array $seg, string $method): never {
    $payload   = requireAuth();
    $db        = Database::connect();
    $productId = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2      = $seg[2] ?? '';

    if ($productId && $sub2 === 'cost' && $method === 'GET') {
        jsonResponse(fetchRecipeCost($db, $productId));
    }

    if (!$productId && $method === 'GET') {
        $productId = intParam('product_id');
        if (!$productId) jsonError(422, 'product_id requerido');
        jsonResponse(fetchRecipe($db, $productId));
    }

    if ($productId && $method === 'PUT') {
        requireRole($payload, 'admin', 'superadmin');
        $body  = getBody();
        $items = $body['items'] ?? [];

        $db->beginTransaction();
        try {
            $db->prepare('DELETE FROM recipe_items WHERE product_id = ?')->execute([$productId]);
            $ins = $db->prepare(
                'INSERT INTO recipe_items (product_id, inventory_item_id, quantity, waste_percent) VALUES (?, ?, ?, ?)'
            );
            foreach ($items as $it) {
                $invId  = (int)($it['inventory_item_id'] ?? 0);
                $qty    = round((float)($it['quantity'] ?? 0), 3);
                $wastePct = max(0.0, min(100.0, round((float)($it['waste_percent'] ?? 0), 2)));
                if ($invId > 0 && $qty > 0) $ins->execute([$productId, $invId, $qty, $wastePct]);
            }
            $db->commit();
        } catch (Throwable $e) { $db->rollBack(); throw $e; }

        jsonResponse(fetchRecipe($db, $productId));
    }

    jsonError(405, 'Método no permitido');
}

function fetchRecipe(PDO $db, int $productId): array {
    $stmt = $db->prepare(
        'SELECT r.id, r.inventory_item_id, r.quantity, r.waste_percent, i.name, i.unit, i.cost
         FROM recipe_items r
         JOIN inventory_items i ON i.id = r.inventory_item_id
         WHERE r.product_id = ? ORDER BY i.name'
    );
    $stmt->execute([$productId]);
    return array_map(fn($r) => [
        'id'                => (int)$r['id'],
        'inventory_item_id' => (int)$r['inventory_item_id'],
        'name'              => $r['name'],
        'unit'              => $r['unit'],
        'quantity'          => (float)$r['quantity'],
        'waste_percent'     => (float)$r['waste_percent'],
        'unit_cost'         => (float)$r['cost'],
        'line_cost'         => round((float)$r['quantity'] * (1 + (float)$r['waste_percent'] / 100) * (float)$r['cost'], 2),
    ], $stmt->fetchAll());
}

// Costeo total de la receta frente al precio de venta del producto.
function fetchRecipeCost(PDO $db, int $productId): array {
    $items     = fetchRecipe($db, $productId);
    $totalCost = round(array_sum(array_column($items, 'line_cost')), 2);

    $stmt = $db->prepare('SELECT price FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    $price   = $product ? (float)$product['price'] : 0.0;

    $foodCostPercent = $price > 0 ? round($totalCost / $price * 100, 2) : null;
    $marginPercent   = $price > 0 ? round(($price - $totalCost) / $price * 100, 2) : null;

    return [
        'product_id'         => $productId,
        'total_cost'         => $totalCost,
        'price'              => $price,
        'margin'             => round($price - $totalCost, 2),
        'food_cost_percent'  => $foodCostPercent,
        'margin_percent'     => $marginPercent,
        'items'              => $items,
    ];
}

// Descuenta los insumos de la receta al vender (llamado desde orders.php).
// La merma estimada (waste_percent) se suma a lo consumido: si una receta
// usa 100g con 5% de merma, se descuentan 105g del insumo.
function deductRecipeStock(PDO $db, int $branchId, int $productId, int $quantity, int $orderId, ?int $userId): void {
    $stmt = $db->prepare('SELECT inventory_item_id, quantity, waste_percent FROM recipe_items WHERE product_id = ?');
    $stmt->execute([$productId]);
    $recipe = $stmt->fetchAll();
    if (!$recipe) return;

    $upd = $db->prepare('UPDATE inventory_items SET stock = stock - ? WHERE id = ?');
    $mov = $db->prepare(
        'INSERT INTO inventory_movements (branch_id, inventory_item_id, type, quantity, reason, ref_id, created_by)
         VALUES (?, ?, \'sale\', ?, ?, ?, ?)'
    );
    foreach ($recipe as $r) {
        $consumed = round((float)$r['quantity'] * (1 + (float)$r['waste_percent'] / 100) * $quantity, 3);
        $upd->execute([$consumed, (int)$r['inventory_item_id']]);
        $mov->execute([$branchId, (int)$r['inventory_item_id'], -$consumed, "Venta pedido #$orderId", $orderId, $userId]);
    }
}

// Revierte (o mermea) los insumos consumidos por un ítem cancelado.
// Idempotente: reclama order_items.inventory_reverted_at con un UPDATE
// atómico antes de tocar stock — un reintento de API que llegue dos veces
// solo revierte una vez.
// - $wasAlreadyPrepared = false → el insumo nunca salió de cocina: se
//   regresa íntegro al stock (movimiento 'return').
// - $wasAlreadyPrepared = true  → el insumo ya se preparó/cocinó y se
//   perdió físicamente: NO se regresa a stock, solo se documenta como
//   merma en el kardex (movimiento 'waste', cantidad 0) para auditoría.
function restoreRecipeStock(
    PDO $db, int $branchId, int $orderItemId, int $productId, int $quantity,
    int $orderId, ?int $userId, bool $wasAlreadyPrepared, ?string $reason = null
): void {
    $claim = $db->prepare(
        'UPDATE order_items SET inventory_reverted_at = NOW() WHERE id = ? AND inventory_reverted_at IS NULL'
    );
    $claim->execute([$orderItemId]);
    if ($claim->rowCount() === 0) return; // ya revertido — reintento idempotente

    $stmt = $db->prepare('SELECT inventory_item_id, quantity, waste_percent FROM recipe_items WHERE product_id = ?');
    $stmt->execute([$productId]);
    $recipe = $stmt->fetchAll();
    if (!$recipe) return;

    $upd = $db->prepare('UPDATE inventory_items SET stock = stock + ? WHERE id = ?');
    $mov = $db->prepare(
        'INSERT INTO inventory_movements (branch_id, inventory_item_id, type, quantity, reason, ref_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($recipe as $r) {
        $consumed = round((float)$r['quantity'] * (1 + (float)$r['waste_percent'] / 100) * $quantity, 3);
        if ($wasAlreadyPrepared) {
            $mov->execute([
                $branchId, (int)$r['inventory_item_id'], 'waste', 0,
                $reason ?? "Merma por cancelación tras preparar — pedido #$orderId", $orderId, $userId,
            ]);
        } else {
            $upd->execute([$consumed, (int)$r['inventory_item_id']]);
            $mov->execute([
                $branchId, (int)$r['inventory_item_id'], 'return', $consumed,
                $reason ?? "Devolución por cancelación — pedido #$orderId", $orderId, $userId,
            ]);
        }
    }
}
