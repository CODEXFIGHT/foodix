/**
 * FoodIX — Sistema de gestión para restaurantes
 * Store del borrador de comanda del mesero, en memoria y aislado por mesa.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { create } from 'zustand'
import { findMergeableLine } from '@/lib/utils/productSearch'
import type { DraftOrderItem } from '@/components/orders/OrderSummary'

// Sin `persist`: el borrador vive solo mientras dura la sesión de la pestaña.
// Si el mesero recarga a mitad de una comanda, arranca limpio (evita comandas
// fantasma que ya no reflejan lo que hay físicamente en la mesa).
interface OrderDraftState {
  draftsByMesa: Record<number, DraftOrderItem[]>
  notesByMesa: Record<number, string>
  addItem: (mesaId: number, item: DraftOrderItem) => void
  incrementLine: (mesaId: number, uid: string) => void
  decrementLine: (mesaId: number, uid: string) => void
  removeLine: (mesaId: number, uid: string) => void
  setNote: (mesaId: number, note: string) => void
  clearDraft: (mesaId: number) => void
}

const EMPTY_ITEMS: DraftOrderItem[] = []

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  draftsByMesa: {},
  notesByMesa: {},

  addItem: (mesaId, item) => {
    const items = get().draftsByMesa[mesaId] ?? EMPTY_ITEMS
    const existing = findMergeableLine(items, item)
    const next = existing
      ? items.map(i => i.uid === existing.uid
          ? { ...i, quantity: i.quantity + item.quantity, subtotal: i.unit_price * (i.quantity + item.quantity) }
          : i)
      : [...items, item]
    set(s => ({ draftsByMesa: { ...s.draftsByMesa, [mesaId]: next } }))
  },

  incrementLine: (mesaId, uid) => {
    const items = get().draftsByMesa[mesaId] ?? EMPTY_ITEMS
    set(s => ({
      draftsByMesa: {
        ...s.draftsByMesa,
        [mesaId]: items.map(i => i.uid === uid
          ? { ...i, quantity: i.quantity + 1, subtotal: i.unit_price * (i.quantity + 1) }
          : i),
      },
    }))
  },

  decrementLine: (mesaId, uid) => {
    const items = get().draftsByMesa[mesaId] ?? EMPTY_ITEMS
    const line = items.find(i => i.uid === uid)
    if (!line) return
    const next = line.quantity <= 1
      ? items.filter(i => i.uid !== uid)
      : items.map(i => i.uid === uid
          ? { ...i, quantity: i.quantity - 1, subtotal: i.unit_price * (i.quantity - 1) }
          : i)
    set(s => ({ draftsByMesa: { ...s.draftsByMesa, [mesaId]: next } }))
  },

  removeLine: (mesaId, uid) => {
    const items = get().draftsByMesa[mesaId] ?? EMPTY_ITEMS
    set(s => ({ draftsByMesa: { ...s.draftsByMesa, [mesaId]: items.filter(i => i.uid !== uid) } }))
  },

  setNote: (mesaId, note) => set(s => ({ notesByMesa: { ...s.notesByMesa, [mesaId]: note } })),

  clearDraft: (mesaId) => set(s => {
    const draftsByMesa = { ...s.draftsByMesa }
    const notesByMesa = { ...s.notesByMesa }
    delete draftsByMesa[mesaId]
    delete notesByMesa[mesaId]
    return { draftsByMesa, notesByMesa }
  }),
}))

export function useMesaDraft(mesaId: number): DraftOrderItem[] {
  return useOrderDraftStore(s => s.draftsByMesa[mesaId] ?? EMPTY_ITEMS)
}

export function useMesaDraftNote(mesaId: number): string {
  return useOrderDraftStore(s => s.notesByMesa[mesaId] ?? '')
}

export function draftTotal(items: DraftOrderItem[]): number {
  return items.reduce((sum, i) => sum + i.subtotal, 0)
}

export function draftItemCount(items: DraftOrderItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

export function makeDraftUid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
