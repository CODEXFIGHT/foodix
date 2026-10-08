/**
 * FoodIX — Formato de líneas de pedido con precio variable / por kilogramo.
 * Lógica pura compartida por el resumen de comanda, la cocina (KDS) y el ticket,
 * para que un producto por peso o de precio variable se muestre igual en todos
 * lados (ej. "1.25 kg × $240.00").
 */
import { formatCurrency } from '@/lib/utils/formatters'
import type { PriceType } from '@/lib/types'

interface PriceLine {
  price_type?: PriceType | null
  weight_kg?: number | null
  price_per_kg?: number | null
  price_pending?: boolean
}

/** ¿La línea se cobra por peso (tiene precio/kg)? */
export function isKgLine(i: PriceLine): boolean {
  return i.price_type === 'kg' || (i.price_per_kg != null && i.price_per_kg > 0)
}

/** ¿La línea es de precio variable capturado al vender? */
export function isVariableLine(i: PriceLine): boolean {
  return i.price_type === 'open' || (i.price_type === 'variable' && !isKgLine(i))
}

/**
 * Detalle legible de una línea por kilogramo: "1.25 kg × $240.00".
 * Si el peso aún no se captura (precio estimado), indica el precio/kg pendiente.
 * Devuelve null si la línea no es por peso.
 */
export function formatKgDetail(i: PriceLine): string | null {
  if (!isKgLine(i)) return null
  const ppk = i.price_per_kg ?? 0
  if (i.weight_kg && i.weight_kg > 0) {
    return `${i.weight_kg} kg × ${formatCurrency(ppk)}/kg`
  }
  return `${formatCurrency(ppk)}/kg · pendiente de pesar`
}

/**
 * Etiqueta corta del tipo de precio para mostrar como distintivo en cocina/ticket.
 * Devuelve null para precio fijo (no necesita etiqueta).
 */
export function priceTypeLabel(i: PriceLine): string | null {
  if (isKgLine(i)) return 'Por kg'
  if (isVariableLine(i)) return 'Precio variable'
  return null
}
