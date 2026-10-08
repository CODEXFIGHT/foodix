<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Sesiones de caja, movimientos y cortes.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Caja y turnos:
// GET  /cash/current?branch_id=   → sesión abierta (o null)
// POST /cash/open                 → abre caja {opening_amount, notes}
// POST /cash/close                → cierra caja {closing_amount, notes}
// POST /cash/movement             → entrada/salida de efectivo {type,amount,reason}
// GET  /cash/report?session_id=   → corte (X si abierta, Z si cerrada)
// GET  /cash/sessions?branch_id=  → historial de turnos

function handleCash(array $seg, string $method): never {
    $payload = requireAuth();
    $db      = Database::connect();
    $sub     = $seg[1] ?? '';

    if ($sub === 'current' && $method === 'GET') {
        $branchId = branchScopeC($payload);
        $s = currentSession($db, $branchId, cashPosId());
        jsonResponse($s ? castSession($s) : null);
    }

    if ($sub === 'open' && $method === 'POST') {
        $body     = getBody();
        $branchId = branchScopeC($payload, $body);
        if (!$branchId) jsonError(422, 'branch_id requerido');
        $posId = cashPosId($body);
        // Una caja abierta por POS: evita dos turnos simultáneos en el mismo POS.
        if (currentSession($db, $branchId, $posId)) {
            jsonError(409, 'Ya hay una caja abierta en este POS', ['error' => 'cash_already_open']);
        }

        $stmt = $db->prepare(
            'INSERT INTO cash_sessions (branch_id, pos_id, opened_by, opened_role, opening_amount, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, \'open\')'
        );
        $stmt->execute([
            $branchId, $posId, (int)$payload['sub'], (string)($payload['role'] ?? ''),
            round((float)($body['opening_amount'] ?? 0), 2),
            trim((string)($body['notes'] ?? '')) ?: null,
        ]);
        $id = (int)$db->lastInsertId();
        jsonResponse(castSession(fetchSession($db, $id)), 201);
    }

    if ($sub === 'close' && $method === 'POST') {
        $body     = getBody();
        $session  = requireOpenCashSession($db, $payload, $body);

        $report   = buildReport($db, (int)$session['id']);
        $expected = $report['expected_cash'];
        $closing  = round((float)($body['closing_amount'] ?? 0), 2);

        $db->prepare(
            'UPDATE cash_sessions
             SET status = \'closed\', closed_by = ?, closed_role = ?, closing_amount = ?, expected_amount = ?,
                 difference = ?, closed_at = NOW(), notes = COALESCE(?, notes)
             WHERE id = ?'
        )->execute([
            (int)$payload['sub'], (string)($payload['role'] ?? ''), $closing, $expected,
            round($closing - $expected, 2),
            trim((string)($body['notes'] ?? '')) ?: null,
            (int)$session['id'],
        ]);

        jsonResponse([
            'session' => castSession(fetchSession($db, (int)$session['id'])),
            'report'  => $report,
        ]);
    }

    if ($sub === 'movement' && $method === 'POST') {
        $body     = getBody();
        $branchId = branchScopeC($payload, $body);
        $session  = requireOpenCashSession($db, $payload, $body);

        $type   = (string)($body['type'] ?? '');
        $amount = round((float)($body['amount'] ?? 0), 2);
        if (!in_array($type, ['in', 'out'], true)) jsonError(422, 'Tipo inválido (in/out)');
        if ($amount <= 0) jsonError(422, 'Monto inválido');

        $db->prepare(
            'INSERT INTO cash_movements (session_id, branch_id, type, amount, reason, created_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            (int)$session['id'], $branchId, $type, $amount,
            trim((string)($body['reason'] ?? '')) ?: null, (int)$payload['sub'],
        ]);
        jsonResponse(buildReport($db, (int)$session['id']), 201);
    }

    if ($sub === 'report' && $method === 'GET') {
        $sessionId = intParam('session_id');
        if (!$sessionId) {
            $branchId = branchScopeC($payload);
            $session  = currentSession($db, $branchId, cashPosId());
            if (!$session) jsonError(404, 'No hay caja abierta');
            $sessionId = (int)$session['id'];
        }
        jsonResponse(buildReport($db, $sessionId));
    }

    if ($sub === 'sessions' && $method === 'GET') {
        $branchId = branchScopeC($payload);
        $stmt = $db->prepare(
            'SELECT * FROM cash_sessions WHERE branch_id = ? ORDER BY id DESC LIMIT 50'
        );
        $stmt->execute([$branchId]);
        jsonResponse(array_map('castSession', $stmt->fetchAll()));
    }

    jsonError(404, 'Ruta de caja no encontrada');
}

// ── Corte X/Z ───────────────────────────────────────────────────────────────

function buildReport(PDO $db, int $sessionId): array {
    $session = fetchSession($db, $sessionId);
    if (!$session) jsonError(404, 'Sesión no encontrada');

    $start = $session['opened_at'];
    $end   = $session['closed_at'] ?? date('Y-m-d H:i:s');

    // Ventas por método de pago LIGADAS A ESTA SESIÓN de caja (item 8): se basa
    // en cash_session_id, no solo en la fecha, para no mezclar turnos/POS. Los
    // pagos legados sin sesión caen al criterio antiguo (branch + ventana).
    $stmt = $db->prepare(
        'SELECT method, COALESCE(SUM(amount),0) AS total, COALESCE(SUM(tip),0) AS tips, COUNT(*) AS cnt
         FROM order_payments
         WHERE cash_session_id = ?
            OR (cash_session_id IS NULL AND branch_id = ? AND created_at BETWEEN ? AND ?)
         GROUP BY method'
    );
    $stmt->execute([$sessionId, (int)$session['branch_id'], $start, $end]);

    $byMethod = ['efectivo'=>0.0,'tarjeta'=>0.0,'transferencia'=>0.0,'monedero'=>0.0,'otro'=>0.0];
    $tips = 0.0; $txCount = 0;
    foreach ($stmt->fetchAll() as $r) {
        $byMethod[$r['method']] = (float)$r['total'];
        $tips += (float)$r['tips'];
        $txCount += (int)$r['cnt'];
    }
    $totalSales = array_sum($byMethod);

    // Movimientos de efectivo.
    $mv = $db->prepare(
        'SELECT type, COALESCE(SUM(amount),0) AS total FROM cash_movements WHERE session_id = ? GROUP BY type'
    );
    $mv->execute([$sessionId]);
    $cashIn = 0.0; $cashOut = 0.0;
    foreach ($mv->fetchAll() as $r) {
        if ($r['type'] === 'in')  $cashIn  = (float)$r['total'];
        if ($r['type'] === 'out') $cashOut = (float)$r['total'];
    }

    $opening = (float)$session['opening_amount'];
    // Efectivo esperado = fondo + ventas efectivo + entradas - salidas.
    $expectedCash = round($opening + $byMethod['efectivo'] + $cashIn - $cashOut, 2);

    // Descuentos aplicados y pedidos cancelados durante el turno (item 6).
    $disc = $db->prepare(
        'SELECT COALESCE(SUM(discount),0) AS total FROM orders
         WHERE cash_session_id = ? OR (cash_session_id IS NULL AND branch_id = ? AND created_at BETWEEN ? AND ?)'
    );
    $disc->execute([$sessionId, (int)$session['branch_id'], $start, $end]);
    $discounts = round((float)$disc->fetchColumn(), 2);

    $canc = $db->prepare(
        "SELECT COUNT(*) FROM orders
         WHERE status = 'cancelled' AND branch_id = ? AND updated_at BETWEEN ? AND ?"
    );
    $canc->execute([(int)$session['branch_id'], $start, $end]);
    $cancellations = (int)$canc->fetchColumn();

    // Lista de movimientos para el detalle.
    $list = $db->prepare(
        'SELECT id, type, amount, reason, created_at FROM cash_movements WHERE session_id = ? ORDER BY id'
    );
    $list->execute([$sessionId]);
    $movements = array_map(fn($m) => [
        'id'         => (int)$m['id'],
        'type'       => $m['type'],
        'amount'     => (float)$m['amount'],
        'reason'     => $m['reason'],
        'created_at' => $m['created_at'],
    ], $list->fetchAll());

    return [
        'session_id'    => $sessionId,
        'status'        => $session['status'],
        'opened_at'     => $start,
        'closed_at'     => $session['closed_at'],
        'opening_amount'=> $opening,
        'by_method'     => $byMethod,
        'total_sales'   => round($totalSales, 2),
        'tips'          => round($tips, 2),
        'tx_count'      => $txCount,
        'discounts'     => $discounts,
        'cancellations' => $cancellations,
        'cash_in'       => round($cashIn, 2),
        'cash_out'      => round($cashOut, 2),
        'expected_cash' => $expectedCash,
        'closing_amount'=> $session['closing_amount'] !== null ? (float)$session['closing_amount'] : null,
        'difference'    => $session['difference'] !== null ? (float)$session['difference'] : null,
        'movements'     => $movements,
    ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentSession(PDO $db, int $branchId, ?int $posId = null): ?array {
    // Delega en el guard compartido para una única definición de "caja abierta".
    return currentCashSession($db, $branchId, $posId);
}

function fetchSession(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT * FROM cash_sessions WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function castSession(array $s): array {
    return [
        'id'              => (int)$s['id'],
        'branch_id'       => (int)$s['branch_id'],
        'pos_id'          => isset($s['pos_id']) && $s['pos_id'] !== null ? (int)$s['pos_id'] : null,
        'opened_by'       => $s['opened_by'] ? (int)$s['opened_by'] : null,
        'opened_role'     => $s['opened_role'] ?? null,
        'closed_by'       => $s['closed_by'] ? (int)$s['closed_by'] : null,
        'closed_role'     => $s['closed_role'] ?? null,
        'opening_amount'  => (float)$s['opening_amount'],
        'closing_amount'  => $s['closing_amount'] !== null ? (float)$s['closing_amount'] : null,
        'expected_amount' => $s['expected_amount'] !== null ? (float)$s['expected_amount'] : null,
        'difference'      => $s['difference'] !== null ? (float)$s['difference'] : null,
        'status'          => $s['status'],
        'notes'           => $s['notes'],
        'opened_at'       => $s['opened_at'],
        'closed_at'       => $s['closed_at'],
    ];
}

function branchScopeC(array $payload, array $body = []): int {
    if ($payload['role'] === 'superadmin') {
        return (int)($body['branch_id'] ?? intParam('branch_id'));
    }
    return (int)$payload['branch_id'];
}
