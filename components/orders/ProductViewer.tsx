/**
 * FoodIX — Visor de producto estilo "Vips" para el mesero.
 *
 * Overlay a pantalla completa que se abre al tocar un platillo en el
 * ProductPicker: imagen grande, flechas/teclado/swipe para navegar entre los
 * productos filtrados, contador, descripción, precio y controles para agregar al
 * pedido (o abrir modificadores), con tira de miniaturas inferior.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Product } from '@/lib/types'

interface ProductViewerProps {
  items: Product[]
  /** id del producto activo; null = cerrado */
  activeId: number | null
  onActiveIdChange: (id: number) => void
  onClose: () => void
  categoryName?: (p: Product) => string
  qtyOf: (p: Product) => number
  canAdd: (p: Product) => boolean
  hasModifiers: (p: Product) => boolean
  /** Agregar uno (o abrir modificadores si los tiene) */
  onAdd: (p: Product) => void
  /** Quitar uno del pedido */
  onDecrease: (p: Product) => void
}

export function ProductViewer({
  items, activeId, onActiveIdChange, onClose,
  categoryName, qtyOf, canAdd, hasModifiers, onAdd, onDecrease,
}: ProductViewerProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  const index = activeId == null ? -1 : items.findIndex(i => i.id === activeId)
  const item = index >= 0 ? items[index] : null

  const go = useCallback(
    (dir: -1 | 1) => {
      if (index < 0 || items.length === 0) return
      const next = (index + dir + items.length) % items.length
      onActiveIdChange(items[next].id)
    },
    [index, items, onActiveIdChange],
  )

  useEffect(() => {
    if (activeId == null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handler)
    }
  }, [activeId, go, onClose])

  // Si el producto activo deja de existir (cambió un filtro), cerramos.
  useEffect(() => {
    if (activeId != null && index < 0) onClose()
  }, [activeId, index, onClose])

  // Centra la miniatura activa.
  useEffect(() => {
    if (index < 0) return
    const thumb = stripRef.current?.children[index] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index])

  if (!item) return null

  const section = categoryName?.(item) ?? 'Menú'
  const qty = qtyOf(item)
  const available = canAdd(item)
  const modifiers = hasModifiers(item)

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-[#FACC15] to-[#EAB308] text-white animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      {/* Barra superior */}
      <div className="shrink-0 flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <span className="text-base font-bold tabular-nums tracking-wide">
          {index + 1} <span className="text-white/60">/ {items.length}</span>
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 active:scale-90 transition-all"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="shrink-0 px-4 pb-2 text-sm font-medium text-white/80 truncate">
        Menú <span className="text-white/40">»</span> {section}
      </div>

      {/* Imagen adaptable */}
      <div className="flex-1 min-h-0 px-4 py-2">
        <div className="mx-auto h-full w-full max-w-md">
          <div
            className="relative h-full w-full rounded-2xl overflow-hidden bg-white shadow-2xl shadow-black/30"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.name} className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-50 to-stone-200">
                <span className="text-7xl opacity-90">{item.emoji ?? '🍽️'}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Sin imagen</span>
              </div>
            )}

            {!available && (
              <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white shadow">Agotado</span>
            )}

            {items.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bloque fijo: nombre + descripción + acción */}
      <div className="shrink-0 bg-gradient-to-t from-[#EAB308] to-[#EAB308]/85 px-4 pt-3 pb-2 border-t border-white/10">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-3">
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide leading-tight line-clamp-2">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-xs sm:text-sm text-white/85 leading-snug line-clamp-2">{item.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="leading-none shrink-0">
              <p className="text-2xl font-extrabold tabular-nums">{formatCurrency(item.price)}</p>
            </div>
            <div className="ml-auto">
              {!available ? (
                <span className="inline-flex items-center rounded-xl border border-white/40 px-4 h-12 text-sm font-semibold text-white/80">No disponible</span>
              ) : modifiers ? (
                <button
                  onClick={() => onAdd(item)}
                  className="h-12 px-5 rounded-xl bg-white text-yellow-800 text-sm font-extrabold flex items-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Elegir opciones
                </button>
              ) : qty > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onDecrease(item)}
                    aria-label="Quitar uno"
                    className="w-11 h-11 rounded-full border border-white/40 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-xl font-extrabold w-6 text-center tabular-nums">{qty}</span>
                  <button
                    onClick={() => onAdd(item)}
                    aria-label="Agregar uno"
                    className="w-11 h-11 rounded-full bg-white text-yellow-800 flex items-center justify-center active:scale-90 transition-all shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onAdd(item)}
                  className="h-12 px-5 rounded-xl bg-white text-yellow-800 text-sm font-extrabold flex items-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                >
                  <ShoppingCart className="h-4 w-4" /> Agregar al pedido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tira de miniaturas */}
      <div
        ref={stripRef}
        className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] bg-black/10"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {items.map((it, i) => {
          const itQty = qtyOf(it)
          return (
            <button
              key={it.id}
              onClick={() => onActiveIdChange(it.id)}
              aria-label={it.name}
              aria-current={i === index}
              className={cn(
                'relative shrink-0 h-16 w-16 rounded-xl overflow-hidden transition-all',
                i === index ? 'ring-[3px] ring-white scale-105' : 'opacity-60 hover:opacity-100',
              )}
            >
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-200 text-2xl">{it.emoji ?? '🍽️'}</span>
              )}
              {itQty > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-[#1C1917] text-white text-[10px] font-bold flex items-center justify-center">{itQty}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
