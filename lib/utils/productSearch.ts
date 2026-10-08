/**
 * FoodIX — Sistema de gestión para restaurantes
 * Lógica pura de búsqueda y alta rápida de productos en el flujo de pedidos.
 * Sin dependencias de React: fácil de memoizar y de probar.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { Product, Category, PriceType } from '@/lib/types'

/** Campos mínimos para resolver el modo de precio de un producto. */
type PricingFields = { price_type?: PriceType | null; price_per_kg?: number | null }

/** ¿Tiene un precio por kilo configurado (> 0)? */
function hasKgBase(p: PricingFields): boolean {
  return typeof p.price_per_kg === 'number' && p.price_per_kg > 0
}

/**
 * Producto que se cobra por peso: el mesero captura kg y precio/kg al vender.
 * El tipo legado 'variable' se trata como KG solo si tiene precio/kg configurado
 * (así no rompemos productos antiguos guardados con ese valor).
 */
export function isKgPrice(p: PricingFields): boolean {
  if (p.price_type === 'kg') return true
  if (p.price_type === 'variable' && hasKgBase(p)) return true
  return false
}

/**
 * Productos cuyo precio final se captura al vender (precio variable / abierto).
 * Acepta el tipo de precio suelto (retrocompat) o el producto completo. El tipo
 * legado 'variable' sin precio/kg también cuenta como captura de precio.
 */
export function isOpenPrice(arg?: PriceType | null | PricingFields): boolean {
  const p: PricingFields = typeof arg === 'object' && arg !== null ? arg : { price_type: arg ?? null }
  if (p.price_type === 'open') return true
  if (p.price_type === 'variable' && !hasKgBase(p)) return true
  return false
}

/** Minúsculas y sin acentos, para una búsqueda tolerante (ej. "cafe" → "café"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Elimina marcas diacríticas combinantes (U+0300–U+036F).
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .trim()
}

export interface ProductSearchFilters {
  query?: string
  categoryId?: number | null
}

/**
 * Filtra productos por categoría y por una consulta que matchea (AND por
 * término) contra: nombre, nombre de la categoría, código de barras,
 * descripción e ingredientes/palabras clave.
 */
export function filterProducts(
  products: Product[],
  categoriesById: Map<number, Category>,
  { query = '', categoryId = null }: ProductSearchFilters,
): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)

  return products.filter(p => {
    // Comparación tolerante a tipos: el API puede devolver category_id como
    // número o string según el origen; igualamos por valor numérico.
    if (categoryId !== null && Number(p.category_id) !== Number(categoryId)) return false
    if (terms.length === 0) return true

    const cat = categoriesById.get(Number(p.category_id))
    const haystack = normalize([
      p.name,
      cat?.name ?? '',
      p.barcode ?? '',
      p.description ?? '',
      p.ingredients ?? '',
    ].join(' '))

    // Cada término debe aparecer: al escribir más, los resultados se acotan.
    return terms.every(t => haystack.includes(t))
  })
}

/**
 * Un producto se puede agregar si está disponible y tiene precio válido (> 0).
 * Los de precio abierto/variable se permiten aunque su precio base sea 0,
 * porque el monto se captura al momento de la venta.
 */
export function canAddProduct(p: Pick<Product, 'available' | 'price'> & { price_type?: PriceType | null; price_per_kg?: number | null }): boolean {
  if (p.available !== true) return false
  // Precio variable: el monto se captura al vender (puede no tener precio base).
  if (isOpenPrice(p)) return true
  // Por kilogramo: basta con tener un precio/kg base (> 0) configurado.
  if (isKgPrice(p)) return hasKgBase(p)
  return typeof p.price === 'number' && p.price > 0
}

/**
 * Resuelve qué producto agregar cuando el mesero confirma la búsqueda con Enter
 * (o cuando entra la lectura de un código de barras, que termina en Enter).
 *
 * Nunca adivina entre varios candidatos: solo devuelve producto si hay un match
 * exacto por código de barras o por nombre, o si el filtro dejó uno solo.
 * `matches` es la lista ya filtrada, para que el resultado sea siempre uno de
 * los que el mesero tiene en pantalla.
 */
export function resolveSearchSubmit(matches: Product[], query: string): Product | null {
  const q = normalize(query)
  if (!q) return null

  const byBarcode = matches.find(p => p.barcode && normalize(p.barcode) === q)
  if (byBarcode) return byBarcode

  const byName = matches.find(p => normalize(p.name) === q)
  if (byName) return byName

  return matches.length === 1 ? matches[0] : null
}

interface LineLike {
  uid: string
  product_id: number
  quantity: number
  modifiers?: unknown[]
}

export type AddResolution =
  | { type: 'increment'; uid: string; quantity: number }
  | { type: 'new' }

/**
 * Decide si agregar un producto (sin modificadores) debe incrementar la línea
 * existente o crear una nueva. Las líneas con modificadores siempre son nuevas,
 * por eso solo se fusiona con líneas sin modificadores del mismo producto.
 */
export function resolveQuickAdd(items: LineLike[], productId: number): AddResolution {
  const existing = items.find(
    i => i.product_id === productId && (!i.modifiers || i.modifiers.length === 0),
  )
  return existing
    ? { type: 'increment', uid: existing.uid, quantity: existing.quantity + 1 }
    : { type: 'new' }
}

interface ConfiguredLine {
  uid: string
  product_id: number
  quantity: number
  modifiers?: { name: string; price_delta: number }[]
  selectedModifiers?: string[]
  item_notes?: string
}

/**
 * Firma estable de la configuración de una línea: mismo producto, mismos
 * modificadores (predefinidos y de selección) y misma nota producen la misma
 * firma. Los modificadores se ordenan para que el orden de selección no importe.
 */
export function lineSignature(line: Omit<ConfiguredLine, 'uid' | 'quantity'>): string {
  const mods = (line.modifiers ?? [])
    .map(m => `${m.name}:${m.price_delta}`)
    .sort()
  const selected = [...(line.selectedModifiers ?? [])].sort()
  const notes = (line.item_notes ?? '').trim()
  return JSON.stringify([line.product_id, mods, selected, notes])
}

/**
 * Busca una línea existente con la misma configuración que el candidato para
 * fusionarlas (incrementar cantidad) en vez de duplicar la línea en el resumen.
 */
export function findMergeableLine<T extends ConfiguredLine>(
  items: T[],
  candidate: Omit<ConfiguredLine, 'uid' | 'quantity'>,
): T | undefined {
  const sig = lineSignature(candidate)
  return items.find(i => lineSignature(i) === sig)
}
