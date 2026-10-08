// Constructor de comandos ESC/POS — el estándar universal de impresoras térmicas
// de tickets (Epson, Bixolon, Star, 3nstar, genéricas chinas, etc.). Genera el
// stream de bytes crudo que se manda igual por USB (WebUSB) o por red (socket 9100).

import {
  PRODUCT_NAME,
  VENDOR_NAME,
  PRODUCT_URL,
} from '@/lib/constants/version'

export type PaperWidth = 58 | 80

export interface ReceiptLine {
  name: string
  qty: number
  total: number
  modifiers?: string[]      // modificadores elegidos, se listan bajo el producto
  notes?: string | null     // nota del producto (ej. "sin cebolla")
}

export interface ReceiptData {
  businessName: string
  slogan?: string
  address?: string
  phone?: string
  logo?: string           // data URL; se imprime en modo navegador (HTML)
  logoBytes?: number[]     // logo ya rasterizado a ESC/POS (GS v 0)
  orderId: number | string
  ticketNumber?: string   // folio formateado, p.ej. "000123"
  tableName?: string
  orderType?: string      // 'dine_in' | 'takeaway' | 'delivery'
  createdAt: string // texto ya formateado
  lines: ReceiptLine[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  /** Descuentos automáticos aplicados (promoción/cupón/lealtad) — se imprimen solo si hay alguno. */
  discountBreakdown?: { label: string; amount: number }[]
  currency?: string
  footer?: string
  // Branding / auditoría (Fase 3)
  branchName?: string
  deviceName?: string
  userName?: string
  appVersion?: string     // sobrescribe la versión por defecto
  paid?: boolean          // ticket de venta pagada
  paymentMethods?: string[]
  qr?: string             // contenido del QR (JSON inteligente)
}

// ── Comandos crudos ─────────────────────────────────────────────────────────
const ESC = 0x1b
const GS = 0x1d

const CMD = {
  init: [ESC, 0x40],
  codepage1252: [ESC, 0x74, 16], // WPC1252 → acentos y ñ del español
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  alignRight: [ESC, 0x61, 2],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  sizeNormal: [GS, 0x21, 0x00],
  sizeDouble: [GS, 0x21, 0x11], // doble ancho + alto
  sizeDoubleH: [GS, 0x21, 0x01], // doble alto
  // Corte automático del papel — FUNCIÓN B de GS V: "GS V 66 n" = [GS, 0x56, 0x42, n].
  // Esta forma AVANZA el papel hasta la posición de corte y LUEGO acciona la cuchilla.
  // Es la clave para las cortadoras genéricas tipo POS-8360: la forma clásica
  // "GS V 0" (función A) corta en la posición ACTUAL del cabezal y, como hay una
  // separación física cabezal→cuchilla, muchas POS-8360 simplemente NO accionan la
  // cuchilla (el papel no se corta). La función B gestiona ese avance internamente,
  // por eso SÍ corta de forma fiable. n = avance extra en unidades de movimiento
  // vertical; con n alto garantizamos que el contenido libre la cuchilla.
  cut: [GS, 0x56, 0x42, 0x00],
  // Corte PARCIAL clásico (función A), por si un modelo lo prefiere.
  cutPartial: [GS, 0x56, 0x01],
  // Corte TOTAL clásico (función A). Fallback para impresoras que no implementan
  // la función B; se deja como referencia / alternativa.
  cutFull: [GS, 0x56, 0x00],
  // Pulso al cajón de dinero. Se mandan AMBOS pines (2 y 5) para máxima
  // compatibilidad: distintos modelos de cajón usan uno u otro.
  drawerPin2: [ESC, 0x70, 0, 25, 250],
  drawerPin5: [ESC, 0x70, 1, 25, 250],
}

function feed(n: number): number[] {
  return [ESC, 0x64, n] // ESC d n → avanza n líneas
}

// Codifica texto a WPC1252. Para el rango Latin-1 (acentos, ñ, ¿, ¡) el code
// point coincide con el byte; lo demás cae a '?'.
function encodeText(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63
    out.push(code < 256 ? code : 63)
  }
  return out
}

class EscPosBuilder {
  private bytes: number[] = []

  raw(cmd: number[]): this {
    this.bytes.push(...cmd)
    return this
  }

  text(str: string): this {
    this.bytes.push(...encodeText(str))
    return this
  }

  line(str = ''): this {
    return this.text(str).raw([0x0a])
  }

  feed(n = 1): this {
    return this.raw(feed(n))
  }

  /**
   * Corte automático del papel. Avanza `feedLines` líneas como margen inferior y
   * luego ejecuta el corte por FUNCIÓN B (GS V 66), que además avanza internamente
   * la separación cabezal→cuchilla antes de accionar el cortador. Esto hace que la
   * POS-8360 (y cortadoras genéricas) corten de forma fiable, a diferencia de la
   * función A (GS V 0), que muchas de estas impresoras ignoran.
   */
  cut(feedLines = 5): this {
    return this.feed(feedLines).raw(CMD.cut)
  }

  /** Imprime un código QR (modelo 2) con el contenido dado. */
  qr(data: string, moduleSize = 6): this {
    const bytes = encodeText(data)
    const len = bytes.length + 3
    const pL = len & 0xff
    const pH = (len >> 8) & 0xff
    // Tamaño de módulo
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize])
    // Nivel de corrección de error L (0x30): el menos denso. En un ticket térmico
    // (alto contraste, limpio) L es de sobra fiable y reduce la cantidad de módulos
    // → QR menos saturado y más fácil de escanear con la cámara del teléfono.
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30])
    // Almacenar datos
    this.raw([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30])
    this.raw(bytes)
    // Imprimir
    this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30])
    return this.raw([0x0a])
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

/** Etiqueta legible del tipo de pedido. */
export function orderTypeLabel(t?: string): string {
  if (t === 'takeaway') return 'Para llevar'
  if (t === 'delivery') return 'Domicilio'
  return 'Mesa'
}

/** Pie profesional: marca y sitio. */
function brandFooter(b: EscPosBuilder, width: number): void {
  b.raw(CMD.alignCenter)
  b.line(divider(width))
  b.raw(CMD.boldOn).line(PRODUCT_NAME).raw(CMD.boldOff)
  b.line(`Powered by ${VENDOR_NAME}`)
  b.line(PRODUCT_URL)
}

export function money(n: number, currency = '$'): string {
  return `${currency}${n.toFixed(2)}`
}

// Línea de dos columnas (izq / der) ajustada al ancho del papel.
export function twoCol(left: string, right: string, width: number): string {
  const space = width - left.length - right.length
  if (space < 1) {
    // recorta el nombre si no cabe
    const maxLeft = Math.max(1, width - right.length - 1)
    return `${left.slice(0, maxLeft)} ${right}`
  }
  return left + ' '.repeat(space) + right
}

export function divider(width: number): string {
  return '-'.repeat(width)
}

/** Columnas de caracteres por ancho de papel (igual que en buildReceipt). */
export function paperColumns(paper: PaperWidth): number {
  return paper === 80 ? 48 : 32
}

/** Construye el ticket completo listo para enviar a la impresora. */
export function buildReceipt(data: ReceiptData, paper: PaperWidth): Uint8Array {
  const width = paper === 80 ? 48 : 32
  const cur = data.currency ?? '$'
  const b = new EscPosBuilder()

  b.raw(CMD.init).raw(CMD.codepage1252)

  // Logotipo del negocio (rasterizado), centrado
  if (data.logoBytes && data.logoBytes.length > 8) {
    b.raw(CMD.alignCenter).raw(data.logoBytes).raw([0x0a]).raw(CMD.alignLeft)
  }

  // Negocio
  b.raw(CMD.alignCenter)
  b.raw(CMD.boldOn).raw(CMD.sizeDoubleH)
  b.line(data.businessName)
  b.raw(CMD.sizeNormal).raw(CMD.boldOff)
  if (data.slogan) b.line(data.slogan)
  if (data.address) b.line(data.address)
  if (data.phone) b.line(`Tel: ${data.phone}`)

  // Metadatos del ticket (sucursal, dispositivo, usuario, folio, fecha, tipo)
  b.raw(CMD.alignLeft)
  b.line(divider(width))
  if (data.branchName) b.line(`Sucursal: ${data.branchName}`)
  if (data.deviceName) b.line(`Dispositivo: ${data.deviceName}`)
  if (data.userName)   b.line(`Atendió: ${data.userName}`)
  b.line(`Folio: #${data.ticketNumber ?? data.orderId}`)
  b.line(`Fecha: ${data.createdAt}`)
  // En pedidos de mesa la línea "Mesa: X" ya indica el tipo, así que se omite
  // "Tipo: Mesa" para ahorrar papel; se imprime solo para llevar/domicilio.
  if (orderTypeLabel(data.orderType) === 'Mesa') {
    if (data.tableName) b.line(`Mesa: ${data.tableName}`)
  } else {
    b.line(`Tipo: ${orderTypeLabel(data.orderType)}`)
  }
  b.line(divider(width))

  // Productos: la línea principal (cantidad · producto · precio) va en DOBLE ALTO
  // para que el cliente la lea con claridad. Se mantiene en ancho normal (48 cols
  // en 80mm / 72mm imprimibles) para no desbordar el papel ni romper la alineación
  // a dos columnas. Modificadores y notas quedan en tamaño normal como subdetalle.
  for (const item of data.lines) {
    const qtyName = `${item.qty}x ${item.name}`
    // Todo el bloque del producto en doble alto: el nombre en negrita y los
    // modificadores/notas en peso normal (legibles pero subordinados).
    b.raw(CMD.sizeDoubleH)
    b.raw(CMD.boldOn).line(twoCol(qtyName, money(item.total, cur), width)).raw(CMD.boldOff)
    for (const m of item.modifiers ?? []) b.line(`  + ${m}`)
    if (item.notes) b.line(`  * ${item.notes}`)
    b.raw(CMD.sizeNormal)
  }
  b.line(divider(width))

  // Descuentos aplicados (promoción/cupón/lealtad) — solo si hay alguno.
  if (data.discountBreakdown && data.discountBreakdown.length > 0) {
    for (const d of data.discountBreakdown) {
      b.line(twoCol(d.label, `-${money(d.amount, cur)}`, width))
    }
    b.line(divider(width))
  }

  // Total (sin desglose de IVA). Doble ancho + alto: es el dato más importante,
  // ocupa todo el ancho usando la mitad de columnas (24 en 80mm).
  b.raw(CMD.boldOn).raw(CMD.sizeDouble)
  b.line(twoCol('TOTAL', money(data.total, cur), Math.floor(width / 2)))
  b.raw(CMD.sizeNormal).raw(CMD.boldOff)

  // Estado de pago
  if (data.paid) {
    b.feed(1).raw(CMD.alignCenter).raw(CMD.boldOn).raw(CMD.sizeDoubleH)
    b.line('*** TICKET COBRADO ***')
    b.raw(CMD.sizeNormal).raw(CMD.boldOff)
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      b.line(`Pago: ${data.paymentMethods.join(', ')}`)
    }
  }

  // Mensaje de cortesía (doble alto, centrado)
  b.feed(1).raw(CMD.alignCenter).raw(CMD.boldOn).raw(CMD.sizeDoubleH)
  b.line(data.footer ?? 'Gracias por su preferencia')
  b.raw(CMD.sizeNormal).raw(CMD.boldOff)

  // QR del ticket (enlace a la página pública del recibo). El tamaño de módulo
  // se adapta a la longitud: con más datos, módulos más pequeños para que el QR
  // siga cabiendo en el área imprimible (72mm) y se mantenga escaneable.
  if (data.qr) {
    const len = data.qr.length
    // Con corrección L se necesitan menos módulos, así que priorizamos módulos
    // GRANDES (6) para la mayoría de tickets; solo se reducen si el contenido es
    // muy largo, para que el QR siga cabiendo en el área imprimible (72mm).
    const moduleSize = len > 1250 ? 4 : len > 950 ? 5 : 6
    b.feed(1).qr(data.qr, moduleSize)
  }

  // Pie profesional con soporte/sitio
  brandFooter(b, width)

  b.cut(3)
  return b.build()
}

// ── Ticket de COCINA (comanda por estación) ─────────────────────────────────

export interface KitchenTicketItem {
  qty: number
  name: string
  modifiers?: string[]
  notes?: string | null
}

export interface KitchenTicketData {
  businessName: string
  stationLabel: string       // 'COCINA CALIENTE' | 'COCINA FRÍA / BARRA'
  banner?: string            // 'AGREGADO A MESA' | 'CANCELAR PRODUCTO'
  orderRef: string           // 'Mesa 5' | 'Para llevar #123'
  waiter?: string | null
  time: string               // hora ya formateada
  items: KitchenTicketItem[]
}

/** Comanda de cocina: grande, sin precios, con modificadores y notas. */
export function buildKitchenTicket(data: KitchenTicketData, paper: PaperWidth): Uint8Array {
  const width = paper === 80 ? 48 : 32
  const b = new EscPosBuilder()

  b.raw(CMD.init).raw(CMD.codepage1252)

  // Encabezado
  b.raw(CMD.alignCenter).raw(CMD.boldOn)
  b.line(`${PRODUCT_NAME} Kitchen`)
  b.line(data.businessName)
  b.raw(CMD.sizeDoubleH)
  b.line(data.stationLabel)
  b.raw(CMD.sizeNormal)
  if (data.banner) {
    b.raw(CMD.sizeDouble)
    b.line(`** ${data.banner} **`)
    b.raw(CMD.sizeNormal)
  }
  b.raw(CMD.boldOff)

  // Info
  b.raw(CMD.alignLeft)
  b.line(divider(width))
  b.raw(CMD.boldOn).raw(CMD.sizeDoubleH)
  b.line(data.orderRef)
  b.raw(CMD.sizeNormal).raw(CMD.boldOff)
  if (data.waiter) b.line(`Mesero: ${data.waiter}`)
  b.line(`Hora: ${data.time}`)
  b.line(divider(width))

  // Platillos (cantidad y nombre en doble alto; modificadores/notas debajo)
  for (const item of data.items) {
    // Bloque del platillo en doble alto: nombre en negrita y los
    // modificadores/notas en peso normal (más legibles para la cocina).
    b.raw(CMD.sizeDoubleH)
    b.raw(CMD.boldOn).line(`${item.qty}x ${item.name}`).raw(CMD.boldOff)
    for (const mod of item.modifiers ?? []) b.line(`  - ${mod}`)
    if (item.notes) b.line(`  Nota: ${item.notes}`)
    b.raw(CMD.sizeNormal)
    b.feed(1)
  }

  b.line(divider(width))
  b.cut()
  return b.build()
}

/** Solo el pulso para abrir el cajón (sin imprimir nada). */
export function buildDrawerKick(): Uint8Array {
  return new Uint8Array([
    ...CMD.init,
    ...CMD.drawerPin2,
    ...CMD.drawerPin5,
  ])
}

/** Ticket de prueba para verificar la configuración. */
export function buildTestReceipt(businessName: string, paper: PaperWidth): Uint8Array {
  const width = paper === 80 ? 48 : 32
  const b = new EscPosBuilder()
  b.raw(CMD.init).raw(CMD.codepage1252)
  b.raw(CMD.alignCenter).raw(CMD.boldOn).raw(CMD.sizeDouble)
  b.line('PRUEBA')
  b.raw(CMD.sizeNormal).raw(CMD.boldOff)
  b.line(businessName)
  b.line(divider(width))
  b.raw(CMD.alignLeft)
  b.line('Acentos: áéíóú ñ Ñ ¿¡')
  b.line(`Papel: ${paper}mm (${width} cols)`)
  b.line('Si lees esto, la impresora')
  b.line('está configurada correctamente.')
  b.cut()
  return b.build()
}
