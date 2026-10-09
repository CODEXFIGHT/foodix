'use client'

import { useState, useEffect } from 'react'
import { Clock, Flame, Snowflake, Check, CookingPot, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { StationOrder } from '@/lib/types'

interface StationOrderCardProps {
  order: StationOrder
  /** Estación de la pantalla. En la vista unificada (Todas) sirve solo como
   *  respaldo: el icono/acción de cada ítem usa `item.station` cuando existe. */
  station: 'hot' | 'cold'
  onAction: (orderItemId: number, newStatus: 'preparing' | 'ready' | 'delivered', station: 'hot' | 'cold') => void
  isUpdating?: boolean
  onCancelItem: (orderId: number, orderItemId: number, productName: string) => void
}

export function StationOrderCard({
  order,
  station,
  onAction,
  isUpdating,
  onCancelItem,
}: StationOrderCardProps) {
  const [elapsed, setElapsed] = useState(order.elapsed_seconds)

  // La card solo muestra minutos: refrescar cada 30s (no cada segundo) reduce
  // re-renders ~30× y mantiene fluidez en tablets Android económicas.
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 30), 30000)
    return () => clearInterval(t)
  }, [])

  // Format table / takeaway / delivery label
  const tableLabel = /^\d/.test(order.table_name) ? `Mesa ${order.table_name}` : order.table_name
  const orderTitle = order.order_type === 'takeaway' ? `Para llevar #${order.id}`
    : order.order_type === 'delivery' ? `Domicilio #${order.id}`
    : tableLabel

  return (
    <article className="animate-fade-in-up flex flex-col overflow-hidden rounded-2xl bg-white shadow-md border border-stone-100 transition-all duration-200">
      {/* Card Header */}
      <div className="flex items-center justify-between bg-stone-50 border-b border-stone-100 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-base font-extrabold text-stone-900 leading-tight truncate">
              {orderTitle}
            </p>
            {order.source === 'whatsapp' && (
              <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#25D366]/15 text-[#1a8f48] text-[10px] font-bold px-2 py-0.5">
                📱 WhatsApp
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5 truncate">
            👤 {order.source === 'whatsapp'
              ? (order.customer_name || order.customer_phone || 'Cliente WhatsApp')
              : (order.waiter_name || 'Mesero')}
          </p>
        </div>
        {/* Elapsed Time Badge */}
        <div className="flex items-center gap-1 bg-stone-100 text-stone-500 text-[11px] font-bold px-2 py-1 rounded-full shrink-0">
          <Clock className="h-3.5 w-3.5" />
          <span>{Math.max(0, Math.round(elapsed / 60))} min</span>
        </div>
      </div>

      {/* Items List */}
      <ul className="flex-1 divide-y divide-stone-100">
        {order.items.map(item => {
          const isCancelled = item.station_status === 'cancelled'
          const isDelivered = item.station_status === 'delivered'
          const itemStation = item.station ?? station
          const StationIcon = itemStation === 'hot' ? Flame : Snowflake

          // Status Badge Meta
          const getBadgeStyles = () => {
            if (isCancelled) return 'bg-red-50 text-red-500'
            if (isDelivered) return 'bg-stone-100 text-stone-400'
            if (item.station_status === 'pending') return 'bg-blue-50 text-blue-500'
            if (item.station_status === 'preparing') return 'bg-amber-50 text-yellow-400'
            return 'bg-emerald-50 text-emerald-500 font-semibold' // ready
          }

          return (
            <li key={item.order_item_id} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-start gap-2 text-sm font-bold text-stone-950">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-stone-900 text-xs font-bold text-white select-none">
                      {item.quantity}
                    </span>
                    <span className={cn('mt-0.5 truncate leading-tight', isCancelled && 'line-through text-stone-400')}>
                      {item.product_name}
                    </span>
                  </p>

                  {/* Modifiers como badges visibles (Sin cebolla, Extra aguacate…) */}
                  {item.modifiers && item.modifiers.length > 0 && !isCancelled && (
                    <div className="mt-1.5 ml-8 flex flex-wrap gap-1">
                      {item.modifiers.map((m, idx) => (
                        <span
                          key={`${m.name}-${idx}`}
                          className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {item.item_notes && !isCancelled && (
                    <div className="mt-1.5 ml-8">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                        📝 {item.item_notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Station Icon/Badge */}
                <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors', getBadgeStyles())}>
                  <StationIcon className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Action / Status Buttons */}
              {isCancelled ? (
                <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-500 text-base leading-none flex-shrink-0">✕</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-red-700 text-xs font-bold leading-none">PRODUCTO REMOVIDO</p>
                    <p className="text-stone-500 line-through text-xs mt-1 leading-tight">
                      El cliente o mesero canceló este artículo.
                    </p>
                  </div>
                </div>
              ) : isDelivered ? (
                <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-xs font-semibold text-stone-400 border border-stone-200/30">
                  <Check className="h-4 w-4" /> Entregado
                </div>
              ) : item.station_status === 'pending' ? (
                // Un solo toque: pasa directo a "listo" sin el paso intermedio
                // "Comenzar preparación" — el backend no exige esa cadena.
                <div className="mt-2.5 flex items-stretch gap-2">
                  <button
                    onClick={() => onAction(item.order_item_id, 'ready', itemStation)}
                    disabled={isUpdating}
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 py-3 text-sm font-bold text-stone-950 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CookingPot className="h-4 w-4" />
                    Marcar listo
                  </button>
                  <button
                    onClick={() => onCancelItem(order.id, item.order_item_id, item.product_name)}
                    disabled={isUpdating}
                    aria-label="Cancelar producto"
                    title="Cancelar producto"
                    className="flex min-h-[52px] shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : item.station_status === 'preparing' ? (
                <div className="mt-2.5 flex items-stretch gap-2">
                  <button
                    onClick={() => onAction(item.order_item_id, 'ready', itemStation)}
                    disabled={isUpdating}
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 py-3 text-sm font-bold text-stone-950 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CookingPot className="h-4 w-4" />
                    Marcar listo
                  </button>
                  <button
                    onClick={() => onCancelItem(order.id, item.order_item_id, item.product_name)}
                    disabled={isUpdating}
                    aria-label="Cancelar producto"
                    title="Cancelar producto"
                    className="flex min-h-[52px] shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onAction(item.order_item_id, 'delivered', itemStation)}
                  disabled={isUpdating}
                  className="mt-2.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Marcar entregado
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}
