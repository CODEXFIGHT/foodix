/**
 * Parser determinista de mensajes multi-ítem para el bot de WhatsApp.
 *
 * Reconoce texto libre como "2 tacos, 1 bebida y 3 quesadillas" y lo separa en
 * líneas de pedido (producto + cantidad) SIN llamar a ningún servicio externo
 * — es una función pura, fácil de probar aparte de whatsappFlow.ts.
 *
 * Cuando no reconoce nada (mensaje sin coma/"y"/números, o texto demasiado
 * libre), whatsappFlow.ts cae al camino de siempre: número exacto de la
 * lista, nombre único, o el fallback de IA (whatsappAI.ts).
 */

export interface ParsableProduct {
  id: number
  name: string
  available?: boolean
}

export interface ParsedLineItem<P extends ParsableProduct = ParsableProduct> {
  product: P
  quantity: number
}

export interface ParseResult<P extends ParsableProduct = ParsableProduct> {
  matched: ParsedLineItem<P>[]
  /** Fragmentos de texto que no se pudieron asociar a ningún producto del catálogo. */
  unmatched: string[]
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Sustituye números escritos en palabras por dígitos ANTES de segmentar por
 * " y " — así "dos tacos y tres quesadillas" se vuelve "2 tacos y 3
 * quesadillas" y el separador de abajo (que solo corta antes de un dígito)
 * puede reconocer el límite entre platillos sin romper nombres de producto
 * que por casualidad contengan " y " (ej. "Jamón y Queso").
 */
function digitizeNumberWords(text: string): string {
  return text.replace(
    /\b(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/gi,
    (m) => {
      const n = NUMBER_WORDS[m.toLowerCase()]
      return n !== undefined ? String(n) : m
    },
  )
}

/**
 * Segmenta el mensaje en líneas de pedido candidatas: coma, salto de línea, o
 * " y " SOLO cuando le sigue un dígito (evita partir nombres de producto que
 * incluyan " y " cuando el cliente no dio cantidades explícitas — en ese
 * caso el mensaje completo queda como un único segmento sin match, y
 * whatsappFlow.ts escala al fallback de IA).
 */
function segmentMessage(text: string): string[] {
  return text
    .split(/\s*,\s*|\n+|\s+y\s+(?=\d)/gi)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Extrae la cantidad líder de un segmento ("2 tacos" → {quantity:2, rest:"tacos"}). Default 1 si no hay número. */
function extractQuantity(segment: string): { quantity: number; rest: string } {
  const m = segment.match(/^(\d{1,2})\s*x?\s*(.*)$/i)
  if (m && m[2].trim()) {
    const quantity = Math.min(20, Math.max(1, parseInt(m[1], 10)))
    return { quantity, rest: m[2].trim() }
  }
  return { quantity: 1, rest: segment.trim() }
}

/**
 * Busca el mejor match de catálogo para un fragmento de texto — substring en
 * ambas direcciones (nombre-en-texto y texto-en-nombre, igual que el camino
 * de un solo ítem en whatsappFlow.ts), desambiguando por longitud más
 * cercana cuando varios productos calzan.
 */
function matchProduct<P extends ParsableProduct>(rest: string, catalog: P[]): P | undefined {
  const needle = normalize(rest)
  if (!needle) return undefined

  const candidates = catalog.filter(p => {
    if (p.available === false) return false
    const name = normalize(p.name)
    return name.includes(needle) || needle.includes(name)
  })
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]

  return candidates.reduce((best, p) => {
    const bestDelta = Math.abs(normalize(best.name).length - needle.length)
    const pDelta = Math.abs(normalize(p.name).length - needle.length)
    return pDelta < bestDelta ? p : best
  })
}

/**
 * Heurístico barato para decidir si vale la pena intentar el parseo
 * multi-ítem antes del camino rápido de un solo producto (número/nombre
 * exacto) — así un simple "3" nunca paga el costo de este parser.
 */
export function looksLikeMultiItem(rawText: string): boolean {
  const digitGroups = rawText.match(/\d+/g) ?? []
  return /,/.test(rawText) || /\by\b/i.test(rawText) || digitGroups.length >= 2
}

export function parseMultiItemMessage<P extends ParsableProduct>(
  rawText: string, catalog: P[],
): ParseResult<P> {
  const segments = segmentMessage(digitizeNumberWords(rawText))

  const matched: ParsedLineItem<P>[] = []
  const unmatched: string[] = []

  for (const segment of segments) {
    const { quantity, rest } = extractQuantity(segment)
    const product = matchProduct(rest, catalog)
    if (!product) {
      unmatched.push(segment)
      continue
    }
    const existing = matched.find(m => m.product.id === product.id)
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + quantity)
    } else {
      matched.push({ product, quantity })
    }
  }

  return { matched, unmatched }
}
