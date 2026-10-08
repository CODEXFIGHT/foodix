<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Solicitudes de contacto / cotización desde la landing.
 *   POST /leads                     — público (visitante sin sesión)
 *   GET  /leads?status=             — superadmin (lista)
 *   POST /leads/{id}/status         — superadmin (cambia estado)
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/mailer.php';

function handleLeads(array $seg, string $method): never {
    $id     = isset($seg[1]) ? (int)$seg[1] : 0;
    $action = $seg[2] ?? '';

    // Envío público del formulario de contacto.
    if (!$id && $method === 'POST') {
        leadsSubmit();
    }

    // A partir de aquí, todo es solo para el superadmin.
    $payload = requireAuth();
    requireRole($payload, 'superadmin');
    $db = Database::connect();

    if (!$id && $method === 'GET') {
        leadsList($db);
    }
    if ($id && $action === 'status' && $method === 'POST') {
        leadsUpdateStatus($db, $id);
    }

    jsonError(404, 'Ruta no encontrada');
}

// ── Envío público ─────────────────────────────────────────────────────────────
function leadsSubmit(): never {
    $body = getBody();

    $name     = trim((string)($body['name'] ?? ''));
    $whatsapp = trim((string)($body['whatsapp'] ?? ''));
    $message  = trim((string)($body['message'] ?? ''));

    if ($name === '' || mb_strlen($name) > 120) {
        jsonError(422, 'Nombre requerido');
    }
    if ($whatsapp === '' || mb_strlen($whatsapp) > 40) {
        jsonError(422, 'WhatsApp requerido');
    }
    if ($message === '' || mb_strlen($message) > 2000) {
        jsonError(422, 'Mensaje requerido');
    }

    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if ($ip) $ip = substr(trim(explode(',', $ip)[0]), 0, 45);
    $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null;

    $db   = Database::connect();
    $stmt = $db->prepare(
        'INSERT INTO contact_leads (name, whatsapp, message, source, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$name, $whatsapp, $message, 'landing', $ip, $ua]);
    $leadId = (int)$db->lastInsertId();

    // Notificación por correo (no bloquea la respuesta si el correo falla).
    $emailed = leadsNotifyByEmail($name, $whatsapp, $message);
    if ($emailed) {
        $db->prepare('UPDATE contact_leads SET emailed = 1 WHERE id = ?')->execute([$leadId]);
    }

    jsonResponse(['ok' => true, 'id' => $leadId], 201);
}

function leadsNotifyByEmail(string $name, string $whatsapp, string $message): bool {
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeWa   = htmlspecialchars($whatsapp, ENT_QUOTES, 'UTF-8');
    $safeMsg  = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
    $waDigits = preg_replace('/\D+/', '', $whatsapp);
    $when     = date('d/m/Y H:i');

    $html = <<<HTML
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
  <div style="background:#E85D04;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;font-size:18px">Nueva solicitud de cotización · FoodIX</h2>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:22px;border-radius:0 0 12px 12px">
    <p style="margin:0 0 6px"><strong>Nombre:</strong> {$safeName}</p>
    <p style="margin:0 0 6px"><strong>WhatsApp:</strong> {$safeWa}
      &nbsp;<a href="https://wa.me/{$waDigits}" style="color:#E85D04">Abrir chat</a></p>
    <p style="margin:14px 0 4px"><strong>Mensaje:</strong></p>
    <div style="background:#faf9f7;border:1px solid #eee;border-radius:8px;padding:12px;font-size:14px;line-height:1.5">{$safeMsg}</div>
    <p style="margin:18px 0 0;font-size:12px;color:#999">Recibido el {$when} desde la landing de FoodIX.</p>
  </div>
</div>
HTML;

    return sendHtmlMail(MAIL_NOTIFY_TO, 'Nueva cotización de ' . $name . ' — FoodIX', $html);
}

// ── Superadmin ────────────────────────────────────────────────────────────────
function leadsList(PDO $db): never {
    $status = strParam('status');
    $allowed = ['new', 'read', 'archived'];

    if ($status !== '' && in_array($status, $allowed, true)) {
        $stmt = $db->prepare(
            'SELECT id, name, whatsapp, message, status, source, emailed, created_at
             FROM contact_leads WHERE status = ? ORDER BY created_at DESC LIMIT 500'
        );
        $stmt->execute([$status]);
    } else {
        $stmt = $db->query(
            'SELECT id, name, whatsapp, message, status, source, emailed, created_at
             FROM contact_leads ORDER BY created_at DESC LIMIT 500'
        );
    }

    $items = array_map(fn($r) => [
        'id'         => (int)$r['id'],
        'name'       => $r['name'],
        'whatsapp'   => $r['whatsapp'],
        'message'    => $r['message'],
        'status'     => $r['status'],
        'source'     => $r['source'],
        'emailed'    => (bool)$r['emailed'],
        'created_at' => $r['created_at'],
    ], $stmt->fetchAll());

    $counts = $db->query(
        "SELECT
            COUNT(*) AS total,
            SUM(status = 'new') AS new_count,
            SUM(status = 'read') AS read_count,
            SUM(status = 'archived') AS archived_count
         FROM contact_leads"
    )->fetch();

    jsonResponse([
        'items'   => $items,
        'metrics' => [
            'total'    => (int)($counts['total'] ?? 0),
            'new'      => (int)($counts['new_count'] ?? 0),
            'read'     => (int)($counts['read_count'] ?? 0),
            'archived' => (int)($counts['archived_count'] ?? 0),
        ],
    ]);
}

function leadsUpdateStatus(PDO $db, int $id): never {
    $body   = getBody();
    $status = trim((string)($body['status'] ?? ''));
    if (!in_array($status, ['new', 'read', 'archived'], true)) {
        jsonError(422, 'Estado inválido');
    }

    $stmt = $db->prepare('UPDATE contact_leads SET status = ? WHERE id = ?');
    $stmt->execute([$status, $id]);
    if ($stmt->rowCount() === 0) {
        // No cambió (mismo estado) o no existe: validamos existencia.
        $exists = $db->prepare('SELECT 1 FROM contact_leads WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) jsonError(404, 'Solicitud no encontrada');
    }

    jsonResponse(['ok' => true, 'id' => $id, 'status' => $status]);
}
