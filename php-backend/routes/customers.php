<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de clientes y su historial.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Clientes (CRM) + monedero y puntos de lealtad.
// GET    /customers?branch_id=&q=    → lista (con búsqueda por alias/nombre/teléfono/dirección)
// POST   /customers                  → crear
// PATCH  /customers/{id}             → editar
// DELETE /customers/{id}             → desactivar
// POST   /customers/{id}/wallet      → ajustar monedero {amount, type:add|subtract, reason}

function handleCustomers(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $id      = isset($seg[1]) && is_numeric($seg[1]) ? (int)$seg[1] : null;
    $sub2    = $seg[2] ?? '';

    if ($id && $sub2 === 'wallet' && $method === 'POST') {
        handleWallet($db, $id, $payload);
    }

    if ($id && $sub2 === 'ledger' && $method === 'GET') {
        $stmt = $db->prepare(
            'SELECT kind, amount, balance_after, reason, ref_type, ref_id, created_at
             FROM customer_ledger_entries WHERE customer_id = ? ORDER BY id DESC LIMIT 100'
        );
        $stmt->execute([$id]);
        jsonResponse(array_map(fn($r) => [
            'kind'          => $r['kind'],
            'amount'        => (float)$r['amount'],
            'balance_after' => (float)$r['balance_after'],
            'reason'        => $r['reason'],
            'ref_type'      => $r['ref_type'],
            'ref_id'        => $r['ref_id'] ? (int)$r['ref_id'] : null,
            'created_at'    => $r['created_at'],
        ], $stmt->fetchAll()));
    }

    if (!$id && $method === 'GET') {
        $branchId = branchScopeCust($payload);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $q = strParam('q');
        $sql = 'SELECT * FROM customers WHERE branch_id = ? AND active = 1';
        $params = [$branchId];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR phone LIKE ? OR address LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        $sql .= ' ORDER BY name LIMIT 200';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse(array_map('castCustomer', $stmt->fetchAll()));
    }

    if (!$id && $method === 'POST') {
        $body     = getBody();
        $branchId = branchScopeCust($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') jsonError(422, 'Nombre requerido');

        $stmt = $db->prepare(
            'INSERT INTO customers (branch_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $branchId, $name,
            trim((string)($body['phone'] ?? '')) ?: null,
            trim((string)($body['email'] ?? '')) ?: null,
            trim((string)($body['address'] ?? '')) ?: null,
        ]);
        jsonResponse(castCustomer(fetchCustomer($db, (int)$db->lastInsertId())), 201);
    }

    if (!$id) jsonError(404, 'Ruta no encontrada');

    if ($method === 'PATCH') {
        $body = getBody();
        $set = []; $params = [];
        foreach (['name','phone','email','address'] as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = trim((string)$body[$f]) ?: null; }
        }
        if (!$set) jsonError(422, 'Sin campos');
        $params[] = $id;
        $db->prepare('UPDATE customers SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($params);
        jsonResponse(castCustomer(fetchCustomer($db, $id)));
    }

    if ($method === 'DELETE') {
        requireRole($payload, 'admin', 'superadmin');
        $db->prepare('UPDATE customers SET active = 0 WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true]);
    }

    jsonError(405, 'Método no permitido');
}

function handleWallet(PDO $db, int $id, array $payload): never {
    requireRole($payload, 'admin', 'superadmin');
    $body   = getBody();
    $cust   = fetchCustomer($db, $id);
    if (!$cust) jsonError(404, 'Cliente no encontrado');

    $amount = round((float)($body['amount'] ?? 0), 2);
    $type   = (string)($body['type'] ?? 'add');
    if ($amount <= 0) jsonError(422, 'Monto inválido');
    $delta = $type === 'subtract' ? -$amount : $amount;

    $db->prepare('UPDATE customers SET wallet_balance = GREATEST(0, wallet_balance + ?) WHERE id = ?')
       ->execute([$delta, $id]);
    logCustomerLedger(
        $db, $id, (int)$cust['branch_id'], $type === 'subtract' ? 'wallet_debit' : 'wallet_credit', $amount,
        trim((string)($body['reason'] ?? '')) ?: 'Ajuste manual', 'manual', null, (int)$payload['sub']
    );
    jsonResponse(castCustomer(fetchCustomer($db, $id)));
}

function fetchCustomer(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM customers WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castCustomer(array $c): array {
    return [
        'id'             => (int)$c['id'],
        'branch_id'      => (int)$c['branch_id'],
        'name'           => $c['name'],
        'phone'          => $c['phone'],
        'email'          => $c['email'],
        'address'        => $c['address'],
        'points'         => (int)$c['points'],
        'wallet_balance' => (float)$c['wallet_balance'],
        'total_spent'    => (float)$c['total_spent'],
        'visits'         => (int)$c['visits'],
        'last_order_at'  => $c['last_order_at'] ?? null,
        'segment'        => customerSegment($c),
    ];
}

// Segmentación simple derivada de datos ya existentes — sin tabla aparte, se
// recalcula al vuelo. Prioridad: VIP > Nuevo > Inactivo > Frecuente > Regular.
function customerSegment(array $c): string {
    $visits = (int)$c['visits'];
    $spent  = (float)$c['total_spent'];
    $lastOrder = $c['last_order_at'] ?? null;
    $daysSince = $lastOrder ? (time() - strtotime($lastOrder)) / 86400 : null;

    if ($visits >= 10 || $spent >= 5000) return 'vip';
    if ($visits === 0) return 'nuevo';
    if ($daysSince !== null && $daysSince > 60) return 'inactivo';
    if ($visits >= 5) return 'frecuente';
    return 'regular';
}

// Aplica monedero usado como pago y acumula puntos/visita/gasto al cerrar un
// pedido — llamado desde orders.php (handlePayOrder y handlePaySplit) para no
// duplicar la lógica. Cada movimiento deja un renglón en el ledger inmutable,
// además del saldo mutable que ya lee el POS.
function applyCustomerLoyalty(
    PDO $db, int $customerId, int $branchId, float $monederoUsed, bool $earnsPoints,
    float $orderTotal, int $orderId, ?int $userId
): void {
    if ($monederoUsed > 0) {
        $stmt = $db->prepare('UPDATE customers SET wallet_balance = GREATEST(0, wallet_balance - ?) WHERE id = ?');
        $stmt->execute([$monederoUsed, $customerId]);
        logCustomerLedger($db, $customerId, $branchId, 'wallet_debit', $monederoUsed,
            "Pago con monedero — pedido #$orderId", 'order', $orderId, $userId);
    }
    if ($earnsPoints) {
        $points = (int)floor($orderTotal);
        $db->prepare(
            'UPDATE customers SET points = points + ?, total_spent = total_spent + ?, visits = visits + 1, last_order_at = NOW() WHERE id = ?'
        )->execute([$points, $orderTotal, $customerId]);
        if ($points > 0) {
            logCustomerLedger($db, $customerId, $branchId, 'points_earned', (float)$points,
                "1 punto por unidad gastada — pedido #$orderId", 'order', $orderId, $userId);
        }
    }
}

// Registra un movimiento en el ledger de cliente con el saldo resultante
// (puntos o monedero, según `kind`) para trazabilidad — nunca se borra ni
// se sobrescribe, solo se agregan renglones nuevos (igual que el kardex).
function logCustomerLedger(
    PDO $db, int $customerId, int $branchId, string $kind, float $amount,
    ?string $reason, ?string $refType, ?int $refId, ?int $userId
): void {
    $balCol = str_starts_with($kind, 'points') ? 'points' : 'wallet_balance';
    $stmt = $db->prepare("SELECT $balCol AS bal FROM customers WHERE id = ?");
    $stmt->execute([$customerId]);
    $balanceAfter = (float)($stmt->fetchColumn() ?: 0);

    $db->prepare(
        'INSERT INTO customer_ledger_entries (customer_id, branch_id, kind, amount, balance_after, reason, ref_type, ref_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$customerId, $branchId, $kind, $amount, $balanceAfter, $reason, $refType, $refId, $userId]);
}

function branchScopeCust(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
