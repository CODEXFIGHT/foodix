<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Guard de caja: fuente de verdad para "¿hay un turno de caja abierto?".
 *
 * Reutilizable en TODA ruta crítica (cobro, movimientos de efectivo, corte).
 * La validación vive en el backend a propósito: el frontend solo mejora la UX,
 * pero NADIE puede saltarse la regla cobrando directo contra la API.
 *
 * Una sesión de caja = turno de un cajero en un POS concreto:
 *   abierta  ⇔  status = 'open' AND closed_at IS NULL
 *   alcance  ⇔  (branch_id, pos_id)
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
declare(strict_types=1);

/**
 * POS lógico bajo el que opera la petición.
 * Orden de resolución: header X-Pos-Id → body.pos_id → ?pos_id → 1 (POS único).
 * Devuelve null solo si el valor es inválido (≤ 0).
 */
function cashPosId(array $body = []): ?int {
    $raw = $_SERVER['HTTP_X_POS_ID']
        ?? ($body['pos_id'] ?? ($_GET['pos_id'] ?? 1));
    $pos = (int)$raw;
    return $pos > 0 ? $pos : null;
}

/**
 * Sucursal efectiva de la petición. El superadmin puede operar otra sucursal
 * pasándola explícitamente; el resto queda atado a la suya por el JWT.
 */
function cashBranchId(array $payload, array $body = []): int {
    if (($payload['role'] ?? '') === 'superadmin') {
        return (int)($body['branch_id'] ?? ($_GET['branch_id'] ?? 0));
    }
    return (int)($payload['branch_id'] ?? 0);
}

/**
 * Devuelve la sesión de caja ABIERTA de un (branch, pos), o null.
 * Si $posId es null, busca cualquier caja abierta de la sucursal (compatibilidad
 * con instalaciones de POS único anteriores a la migración 23).
 */
function currentCashSession(PDO $db, int $branchId, ?int $posId = null): ?array {
    if ($posId === null) {
        $stmt = $db->prepare(
            "SELECT * FROM cash_sessions
             WHERE branch_id = ? AND status = 'open' AND closed_at IS NULL
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([$branchId]);
    } else {
        // Coincide con el POS exacto, o con sesiones legadas sin pos_id (NULL).
        $stmt = $db->prepare(
            "SELECT * FROM cash_sessions
             WHERE branch_id = ? AND status = 'open' AND closed_at IS NULL
               AND (pos_id = ? OR pos_id IS NULL)
             ORDER BY (pos_id = ?) DESC, id DESC LIMIT 1"
        );
        $stmt->execute([$branchId, $posId, $posId]);
    }
    return $stmt->fetch() ?: null;
}

/**
 * GUARD: exige una caja abierta para la sucursal/POS de la petición.
 *
 * Devuelve la fila de la sesión activa, o corta con 409 + código estable
 * `cash_session_required` que el frontend usa para abrir el modal de apertura.
 *
 * Úsalo al inicio de cualquier acción que mueva dinero o cierre una venta.
 */
function requireOpenCashSession(PDO $db, array $payload, array $body = []): array {
    $branchId = cashBranchId($payload, $body);
    if (!$branchId) jsonError(422, 'branch_id requerido');

    $posId   = cashPosId($body);
    $session = currentCashSession($db, $branchId, $posId);

    if (!$session) {
        jsonError(409, 'Para continuar necesitas abrir caja o iniciar turno.', [
            'error'     => 'cash_session_required',
            'branch_id' => $branchId,
            'pos_id'    => $posId,
        ]);
    }
    return $session;
}
