/**
 * FoodIX — Sistema de gestión para restaurantes
 * Lógica pura de "Dividir Cuenta": construye y valida planes de división
 * (por productos, por personas, por monto o por comensal) con aritmética de
 * centavos exacta. Sin dependencias de React/DOM para poder probarse aislada.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { OrderItem, OrderSplit, SplitMode, SplitStatus } from '@/lib/types'

/** Asignación de cantidad de un ítem a una división. */
export interface SplitItemAlloc {
  order_item_id: number
  quantity: number
}

/** Borrador de una división antes de enviarse al backend. */
export interface SplitDraft {
  label: string
  total: number
  items: SplitItemAlloc[]
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Divide un total en `parts` montos exactos en centavos. El residuo se reparte
 * de a un centavo entre las primeras divisiones, de modo que la suma SIEMPRE
 * iguala el total (sin perder ni inventar centavos).
 */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts < 1) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / parts)
  const remainder = cents - base * parts
  return Array.from({ length: parts }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100)
}

/** Etiqueta por defecto: "Cliente A", "Cliente B"… y numérica al pasar de la Z. */
export function defaultSplitLabel(index: number): string {
  return index < 26 ? `Cliente ${String.fromCharCode(65 + index)}` : `Cliente ${index + 1}`
}

/** Ítems divisibles (excluye cancelados). */
export function splittableItems(items: OrderItem[]): OrderItem[] {
  return items.filter(i => i.status !== 'cancelled')
}

/** Precio unitario de línea: el subtotal ya incluye modificadores y peso/KG. */
export function lineUnit(item: Pick<OrderItem, 'subtotal' | 'quantity'>): number {
  return item.quantity > 0 ? item.subtotal / item.quantity : item.subtotal
}

/** Total de una división por ítems a partir de su asignación de cantidades. */
export function allocTotal(items: SplitItemAlloc[], byId: Map<number, OrderItem>): number {
  return roundMoney(
    items.reduce((sum, a) => {
      const it = byId.get(a.order_item_id)
      return it ? sum + lineUnit(it) * a.quantity : sum
    }, 0),
  )
}

/** Plan por personas / por monto igual: divide el total en partes iguales. */
export function buildPeopleSplits(total: number, people: number): SplitDraft[] {
  return splitEvenly(total, people).map((amount, i) => ({
    label: defaultSplitLabel(i),
    total: amount,
    items: [],
  }))
}

/**
 * Construye divisiones por productos/comensal desde grupos de asignación.
 * Cada grupo aporta el subtotal de las cantidades que tiene asignadas.
 */
export function buildItemSplits(
  groups: { label: string; alloc: Map<number, number> }[],
  items: OrderItem[],
): SplitDraft[] {
  const byId = new Map(items.map(i => [i.id, i]))
  return groups.map(g => {
    const allocItems: SplitItemAlloc[] = [...g.alloc.entries()]
      .filter(([, qty]) => qty > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity }))
    return { label: g.label, total: allocTotal(allocItems, byId), items: allocItems }
  })
}

/** Verifica que TODA la cantidad de cada ítem quede asignada (modo por ítems). */
export function fullyAllocated(items: OrderItem[], splits: SplitDraft[]): boolean {
  const assigned = new Map<number, number>()
  for (const s of splits) {
    for (const a of s.items) {
      assigned.set(a.order_item_id, (assigned.get(a.order_item_id) ?? 0) + a.quantity)
    }
  }
  return splittableItems(items).every(i => (assigned.get(i.id) ?? 0) === i.quantity)
}

export interface SplitValidation {
  ok: boolean
  message?: string
}

/**
 * Valida un plan antes de enviarlo: ≥2 divisiones, montos positivos y suma que
 * iguala el total de la cuenta. En modos por ítems exige asignación completa.
 */
export function validateSplitPlan(
  splits: SplitDraft[],
  orderTotal: number,
  mode: SplitMode,
  items: OrderItem[] = [],
): SplitValidation {
  if (splits.length < 2) return { ok: false, message: 'Crea al menos 2 divisiones' }
  if (splits.some(s => s.total <= 0)) {
    return { ok: false, message: 'Cada división debe tener un monto mayor a 0' }
  }
  const sum = roundMoney(splits.reduce((s, x) => s + x.total, 0))
  if (Math.abs(sum - roundMoney(orderTotal)) > 0.05) {
    return {
      ok: false,
      message: `La suma de las divisiones ($${sum.toFixed(2)}) debe igualar el total ($${orderTotal.toFixed(2)})`,
    }
  }
  if ((mode === 'items' || mode === 'guest') && items.length > 0 && !fullyAllocated(items, splits)) {
    return { ok: false, message: 'Asigna todos los productos a una división' }
  }
  return { ok: true }
}

export interface SplitProgress {
  /** Divisiones cobradas. */
  paid: number
  /** Total de divisiones. */
  total: number
  paidAmount: number
  totalAmount: number
  allPaid: boolean
  /** 0–100 según divisiones cobradas. */
  percent: number
}

/** Resumen del progreso de cobro de un plan de divisiones (para la UI). */
export function splitProgress(
  splits: Pick<OrderSplit, 'status' | 'total'>[] | undefined,
): SplitProgress {
  const list = splits ?? []
  const total = list.length
  const paid = list.filter(s => s.status === 'paid').length
  const totalAmount = roundMoney(list.reduce((s, x) => s + x.total, 0))
  const paidAmount = roundMoney(
    list.reduce((s, x) => s + (x.status === 'paid' ? x.total : 0), 0),
  )
  return {
    paid,
    total,
    paidAmount,
    totalAmount,
    allPaid: total > 0 && paid === total,
    percent: total > 0 ? Math.round((paid / total) * 100) : 0,
  }
}

/** Etiqueta legible del estado de una división. */
export function splitStatusLabel(status: SplitStatus): string {
  return status === 'paid' ? 'Pagado' : status === 'cancelled' ? 'Cancelado' : 'Pendiente'
}
