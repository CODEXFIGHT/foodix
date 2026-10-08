/**
 * Estado de conversación WhatsApp por (sucursal + número de teléfono).
 *
 * Persistencia durable en el backend PHP (`/whatsapp/session`) para que el
 * carrito sobreviva entre invocaciones serverless (Vercel). El `Map` local
 * actúa solo como caché de proceso para instancias "calientes".
 *
 * Si `BACKEND_SERVICE_TOKEN` no está configurado, degrada a memoria (dev).
 */

const getBackend = () => process.env.BACKEND_BASE_URL
  ?? 'https://tallercheck.mx/restauros/api/index.php'
const getServiceToken = () => process.env.BACKEND_SERVICE_TOKEN ?? ''

export type FlowStep =
  | 'idle'              // primer contacto o sesión expirada
  | 'menu'              // mostrando catálogo / esperando selección de producto(s)
  | 'qty'               // preguntando cantidad del item seleccionado (camino de un solo ítem)
  | 'notes'             // preguntando instrucciones especiales del item (opcional)
  | 'cart'              // carrito con ítems, preguntando si agrega más o confirma
  | 'upsell'            // sugiriendo una bebida antes de confirmar (sube el ticket promedio)
  | 'delivery_address'  // pidiendo dirección — SOLO si el default de la sucursal es "delivery"
  | 'done'              // pedido creado exitosamente
  | 'human_support'     // el cliente pidió hablar con el restaurante — el bot no interrumpe

export interface CartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  /** Instrucción especial en texto libre (ej. "sin cebolla") — opcional. */
  notes?: string
}

export interface WhatsAppSession {
  phone: string
  step: FlowStep
  cart: CartItem[]
  /** Producto en espera de cantidad/notas antes de pasar al carrito. */
  pendingProduct?: { id: number; name: string; price: number; quantity?: number }
  /**
   * Le mostramos el mensaje de recuperación ("dejaste un pedido en
   * progreso, ¿continuar/cancelar/ver menú?") y estamos esperando su
   * decisión — mientras esté en `true`, el siguiente mensaje del cliente
   * se interpreta como esa decisión, no como input normal del flujo.
   */
  awaitingResume?: boolean
  /**
   * `orderType`/`tableNumber`/`customerName` ya NO los llena el cliente — el
   * flujo eliminó las preguntas de "¿mesa/llevar/domicilio?" y "¿tu nombre?".
   * Se mantienen en el tipo (y en la persistencia remota) por compatibilidad
   * con sesiones en curso al momento del despliegue; el código nuevo asigna
   * `orderType` desde el default de la sucursal y `customerName` con un alias
   * automático — ver `finishOrder()` en whatsappFlow.ts.
   */
  orderType?: 'dine_in' | 'takeaway' | 'delivery'
  tableNumber?: string
  customerName?: string
  /** Dirección de entrega — solo se pide/usa cuando orderType === 'delivery'. */
  deliveryAddress?: string
  /** Cursor de paginación del menú (0-based) — "ver más" lo incrementa. */
  menuPage?: number
  /** ¿Ya se le ofreció una bebida en esta sesión? Evita repetir el upsell si vuelve a confirmar. */
  upsellOffered?: boolean
  branchSlug: string
  /** Timestamp última actividad (ms) */
  lastActivity: number
}

const SESSION_TTL_MS = (Number(process.env.WHATSAPP_SESSION_TTL_MINUTES) || 30) * 60 * 1000

// Caché de proceso (clave: `${branchSlug}:${phone}`)
const sessions = new Map<string, WhatsAppSession>()

const key = (phone: string, branchSlug: string) => `${branchSlug}:${phone}`

// ─── Backend durable ──────────────────────────────────────────────────────────

async function fetchRemoteSession(phone: string, branchSlug: string): Promise<WhatsAppSession | null> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return null
  try {
    const url = `${getBackend()}/whatsapp/session?branch_slug=${encodeURIComponent(branchSlug)}&phone=${encodeURIComponent(phone)}`
    const res = await fetch(url, {
      headers: { 'X-Service-Token': serviceToken, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const s = data.session
    if (!s) return null
    return {
      phone,
      branchSlug,
      step: (s.step ?? 'idle') as FlowStep,
      cart: Array.isArray(s.cart) ? s.cart : [],
      // Sin esto, el producto que el cliente está agregando se pierde si el
      // mensaje de "cantidad" o "notas" cae en otra invocación serverless
      // (bug real: el pedido terminaba solo con el último producto agregado).
      pendingProduct: s.pendingProduct ?? undefined,
      awaitingResume: Boolean(s.awaitingResume),
      orderType: s.orderType ?? undefined,
      tableNumber: s.tableNumber ?? undefined,
      customerName: s.customerName ?? undefined,
      menuPage: typeof s.menuPage === 'number' ? s.menuPage : 0,
      lastActivity: typeof s.lastActivity === 'number' ? s.lastActivity : Date.now(),
    }
  } catch {
    return null
  }
}

async function persistRemoteSession(session: WhatsAppSession): Promise<void> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return
  try {
    await fetch(`${getBackend()}/whatsapp/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        branch_slug: session.branchSlug,
        phone: session.phone,
        step: session.step,
        cart: session.cart,
        pendingProduct: session.pendingProduct ?? null,
        awaitingResume: session.awaitingResume ?? false,
        orderType: session.orderType ?? null,
        tableNumber: session.tableNumber ?? null,
        customerName: session.customerName ?? null,
        menuPage: session.menuPage ?? 0,
      }),
    })
  } catch (err) {
    console.error('[WA-Session] error al persistir sesión:', err)
  }
}

async function deleteRemoteSession(phone: string, branchSlug: string): Promise<void> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return
  try {
    await fetch(`${getBackend()}/whatsapp/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
      body: JSON.stringify({ branch_slug: branchSlug, phone, clear: true }),
    })
  } catch (err) {
    console.error('[WA-Session] error al borrar sesión:', err)
  }
}

// ─── API pública (async) ──────────────────────────────────────────────────────

/**
 * Carga la sesión del cliente. A diferencia de antes, **nunca descarta el
 * pedido en curso por haber pasado el TTL de inactividad** — el TTL solo se
 * usa para *detectar* que la sesión está "pausada" (ver `isSessionPaused`) y
 * disparar el mensaje de recuperación en whatsappFlow.ts. Perder el carrito
 * en silencio era exactamente el bug que esto corrige.
 */
export async function getSession(phone: string, branchSlug: string): Promise<WhatsAppSession> {
  const cached = sessions.get(key(phone, branchSlug))
  if (cached) return cached

  const remote = await fetchRemoteSession(phone, branchSlug)
  if (remote) {
    sessions.set(key(phone, branchSlug), remote)
    return remote
  }

  const fresh: WhatsAppSession = {
    phone, step: 'idle', cart: [], menuPage: 0, branchSlug, lastActivity: Date.now(),
  }
  sessions.set(key(phone, branchSlug), fresh)
  return fresh
}

/**
 * El cliente volvió después del TTL de inactividad con un pedido a medias.
 * whatsappFlow.ts usa esto para mostrar el mensaje de recuperación
 * ("dejaste un pedido en progreso...") en vez de tratar el mensaje como
 * input normal del flujo.
 */
export function isSessionPaused(session: WhatsAppSession): boolean {
  const hasPendingOrder = session.cart.length > 0 || Boolean(session.pendingProduct)
  const resumableStep = session.step !== 'idle' && session.step !== 'done' && session.step !== 'human_support'
  return hasPendingOrder && resumableStep && Date.now() - session.lastActivity > SESSION_TTL_MS
}

export async function saveSession(session: WhatsAppSession): Promise<void> {
  session.lastActivity = Date.now()
  sessions.set(key(session.phone, session.branchSlug), session)
  await persistRemoteSession(session)
}

export async function clearSession(phone: string, branchSlug: string): Promise<void> {
  sessions.delete(key(phone, branchSlug))
  await deleteRemoteSession(phone, branchSlug)
}

/**
 * Registra un mensaje en el historial. Cuando `direction` es `'in'` y se pasa
 * `messageId` (Twilio MessageSid u homólogo), el backend usa el índice único
 * (branch_id, provider_message_id) para detectar reintentos del webhook —
 * `duplicate: true` significa "este mensaje ya se procesó, no reproceses el
 * paso de la conversación".
 */
export async function logMessage(
  phone: string, branchSlug: string, direction: 'in' | 'out', body: string, messageId?: string,
): Promise<{ duplicate: boolean }> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return { duplicate: false }
  try {
    const res = await fetch(`${getBackend()}/whatsapp/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        branch_slug: branchSlug, phone, direction, body,
        provider_message_id: messageId ?? null,
      }),
    })
    if (!res.ok) return { duplicate: false }
    const data = await res.json()
    return { duplicate: Boolean(data?.duplicate) }
  } catch {
    return { duplicate: false } // historial best-effort
  }
}

/**
 * Resuelve a qué sucursal (slug) pertenece un número de WhatsApp del negocio,
 * buscando en `wa_connections` por `from_number`. Permite multi-tenant: cada
 * restaurante Pro con su propio número en producción. Devuelve null si no hay
 * mapeo (caso típico del sandbox, donde el número es compartido).
 */
export async function resolveBranchByNumber(toNumber: string): Promise<{ branchSlug: string | null; planPro: boolean }> {
  const serviceToken = getServiceToken()
  if (!serviceToken || !toNumber) return { branchSlug: null, planPro: false }
  try {
    const url = `${getBackend()}/whatsapp/resolve?to=${encodeURIComponent(toNumber)}`
    const res = await fetch(url, {
      headers: { 'X-Service-Token': serviceToken, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    })
    if (!res.ok) return { branchSlug: null, planPro: false }
    const data = await res.json()
    return {
      branchSlug: (data.branch_slug as string) || null,
      planPro: Boolean(data.plan_pro),
    }
  } catch {
    return { branchSlug: null, planPro: false }
  }
}

/**
 * Marca (idempotente, best-effort) la sucursal como WhatsApp conectado al
 * recibir un mensaje real — el panel de Admin detecta la conexión solo, sin
 * que el admin tenga que hacer clic manual en "Marcar conectado".
 */
export async function notifyBranchActive(
  branchSlug: string, fromNumber?: string, provider?: string,
): Promise<void> {
  const serviceToken = getServiceToken()
  if (!serviceToken || !branchSlug) return
  try {
    await fetch(`${getBackend()}/whatsapp/auto-connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
      body: JSON.stringify({
        branch_slug: branchSlug,
        from_number: fromNumber ?? null,
        provider: provider ?? null,
      }),
    })
  } catch { /* best-effort */ }
}

export async function checkBranchPlanPro(slug: string): Promise<boolean> {
  const serviceToken = getServiceToken()
  if (!serviceToken || !slug) return false
  try {
    const url = `${getBackend()}/whatsapp/resolve?slug=${encodeURIComponent(slug)}`
    const res = await fetch(url, {
      headers: { 'X-Service-Token': serviceToken, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.plan_pro)
  } catch {
    return false
  }
}

/** Limpia sesiones expiradas de la caché de proceso. */
export function pruneSessions(): void {
  const now = Date.now()
  for (const [k, s] of sessions.entries()) {
    if (now - s.lastActivity > SESSION_TTL_MS) sessions.delete(k)
  }
}

export interface InactiveSessionRef {
  branchSlug: string
  phone: string
}

/**
 * Sesiones con pedido a medias que llevan `minutes` sin actividad y todavía
 * no recibieron el recordatorio "¿sigues ahí?" — usado por el cron externo
 * en app/api/whatsapp/cron/inactivity/route.ts (Vercel Hobby no permite
 * crons de alta frecuencia).
 */
export async function fetchInactiveSessions(minutes: number): Promise<InactiveSessionRef[]> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return []
  try {
    const url = `${getBackend()}/whatsapp/inactive-sessions?minutes=${encodeURIComponent(String(minutes))}`
    const res = await fetch(url, {
      headers: { 'X-Service-Token': serviceToken, 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    const rows = Array.isArray(data.sessions) ? data.sessions : []
    return rows.map((r: { branch_slug: string; phone: string }) => ({ branchSlug: r.branch_slug, phone: r.phone }))
  } catch {
    return []
  }
}

/**
 * Marca que ya se le mandó el recordatorio de inactividad a esta sesión.
 * No actualiza `lastActivity` — el aviso automático no es actividad real
 * del cliente y no debe resetear su TTL.
 */
export async function markSessionNotified(branchSlug: string, phone: string): Promise<void> {
  const serviceToken = getServiceToken()
  if (!serviceToken) return
  try {
    await fetch(`${getBackend()}/whatsapp/notify-inactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
      body: JSON.stringify({ branch_slug: branchSlug, phone }),
    })
  } catch { /* best-effort */ }
}
