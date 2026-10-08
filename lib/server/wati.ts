/**
 * Cliente servidor para WhatsApp — soporta tres modos:
 *
 *  • META (recomendado): WhatsApp Cloud API oficial de Meta.
 *    Menor costo operativo porque evita intermediarios como Twilio. Meta cobra
 *    por mensaje entregado según país y categoría; los mensajes de servicio
 *    dentro de la ventana de atención siguen siendo el camino más barato para
 *    pedidos iniciados por el cliente.
 *    Variables: WA_PROVIDER=meta | WA_PHONE_NUMBER_ID | WA_ACCESS_TOKEN
 *
 *  • WATI (alternativa no-code): Para quien ya tiene cuenta en Wati o necesita
 *    inbox/chatbot visual externo, aceptando cuota mensual y markup.
 *    Variables: WA_PROVIDER=wati | WATI_API_ENDPOINT | WATI_API_TOKEN
 *
 *  • TWILIO (fallback): API de WhatsApp de Twilio (sandbox o número aprobado).
 *    En ventana de sesión (24h) los mensajes son texto libre, por lo que las
 *    listas/botones interactivos se degradan a texto numerado.
 *    Variables: WA_PROVIDER=twilio | TWILIO_ACCOUNT_SID | TWILIO_AUTH_TOKEN |
 *               TWILIO_WHATSAPP_FROM | TWILIO_MESSAGING_SERVICE_SID?
 *
 * Solo se importa desde Route Handlers (Node.js) — nunca desde el cliente.
 */

const PROVIDER       = (process.env.WA_PROVIDER ?? 'meta') as 'meta' | 'wati' | 'twilio'
// Meta Cloud API
const META_PHONE_ID  = process.env.WA_PHONE_NUMBER_ID ?? ''
const META_TOKEN     = process.env.WA_ACCESS_TOKEN    ?? ''
const META_API_VER   = 'v20.0'
// Wati
const WATI_ENDPOINT  = process.env.WATI_API_ENDPOINT  ?? ''
const WATI_TOKEN     = process.env.WATI_API_TOKEN      ?? ''
// Twilio
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID  ?? ''
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN   ?? ''
const TWILIO_FROM    = process.env.TWILIO_WHATSAPP_FROM ?? '' // ej. +14155238886
const TWILIO_MSG_SVC = process.env.TWILIO_MESSAGING_SERVICE_SID ?? ''
// Base pública de la app (para construir la URL del proxy de imágenes, ver abajo).
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://restauros.app').replace(/\/+$/, '')

/**
 * WhatsApp (Meta Cloud API y Twilio) solo acepta JPEG/PNG para mensajes de
 * imagen — WebP no está soportado fuera de stickers (512×512, <100KB). Las
 * fotos de producto se suben como .webp (más liviano para la Carta QR), así
 * que antes de mandarlas por WhatsApp se reescriben a través de
 * `/api/whatsapp/image`, que las convierte a JPEG al vuelo. Si la imagen ya
 * es jpg/png, se manda tal cual (sin proxy de por medio).
 */
function toWhatsAppSafeImageUrl(url: string): string {
  if (!/\.webp(\?|$)/i.test(url)) return url
  return `${APP_URL}/api/whatsapp/image?u=${encodeURIComponent(url)}`
}

// Límite de tiempo para las llamadas salientes a Meta/Twilio/Wati — si el
// proveedor tarda o se cuelga, más vale fallar rápido (y quedar logueado)
// que dejar la respuesta al cliente esperando indefinidamente.
const SEND_TIMEOUT_MS = 8_000

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) }
}

// ─── Meta Cloud API ──────────────────────────────────────────────────────────

async function metaPost(body: unknown): Promise<void> {
  if (!META_PHONE_ID || !META_TOKEN) {
    console.warn('[WA] WA_PHONE_NUMBER_ID o WA_ACCESS_TOKEN no configurados.')
    return
  }
  const { signal, cancel } = withTimeout(SEND_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VER}/${META_PHONE_ID}/messages`,
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${META_TOKEN}`,
        },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const txt = await res.text()
      console.error(`[WA Meta] error ${res.status}:`, txt)
    }
  } catch (err) {
    console.error('[WA Meta] fetch falló o se agotó el tiempo:', err)
  } finally {
    cancel()
  }
}

/**
 * Indicador nativo de "escribiendo…" — Meta lo muestra marcando el mensaje
 * entrante como leído junto con `typing_indicator`. Se apaga solo a los 25s
 * o en cuanto se manda la respuesta (lo que ocurra primero); no hace falta
 * "apagarlo" manualmente. Requiere el `message_id` (wamid) del mensaje
 * entrante — por eso solo se puede llamar desde el webhook, nunca después.
 */
async function metaSendTyping(messageId: string): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
    typing_indicator: { type: 'text' },
  })
}

async function metaSendText(phone: string, message: string): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message, preview_url: false },
  })
}

async function metaSendImage(phone: string, imageUrl: string, caption?: string): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'image',
    image: { link: imageUrl, caption: caption?.slice(0, 1024) },
  })
}

/**
 * Tarjeta de producto con botón nativo de WhatsApp: foto + texto + un botón
 * de respuesta rápida (ej. "➕ Agregar") pegado directamente debajo de la
 * imagen. Soportado por Meta Cloud API (mensaje interactivo tipo "button"
 * con header de imagen) — es el equivalente real más cercano a las tarjetas
 * de WhatsApp Business con botones.
 */
async function metaSendImageButton(
  phone: string, imageUrl: string, body: string, buttonId: string, buttonTitle: string,
): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'image', image: { link: imageUrl } },
      body: { text: body },
      action: {
        buttons: [{ type: 'reply', reply: { id: buttonId, title: buttonTitle.slice(0, 20) } }],
      },
    },
  })
}

async function metaSendButtons(
  phone: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  })
}

async function metaSendList(
  phone: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
): Promise<void> {
  await metaPost({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      footer: { text: 'FoodIX · pedidos por WhatsApp' },
      action: {
        button: buttonLabel,
        sections: sections.map(s => ({
          title: s.title,
          rows: s.rows.slice(0, 10).map(r => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72) ?? '',
          })),
        })),
      },
    },
  })
}

// ─── Wati ────────────────────────────────────────────────────────────────────

async function watiPost(path: string, body: unknown): Promise<void> {
  if (!WATI_ENDPOINT || !WATI_TOKEN) {
    console.warn('[WA Wati] WATI_API_ENDPOINT o WATI_API_TOKEN no configurados.')
    return
  }
  const { signal, cancel } = withTimeout(SEND_TIMEOUT_MS)
  try {
    const res = await fetch(`${WATI_ENDPOINT}${path}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WATI_TOKEN}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error(`[WA Wati] ${path} error ${res.status}:`, txt)
    }
  } catch (err) {
    console.error(`[WA Wati] ${path} fetch falló o se agotó el tiempo:`, err)
  } finally {
    cancel()
  }
}

// ─── Twilio (FoodIX Pro) ──────────────────────────────────────────────────

/** Asegura el prefijo `whatsapp:` y un único `+` en el número E.164. */
function twilioAddr(num: string): string {
  const clean = num.replace(/^whatsapp:/, '').trim()
  return `whatsapp:${clean.startsWith('+') ? clean : '+' + clean.replace(/[^\d]/g, '')}`
}

async function twilioSend(to: string, body: string, mediaUrl?: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || (!TWILIO_FROM && !TWILIO_MSG_SVC)) {
    console.warn('[WA Twilio] Credenciales incompletas (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM).')
    return
  }
  const params = new URLSearchParams()
  params.set('To', twilioAddr(to))
  if (TWILIO_MSG_SVC) params.set('MessagingServiceSid', TWILIO_MSG_SVC)
  else params.set('From', twilioAddr(TWILIO_FROM))
  if (body) params.set('Body', body)
  if (mediaUrl) params.append('MediaUrl', mediaUrl)

  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')
  const { signal, cancel } = withTimeout(SEND_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    if (!res.ok) {
      const txt = await res.text()
      console.error(`[WA Twilio] error ${res.status}:`, txt)
    }
  } catch (err) {
    console.error('[WA Twilio] fetch falló o se agotó el tiempo:', err)
  } finally {
    cancel()
  }
}

/**
 * Indicador nativo de "escribiendo…" (Twilio Typing Indicators, API v3 —
 * marca el mensaje entrante como leído y muestra el estado en el teléfono
 * del cliente). Requiere el `MessageSid` (o `MediaSid`) del mensaje entrante
 * de Twilio — NO el `wamid` de Meta, son SIDs distintos por proveedor.
 * Se apaga solo a los 25s o al mandar la respuesta.
 */
async function twilioSendTyping(messageSid: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN) return
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')
  // Timeout corto: es una mejora de UX, no vale la pena esperar mucho por ella.
  const { signal, cancel } = withTimeout(4_000)
  try {
    const res = await fetch('https://messaging.twilio.com/v3/Indicators/Typing.json', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: 'whatsapp', messageId: messageSid }),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error(`[WA Twilio] error typing indicator ${res.status}:`, txt)
    }
  } catch (err) {
    console.error('[WA Twilio] typing indicator falló o se agotó el tiempo:', err)
  } finally {
    cancel()
  }
}

const CARD_RULE = '━━━━━━━━━━━━━━━━━━'

/** Render de botones como texto numerado (Twilio en ventana de sesión = texto libre). */
function twilioButtonsText(body: string, buttons: { id: string; title: string }[]): string {
  const opts = buttons.map((b, i) => `*${i + 1})* ${b.title}`).join('\n')
  return `${body}\n\n${opts}\n\n_Responde con el número o el texto de la opción._`
}

/**
 * Render de lista como "card" de texto premium (Twilio no soporta listas
 * interactivas fuera de plantillas aprobadas): separadores + secciones +
 * numeración secuencial, para que se sienta cercano a WhatsApp Business
 * aunque sea texto plano.
 */
function twilioListText(
  headerText: string,
  bodyText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
): string {
  const blocks = sections.map(s => {
    const rows = s.rows
      .map(r => `${r.id}. ${r.title}${r.description ? ` — ${r.description}` : ''}`)
      .join('\n')
    return `*${s.title}*\n${rows}`
  })
  return (
    `${CARD_RULE}\n🍽️ *FoodIX*\n${CARD_RULE}\n\n` +
    `*${headerText}*\n${bodyText}\n\n${blocks.join('\n\n')}\n\n${CARD_RULE}\n` +
    '_Responde con el número del platillo que quieres agregar._'
  )
}

// ─── API pública (agnóstica del proveedor) ───────────────────────────────────

/**
 * Muestra el "escribiendo…" nativo de WhatsApp mientras el bot procesa la
 * respuesta (fetch del menú, fallback IA, etc.) — mejor UX que dejar el chat
 * en silencio unos segundos. `messageId` es el ID del mensaje ENTRANTE que
 * se está respondiendo (wamid de Meta o MessageSid de Twilio, según el
 * proveedor activo); sin él no hay nada que marcar y no se manda nada.
 *
 * Wati no tiene una API pública documentada de typing indicator — no-op ahí
 * (proveedor secundario, no usado en el demo).
 */
export async function sendTypingIndicator(messageId?: string): Promise<void> {
  if (!messageId) return
  try {
    if (PROVIDER === 'twilio') await twilioSendTyping(messageId)
    else if (PROVIDER === 'meta') await metaSendTyping(messageId)
  } catch (err) {
    console.error('[WA] error al mandar typing indicator:', err)
  }
}

export async function sendText(phone: string, message: string): Promise<void> {
  if (PROVIDER === 'twilio') {
    await twilioSend(phone, message)
  } else if (PROVIDER === 'wati') {
    await watiPost(`/api/v1/sendSessionMessage/${phone}`, { messageText: message })
  } else {
    await metaSendText(phone, message)
  }
}

/** Envía una foto de producto con leyenda (nombre, descripción, precio). */
export async function sendImage(phone: string, imageUrl: string, caption?: string): Promise<void> {
  const safeUrl = toWhatsAppSafeImageUrl(imageUrl)
  if (PROVIDER === 'twilio') {
    await twilioSend(phone, caption ?? '', safeUrl)
  } else if (PROVIDER === 'wati') {
    // Best-effort: endpoint no verificado contra documentación en vivo de Wati
    // (proveedor secundario, no usado en el demo). Sigue el mismo patrón que
    // el resto de llamadas de sesión de Wati en este archivo.
    await watiPost(`/api/v1/sendSessionFile/${phone}`, { caption, url: safeUrl })
  } else {
    await metaSendImage(phone, safeUrl, caption)
  }
}

/**
 * Tarjeta de producto con llamada a la acción para agregarlo al pedido.
 *
 * - Meta Cloud API: botón nativo "➕ Agregar" pegado a la foto (mensaje
 *   interactivo). Al tocarlo, WhatsApp devuelve `replyId` como si el cliente
 *   lo hubiera escrito — por eso `replyId` es el mismo número secuencial que
 *   ya entiende `stepMenu` (sin tabla de mapeo extra).
 * - Twilio/Wati: sin botones nativos en mensajes de sesión libre → la
 *   llamada a la acción va como texto ("Responde *N* para agregarlo") en el
 *   propio caption de la foto.
 */
export async function sendProductCard(
  phone: string, imageUrl: string, body: string, replyId: string, addLabel = '➕ Agregar',
): Promise<void> {
  const safeUrl = toWhatsAppSafeImageUrl(imageUrl)
  if (PROVIDER === 'meta') {
    await metaSendImageButton(phone, safeUrl, body, replyId, addLabel)
  } else if (PROVIDER === 'wati') {
    await watiPost(`/api/v1/sendSessionFile/${phone}`, {
      caption: `${body}\n\n👉 Responde *${replyId}* para agregarlo a tu pedido`,
      url: safeUrl,
    })
  } else {
    await twilioSend(phone, `${body}\n\n👉 Responde *${replyId}* para agregarlo a tu pedido`, safeUrl)
  }
}

export async function sendButtons(
  phone: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<void> {
  if (PROVIDER === 'twilio') {
    await twilioSend(phone, twilioButtonsText(body, buttons))
  } else if (PROVIDER === 'wati') {
    await watiPost(`/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${phone}`, {
      body,
      buttons: buttons.map(b => ({ text: b.title })),
    })
  } else {
    await metaSendButtons(phone, body, buttons)
  }
}

export async function sendList(
  phone: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
): Promise<void> {
  if (PROVIDER === 'twilio') {
    await twilioSend(phone, twilioListText(headerText, bodyText, sections))
  } else if (PROVIDER === 'wati') {
    await watiPost(`/api/v1/sendInteractiveListMessage?whatsappNumber=${phone}`, {
      header: headerText,
      body: bodyText,
      footer: 'FoodIX · pedidos por WhatsApp',
      buttonText: buttonLabel,
      sections,
    })
  } else {
    await metaSendList(phone, headerText, bodyText, buttonLabel, sections)
  }
}
