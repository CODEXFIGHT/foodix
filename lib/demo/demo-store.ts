/**
 * FoodIX — Modo Demo
 * Store reactivo aislado (patrón useSyncExternalStore) respaldado por
 * localStorage + BroadcastChannel. Es la ÚNICA fuente de mutación del demo;
 * no importa ningún servicio de escritura real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useSyncExternalStore } from 'react'
import type {
  DemoState,
  DemoSlice,
  DemoProduct,
  DemoCategory,
  DemoOrder,
  DemoOrderItem,
  DemoSplit,
  DemoSplitMode,
  OrderItemStatus,
  TableStatus,
} from './demo-types'
import { freshSeedState } from './demo-seed'
import {
  loadState,
  persistSlices,
  reloadSlice,
  resetState,
  keyToSlice,
  DEMO_KEYS,
} from './demo-storage'
import { broadcastChange, subscribeBroadcast } from './demo-realtime'

const ORIGIN = Math.random().toString(36).slice(2)

let state: DemoState = freshSeedState()
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  state = loadState()
}

/** Aplica un cambio: persiste las slices afectadas, notifica y difunde. */
function commit(next: DemoState, slices: DemoSlice[]) {
  state = next
  persistSlices(state, slices)
  emit()
  for (const slice of slices) broadcastChange(slice, ORIGIN)
}

function onExternalSlice(slice: DemoSlice) {
  state = reloadSlice(state, slice)
  emit()
}

// ---------------------------------------------------------------------------
// Suscripción (useSyncExternalStore)
// ---------------------------------------------------------------------------

function subscribe(listener: () => void): () => void {
  hydrate()
  listeners.add(listener)

  const onStorage = (e: StorageEvent) => {
    const slice = keyToSlice(e.key)
    if (slice) onExternalSlice(slice)
  }
  const unsubBroadcast = subscribeBroadcast(msg => {
    if (msg.origin === ORIGIN) return
    onExternalSlice(msg.slice)
  })

  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    unsubBroadcast()
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot(): DemoState {
  return state
}

const serverSnapshot = freshSeedState()
function getServerSnapshot(): DemoState {
  return serverSnapshot
}

/** Hook selector. El selector debe devolver referencias estables del estado. */
export function useDemoStore<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  )
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Editar la orden invalida un plan de división aún no cobrado (cambia el total). */
function dropPendingSplits(o: DemoOrder): DemoOrder {
  if (o.splits && o.splits.length > 0 && o.splits.every(s => s.status !== 'paid')) {
    return { ...o, splits: undefined }
  }
  return o
}

function syncTableStatuses(next: DemoState): DemoState {
  const tables = next.tables.map(t => {
    const active = next.orders.find(o => o.tableId === t.id && o.status !== 'closed')
    if (!active) return t.status === 'free' ? t : { ...t, status: 'free' as TableStatus }
    const status: TableStatus = t.status === 'billing' ? 'billing' : 'occupied'
    return t.status === status ? t : { ...t, status }
  })
  return { ...next, tables }
}

// ---------------------------------------------------------------------------
// Acciones — Admin (menú / productos / categorías)
// ---------------------------------------------------------------------------

export const demoActions = {
  /** Crea o actualiza un producto. Devuelve el id. */
  upsertProduct(input: Omit<DemoProduct, 'id'> & { id?: string }): string {
    const id = input.id ?? uid('p')
    const exists = state.products.some(p => p.id === id)
    const product: DemoProduct = { ...input, id }
    const products = exists
      ? state.products.map(p => (p.id === id ? product : p))
      : [...state.products, product]
    commit({ ...state, products }, ['products'])
    return id
  },

  deleteProduct(id: string) {
    commit({ ...state, products: state.products.filter(p => p.id !== id) }, ['products'])
  },

  toggleProductAvailable(id: string) {
    const products = state.products.map(p =>
      p.id === id ? { ...p, available: !p.available } : p,
    )
    commit({ ...state, products }, ['products'])
  },

  addCategory(input: Omit<DemoCategory, 'id' | 'order'>): string {
    const id = uid('c')
    const order = state.categories.length + 1
    commit({ ...state, categories: [...state.categories, { ...input, id, order }] }, ['menu'])
    return id
  },

  deleteCategory(id: string) {
    // No borra productos; solo la categoría (los productos quedan huérfanos visibles en "otros")
    commit({ ...state, categories: state.categories.filter(c => c.id !== id) }, ['menu'])
  },

  setTableStatus(tableId: string, status: TableStatus) {
    const tables = state.tables.map(t => (t.id === tableId ? { ...t, status } : t))
    commit({ ...state, tables }, ['tables'])
  },

  // -------------------------------------------------------------------------
  // Acciones — Mesero (órdenes)
  // -------------------------------------------------------------------------

  /** Devuelve la orden abierta/enviada de una mesa, creándola si no existe. */
  getOrCreateOrder(tableId: string, waiterName: string): string {
    const active = state.orders.find(o => o.tableId === tableId && o.status !== 'closed')
    if (active) return active.id
    const now = Date.now()
    const order: DemoOrder = {
      id: uid('o'),
      tableId,
      waiterName,
      items: [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }
    const next = syncTableStatuses({ ...state, orders: [...state.orders, order] })
    commit(next, ['orders', 'tables'])
    return order.id
  },

  addItem(orderId: string, item: Omit<DemoOrderItem, 'id' | 'status'>) {
    const orders = state.orders.map(o => {
      if (o.id !== orderId) return o
      const newItem: DemoOrderItem = {
        ...item,
        id: uid('oi'),
        status: 'new',
        selectedModifiers: item.selectedModifiers ?? [],
      }
      return dropPendingSplits({ ...o, items: [...o.items, newItem], updatedAt: Date.now() })
    })
    commit({ ...state, orders }, ['orders'])
  },

  removeItem(orderId: string, itemId: string) {
    const orders = state.orders.map(o =>
      o.id === orderId
        ? dropPendingSplits({ ...o, items: o.items.filter(i => i.id !== itemId), updatedAt: Date.now() })
        : o,
    )
    commit({ ...state, orders }, ['orders'])
  },

  changeItemQty(orderId: string, itemId: string, delta: number) {
    const orders = state.orders.map(o => {
      if (o.id !== orderId) return o
      const items = o.items
        .map(i => (i.id === itemId ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter(i => i.qty > 0)
      return dropPendingSplits({ ...o, items, updatedAt: Date.now() })
    })
    commit({ ...state, orders }, ['orders'])
  },

  /** Envía la orden a cocina (open -> sent). */
  sendOrder(orderId: string) {
    const orders = state.orders.map(o =>
      o.id === orderId ? { ...o, status: 'sent' as const, updatedAt: Date.now() } : o,
    )
    commit(syncTableStatuses({ ...state, orders }), ['orders', 'tables'])
  },

  /** Marca mesa en cobro (billing). */
  requestBill(tableId: string) {
    const tables = state.tables.map(t =>
      t.id === tableId ? { ...t, status: 'billing' as TableStatus } : t,
    )
    commit({ ...state, tables }, ['tables'])
  },

  /** Simula el cobro: cierra la orden y libera la mesa. */
  closeOrder(orderId: string) {
    const now = Date.now()
    const order = state.orders.find(o => o.id === orderId)
    const orders = state.orders.map(o =>
      o.id === orderId ? { ...o, status: 'closed' as const, closedAt: now, updatedAt: now } : o,
    )
    let tables = state.tables
    if (order) {
      tables = state.tables.map(t =>
        t.id === order.tableId ? { ...t, status: 'free' as TableStatus } : t,
      )
    }
    commit({ ...state, orders, tables }, ['orders', 'tables'])
  },

  // -------------------------------------------------------------------------
  // Acciones — Cuenta dividida (demo)
  // -------------------------------------------------------------------------

  /** Define/reemplaza el plan de divisiones de una orden (todas pendientes). */
  setOrderSplits(
    orderId: string,
    mode: DemoSplitMode,
    splits: { label: string; total: number; items?: { itemId: string; quantity: number }[] }[],
  ) {
    const orders = state.orders.map(o => {
      if (o.id !== orderId) return o
      const built: DemoSplit[] = splits.map(s => ({
        id: uid('sp'),
        label: s.label,
        mode,
        total: Math.round(s.total * 100) / 100,
        status: 'pending',
        items: s.items ?? [],
      }))
      return { ...o, splits: built, updatedAt: Date.now() }
    })
    commit({ ...state, orders }, ['orders'])
  },

  /** Cobra una división. Si todas quedan pagadas, cierra la orden y libera mesa. */
  paySplit(orderId: string, splitId: string) {
    const order = state.orders.find(o => o.id === orderId)
    if (!order?.splits) return
    const splits = order.splits.map(s => s.id === splitId ? { ...s, status: 'paid' as const } : s)
    const allPaid = splits.every(s => s.status === 'paid')

    if (allPaid) {
      const now = Date.now()
      const orders = state.orders.map(o =>
        o.id === orderId ? { ...o, splits, status: 'closed' as const, closedAt: now, updatedAt: now } : o,
      )
      const tables = state.tables.map(t =>
        t.id === order.tableId ? { ...t, status: 'free' as TableStatus } : t,
      )
      commit({ ...state, orders, tables }, ['orders', 'tables'])
      return
    }

    const orders = state.orders.map(o =>
      o.id === orderId ? { ...o, splits, updatedAt: Date.now() } : o,
    )
    commit({ ...state, orders }, ['orders'])
  },

  /** Elimina el plan de divisiones (vuelve a cuenta única). */
  clearOrderSplits(orderId: string) {
    const orders = state.orders.map(o =>
      o.id === orderId ? { ...o, splits: undefined, updatedAt: Date.now() } : o,
    )
    commit({ ...state, orders }, ['orders'])
  },

  // -------------------------------------------------------------------------
  // Acciones — Cocina
  // -------------------------------------------------------------------------

  setItemStatus(orderId: string, itemId: string, status: OrderItemStatus) {
    const orders = state.orders.map(o =>
      o.id === orderId
        ? {
            ...o,
            items: o.items.map(i => (i.id === itemId ? { ...i, status } : i)),
            updatedAt: Date.now(),
          }
        : o,
    )
    commit({ ...state, orders }, ['orders'])
  },

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  reset() {
    const seed = resetState()
    state = seed
    emit()
    broadcastChange('orders', ORIGIN)
    broadcastChange('products', ORIGIN)
    broadcastChange('tables', ORIGIN)
    broadcastChange('menu', ORIGIN)
  },
}

// ---------------------------------------------------------------------------
// Selectores / helpers de cálculo
// ---------------------------------------------------------------------------

export interface OrderTotals {
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

export function orderItemTotal(item: DemoOrderItem): number {
  const mods = item.modifiers.reduce((s, m) => s + m.price, 0)
  return (item.basePrice + mods) * item.qty
}

export function computeTotals(order: DemoOrder | undefined, taxRate: number): OrderTotals {
  if (!order) return { subtotal: 0, tax: 0, total: 0, itemCount: 0 }
  const subtotal = order.items.reduce((s, i) => s + orderItemTotal(i), 0)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0)
  return { subtotal, tax, total: subtotal + tax, itemCount }
}

export function formatMoney(value: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export { DEMO_KEYS }
