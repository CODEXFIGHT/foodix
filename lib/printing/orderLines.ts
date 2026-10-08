/**
 * FoodIX — Conversión de ítems de orden a líneas de ticket.
 * Centraliza el formato para que los productos de precio variable y por
 * kilogramo se impriman igual en cualquier ticket (cliente o reimpresión):
 *
 *   Ceviche Marlin
 *     1.25 kg × $240.00/kg
 *                              $300.00
 *
 *   Carne Tártara
 *     Precio variable
 *                              $185.00
 */
import { formatKgDetail, isVariableLine } from '@/lib/utils/orderItemDisplay'
import type { OrderItem } from '@/lib/types'
import type { ReceiptLine } from './escpos'

/** Mapea un ítem de orden a una línea de ticket con su detalle de precio. */
export function orderItemToReceiptLine(i: OrderItem): ReceiptLine {
  const detail: string[] = []
  const kg = formatKgDetail(i)
  if (kg) detail.push(kg)
  else if (isVariableLine(i)) detail.push('Precio variable')

  return {
    name: i.product_name,
    qty: i.quantity,
    total: i.subtotal,
    modifiers: [...detail, ...(i.modifiers ?? []).map(m => m.name)],
    notes: i.item_notes ?? null,
  }
}

/** Convierte los ítems de una orden a líneas de ticket (omitiendo cancelados). */
export function orderItemsToReceiptLines(items: OrderItem[]): ReceiptLine[] {
  return items.filter(i => i.status !== 'cancelled').map(orderItemToReceiptLine)
}
