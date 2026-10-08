/**
 * Máquina de estados de la conversación WhatsApp → Pedido.
 *
 * Flujo:
 *   idle → menu (multi-ítem o un solo ítem → qty → notes) → cart
 *        → [delivery_address solo si la sucursal es "delivery"] → done
 *
 * El tipo de entrega YA NO se pregunta: se toma del default configurado por
 * la sucursal en Ajustes (`branches.wa_default_order_type`). El nombre del
 * cliente tampoco se pregunta: se usa un alias automático derivado del
 * teléfono. Ver `finishOrder()` más abajo.
 *
 * Comandos globales (funcionan desde cualquier paso):
 *   cancelar/cancel/salir  → reinicia la sesión
 *   ver pedido/mi pedido/carrito/resumen → muestra el carrito actual
 *   asesor/humano/ayuda/hablar con alguien → pausa el bot (soporte humano)
 *   menú/hola/volver al bot → reinicia al menú (también saca de soporte humano)
 *
 * Cuando el estado llega a "done" se crea el pedido en el backend y
 * el pedido aparece automáticamente en el KDS / cocina de la sucursal.
 */

import { sendText, sendList, sendButtons, sendProductCard, sendTypingIndicator } from './wati'
import {
  getSession, saveSession, clearSession, logMessage, notifyBranchActive, isSessionPaused,
  type WhatsAppSession, type CartItem,
} from './whatsappSession'
import { interpretMenuMessage, interpretMultiItemMessage } from './whatsappAI'
import { parseMultiItemMessage, looksLikeMultiItem, type ParsableProduct } from './whatsappParser'

const BACKEND = process.env.BACKEND_BASE_URL
  ?? 'https://tallercheck.mx/restauros/api/index.php'
const SERVICE_TOKEN = process.env.BACKEND_SERVICE_TOKEN ?? ''

// ─── Helpers de backend ──────────────────────────────────────────────────────

interface BackendProduct extends ParsableProduct {
  price: number
  category?: string
  description?: string
  image?: string
  available?: boolean
  /** Nuevo|Popular|Recomendado|Especialidad|Promo — normalizado en products.php. */
  badge?: string
}

function isRecommended(p: BackendProduct): boolean {
  return p.badge === 'Recomendado' || p.badge === 'Popular'
}

/** Máximo de fotos de producto que se envían por mensaje "menú" (cuida costo/spam). */
const MAX_MENU_IMAGES = 6

/**
 * Trae el mismo menú que ve el cliente en la Carta QR pública
 * (`restauros.app/carta/{slug}` → `GET /public/menu/{slug}`), para que el bot
 * de WhatsApp muestre exactamente los mismos productos, precios y categorías.
 *
 * IMPORTANTE: el endpoint recibe el slug como segmento de ruta, NO como query
 * string (`/public/menu/{slug}`, no `/public/menu?branch_slug=...`) — así lo
 * resuelve `handlePublicMenu()` en `php-backend/routes/public.php`.
 */
interface MenuFetchResult {
  branchName: string | null
  products: BackendProduct[]
  /** IDs de producto más vendidos (últimos 30 días), ya ordenados desc. */
  topSellerIds: number[]
  /** Tipo de entrega por defecto de la sucursal — reemplaza la pregunta "¿mesa/llevar/domicilio?". */
  defaultOrderType: 'pickup' | 'delivery'
}

const EMPTY_MENU: MenuFetchResult = { branchName: null, products: [], topSellerIds: [], defaultOrderType: 'pickup' }

// Caché de proceso (instancia serverless "caliente"): evita ir al backend PHP
// en cada mensaje del mismo chat — la sesión no persiste el catálogo entre
// invocaciones, así que sin esto se re-pedía el menú completo en casi cada
// paso de la conversación, sumando latencia visible para el cliente.
const MENU_CACHE_TTL_MS = 60_000
const menuCache = new Map<string, { data: MenuFetchResult; expiresAt: number }>()

async function fetchMenu(branchSlug: string): Promise<MenuFetchResult> {
  const cached = menuCache.get(branchSlug)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  try {
    const res = await fetch(`${BACKEND}/public/menu/${encodeURIComponent(branchSlug)}`, {
      headers: { 'Cache-Control': 'no-cache' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return EMPTY_MENU
    const data = await res.json()

    // Forma real de la respuesta: { branch, categories: [{id,name,...}], products: [{category_id,...}], top_seller_ids }.
    // Se resuelve category_id → nombre para agrupar el menú de WhatsApp igual que la Carta QR.
    const categories = Array.isArray(data.categories) ? data.categories : []
    const catNameById = new Map<number, string>(
      categories.map((c: { id: number; name: string }) => [c.id, c.name]),
    )

    const rawProducts: Record<string, unknown>[] =
      Array.isArray(data) ? data : (data.products ?? data.items ?? [])

    const products = rawProducts.map(p => ({
      id: Number(p.id),
      name: String(p.name),
      price: Number(p.price),
      description: p.description ? String(p.description) : undefined,
      image: (p.image as string | null | undefined) || undefined,
      category: p.category_id != null ? catNameById.get(Number(p.category_id)) : (p.category as string | undefined),
      available: p.available as boolean | undefined,
      badge: (p.badge as string | null | undefined) || undefined,
    }))

    const branchName = (data.branch?.name as string | undefined) || null
    const defaultOrderType: 'pickup' | 'delivery' =
      data.branch?.wa_default_order_type === 'delivery' ? 'delivery' : 'pickup'
    const topSellerIds = Array.isArray(data.top_seller_ids) ? data.top_seller_ids.map(Number) : []

    const result: MenuFetchResult = { branchName, products, topSellerIds, defaultOrderType }
    menuCache.set(branchSlug, { data: result, expiresAt: Date.now() + MENU_CACHE_TTL_MS })
    return result
  } catch (err) {
    console.error('[WA-Flow] error al obtener el menú:', err)
    return EMPTY_MENU
  }
}

interface MenuRow { id: string; title: string; description?: string }
interface MenuSection { title: string; rows: MenuRow[] }
interface RankedProduct { product: BackendProduct; tier: string }

const PAGE_SIZE = 10

/**
 * Arma UNA lista plana y deduplicada, en orden de prioridad:
 * Recomendados (badge 'Recomendado'/'Popular') → Más vendidos (últimos 30
 * días, sin repetir lo ya listado) → el resto agrupado por categoría.
 *
 * La numeración que ve el cliente es GLOBAL sobre esta lista completa (no por
 * página) — así un número de una página anterior sigue siendo válido después
 * de "ver más".
 */
function buildRankedMenuFeed(products: BackendProduct[], topSellerIds: number[]): RankedProduct[] {
  const seen = new Set<number>()
  const feed: RankedProduct[] = []

  for (const p of products.filter(isRecommended)) {
    feed.push({ product: p, tier: '⭐ Recomendados' })
    seen.add(p.id)
  }

  for (const id of topSellerIds) {
    if (seen.has(id)) continue
    const p = products.find(x => x.id === id)
    if (!p) continue
    feed.push({ product: p, tier: '🔥 Más vendidos' })
    seen.add(p.id)
  }

  const byCategory: Record<string, BackendProduct[]> = {}
  for (const p of products) {
    if (seen.has(p.id)) continue
    const cat = p.category ?? 'Menú'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }
  for (const [cat, items] of Object.entries(byCategory)) {
    for (const p of items) feed.push({ product: p, tier: cat })
  }

  return feed
}

/** Recorta el feed completo a la página pedida y arma secciones de WhatsApp con numeración GLOBAL. */
function buildPageSections(feed: RankedProduct[], page: number): { sections: MenuSection[]; hasMore: boolean; start: number; end: number } {
  const start = page * PAGE_SIZE
  const pageItems = feed.slice(start, start + PAGE_SIZE)

  const sections: MenuSection[] = []
  let currentTier: string | null = null
  let currentRows: MenuRow[] = []

  pageItems.forEach((item, i) => {
    const globalNum = start + i + 1
    if (item.tier !== currentTier) {
      if (currentTier !== null) sections.push({ title: currentTier, rows: currentRows })
      currentTier = item.tier
      currentRows = []
    }
    currentRows.push({
      id: String(globalNum),
      title: item.product.name.slice(0, 24),
      description: item.product.description
        ? `$${Number(item.product.price).toFixed(0)} · ${item.product.description.slice(0, 48)}`
        : `$${Number(item.product.price).toFixed(0)} MXN`,
    })
  })
  if (currentTier !== null) sections.push({ title: currentTier, rows: currentRows })

  return { sections, hasMore: start + PAGE_SIZE < feed.length, start, end: Math.min(start + PAGE_SIZE, feed.length) }
}

/**
 * Envía las fotos de producto como tarjetas premium: foto + nombre +
 * descripción + precio + llamada a la acción para agregarlo (botón nativo en
 * Meta, texto "Responde *N*" en Twilio/Wati — ver `sendProductCard`).
 *
 * Recibe `numbered` (la MISMA lista ya numerada que arma el feed priorizado,
 * recomendados/más vendidos primero) para que el número que aparece en cada
 * foto sea idéntico al que el cliente puede escribir después en la lista.
 */
async function sendMenuImages(phone: string, numbered: BackendProduct[]): Promise<void> {
  const picks = numbered
    .map((p, i) => ({ product: p, n: i + 1 }))
    .filter(x => x.product.image)
    .slice(0, MAX_MENU_IMAGES)

  // En paralelo: cada foto es una llamada HTTP independiente al proveedor
  // (Meta/Twilio despacha en el orden en que llegan las peticiones, casi
  // simultáneas), así que esperar una por una solo sumaba latencia sin
  // beneficio real de orden.
  await Promise.all(picks.map(({ product: p, n }) => {
    const body =
      `*${n}. ${p.name}*\n` +
      (p.description ? `${p.description}\n\n` : '\n') +
      `💰 *$${Number(p.price).toFixed(0)} MXN*`
    return sendProductCard(phone, p.image!, body, String(n))
  }))
}

/**
 * Sugiere una bebida para subir el ticket promedio: la primera disponible de
 * categoría "bebida" que el cliente aún no tenga en el carrito. Devuelve
 * `undefined` si la sucursal no tiene categoría de bebidas o ya las tiene todas
 * en el carrito — nunca interrumpe el flujo por esto.
 */
function findUpsellCandidate(products: BackendProduct[], cart: CartItem[]): BackendProduct | undefined {
  const inCart = new Set(cart.map(i => i.product_id))
  return products.find(p =>
    p.available !== false &&
    !inCart.has(p.id) &&
    normalize(p.category ?? '').includes('bebida'))
}

/** Continúa el checkout tras resolver (o saltar) el upsell de bebida. */
async function proceedToDeliveryOrFinish(session: WhatsAppSession, phone: string): Promise<void> {
  if (session.orderType === 'delivery') {
    session.step = 'delivery_address'
    await sendText(phone,
      '¿A qué dirección enviamos tu pedido? 📍\n\n_(calle, número, colonia o alguna referencia)_')
    return
  }
  await finishOrder(session, phone)
}

async function stepUpsell(session: WhatsAppSession, phone: string, text: string) {
  const suggested = session.pendingProduct
  session.pendingProduct = undefined

  if (suggested && (text.includes('si') || text.includes('yes') || text === '1')) {
    const existing = session.cart.find(i => i.product_id === suggested.id && i.notes === undefined)
    if (existing) existing.quantity = Math.min(20, existing.quantity + 1)
    else session.cart.push({ product_id: suggested.id, name: suggested.name, price: suggested.price, quantity: 1 })
    await sendText(phone, `✅ Agregué *${suggested.name}* a tu pedido.`)
  }

  await proceedToDeliveryOrFinish(session, phone)
}

function addToCart(session: WhatsAppSession, product: BackendProduct, quantity: number): void {
  const item: CartItem = {
    product_id: product.id,
    name: product.name,
    price: Number(product.price),
    quantity,
  }
  const existing = session.cart.find(i => i.product_id === item.product_id && i.notes === undefined)
  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + item.quantity)
  } else {
    session.cart.push(item)
  }
}

/**
 * ¿La cocina de esta sucursal tiene muchos pedidos activos ahora mismo? Se
 * consulta justo al confirmar (no antes) para reflejar el estado más
 * reciente. Nunca bloquea el pedido — si falla o no hay servicio configurado,
 * simplemente no se muestra el aviso de demora.
 */
async function checkKitchenLoad(branchSlug: string): Promise<boolean> {
  if (!SERVICE_TOKEN) return false
  try {
    const res = await fetch(
      `${BACKEND}/whatsapp/kitchen-load?branch_slug=${encodeURIComponent(branchSlug)}`,
      { headers: { 'X-Service-Token': SERVICE_TOKEN }, cache: 'no-store' },
    )
    if (!res.ok) return false
    const data = await res.json()
    return data.busy === true
  } catch {
    return false
  }
}

async function createBackendOrder(session: WhatsAppSession): Promise<number | null> {
  if (!SERVICE_TOKEN) {
    console.warn('[WA-Flow] BACKEND_SERVICE_TOKEN no configurado — pedido NO creado en backend.')
    return null
  }
  try {
    const body = {
      order_type: session.orderType ?? 'takeaway',
      customer_name: session.customerName ?? 'Cliente WhatsApp',
      customer_phone: session.phone,
      table_number: session.tableNumber ?? null,
      delivery_address: session.deliveryAddress ?? null,
      branch_slug: session.branchSlug,
      items: session.cart.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.price,
        name: i.name,
        item_notes: i.notes ?? null,
      })),
    }
    const res = await fetch(`${BACKEND}/whatsapp/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': SERVICE_TOKEN,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[WA-Flow] backend rechazó el pedido:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return data.id ?? data.order_id ?? null
  } catch (err) {
    console.error('[WA-Flow] error al crear pedido:', err)
    return null
  }
}

// ─── Formateo de respuestas ──────────────────────────────────────────────────

/** Encabezado de tarjeta "premium" — usado cuando Twilio degrada listas/botones a texto plano. */
function cardHeader(title = 'FoodIX'): string {
  return `━━━━━━━━━━━━━━━━━━\n🍽️ *${title}*\n━━━━━━━━━━━━━━━━━━`
}

function formatCart(cart: CartItem[]): string {
  if (cart.length === 0) return '_(vacío)_'
  const lines = cart.map((i, idx) => {
    const notes = i.notes ? `\n   _${i.notes}_` : ''
    return `${idx + 1}. ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(0)}${notes}`
  })
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  return lines.join('\n') + `\n\n*Total: $${total.toFixed(0)} MXN*`
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function sendCartSummary(session: WhatsAppSession, phone: string): Promise<void> {
  if (session.cart.length === 0) {
    await sendText(phone, '🛒 Tu pedido está vacío por ahora.\n\nEscribe *menú* para ver los platillos disponibles.')
    return
  }
  session.step = 'cart'
  await sendButtons(phone,
    `🛒 *Tu pedido actual:*\n\n${formatCart(session.cart)}\n\n¿Qué deseas hacer?`,
    [
      { id: 'more', title: '➕ Agregar más' },
      { id: 'confirm', title: '✅ Confirmar pedido' },
      { id: 'cancel', title: '❌ Cancelar' },
    ],
  )
}

// ─── Comandos globales (funcionan sin importar el paso actual) ──────────────

const GREETING_WORDS = new Set([
  'hola', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
  'menu', 'quiero ordenar', 'pedido', 'iniciar', 'volver al bot',
])
const CART_VIEW_WORDS = new Set(['ver pedido', 'mi pedido', 'carrito', 'resumen'])
const HUMAN_SUPPORT_WORDS = new Set(['asesor', 'humano', 'restaurante', 'ayuda', 'hablar con alguien'])

// ─── Recuperación de sesión pausada (vuelve después del TTL de inactividad) ──
// `text` ya llega normalizado (sin acentos, minúsculas — ver `normalize()`).
// Igual que en stepCart, se acepta tanto la palabra clave como la posición
// numérica del botón (Twilio degrada botones a texto numerado).

function isResumeContinue(text: string): boolean {
  return text.includes('continuar') || text.includes('seguir') || text === 'si' || text === 'ok' || text === '1'
}
function isResumeCancel(text: string): boolean {
  return text.includes('cancelar') || text === 'cancel' || text === 'no' || text === 'salir' || text === '2'
}
function isResumeMenu(text: string): boolean {
  return text.includes('menu') || text === '3'
}

// El carrito puede estar vacío y aun así haber algo que recuperar: el
// cliente pudo haberse quedado a mitad de elegir cantidad/notas del primer
// producto (session.pendingProduct) antes de que existiera un carrito.
function resumeOrderSummary(session: WhatsAppSession): string {
  if (session.cart.length > 0) return formatCart(session.cart)
  if (session.pendingProduct) {
    const { name, quantity } = session.pendingProduct
    return quantity ? `${quantity}x ${name}` : `${name} _(eligiendo cantidad)_`
  }
  return '_(vacío)_'
}

function resumePromptText(session: WhatsAppSession): string {
  return (
    '👋 *Bienvenido de nuevo.*\n\n' +
    'Veo que dejaste un pedido en progreso:\n\n' +
    `🧾 *Pedido actual:*\n${resumeOrderSummary(session)}\n\n` +
    '¿Deseas continuar con tu pedido o cancelarlo?'
  )
}

async function sendResumePrompt(session: WhatsAppSession, phone: string): Promise<void> {
  await sendButtons(phone, resumePromptText(session), [
    { id: 'resume_continue', title: '➡️ Continuar pedido' },
    { id: 'resume_cancel', title: '❌ Cancelar pedido' },
    { id: 'resume_menu', title: '📋 Ver menú' },
  ])
}

// ─── Punto de entrada principal ──────────────────────────────────────────────

export async function handleIncomingMessage(
  phone: string,
  rawText: string,
  branchSlug: string,
  toNumber?: string,
  provider?: string,
  messageId?: string,
  profileName?: string,
): Promise<void> {
  const text = normalize(rawText)

  // "Escribiendo…" nativo lo antes posible — antes incluso de cargar la
  // sesión, para que el cliente vea feedback inmediato mientras el bot
  // arma la respuesta (fetch del menú, fallback IA, envío de fotos...).
  sendTypingIndicator(messageId).catch(() => {})

  const session = await getSession(phone, branchSlug)

  // Historial best-effort del mensaje entrante. Cuando el proveedor manda un
  // id de mensaje confiable (Twilio MessageSid), este mismo log sirve como
  // guard de idempotencia: si el webhook se reintenta (red lenta, timeout),
  // el backend detecta el id repetido y NO se vuelve a procesar el mensaje
  // — evita duplicar pedidos por un reintento.
  if (messageId) {
    const { duplicate } = await logMessage(phone, branchSlug, 'in', rawText, messageId)
    if (duplicate) return
  } else {
    logMessage(phone, branchSlug, 'in', rawText).catch(() => {})
  }

  // Autodetección: este es un mensaje real de WhatsApp llegando al webhook →
  // prueba que el canal está vivo. Marca la sucursal "conectado" sin que el
  // admin tenga que hacer clic manual (idempotente en el backend).
  notifyBranchActive(branchSlug, toNumber, provider).catch(() => {})

  // Comandos globales de escape
  if (text === 'cancelar' || text === 'cancel' || text === 'salir') {
    await clearSession(phone, branchSlug)
    await sendText(phone,
      '❌ Tu pedido fue cancelado. Escríbenos cuando quieras volver a ordenar. 🍽️')
    return
  }

  // Ya le mostramos el prompt de recuperación (sesión pausada) y este mensaje
  // es su respuesta a "continuar / cancelar / ver menú".
  if (session.awaitingResume) {
    if (isResumeContinue(text)) {
      session.awaitingResume = false
      // Si se pausó a mitad de elegir cantidad/notas del producto en curso,
      // se retoma esa misma pregunta — no tiene carrito todavía que resumir.
      if (session.step === 'qty' && session.pendingProduct) {
        await sendText(phone,
          `*${session.pendingProduct.name}*\n\n` +
          '¿Cuántas unidades deseas? (1–20, o escribe *menú* para ver otros platillos)')
      } else if (session.step === 'notes' && session.pendingProduct) {
        await sendText(phone,
          '¿Alguna instrucción especial para este platillo? _(ej. "sin cebolla", "para llevar")_\n\n' +
          'Escríbela, o responde *no* si no necesitas nada en especial.')
      } else {
        await sendCartSummary(session, phone)
      }
      await saveSession(session)
      return
    }
    if (isResumeCancel(text)) {
      await clearSession(phone, branchSlug)
      await sendText(phone,
        '❌ Tu pedido fue cancelado. Escríbenos cuando quieras volver a ordenar. 🍽️')
      return
    }
    if (isResumeMenu(text)) {
      session.awaitingResume = false
      // showMenuList (no stepIdle) — el pedido ya armado no debe vaciarse
      // solo porque el cliente quiere ver el menú para agregar algo más.
      const { products, topSellerIds } = await fetchMenu(branchSlug)
      await showMenuList(session, phone, products, topSellerIds)
      await saveSession(session)
      return
    }
    await sendResumePrompt(session, phone)
    await saveSession(session)
    return
  }

  // El cliente vuelve después del TTL de inactividad con un pedido a medias —
  // no se pierde nada: se le pregunta si quiere continuar antes de tratar
  // este mensaje como input normal del flujo.
  if (isSessionPaused(session)) {
    session.awaitingResume = true
    await sendResumePrompt(session, phone)
    await saveSession(session)
    return
  }

  const isGreeting = GREETING_WORDS.has(text)
  if (isGreeting) session.step = 'idle'

  // Soporte humano: el bot no interrumpe salvo que el cliente pida volver
  // (cualquier palabra de saludo/menú lo regresa al flujo normal).
  if (!isGreeting && session.step === 'human_support') {
    await saveSession(session)
    return
  }

  if (HUMAN_SUPPORT_WORDS.has(text)) {
    session.step = 'human_support'
    await sendText(phone,
      '🧑‍💼 *Te conectamos con el restaurante.*\n\n' +
      'Un encargado revisará tu mensaje lo antes posible.\n\n' +
      'Escribe *menú* cuando quieras volver a hablar con el bot.')
    await saveSession(session)
    return
  }

  if (!isGreeting && CART_VIEW_WORDS.has(text) && session.step !== 'done') {
    await sendCartSummary(session, phone)
    await saveSession(session)
    return
  }

  switch (session.step) {
    case 'idle':
      await stepIdle(session, phone, branchSlug, profileName)
      break
    case 'menu':
      await stepMenu(session, phone, text, branchSlug, rawText.trim())
      break
    case 'qty':
      await stepQty(session, phone, text)
      break
    case 'notes':
      await stepNotes(session, phone, rawText.trim())
      break
    case 'cart':
      await stepCart(session, phone, text, branchSlug)
      break
    case 'upsell':
      await stepUpsell(session, phone, text)
      break
    case 'delivery_address':
      await stepDeliveryAddress(session, phone, rawText.trim())
      break
    case 'done':
      await sendText(phone,
        '✅ Tu pedido ya fue enviado a cocina. Si necesitas algo más escribe *menú*.')
      break
    default:
      await stepIdle(session, phone, branchSlug)
  }

  await saveSession(session)
}

// ─── Pasos de la conversación ────────────────────────────────────────────────

async function stepIdle(session: WhatsAppSession, phone: string, branchSlug: string, profileName?: string) {
  const { branchName, products, topSellerIds } = await fetchMenu(branchSlug)

  if (products.length === 0) {
    await sendText(phone,
      '⚠️ No pude consultar el menú en este momento.\n\n' +
      'Intenta nuevamente escribiendo *menú* o contacta directamente al restaurante.')
    return
  }

  // Bienvenida personalizada: nombre real del restaurante en el encabezado y,
  // si WhatsApp nos dio el nombre de perfil del cliente, un saludo por nombre.
  const firstName = profileName?.trim().split(/\s+/)[0]?.slice(0, 30)
  const feed = buildRankedMenuFeed(products, topSellerIds)
  const numbered = feed.map(r => r.product)

  // Arranque genuino: el carrito de una sesión nueva ya viene vacío, pero se
  // reafirma aquí por claridad — este es el ÚNICO lugar donde se debe vaciar.
  session.cart = []
  session.menuPage = 0

  // Bienvenida, fotos y lista del menú NO dependen entre sí (las tres salen
  // del mismo `products` ya resuelto) — se disparan en paralelo en vez de
  // esperar cada round-trip HTTP uno tras otro. WhatsApp entrega los
  // mensajes casi en el orden en que llegan las peticiones, así que el
  // cliente los sigue viendo en orden aunque nuestro código ya no espere.
  await Promise.all([
    sendText(phone,
      `${cardHeader(branchName ?? 'FoodIX')}\n\n` +
      `Bienvenido${firstName ? `, *${firstName}*` : ''}. Soy tu asistente de pedidos por WhatsApp.\n\n` +
      'Dime qué quieres pedir — puedes mandar varios platillos y cantidades en un solo mensaje ' +
      '(ej. "2 tacos, 1 agua y 3 quesadillas"). Sin llamadas ni esperas.\n\n' +
      'Este es el menú disponible:'),
    sendMenuImages(phone, numbered),
    showMenuList(session, phone, products, topSellerIds),
  ])
}

/**
 * Vuelve a mostrar la lista numerada del menú (recortada a la página actual)
 * SIN repetir la bienvenida ni las fotos, y SIN tocar el carrito — para
 * "agregar más" desde el carrito o cualquier reentrada al menú a mitad de un
 * pedido. `stepIdle` (arriba) es el único que debe vaciar `session.cart`,
 * porque es el arranque genuino de una conversación nueva.
 */
async function showMenuList(
  session: WhatsAppSession, phone: string, products: BackendProduct[], topSellerIds: number[],
) {
  const feed = buildRankedMenuFeed(products, topSellerIds)
  const page = session.menuPage ?? 0
  const { sections, hasMore, start, end } = buildPageSections(feed, page)
  session.step = 'menu'

  const rangeLabel = feed.length > PAGE_SIZE ? ` (${start + 1}–${end} de ${feed.length})` : ''

  await sendList(
    phone,
    'Elige tu platillo',
    `Responde con el número del platillo que quieres agregar${rangeLabel}, o manda varios a la vez ` +
    '(ej. "2 tacos y 1 agua").\n\n' +
    (hasMore ? 'Escribe *ver más* para ver más platillos.\n\n' : '') +
    'Escribe *cancelar* en cualquier momento para salir.',
    'Ver menú',
    sections,
  )
}

async function stepMenu(
  session: WhatsAppSession, phone: string, text: string, branchSlug: string, rawText: string,
) {
  const { branchName, products, topSellerIds } = await fetchMenu(branchSlug)
  const feed = buildRankedMenuFeed(products, topSellerIds)
  const numbered = feed.map(r => r.product)

  // Paginación: "ver más" avanza a la siguiente página de 10 sin tocar el carrito.
  if (text === 'ver mas' || text === 'ver más') {
    session.menuPage = (session.menuPage ?? 0) + 1
    await showMenuList(session, phone, products, topSellerIds)
    return
  }

  // Intento multi-ítem: varios platillos y cantidades en un solo mensaje
  // (ej. "2 tacos, 1 bebida y 3 quesadillas"). Gateado por un heurístico
  // barato (coma/"y"/2+ números) para que un simple "3" nunca pague este costo.
  if (looksLikeMultiItem(rawText)) {
    const { matched, unmatched } = parseMultiItemMessage(rawText, numbered)

    if (matched.length > 0) {
      for (const { product, quantity } of matched) addToCart(session, product, quantity)
      if (unmatched.length > 0) {
        await sendText(phone, `Agregué lo que reconocí. No entendí: "${unmatched.join('", "')}". ¿Quieres agregar algo más?`)
      }
      await sendCartSummary(session, phone)
      return
    }

    // El parser determinista no reconoció nada — probar la IA multi-ítem
    // antes de caer al camino de un solo producto de siempre.
    const decision = await interpretMultiItemMessage({
      branchName,
      userText: rawText,
      catalog: numbered.map((p, i) => ({ n: i + 1, name: p.name, price: Number(p.price), category: p.category })),
    })

    if (decision && decision.items.length > 0) {
      let addedAny = false
      for (const { productIndex, quantity } of decision.items) {
        const product = numbered[productIndex - 1]
        if (!product || product.available === false) continue
        addToCart(session, product, quantity)
        addedAny = true
      }
      if (addedAny) {
        if (decision.reply) await sendText(phone, decision.reply)
        await sendCartSummary(session, phone)
        return
      }
    }
    if (decision?.reply) {
      await sendText(phone, decision.reply)
      return
    }
    // Nada reconocido ni por el parser ni por la IA — seguir con el camino
    // de un solo producto (número/nombre exacto) por si el heurístico se
    // disparó de más (ej. un mensaje con una sola coma decorativa).
  }

  // El proveedor envía el `id` del row seleccionado o texto plano (Twilio: número/nombre).
  // El número que ve el cliente es la posición GLOBAL (1, 2, 3…) del feed
  // priorizado, NO el id real del producto ni la página actual.
  let product: BackendProduct | undefined
  const numId = parseInt(text, 10)
  if (!isNaN(numId) && numId >= 1 && numId <= numbered.length) {
    product = numbered[numId - 1]
  }
  if (!product) {
    product = products.find(p => normalize(p.name).includes(text))
  }

  // Fallback IA: solo cuando el match exacto por número/nombre falla — así el
  // camino rápido (responder con el número de la lista) nunca paga el costo
  // de la llamada a OpenRouter, y solo se usa cuando de verdad hace falta
  // "entender" al cliente (lenguaje libre o una pregunta sobre el menú).
  if (!product) {
    const decision = await interpretMenuMessage({
      branchName,
      userText: rawText,
      catalog: numbered.map((p, i) => ({ n: i + 1, name: p.name, price: Number(p.price), category: p.category })),
    })

    if (decision?.productIndex) {
      product = numbered[decision.productIndex - 1]
    } else if (decision?.reply) {
      await sendText(phone, decision.reply)
      return
    }
  }

  if (!product) {
    await sendText(phone,
      'No reconocí esa opción. Elige un platillo de la lista o escribe *menú* para verla de nuevo.')
    return
  }

  if (product.available === false) {
    await sendText(phone,
      `*${product.name}* no está disponible en este momento. Elige otro platillo o escribe *menú*.`)
    return
  }

  session.pendingProduct = { id: product.id, name: product.name, price: Number(product.price) }
  session.step = 'qty'

  // Descripción corta aquí (la tarjeta con foto ya mostró la versión completa) —
  // este mensaje es la confirmación rápida antes de pedir cantidad.
  const shortDesc = product.description ? product.description.slice(0, 140).trim() : ''

  await sendText(phone,
    `${cardHeader()}\n\n` +
    `*${product.name}*\n` +
    (shortDesc ? `${shortDesc}${product.description!.length > 140 ? '…' : ''}\n\n` : '\n') +
    `💰 *$${Number(product.price).toFixed(0)} MXN*\n\n` +
    `¿Cuántas unidades deseas? (1–20, o escribe *menú* para ver otros platillos)`)
}

async function stepQty(session: WhatsAppSession, phone: string, text: string) {
  const qty = parseInt(text, 10)
  if (!session.pendingProduct || isNaN(qty) || qty < 1 || qty > 20) {
    await sendText(phone, 'Ingresa una cantidad válida (1–20).')
    return
  }

  session.pendingProduct.quantity = qty
  session.step = 'notes'
  await sendText(phone,
    '¿Alguna instrucción especial para este platillo? _(ej. "sin cebolla", "para llevar")_\n\n' +
    'Escríbela, o responde *no* si no necesitas nada en especial.')
}

async function stepNotes(session: WhatsAppSession, phone: string, rawText: string) {
  const pending = session.pendingProduct
  if (!pending || !pending.quantity) {
    // Recuperación de un estado inconsistente — no debe tocar el carrito ya acumulado.
    const { products, topSellerIds } = await fetchMenu(session.branchSlug)
    await showMenuList(session, phone, products, topSellerIds)
    return
  }

  const notes = normalize(rawText) === 'no' ? undefined : rawText.trim().slice(0, 200) || undefined

  const item: CartItem = {
    product_id: pending.id,
    name: pending.name,
    price: pending.price,
    quantity: pending.quantity,
    notes,
  }

  // Acumular en carrito si ya existe el mismo producto CON las mismas notas
  // (notas distintas se tratan como líneas separadas, ej. "sin cebolla" vs "extra picante").
  const existing = session.cart.find(i => i.product_id === item.product_id && i.notes === item.notes)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    session.cart.push(item)
  }

  session.pendingProduct = undefined
  session.step = 'cart'

  const cartText = formatCart(session.cart)
  await sendButtons(phone,
    `✅ Agregado al pedido:\n\n${cartText}\n\n¿Qué deseas hacer ahora?`,
    [
      { id: 'more', title: '➕ Agregar más' },
      { id: 'confirm', title: '✅ Confirmar pedido' },
      { id: 'cancel', title: '❌ Cancelar' },
    ],
  )
}

async function stepCart(
  session: WhatsAppSession, phone: string, text: string, branchSlug: string,
) {
  if (text.includes('agregar') || text.includes('mas') || text.includes('more') || text === '1') {
    // Reabre la lista del menú SIN vaciar el carrito ya acumulado (bug previo:
    // esto llamaba a stepIdle(), que siempre reinicia session.cart = []).
    // "Agregar más" arranca de vuelta en la página 1, no donde el cliente se
    // haya quedado paginando la última vez — es una intención de browse nueva.
    const { products, topSellerIds } = await fetchMenu(branchSlug)
    session.menuPage = 0
    await showMenuList(session, phone, products, topSellerIds)
    return
  }
  if (text.includes('confirmar') || text.includes('confirm') || text === '2') {
    const { defaultOrderType, products } = await fetchMenu(branchSlug)
    session.orderType = defaultOrderType === 'delivery' ? 'delivery' : 'takeaway'

    if (!session.upsellOffered) {
      const upsell = findUpsellCandidate(products, session.cart)
      if (upsell) {
        session.upsellOffered = true
        session.pendingProduct = { id: upsell.id, name: upsell.name, price: Number(upsell.price) }
        session.step = 'upsell'
        await sendButtons(phone,
          `Antes de confirmar… ¿le agregamos algo de tomar? 🥤\n\n` +
          `*${upsell.name}* — $${Number(upsell.price).toFixed(0)} MXN`,
          [
            { id: 'yes', title: `➕ Sí, agregar` },
            { id: 'no', title: 'No, gracias' },
          ],
        )
        return
      }
    }

    await proceedToDeliveryOrFinish(session, phone)
    return
  }
  if (text.startsWith('quitar') || text.startsWith('eliminar') || text.startsWith('borrar')) {
    const num = parseInt(text.replace(/\D+/g, ''), 10)
    const idx = !isNaN(num) ? num - 1 : -1
    if (idx < 0 || idx >= session.cart.length) {
      await sendText(phone, '⚠️ Indica el número del producto a quitar, ej. *quitar 1*.')
      return
    }
    const [removed] = session.cart.splice(idx, 1)
    if (session.cart.length === 0) {
      session.step = 'menu'
      await sendText(phone, `🗑️ Quité: *${removed.name}*.\n\nTu pedido quedó vacío. Escribe *menú* para ver los platillos.`)
      return
    }
    await sendButtons(phone,
      `🗑️ Quité: *${removed.name}*.\n\n🛒 Pedido actualizado:\n\n${formatCart(session.cart)}\n\n¿Qué deseas hacer?`,
      [
        { id: 'more', title: '➕ Agregar más' },
        { id: 'confirm', title: '✅ Confirmar pedido' },
        { id: 'cancel', title: '❌ Cancelar' },
      ],
    )
    return
  }
  // Texto desconocido — reenviar carrito
  const cartText = formatCart(session.cart)
  await sendText(phone,
    `Tu pedido actual:\n\n${cartText}\n\nResponde:\n` +
    '• *agregar* — agregar más platillos\n' +
    '• *quitar N* — quitar un producto (ej. quitar 1)\n' +
    '• *confirmar* — confirmar y enviar a cocina\n' +
    '• *cancelar* — cancelar todo')
}

async function stepDeliveryAddress(session: WhatsAppSession, phone: string, raw: string) {
  const address = raw.trim().slice(0, 200)
  if (address.length < 5) {
    await sendText(phone, '⚠️ Ingresa la dirección completa para tu entrega (calle, número, colonia o referencia).')
    return
  }
  session.deliveryAddress = address
  await finishOrder(session, phone)
}

/**
 * Cierra el pedido: genera el alias automático del cliente (nunca se pregunta
 * el nombre), crea la orden en el backend y envía la confirmación con el
 * número de pedido. Camino compartido por pickup (directo desde `stepCart`) y
 * delivery (desde `stepDeliveryAddress`, tras la única pregunta extra).
 */
async function finishOrder(session: WhatsAppSession, phone: string): Promise<void> {
  const last4 = session.phone.replace(/\D/g, '').slice(-4)
  session.customerName = `Cliente WhatsApp${last4 ? ` ****${last4}` : ''}`
  session.step = 'done'

  const [orderId, kitchenBusy] = await Promise.all([
    createBackendOrder(session),
    checkKitchenLoad(session.branchSlug),
  ])

  const typeLabel: Record<string, string> = {
    takeaway: 'para llevar',
    delivery: 'a domicilio',
  }
  const cartText = formatCart(session.cart)
  const deliveryLine = session.orderType === 'delivery' && session.deliveryAddress
    ? `Dirección: *${session.deliveryAddress}*\n`
    : ''
  const busyLine = kitchenBusy
    ? '\n⏳ Cocina tiene bastantes pedidos en este momento, así que podría tardar un poco más de lo usual. ¡Gracias por tu paciencia!\n'
    : ''

  if (orderId) {
    await sendText(phone,
      `${cardHeader()}\n\n` +
      `✅ *Pedido confirmado — #${orderId}*\n\n` +
      `Entrega: *${typeLabel[session.orderType ?? 'takeaway']}*\n` +
      deliveryLine +
      `\n${cartText}\n` +
      busyLine +
      '\nTu pedido ya está en cocina. Te avisamos en cuanto esté listo.\n\n' +
      'Escribe *menú* cuando quieras hacer otro pedido.',
    )
  } else {
    // El backend no está configurado aún — avisamos al cliente y logeamos
    await sendText(phone,
      `${cardHeader()}\n\n` +
      `Recibimos tu pedido.\n\n${cartText}\n\n` +
      'En breve lo confirmamos. Gracias por escribirnos.',
    )
  }

  await clearSession(phone, session.branchSlug)
}
