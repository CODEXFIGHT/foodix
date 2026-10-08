/**
 * FoodIX — Modo Demo
 * Capa de almacenamiento aislada. Usa localStorage con namespace `foodix_demo_*`
 * para los datos, y sessionStorage (por pestaña) para la sesión de rol.
 *
 * NUNCA toca base de datos real ni keys de producción.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { DemoState, DemoSlice } from './demo-types'
import { freshSeedState } from './demo-seed'

const NS = 'foodix_demo_'

export const DEMO_KEYS = {
  session: `${NS}session`,
  menu: `${NS}menu`,
  products: `${NS}products`,
  tables: `${NS}tables`,
  orders: `${NS}orders`,
} as const

/** Versión del esquema seed; al cambiar invalida datos viejos. */
const SCHEMA_VERSION = 2
const VERSION_KEY = `${NS}version`

function hasLocal(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Lee una slice de localStorage; null si no existe o es inválida. */
export function readSlice<T>(key: string): T | null {
  if (!hasLocal()) return null
  return safeParse<T>(window.localStorage.getItem(key))
}

/** Escribe una slice en localStorage (silencioso si no hay storage). */
export function writeSlice(key: string, value: unknown): void {
  if (!hasLocal()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* cuota llena o modo privado: el demo sigue en memoria */
  }
}

/** Divide el estado completo en sus slices persistibles. */
export function sliceState(state: DemoState): Record<DemoSlice, unknown> {
  return {
    menu: {
      restaurant: state.restaurant,
      categories: state.categories,
      modifiers: state.modifiers,
    },
    products: state.products,
    tables: state.tables,
    orders: state.orders,
  }
}

/** Persiste solo las slices indicadas. */
export function persistSlices(state: DemoState, slices: DemoSlice[]): void {
  const parts = sliceState(state)
  for (const slice of slices) {
    writeSlice(DEMO_KEYS[slice], parts[slice])
  }
}

/** Persiste todas las slices + versión de esquema. */
export function persistAll(state: DemoState): void {
  persistSlices(state, ['menu', 'products', 'tables', 'orders'])
  writeSlice(VERSION_KEY, SCHEMA_VERSION)
}

/**
 * Carga el estado completo desde localStorage. Si falta cualquier slice o la
 * versión no coincide, reconstruye desde el seed y lo persiste.
 */
export function loadState(): DemoState {
  const seed = freshSeedState()
  if (!hasLocal()) return seed

  const version = readSlice<number>(VERSION_KEY)
  if (version !== SCHEMA_VERSION) {
    persistAll(seed)
    return seed
  }

  const menu = readSlice<{
    restaurant: DemoState['restaurant']
    categories: DemoState['categories']
    modifiers: DemoState['modifiers']
  }>(DEMO_KEYS.menu)
  const products = readSlice<DemoState['products']>(DEMO_KEYS.products)
  const tables = readSlice<DemoState['tables']>(DEMO_KEYS.tables)
  const orders = readSlice<DemoState['orders']>(DEMO_KEYS.orders)

  if (!menu || !products || !tables || !orders) {
    persistAll(seed)
    return seed
  }

  const normalizedProducts = products.map(p => ({
    ...p,
    modifiers: Array.isArray(p.modifiers) ? p.modifiers : []
  }))

  return {
    restaurant: menu.restaurant,
    categories: menu.categories,
    modifiers: menu.modifiers,
    products: normalizedProducts,
    tables,
    orders,
  }
}

/** Recarga una sola slice desde localStorage sobre un estado base. */
export function reloadSlice(base: DemoState, slice: DemoSlice): DemoState {
  if (slice === 'menu') {
    const menu = readSlice<{
      restaurant: DemoState['restaurant']
      categories: DemoState['categories']
      modifiers: DemoState['modifiers']
    }>(DEMO_KEYS.menu)
    if (!menu) return base
    return { ...base, restaurant: menu.restaurant, categories: menu.categories, modifiers: menu.modifiers }
  }
  if (slice === 'products') {
    const value = readSlice<DemoState['products']>(DEMO_KEYS.products)
    if (!value) return base
    const normalized = value.map(p => ({
      ...p,
      modifiers: Array.isArray(p.modifiers) ? p.modifiers : []
    }))
    return { ...base, products: normalized }
  }
  const value = readSlice<DemoState[typeof slice]>(DEMO_KEYS[slice])
  if (!value) return base
  return { ...base, [slice]: value }
}

/** Restaura todos los datos demo al seed inicial. */
export function resetState(): DemoState {
  const seed = freshSeedState()
  persistAll(seed)
  return seed
}

/** Alias semántico: precarga los datos demo (restaurante, productos, mesas…). */
export const seedDemoData = resetState

/** Alias semántico: borra TODOS los datos demo del navegador. */
export function clearDemoData(): void {
  purgeAll()
}

/** Borra por completo todas las keys demo (incluida la sesión). */
export function purgeAll(): void {
  if (!hasLocal()) return
  Object.values(DEMO_KEYS).forEach(k => window.localStorage.removeItem(k))
  window.localStorage.removeItem(VERSION_KEY)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem(DEMO_KEYS.session)
  }
}

/** Mapea una key de storage a su slice (para eventos `storage`). */
export function keyToSlice(key: string | null): DemoSlice | null {
  switch (key) {
    case DEMO_KEYS.menu: return 'menu'
    case DEMO_KEYS.products: return 'products'
    case DEMO_KEYS.tables: return 'tables'
    case DEMO_KEYS.orders: return 'orders'
    default: return null
  }
}
