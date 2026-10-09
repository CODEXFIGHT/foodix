/**
 * FoodIX — Sistema de gestión para restaurantes
 * Franja de promociones vigentes de la carta digital pública.
 *
 * Anuncia los descuentos automáticos (día/horario) que el backend ya aplica al
 * crear el pedido — ver evaluateOrderPromotions() en promotions.php. Aquí NO se
 * calcula ningún descuento: solo se comunica, para que el cliente sepa por qué
 * su total bajará al confirmar.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
'use client'

import { useState } from 'react'
import { BadgePercent, Clock, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface PublicPromotion {
  id: number
  name: string
  type: 'discount_percent' | 'discount_amount'
  value: number
  applies_to: 'order' | 'category' | 'product'
  target_id: number | null
  /** El backend ya evaluó día y horario con la zona horaria del servidor. */
  active_now: boolean
  schedule_label: string
}

/** "20% de descuento" / "$50 de descuento". */
export function promoValueLabel(promo: PublicPromotion): string {
  return promo.type === 'discount_percent'
    ? `${promo.value % 1 === 0 ? promo.value.toFixed(0) : promo.value}% de descuento`
    : `$${promo.value.toFixed(2)} de descuento`
}

/** Etiqueta corta para el chip sobre la tarjeta del platillo. */
export function promoBadgeLabel(promo: PublicPromotion): string {
  return promo.type === 'discount_percent'
    ? `-${promo.value % 1 === 0 ? promo.value.toFixed(0) : promo.value}%`
    : `-$${promo.value % 1 === 0 ? promo.value.toFixed(0) : promo.value}`
}

function scopeLabel(promo: PublicPromotion, categoryName?: string, productName?: string): string {
  if (promo.applies_to === 'order') return 'En todo tu pedido'
  if (promo.applies_to === 'category') return categoryName ? `En ${categoryName}` : 'En una sección de la carta'
  return productName ? `En ${productName}` : 'En un platillo seleccionado'
}

export function PromoStrip({
  promotions,
  categoryName,
  productName,
}: {
  promotions: PublicPromotion[]
  categoryName: (id: number) => string | undefined
  productName: (id: number) => string | undefined
}) {
  const [detailOpen, setDetailOpen] = useState(false)

  // La franja anuncia lo que está vigente AHORA; el resto se ve al abrir el
  // detalle (con su horario), igual que "click para ver detalles".
  const activas = promotions.filter(p => p.active_now)
  if (promotions.length === 0) return null

  const destacada = activas[0] ?? promotions[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#D1400F] via-[#F26611] to-amber-500 px-4 py-3 text-left shadow-lg shadow-[#D1400F]/25 transition-transform active:scale-[.985]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <BadgePercent className="h-5 w-5 text-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-white">{destacada.name}</span>
          <span className="block truncate text-[11px] font-semibold text-white/85">
            {promoValueLabel(destacada)}
            {activas.length > 1 && ` · +${activas.length - 1} promo${activas.length - 1 === 1 ? '' : 's'} más`}
            {activas.length === 0 && ` · ${destacada.schedule_label}`}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
          Ver <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      {detailOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Promociones">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in" onClick={() => setDetailOpen(false)} />

          <div
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-[#FAFAF8] shadow-2xl animate-fade-in-up sm:rounded-3xl"
            style={{ maxHeight: '85dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-[#D1400F] to-amber-500 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">Promociones</p>
                <h2 className="text-lg font-extrabold text-white">Descuentos de hoy</h2>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                aria-label="Cerrar promociones"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>
              {promotions.map(promo => (
                <div
                  key={promo.id}
                  className={cn(
                    'rounded-2xl border bg-white p-3.5 shadow-sm',
                    promo.active_now ? 'border-[#D1400F]/35' : 'border-stone-200 opacity-70',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        promo.active_now ? 'bg-[#D1400F]/10 text-[#D1400F]' : 'bg-stone-100 text-stone-400',
                      )}
                    >
                      <BadgePercent className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-stone-800">{promo.name}</p>
                      <p className="text-xs font-semibold text-[#D1400F]">{promoValueLabel(promo)}</p>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {scopeLabel(
                          promo,
                          promo.target_id != null ? categoryName(promo.target_id) : undefined,
                          promo.target_id != null ? productName(promo.target_id) : undefined,
                        )}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
                        <Clock className="h-3 w-3" /> {promo.schedule_label}
                      </p>
                    </div>
                    {promo.active_now && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Vigente
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <p className="pt-1 text-center text-[11px] leading-relaxed text-stone-400">
                Los descuentos se aplican automáticamente al confirmar tu pedido.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
