/**
 * FoodIX — Cerebro IA del bot de WhatsApp (OpenRouter).
 *
 * Se usa como *fallback* dentro del flujo determinista de whatsappFlow.ts —
 * NUNCA decide precios, IDs o totales por su cuenta (eso sigue viniendo del
 * catálogo real). Solo interpreta lenguaje libre en dos casos:
 *
 *   1. El cliente escribe un platillo en lenguaje natural en vez del número
 *      exacto de la lista ("dame unas alitas bbq" → producto #3).
 *   2. El cliente hace una pregunta que no es un comando del flujo
 *      ("¿tienen algo sin gluten?", "¿cuánto tardan?") — se responde con el
 *      menú real como contexto, sin inventar productos que no existen.
 *
 * Mismo patrón que app/api/ai/product-content/route.ts: fetch directo a la
 * API de OpenRouter (sin SDK adicional), timeout corto para no frenar el
 * chat si OpenRouter tarda, y degradación silenciosa al flujo normal si
 * falla o no hay OPENROUTER_API_KEY configurado.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
// Modelo rápido y barato — suficiente para clasificar intención y responder
// preguntas cortas del menú. Configurable sin tocar código.
const MODEL = process.env.WA_AI_MODEL ?? 'openai/gpt-4o-mini'
// El bot debe sentirse instantáneo: si OpenRouter no responde en este tiempo,
// se degrada al mensaje de "no reconocí esa opción" de siempre. Medido en vivo
// con este mismo modelo/prompt: ~0.9–1.4s típico — 3.5s ya deja margen de sobra
// sin dejar al cliente esperando de más en el peor caso.
const TIMEOUT_MS = 3_500

interface CatalogEntry { n: number; name: string; price: number; category?: string }

export interface WaAIDecision {
  /** Índice (1-based, igual a la numeración que ve el cliente) del platillo detectado, si aplica. */
  productIndex?: number
  /** Respuesta en texto para el cliente cuando es una pregunta (no una selección de producto). */
  reply?: string
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) }
}

/**
 * Interpreta un mensaje libre del cliente contra el menú real de la sucursal.
 * Devuelve null si la IA no está configurada, falla, o no aporta nada útil
 * (en ese caso whatsappFlow.ts sigue con su respuesta determinista de siempre).
 */
export async function interpretMenuMessage(params: {
  branchName: string | null
  userText: string
  catalog: CatalogEntry[]
}): Promise<WaAIDecision | null> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || params.catalog.length === 0) return null

  const menuList = params.catalog
    .map(p => `${p.n}. ${p.name}${p.category ? ` (${p.category})` : ''} — $${p.price.toFixed(0)} MXN`)
    .join('\n')

  const system =
    'Eres el asistente de pedidos por WhatsApp de un restaurante en México. ' +
    'SOLO conoces los platillos de la lista numerada que te doy — nunca inventes platillos, ' +
    'precios ni promociones que no estén ahí. Responde SIEMPRE con un objeto JSON válido: ' +
    '{"productIndex": number|null, "reply": string|null}. ' +
    'Usa "productIndex" (el número de la lista) cuando el cliente claramente quiere pedir uno de esos ' +
    'platillos, aunque lo escriba con errores, sinónimos o sin el número exacto. ' +
    'Usa "reply" (texto breve, cálido, en español, máx. 3 frases, sin emojis excesivos) cuando el ' +
    'cliente hace una pregunta o comentario que no es una selección directa de platillo — por ejemplo ' +
    'sobre ingredientes, si hay opciones vegetarianas/sin gluten (respondiendo solo con lo que puedas ' +
    'inferir de los nombres/categorías reales de la lista, sin asegurar cosas que no sabes), tiempos de ' +
    'entrega, horarios, o cualquier plática. Si no entiendes nada en absoluto, ambos campos van null.'

  const user =
    `Restaurante: ${params.branchName ?? 'este restaurante'}.\n\nMenú disponible:\n${menuList}\n\n` +
    `Mensaje del cliente: "${params.userText}"`

  const { signal, cancel } = withTimeout(TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? '{}'

    let parsed: { productIndex?: number | null; reply?: string | null } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) { try { parsed = JSON.parse(match[0]) } catch { /* ignore */ } }
    }

    const productIndex = typeof parsed.productIndex === 'number' && Number.isInteger(parsed.productIndex)
      && parsed.productIndex >= 1 && parsed.productIndex <= params.catalog.length
      ? parsed.productIndex
      : undefined
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim().slice(0, 600) : undefined

    if (!productIndex && !reply) return null
    return { productIndex, reply }
  } catch (err) {
    console.error('[WA-AI] error consultando OpenRouter:', err)
    return null
  } finally {
    cancel()
  }
}

export interface WaAIMultiItemDecision {
  /** Uno por platillo detectado en el mensaje — puede venir vacío. */
  items: { productIndex: number; quantity: number }[]
  /** Texto para el cliente cuando hay algo que no se pudo reconocer, o nada en absoluto. */
  reply?: string
}

/**
 * Igual que `interpretMenuMessage()` pero para mensajes con VARIOS platillos
 * en un solo texto (ej. "2 tacos, 1 bebida y 3 quesadillas"). Solo se llama
 * cuando el parser determinista de `whatsappParser.ts` no reconoció nada Y el
 * mensaje tiene pinta de traer varios ítems (coma/"y"/números) — para el
 * caso de un solo platillo se sigue usando `interpretMenuMessage()`.
 */
export async function interpretMultiItemMessage(params: {
  branchName: string | null
  userText: string
  catalog: CatalogEntry[]
}): Promise<WaAIMultiItemDecision | null> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || params.catalog.length === 0) return null

  const menuList = params.catalog
    .map(p => `${p.n}. ${p.name}${p.category ? ` (${p.category})` : ''} — $${p.price.toFixed(0)} MXN`)
    .join('\n')

  const system =
    'Eres el asistente de pedidos por WhatsApp de un restaurante en México. ' +
    'SOLO conoces los platillos de la lista numerada que te doy — nunca inventes platillos, ' +
    'precios ni promociones que no estén ahí. El cliente puede pedir VARIOS platillos y cantidades ' +
    'en un solo mensaje (ej. "2 tacos, 1 bebida y 3 quesadillas"). Responde SIEMPRE con un objeto ' +
    'JSON válido: {"items": [{"productIndex": number, "quantity": number}], "reply": string|null}. ' +
    'Devuelve un objeto en "items" por cada platillo que reconozcas, usando "productIndex" (el número ' +
    'de la lista) y "quantity" (entero, 1 si el cliente no especificó cantidad). Si detectas texto que ' +
    'no corresponde a ningún platillo de la lista, ignóralo en "items" pero menciónalo brevemente en ' +
    '"reply" (español, cálido, máx. 2 frases). Si no reconoces ningún platillo, "items" va vacío y ' +
    '"reply" explica que no entendiste.'

  const user =
    `Restaurante: ${params.branchName ?? 'este restaurante'}.\n\nMenú disponible:\n${menuList}\n\n` +
    `Mensaje del cliente: "${params.userText}"`

  const { signal, cancel } = withTimeout(TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 320,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? '{}'

    let parsed: { items?: unknown; reply?: string | null } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) { try { parsed = JSON.parse(match[0]) } catch { /* ignore */ } }
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : []
    const items = rawItems
      .map((it: unknown) => {
        const o = it as { productIndex?: unknown; quantity?: unknown }
        const productIndex = typeof o.productIndex === 'number' && Number.isInteger(o.productIndex)
          && o.productIndex >= 1 && o.productIndex <= params.catalog.length
          ? o.productIndex : null
        if (productIndex === null) return null
        const quantity = typeof o.quantity === 'number' && Number.isInteger(o.quantity)
          ? Math.min(20, Math.max(1, o.quantity)) : 1
        return { productIndex, quantity }
      })
      .filter((x: { productIndex: number; quantity: number } | null): x is { productIndex: number; quantity: number } => x !== null)

    const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim().slice(0, 600) : undefined

    if (items.length === 0 && !reply) return null
    return { items, reply }
  } catch (err) {
    console.error('[WA-AI] error consultando OpenRouter (multi-ítem):', err)
    return null
  } finally {
    cancel()
  }
}
