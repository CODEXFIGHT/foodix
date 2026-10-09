'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/formatters'
import { Separator } from '@/components/ui/separator'
import { Minus, Plus, Trash2, StickyNote } from 'lucide-react'
import { formatKgDetail } from '@/lib/utils/orderItemDisplay'
import { cn } from '@/lib/utils/cn'
import type { ChosenModifier, PriceType } from '@/lib/types'

export interface DraftOrderItem {
  // Identidad de línea. Un mismo producto con distintos modificadores son
  // líneas separadas, por eso usamos uid en vez de product_id como clave.
  uid: string
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  price_type?: PriceType
  modifiers?: ChosenModifier[]
  selectedModifiers?: string[]
  item_notes?: string
  weight_kg?: number
  price_per_kg?: number
  price_pending?: boolean
  /** Marca esta línea como un combo (el backend expande/reprecia — el frontend solo la etiqueta). */
  combo_id?: number
  combo_name?: string
}

export interface DiscountBreakdownLine {
  label: string
  amount: number
}

interface OrderSummaryProps {
  items: DraftOrderItem[]
  subtotal: number
  tax: number
  total: number
  taxRate?: number
  discount?: number
  /** Detalle de por qué se aplicó el descuento (promoción/cupón/lealtad). Si se omite, se muestra solo el total agregado. */
  discountBreakdown?: DiscountBreakdownLine[]
  tip?: number
  editable?: boolean
  compact?: boolean
  onUpdateQty?: (uid: string, qty: number) => void
  onRemove?: (uid: string) => void
  onUpdateNotes?: (uid: string, notes: string) => void
  /** Si se provee y hay productos, muestra el botón "Vaciar" para borrar todo. */
  onClearAll?: () => void
}

export function OrderSummary({
  items, subtotal, total, discount, discountBreakdown, tip,
  editable, compact, onUpdateQty, onRemove, onUpdateNotes, onClearAll,
}: OrderSummaryProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sin productos agregados
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {editable && onClearAll && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vaciar pedido
          </button>
        </div>
      )}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.uid} className={cn('space-y-1 rounded-xl', compact && 'border bg-muted/20 p-2')}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  {item.product_name}
                  {item.combo_id && (
                    <span className="ml-1.5 align-middle rounded-full bg-[#D1400F]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#D1400F]">
                      Combo{item.combo_name ? `: ${item.combo_name}` : ''}
                    </span>
                  )}
                </p>
                {formatKgDetail(item) ? (
                  <p className="text-xs font-medium text-[#D1400F]">{formatKgDetail(item)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unit_price)} c/u
                    {item.price_type === 'open' && <span className="ml-1 text-[#D1400F]">· variable</span>}
                  </p>
                )}
                {((item.modifiers && item.modifiers.length > 0) || (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                  <p className="text-xs text-muted-foreground leading-tight">
                    {[
                      ...(item.modifiers ?? []).map(m => m.name),
                      ...(item.selectedModifiers ?? [])
                    ].join(', ')}
                  </p>
                )}
                {item.item_notes && (
                  <p className="text-xs italic text-muted-foreground leading-tight">“{item.item_notes}”</p>
                )}
              </div>
              {editable ? (
                <div className="flex items-center gap-1 shrink-0">
                  {/* Los productos por kg tienen cantidad fija (1): solo se pueden quitar. */}
                  {!formatKgDetail(item) && (
                    <>
                      <button
                        onClick={() => {
                          if (item.quantity <= 1) onRemove?.(item.uid)
                          else onUpdateQty?.(item.uid, item.quantity - 1)
                        }}
                        aria-label="Quitar uno"
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQty?.(item.uid, item.quantity + 1)}
                        aria-label="Agregar uno"
                        className="w-8 h-8 rounded-full border border-[#D1400F] text-[#D1400F] flex items-center justify-center hover:bg-[#D1400F] hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {formatKgDetail(item) && (
                    <span className="text-sm font-semibold mr-1">{formatCurrency(item.subtotal)}</span>
                  )}
                  <button
                    onClick={() => onRemove?.(item.uid)}
                    aria-label={`Eliminar ${item.product_name}`}
                    title="Eliminar producto"
                    className="w-8 h-8 rounded-full text-destructive hover:bg-destructive hover:text-white flex items-center justify-center ml-1 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(item.subtotal)}</p>
                  <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                </div>
              )}
            </div>
            {editable && onUpdateNotes && (
              <OrderLineNote
                value={item.item_notes ?? ''}
                onChange={notes => onUpdateNotes(item.uid, notes)}
              />
            )}
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount !== undefined && discount > 0 && (
          discountBreakdown && discountBreakdown.length > 0 ? (
            discountBreakdown.map((d, i) => (
              <div key={i} className="flex justify-between text-green-600">
                <span className="truncate pr-2">{d.label}</span>
                <span className="shrink-0">−{formatCurrency(d.amount)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between text-green-600">
              <span>Descuento</span>
              <span>−{formatCurrency(discount)}</span>
            </div>
          )
        )}
        {tip !== undefined && tip > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Propina</span>
            <span>{formatCurrency(tip)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-base pt-1">
          <span>Total</span>
          <span className="text-[#D1400F]">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

/** Nota por producto (ej. "sin cebolla"): toggle compacto + input. */
function OrderLineNote({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(Boolean(value))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <StickyNote className="h-3 w-3" />
        Agregar nota
      </button>
    )
  }

  return (
    <input
      type="text"
      value={value}
      autoFocus
      maxLength={120}
      onChange={e => onChange(e.target.value)}
      onBlur={() => { if (!value) setOpen(false) }}
      placeholder="Ej. sin cebolla, bien cocido…"
      className="w-full text-xs rounded-md border bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#D1400F]"
    />
  )
}
