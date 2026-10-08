<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Comanda por voz del mesero: interpreta un transcript en español libre
 * contra el catálogo real de la sucursal usando OpenRouter como intérprete
 * de lenguaje — nunca decide productos, precios ni cantidades por su cuenta,
 * el modelo solo puede señalar platillos por posición en una lista numerada
 * (nunca por id directo), igual patrón que lib/server/whatsappAI.ts en el
 * front. Sin OPENROUTER_API_KEY configurada o si la llamada falla, degrada
 * en silencio a confianza 0 — el mesero completa el pedido a mano, nunca truena.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

const VOICE_ORDER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const VOICE_ORDER_MODEL    = 'openai/gpt-4o-mini';

function handleOrdenes(array $seg, string $method): never {
    $sub1 = $seg[1] ?? '';

    if ($sub1 === 'parse-voz' && $method === 'POST') {
        handleParseVoz();
    }

    jsonError(404, 'Ruta no encontrada');
}

function handleParseVoz(): never {
    $payload = requireAuth();
    requireRole($payload, 'mesero', 'admin', 'superadmin');
    $db = Database::connect();

    $body       = getBody();
    $transcript = trim((string)($body['transcript'] ?? ''));
    $mesaId     = (int)($body['mesaId'] ?? 0);

    if ($transcript === '') jsonError(422, 'transcript requerido');
    if ($mesaId <= 0)       jsonError(422, 'mesaId requerido');

    $stmt = $db->prepare('SELECT id, branch_id FROM tables WHERE id = ?');
    $stmt->execute([$mesaId]);
    $table = $stmt->fetch();
    if (!$table) jsonError(404, 'Mesa no encontrada');

    // Igual regla que branchScopeT() en routes/tables.php: solo superadmin
    // opera fuera de su propia sucursal.
    if ($payload['role'] !== 'superadmin' && (int)$table['branch_id'] !== (int)$payload['branch_id']) {
        jsonError(403, 'Sin permisos sobre esta mesa');
    }

    $branchId = (int)$table['branch_id'];

    $stmt = $db->prepare(
        'SELECT id, name, price FROM products
         WHERE branch_id = ? AND available = 1
         ORDER BY sort_order ASC, name ASC'
    );
    $stmt->execute([$branchId]);
    $products = $stmt->fetchAll();

    if (!$products) {
        jsonResponse([
            'items'        => [],
            'confianza'    => 0.0,
            'ambiguedades' => ['Esta sucursal no tiene productos disponibles en el menú.'],
        ]);
    }

    $decision = interpretVoiceOrder($transcript, $products);

    if ($decision === null) {
        jsonResponse([
            'items'        => [],
            'confianza'    => 0.0,
            'ambiguedades' => ['No se pudo interpretar el audio automáticamente. Agrega los productos manualmente.'],
        ]);
    }

    jsonResponse($decision);
}

/**
 * Interpreta el transcript contra el catálogo real vía OpenRouter. Devuelve
 * null si no hay OPENROUTER_API_KEY, curl no está disponible, o la llamada
 * falla — en cualquiera de esos casos el llamador degrada a confianza 0.
 */
function interpretVoiceOrder(string $transcript, array $products): ?array {
    $key = defined('OPENROUTER_API_KEY') ? OPENROUTER_API_KEY : '';
    if ($key === '' || !function_exists('curl_init')) return null;

    $catalogList = '';
    foreach ($products as $i => $p) {
        $n = $i + 1;
        $catalogList .= "{$n}. {$p['name']} — \$" . number_format((float)$p['price'], 0) . " MXN\n";
    }

    $system =
        'Eres el asistente de un mesero que dicta una comanda en voz alta en un restaurante en México. ' .
        'SOLO conoces los platillos de la lista numerada que te doy — nunca inventes platillos, precios ' .
        'ni cantidades que el mesero no haya dicho. Responde SIEMPRE con un objeto JSON válido: ' .
        '{"items": [{"index": number, "cantidad": number, "modificadores": string[]}], ' .
        '"confianza": number, "ambiguedades": string[]}. "index" es el número de la lista (1-based) — ' .
        'nunca un id. "cantidad" es entero, 1 si no se especifica. "modificadores" son notas cortas del ' .
        'platillo dichas por el mesero (ej. "sin cebolla", "término medio"), vacío si no aplica. ' .
        '"confianza" es un número entre 0 y 1 que refleja qué tan seguro estás de haber entendido TODO ' .
        'el pedido correctamente — baja (menor a 0.75) si el audio es ambiguo, incompleto, o algún ' .
        'platillo no coincide con claridad contra la lista. "ambiguedades" son frases breves en español ' .
        'explicando lo que no identificaste con certeza (ej. "no encontré \'sushi\' en el menú"), vacío ' .
        'si no hay dudas.';

    $user = "Menú disponible:\n{$catalogList}\nLo que dictó el mesero: \"{$transcript}\"";

    $ch = curl_init(VOICE_ORDER_ENDPOINT);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 6,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model'           => VOICE_ORDER_MODEL,
            'temperature'     => 0.2,
            'max_tokens'      => 500,
            'response_format' => ['type' => 'json_object'],
            'messages'        => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user',   'content' => $user],
            ],
        ], JSON_UNESCAPED_UNICODE),
    ]);

    $raw        = curl_exec($ch);
    $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError  = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $httpStatus !== 200) {
        error_log('[ordenes/parse-voz] OpenRouter error: ' . ($curlError !== '' ? $curlError : "HTTP {$httpStatus}"));
        return null;
    }

    $data    = json_decode((string)$raw, true);
    $content = $data['choices'][0]['message']['content'] ?? '{}';

    $parsed = json_decode((string)$content, true);
    if (!is_array($parsed) && preg_match('/\{[\s\S]*\}/', (string)$content, $m)) {
        $parsed = json_decode($m[0], true);
    }
    if (!is_array($parsed)) return null;

    return sanitizeVoiceDecision($parsed, $products);
}

/**
 * Acota la respuesta del modelo antes de devolverla al cliente: índices
 * fuera de rango se descartan (nunca un product_id inventado llega al
 * mesero), cantidades se acotan a 1-50, confianza a 0-1, y los textos se
 * recortan a un largo razonable.
 */
function sanitizeVoiceDecision(array $parsed, array $products): array {
    $count    = count($products);
    $rawItems = is_array($parsed['items'] ?? null) ? $parsed['items'] : [];

    $items = [];
    foreach ($rawItems as $raw) {
        if (!is_array($raw)) continue;
        $index = (int)($raw['index'] ?? 0);
        if ($index < 1 || $index > $count) continue;

        $product       = $products[$index - 1];
        $cantidad      = max(1, min(50, (int)($raw['cantidad'] ?? 1)));
        $modsInput     = is_array($raw['modificadores'] ?? null) ? $raw['modificadores'] : [];
        $modificadores = [];
        foreach ($modsInput as $mod) {
            if (!is_string($mod)) continue;
            $mod = trim($mod);
            if ($mod === '') continue;
            $modificadores[] = mb_substr($mod, 0, 80);
            if (count($modificadores) >= 10) break;
        }

        $items[] = [
            'productoId'    => (int)$product['id'],
            'cantidad'      => $cantidad,
            'modificadores' => $modificadores,
        ];
    }

    $confianza = is_numeric($parsed['confianza'] ?? null) ? (float)$parsed['confianza'] : 0.0;
    $confianza = max(0.0, min(1.0, $confianza));

    $ambigInput   = is_array($parsed['ambiguedades'] ?? null) ? $parsed['ambiguedades'] : [];
    $ambiguedades = [];
    foreach ($ambigInput as $amb) {
        if (!is_string($amb)) continue;
        $amb = trim($amb);
        if ($amb === '') continue;
        $ambiguedades[] = mb_substr($amb, 0, 200);
        if (count($ambiguedades) >= 5) break;
    }

    if (empty($items) && empty($ambiguedades)) {
        $ambiguedades[] = 'No se identificó ningún platillo en el audio.';
    }

    return [
        'items'        => $items,
        'confianza'    => $confianza,
        'ambiguedades' => $ambiguedades,
    ];
}
