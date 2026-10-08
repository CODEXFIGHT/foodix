/**
 * FoodIX — Modo Demo
 * Tipos del entorno demo. Totalmente aislados del dominio real:
 * el demo nunca importa servicios ni tipos de escritura de producción.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

export type DemoRole = 'admin' | 'waiter' | 'kitchen' | 'menu'

export interface DemoUser {
  id: string
  name: string
  role: DemoRole
  avatarColor: string
}

export interface DemoSession {
  /** Marca interna: SIEMPRE true en sesiones demo. */
  isDemo: true
  role: DemoRole
  /** Alias semántico de `role` requerido por la arquitectura demo. */
  demoRole: DemoRole
  userId: string
  userName: string
  /** Inicio de la sesión demo (epoch ms). */
  demoStartedAt: number
  /** Expiración exacta = demoStartedAt + DEMO_TRIAL_MS (epoch ms). */
  demoExpiresAt: number
  /** Nombre del restaurante demo mostrado en la UI. */
  demoRestaurantName: string
  /** @deprecated Compatibilidad: equivale a demoStartedAt. */
  startedAt: number
}

/** Duración exacta de la prueba demo: 30 minutos. */
export const DEMO_TRIAL_MS = 30 * 60 * 1000

/** Razones por las que termina una prueba demo (telemetría / UI). */
export type DemoEndReason = 'logout' | 'expired' | 'manual'

export interface DemoRestaurant {
  name: string
  tagline: string
  currency: string
  /** Tasa de impuesto (ej. 0.16 = 16%). */
  taxRate: number
  address: string
}

export interface DemoCategory {
  id: string
  name: string
  emoji: string
  order: number
}

export interface DemoModifier {
  id: string
  name: string
  /** Precio adicional del modificador (0 = sin costo). */
  price: number
}

export type KitchenStation = 'hot' | 'cold'

export interface DemoProduct {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  available: boolean
  emoji: string
  station: KitchenStation
  /** IDs de modificadores aplicables. */
  modifierIds: string[]
  modifiers?: string[]
}

export type OrderItemStatus = 'new' | 'preparing' | 'ready' | 'served'

export interface DemoOrderItemModifier {
  id: string
  name: string
  price: number
}

export interface DemoOrderItem {
  id: string
  productId: string
  name: string
  emoji: string
  station: KitchenStation
  basePrice: number
  qty: number
  modifiers: DemoOrderItemModifier[]
  selectedModifiers?: string[]
  note: string
  status: OrderItemStatus
}

export type OrderStatus = 'open' | 'sent' | 'closed'

// ── Cuenta dividida (demo, solo en localStorage) ────────────────────────────
export type DemoSplitMode = 'items' | 'people' | 'amount' | 'guest'
export type DemoSplitStatus = 'pending' | 'paid'

export interface DemoSplitItem {
  itemId: string
  quantity: number
}

export interface DemoSplit {
  id: string
  label: string
  mode: DemoSplitMode
  total: number
  status: DemoSplitStatus
  items: DemoSplitItem[]
}

export interface DemoOrder {
  id: string
  tableId: string
  waiterName: string
  items: DemoOrderItem[]
  status: OrderStatus
  createdAt: number
  updatedAt: number
  closedAt?: number
  /** Plan de cuenta dividida (vacío/ausente = cuenta única). */
  splits?: DemoSplit[]
}

export type TableStatus = 'free' | 'occupied' | 'billing'

export interface DemoTable {
  id: string
  label: string
  seats: number
  zone: string
  status: TableStatus
}

export interface DemoState {
  restaurant: DemoRestaurant
  tables: DemoTable[]
  categories: DemoCategory[]
  modifiers: DemoModifier[]
  products: DemoProduct[]
  orders: DemoOrder[]
}

/** Slices persistidas por separado en localStorage (namespace demo). */
export type DemoSlice = 'menu' | 'products' | 'tables' | 'orders'
