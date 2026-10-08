/**
 * Webhook de WhatsApp — soporta Meta Cloud API (gratis), Wati ($79/mes) y Twilio (Pro).
 *
 * Proveedor activo: variable WA_PROVIDER = 'meta' | 'wati' | 'twilio'  (default: meta)
 *
 * Meta Cloud API:
 *   GET  → verificación con hub.verify_token + hub.challenge
 *   POST → payload estándar de Meta con entry[].changes[].value.messages[]
 *
 * Wati:
 *   GET  → devuelve el token para verificación manual
 *   POST → payload con array de mensajes o mensaje individual
 *
 * Twilio:
 *   GET  → ok (Twilio no verifica con challenge)
 *   POST → application/x-www-form-urlencoded con From / Body / WaId / ProfileName.
 *          La firma se valida con el header X-Twilio-Signature (HMAC-SHA1).
 *
 * Variables de entorno:
 *   WA_PROVIDER          meta | wati | twilio
 *   WA_WEBHOOK_TOKEN     token de verificación (Meta: hub.verify_token)
 *   WA_BRANCH_SLUG       slug de la sucursal vinculada al número (fallback: WATI_BRANCH_SLUG)
 *   WA_PHONE_NUMBER_ID   (Meta) ID del número en Meta Business
 *   WA_ACCESS_TOKEN      (Meta) token permanente de la app de Meta
 *   WATI_API_ENDPOINT    (Wati) https://live-server-XXXXX.wati.io
 *   WATI_API_TOKEN       (Wati) Bearer token
 *   TWILIO_AUTH_TOKEN    (Twilio) usado para validar la firma del webhook
 *   TWILIO_VALIDATE      (Twilio) 'false' para desactivar la validación de firma en local
 *   TWILIO_WEBHOOK_URL   (Twilio) URL pública exacta del webhook si el proxy reescribe host/proto
 */

import { NextResponse, after } from 'next/server'
import crypto from 'node:crypto'
import { handleIncomingMessage } from '@/lib/server/whatsappFlow'
import { resolveBranchByNumber, checkBranchPlanPro } from '@/lib/server/whatsappSession'

export const runtime = 'nodejs'

const getProvider = () => process.env.WA_PROVIDER       ?? 'meta'
const getWebhookToken = () => process.env.WA_WEBHOOK_TOKEN  ?? ''
const getBranchSlug = () => process.env.WA_BRANCH_SLUG    ?? process.env.WATI_BRANCH_SLUG ?? ''
const getTwilioToken = () => process.env.TWILIO_AUTH_TOKEN ?? ''
const getTwilioValidate = () => (process.env.TWILIO_VALIDATE ?? 'true') !== 'false'

// ─── Rate limit básico por teléfono ──────────────────────────────────────────
// Ventana deslizante en memoria de proceso: mitiga spam/loops de un mismo
// número sin depender de infraestructura extra. Best-effort (por instancia
// serverless "caliente"), no un rate limit distribuido — suficiente para
// frenar abuso obvio sin bloquear el flujo normal de un cliente real.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_MSGS = 20
const rateLimitHits = new Map<string, number[]>()

function isRateLimited(phone: string): boolean {
  const now = Date.now()
  const hits = (rateLimitHits.get(phone) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  hits.push(now)
  rateLimitHits.set(phone, hits)
  return hits.length > RATE_LIMIT_MAX_MSGS
}

// ─── GET — Verificación del webhook ─────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url)
  const p   = url.searchParams
  const provider = getProvider()
  const webhookToken = getWebhookToken()

  if (provider === 'meta') {
    // Meta envía: hub.mode=subscribe, hub.verify_token, hub.challenge
    const mode      = p.get('hub.mode')
    const token     = p.get('hub.verify_token') ?? ''
    const challenge = p.get('hub.challenge')    ?? ''

    if (mode === 'subscribe' && token === webhookToken) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // Wati: verifica con ?token=...
  const token = p.get('token') ?? ''
  if (webhookToken && token !== webhookToken) {
    return new Response('Forbidden', { status: 403 })
  }
  return new Response('ok', { status: 200 })
}

// ─── POST — Mensaje entrante ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const provider = getProvider()
  // ── Twilio: form-urlencoded + firma X-Twilio-Signature ──
  if (provider === 'twilio') {
    return handleTwilioPost(req)
  }

  // ── Meta / Wati: JSON ──
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const messages = provider === 'meta'
    ? extractMetaMessages(payload)
    : extractWatiMessages(payload, req)

  const branchSlug = getBranchSlug()
  const isPro = await checkBranchPlanPro(branchSlug)
  if (!isPro) {
    console.warn(`[WA Webhook] sucursal ${branchSlug} no cuenta con Plan Pro/Enterprise. Mensajes ignorados.`)
    return NextResponse.json({ status: 'ignored_plan_not_pro' })
  }

  for (const { phone, text, messageId, profileName } of messages) {
    if (!phone || !text.trim()) continue
    if (isRateLimited(phone)) {
      console.warn(`[WA Webhook] ${phone} superó el límite de mensajes/minuto — ignorado.`)
      continue
    }
    // Responde 200 a WhatsApp/Wati inmediatamente; procesa después con
    // after() para que Vercel no congele la función a mitad del flujo
    // (el bot manda varios mensajes seguidos: texto, fotos, listas...).
    after(() =>
      handleIncomingMessage(phone, text, branchSlug, undefined, provider, messageId, profileName).catch(err =>
        console.error(`[WA Webhook] error procesando ${phone}:`, err),
      ),
    )
  }

  return NextResponse.json({ status: 'received' })
}

// ─── Twilio ──────────────────────────────────────────────────────────────────

/** Respuesta TwiML vacía: confirma recepción sin enviar mensaje sincrónico. */
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
const twimlOk = () =>
  new Response(EMPTY_TWIML, { status: 200, headers: { 'Content-Type': 'text/xml' } })

async function handleTwilioPost(req: Request): Promise<Response> {
  let form: URLSearchParams
  try {
    form = new URLSearchParams(await req.text())
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Validación de firma (HMAC-SHA1 sobre URL + params ordenados).
  if (getTwilioValidate()) {
    const signature = req.headers.get('x-twilio-signature') ?? ''
    if (!verifyTwilioSignature(req, form, signature)) {
      console.warn('[WA Twilio] firma inválida — rechazado.')
      return new Response('Invalid signature', { status: 403 })
    }
  }

  const rawFrom   = form.get('From') ?? ''               // whatsapp:+5215... (cliente)
  const rawTo     = form.get('To')   ?? ''               // whatsapp:+1...    (número del negocio)
  const phone     = rawFrom.replace(/^whatsapp:/, '').replace('+', '')
  const toNum     = rawTo.replace(/^whatsapp:/, '')
  const text      = (form.get('Body') ?? '').trim()
  const messageSid = form.get('MessageSid') || undefined // para el typing indicator (Twilio Indicators API)
  const profileName = form.get('ProfileName') || undefined // nombre de WhatsApp del cliente (para personalizar el saludo)

  if (phone && text) {
    // Multi-tenant: resuelve la sucursal por el número destino (To). En el
    // sandbox el número es compartido → no hay mapeo y se usa WA_BRANCH_SLUG.
    const resolved = await resolveBranchByNumber(toNum)
    let branchSlug = resolved.branchSlug
    let isPro = resolved.planPro

    const defaultBranchSlug = getBranchSlug()
    if (!branchSlug) {
      branchSlug = defaultBranchSlug
      isPro = await checkBranchPlanPro(branchSlug)
    }

    if (!isPro) {
      console.warn(`[WA Twilio] sucursal ${branchSlug} no cuenta con Plan Pro/Enterprise. Mensaje ignorado.`)
      return twimlOk()
    }

    if (isRateLimited(phone)) {
      console.warn(`[WA Twilio] ${phone} superó el límite de mensajes/minuto — ignorado.`)
      return twimlOk()
    }

    after(() =>
      handleIncomingMessage(phone, text, branchSlug, toNum, 'twilio', messageSid, profileName).catch(err =>
        console.error(`[WA Twilio] error procesando ${phone}:`, err),
      ),
    )
  }
  return twimlOk()
}

/** URL pública que firmó Twilio (puede diferir de req.url tras un proxy). */
function twilioWebhookUrl(req: Request): string {
  if (process.env.TWILIO_WEBHOOK_URL) return process.env.TWILIO_WEBHOOK_URL
  const url   = new URL(req.url)
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host
  return `${proto}://${host}${url.pathname}${url.search}`
}

/**
 * Valida X-Twilio-Signature: base64( HMAC-SHA1( URL + sort(params).join(key+value), authToken ) ).
 * Ver https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(req: Request, form: URLSearchParams, signature: string): boolean {
  const token = getTwilioToken()
  if (!token || !signature) return false
  const url  = twilioWebhookUrl(req)
  const keys = [...form.keys()].sort()
  let data = url
  for (const k of keys) data += k + (form.get(k) ?? '')

  const expected = crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─── Parsers por proveedor ───────────────────────────────────────────────────

interface IncomingMsg { phone: string; text: string; messageId?: string; profileName?: string }

function extractMetaMessages(payload: unknown): IncomingMsg[] {
  const results: IncomingMsg[] = []
  try {
    const body = payload as Record<string, unknown>
    const entries = (body.entry ?? []) as Record<string, unknown>[]
    for (const entry of entries) {
      const changes = (entry.changes ?? []) as Record<string, unknown>[]
      for (const change of changes) {
        const value    = change.value as Record<string, unknown> | undefined
        const messages = (value?.messages ?? []) as Record<string, unknown>[]
        // Nombre de perfil de WhatsApp del cliente (para personalizar el saludo).
        const contacts = (value?.contacts ?? []) as Record<string, unknown>[]
        const nameByWaId = new Map<string, string>(
          contacts.map(c => [
            (c.wa_id ?? '') as string,
            ((c.profile as Record<string, unknown> | undefined)?.name ?? '') as string,
          ]),
        )
        for (const msg of messages) {
          const phone = (msg.from ?? '') as string
          const messageId = (msg.id ?? '') as string
          // Texto plano
          const textBody = (msg.text as Record<string, unknown> | undefined)?.body as string | undefined
          // Respuesta interactiva (lista o botón)
          const interactive = msg.interactive as Record<string, unknown> | undefined
          const listReply   = interactive?.list_reply   as Record<string, unknown> | undefined
          const btnReply    = interactive?.button_reply as Record<string, unknown> | undefined
          const interactiveId = (listReply?.id ?? btnReply?.id ?? '') as string
          const text = interactiveId || textBody || ''
          if (phone && text) {
            results.push({ phone, text, messageId: messageId || undefined, profileName: nameByWaId.get(phone) || undefined })
          }
        }
      }
    }
  } catch (err) {
    console.error('[WA Meta] error parseando payload:', err)
  }
  return results
}

function extractWatiMessages(payload: unknown, req: Request): IncomingMsg[] {
  // Verificar token en header
  const headerToken = req.headers.get('x-wati-token') ?? ''
  const webhookToken = getWebhookToken()
  if (webhookToken && headerToken !== webhookToken) return []

  const results: IncomingMsg[] = []
  try {
    const msgs = Array.isArray(payload) ? payload : [(payload as Record<string, unknown>)]
    for (const msg of msgs as Record<string, unknown>[]) {
      if (msg.type === 'outgoing' || msg.direction === 'outgoing') continue
      const phone = (msg.waId ?? msg.from ?? '') as string
      const text  = (msg.text ?? msg.body ?? '') as string
      const interactiveId = extractWatiInteractiveId(msg)
      const final = interactiveId || text
      if (phone && final) results.push({ phone, text: final })
      // Nota: Wati no tiene una API pública documentada de typing indicator,
      // así que no se propaga un messageId aquí (sendTypingIndicator es
      // no-op para este proveedor).
    }
  } catch (err) {
    console.error('[WA Wati] error parseando payload:', err)
  }
  return results
}

function extractWatiInteractiveId(msg: Record<string, unknown>): string {
  try {
    const interactive = msg.interactive as Record<string, unknown> | undefined
    if (interactive) {
      const lr = interactive.list_reply   as Record<string, unknown> | undefined
      const br = interactive.button_reply as Record<string, unknown> | undefined
      return ((lr?.id ?? br?.id ?? '') as string)
    }
    return ((msg.buttonId ?? msg.listReplyId ?? '') as string)
  } catch { return '' }
}
