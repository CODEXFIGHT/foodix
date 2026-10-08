<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Almacenamiento de suscripciones Web Push (tabla push_subscriptions).
 *   POST /push/subscribe    — guarda/actualiza la suscripción del dispositivo
 *   POST /push/unsubscribe  — elimina la suscripción por endpoint
 *   GET  /push/list         — superadmin/admin: lista suscripciones (diagnóstico)
 *
 * El envío real del push lo realiza la capa Next.js (web-push + VAPID). Aquí
 * solo persistimos las suscripciones para futuros envíos del servidor.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function handlePush(array $seg, string $method): never {
    $action  = $seg[1] ?? '';
    $payload = requireAuth();
    $db      = Database::connect();

    if ($action === 'subscribe' && $method === 'POST') {
        pushSubscribe($db, $payload);
    }
    if ($action === 'unsubscribe' && $method === 'POST') {
        pushUnsubscribe($db, $payload);
    }
    if ($action === 'list' && $method === 'GET') {
        requireRole($payload, 'admin', 'superadmin');
        pushList($db, $payload);
    }

    jsonError(404, 'Ruta no encontrada');
}

// ── POST /push/subscribe ────────────────────────────────────────────────────
function pushSubscribe(PDO $db, array $payload): never {
    $body = getBody();

    $endpoint = trim((string)($body['endpoint'] ?? ''));
    $p256dh   = trim((string)($body['p256dh'] ?? ''));
    $auth     = trim((string)($body['auth'] ?? ''));
    $ua       = mb_substr(trim((string)($body['user_agent'] ?? '')), 0, 255);

    if ($endpoint === '' || $p256dh === '' || $auth === '') {
        jsonError(422, 'Suscripción incompleta');
    }
    if (mb_strlen($endpoint) > 512) {
        jsonError(422, 'Endpoint demasiado largo');
    }

    $userId   = isset($payload['sub']) ? (int)$payload['sub'] : null;
    $branchId = isset($payload['branch_id']) ? (int)$payload['branch_id'] : null;

    // Upsert por endpoint: cada dispositivo/navegador tiene un endpoint único.
    $stmt = $db->prepare(
        'INSERT INTO push_subscriptions (branch_id, user_id, endpoint, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            branch_id = VALUES(branch_id),
            user_id   = VALUES(user_id),
            p256dh    = VALUES(p256dh),
            auth      = VALUES(auth),
            user_agent = VALUES(user_agent),
            updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([$branchId, $userId, $endpoint, $p256dh, $auth, $ua !== '' ? $ua : null]);

    jsonResponse(['ok' => true]);
}

// ── POST /push/unsubscribe ──────────────────────────────────────────────────
function pushUnsubscribe(PDO $db, array $payload): never {
    $body     = getBody();
    $endpoint = trim((string)($body['endpoint'] ?? ''));

    if ($endpoint === '') {
        jsonError(422, 'Endpoint requerido');
    }

    $stmt = $db->prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
    $stmt->execute([$endpoint]);

    jsonResponse(['ok' => true, 'removed' => $stmt->rowCount()]);
}

// ── Envío: nuevo pedido a cocina ──────────────────────────────────────────────
/**
 * Notifica (best-effort) a la cocina y administración de la sucursal cuando
 * entra un nuevo pedido. Recopila las suscripciones activas y delega el envío
 * firmado (VAPID) a la capa Next.js vía PUSH_NOTIFY_URL.
 *
 * Nunca lanza: jamás debe romper la creación del pedido.
 */
function notifyKitchenNewOrder(
    PDO $db,
    int $branchId,
    int $orderId,
    string $tableName,
    int $createdBy,
    int $itemCount,
    ?string $sourceLabel = null
): void {
    if (!defined('PUSH_NOTIFY_URL') || PUSH_NOTIFY_URL === '' || !function_exists('curl_init')) {
        return;
    }

    try {
        // Suscripciones activas del personal de esta sucursal (cocina, admin,
        // mesero y cajero). 'cajero' aún no es un rol definido; se incluye por
        // compatibilidad futura y simplemente no coincide si no existe.
        $stmt = $db->prepare(
            'SELECT ps.endpoint, ps.p256dh, ps.auth
             FROM push_subscriptions ps
             JOIN users u ON u.id = ps.user_id
             WHERE ps.branch_id = ?
               AND u.role IN (\'cocina\', \'admin\', \'mesero\', \'cajero\')
               AND u.active = 1'
        );
        $stmt->execute([$branchId]);
        $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$subscriptions) return;

        // Nombre del mesero que envió la comanda — salvo que el pedido venga de
        // un canal sin mesero real (ej. WhatsApp, atribuido al admin de la
        // sucursal), donde $sourceLabel evita mostrar "Mesero: {nombre del admin}".
        if ($sourceLabel !== null) {
            $waiterName = $sourceLabel;
        } else {
            $w = $db->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
            $w->execute([$createdBy]);
            $waiterName = trim((string)($w->fetchColumn() ?: '')) ?: 'Mesero';
        }

        $tableLabel = preg_match('/^\d/', $tableName) ? "Mesa $tableName" : $tableName;
        $productos  = $itemCount . ' ' . ($itemCount === 1 ? 'producto' : 'productos');

        $body = json_encode([
            'secret'       => defined('PUSH_INTERNAL_SECRET') ? PUSH_INTERNAL_SECRET : '',
            'notification' => [
                'title' => "🍽️ Nuevo pedido · {$tableLabel}",
                'body'  => "Mesero: {$waiterName} · {$productos}",
                'url'   => '/kitchen',
                'tag'   => "kitchen-order-{$orderId}",
            ],
            'subscriptions' => $subscriptions,
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init(PUSH_NOTIFY_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-Internal-Secret: ' . (defined('PUSH_INTERNAL_SECRET') ? PUSH_INTERNAL_SECRET : ''),
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (\Throwable $e) {
        error_log('[FoodIX push] notifyKitchenNewOrder: ' . $e->getMessage());
    }
}

// ── GET /push/list ──────────────────────────────────────────────────────────
function pushList(PDO $db, array $payload): never {
    // El admin solo ve las de su sucursal; el superadmin las ve todas.
    if (($payload['role'] ?? '') === 'superadmin') {
        $stmt = $db->query(
            'SELECT id, branch_id, user_id, endpoint, user_agent, created_at, updated_at
             FROM push_subscriptions ORDER BY updated_at DESC LIMIT 500'
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $branchId = (int)($payload['branch_id'] ?? 0);
        $stmt = $db->prepare(
            'SELECT id, branch_id, user_id, endpoint, user_agent, created_at, updated_at
             FROM push_subscriptions WHERE branch_id = ? ORDER BY updated_at DESC LIMIT 500'
        );
        $stmt->execute([$branchId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    jsonResponse(['data' => $rows]);
}
