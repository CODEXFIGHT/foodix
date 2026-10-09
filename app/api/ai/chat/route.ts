/**
 * FoodIX — Chatbot "Sol" de la landing (servidor).
 *
 * Responde preguntas de nuevos usuarios sobre FoodIX (planes, precios,
 * funciones, etc.) usando la API de EdenIA. Si EdenIA no está disponible
 * (sin clave configurada o la petición falla), cae de vuelta a OpenRouter
 * con el mismo prompt. Las claves viven SOLO en el servidor.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { PLANS, formatPlanPrice } from '@/app/landing/plans'

export const dynamic = 'force-dynamic'

const EDENIA_ENDPOINT = 'https://api.edenia.com/v1/chat/completions'
const EDENIA_MODEL = 'edenia-chat'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-4o-mini'

const MAX_HISTORY = 12
const MAX_MESSAGE_LENGTH = 1000

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Body {
  messages?: ChatMessage[]
}

function buildPlansSummary() {
  return PLANS.map(plan => {
    const precio = `${formatPlanPrice(plan.price)}/mes`
    const extra = plan.perBranch ? ` (+${formatPlanPrice(plan.perBranch)}/mes por sucursal adicional)` : ''
    const estado = plan.available === false ? ' — Próximamente' : ''
    return `- ${plan.name}: ${precio}${extra}${estado}. ${plan.tagline}. Incluye: ${plan.features.join(', ')}.`
  }).join('\n')
}

function buildSystemPrompt() {
  return (
    'Eres "Sol", el asistente virtual de FoodIX (sistema POS en la nube para restaurantes). ' +
    'Hablas en español de México, de forma cálida, breve y clara (máximo 4-5 frases por respuesta). ' +
    'Tu objetivo es ayudar a nuevos usuarios que visitan la página web a entender qué es FoodIX, ' +
    'sus funciones (mesas, pedidos, cocina/KDS, caja y turnos, carta digital con QR, inventario, ' +
    'reportes, multi-sucursal) y sus precios. Usa SIEMPRE los precios y datos exactos de esta lista ' +
    'de planes (moneda: pesos mexicanos, MXN):\n\n' +
    buildPlansSummary() +
    '\n\nSi preguntan por "el precio" en general sin especificar plan, menciona el plan Starter como ' +
    'punto de entrada y el Pro como el más popular. Si preguntan algo que no sabes con certeza ' +
    '(por ejemplo datos legales, facturación específica o soporte técnico de una cuenta ya existente), ' +
    'invítalos amablemente a escribir por WhatsApp o a iniciar sesión/crear su cuenta para más detalle, ' +
    'sin inventar información. No respondas preguntas fuera del tema de FoodIX.'
  )
}

/** Llama a un endpoint estilo OpenAI (EdenIA u OpenRouter) y devuelve la respuesta del modelo, o null si falla. */
async function askModel(endpoint: string, headers: Record<string, string>, model: string, history: ChatMessage[]) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...history,
        ],
      }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content?.trim() ?? ''
    return reply || null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const edeniaKey = process.env.EDENIA_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (!edeniaKey && !openrouterKey) {
    return NextResponse.json({ error: 'El chat con IA no está disponible por el momento.' }, { status: 503 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const incoming = Array.isArray(body.messages) ? body.messages : []
  const history = incoming
    .filter((m): m is ChatMessage => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }))

  if (!history.length || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Escribe primero tu pregunta.' }, { status: 400 })
  }

  // 1) EdenIA (proveedor principal). 2) Si no hay clave o la petición falla, OpenRouter de respaldo.
  const reply = edeniaKey
    ? await askModel(EDENIA_ENDPOINT, { 'x-api-key': edeniaKey }, EDENIA_MODEL, history)
    : null

  const finalReply = reply ?? (openrouterKey
    ? await askModel(OPENROUTER_ENDPOINT, { Authorization: `Bearer ${openrouterKey}` }, OPENROUTER_MODEL, history)
    : null)

  if (!finalReply) {
    return NextResponse.json({ error: 'Sol no pudo responder en este momento. Intenta de nuevo.' }, { status: 502 })
  }

  return NextResponse.json({ reply: finalReply })
}
