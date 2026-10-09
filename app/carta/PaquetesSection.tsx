/**
 * FoodIX — Sistema de gestión para restaurantes
 * Paquetes (combos) de la carta digital pública.
 *
 * Un paquete es un bundle a precio fijo definido en el panel (Promociones →
 * Combos). Aquí solo se muestra y se agrega al carrito como UNA línea con su
 * `comboId`: el desglose y el prorrateo de precio los hace el backend al crear
 * el pedido (expandComboToItems() en promotions.php), nunca el cliente.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, ShoppingBag, Check, PackageOpen, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { useCartStore, comboCartId } from '@/lib/stores/cartStore'

export interface PublicComboItem {
  product_id: number
  name: string
  quantity: number
  price: number
  available: boolean
  image: string | null
}

export interface PublicCombo {
  id: number
  name: string
  description: string
  price: number
  /** Suma del precio de catálogo de los componentes (para calcular el ahorro). */
  regular_price: number
  image: string | null
  sort_order: number
  /** Algún componente quedó sin disponibilidad: se muestra pero no se agrega. */
  sold_out: boolean
  items: PublicComboItem[]
}

/** Id de la pseudo-categoría "Paquetes" en el slider/sidebar de la carta. */
export const PAQUETES_CAT_ID = -1

export function comboSavings(combo: PublicCombo): number {
  return Math.max(0, Math.round((combo.regular_price - combo.price) * 100) / 100)
}

// ── Tarjeta de paquete ────────────────────────────────────────────────────────
function ComboCard({ combo, idx, onOpen }: { combo: PublicCombo; idx: number; onOpen: () => void }) {
  const savings = comboSavings(combo)
  const totalPiezas = combo.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver qué incluye ${combo.name}`}
      data-reveal=""
      style={{ transitionDelay: `${(idx % 10) * 45}ms` }}
      className="carta-reveal group relative flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-amber-300/70 bg-white text-left shadow-[0_4px_16px_-6px_rgba(28,25,23,0.18)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_36px_-12px_rgba(250,204,21,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04]/50 active:scale-[.965]"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {combo.image ? (
          <Image
            src={combo.image}
            alt={combo.name}
            fill
            sizes="(max-width:639px) 50vw, (max-width:1023px) 33vw, 22vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🥡</div>
        )}

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

        {/* Chips: distintivo de paquete + ahorro */}
        <div className="absolute left-2 right-2 top-2 flex flex-wrap items-start gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-stone-900 shadow">
            <PackageOpen className="h-3 w-3" /> Paquete
          </span>
          {savings > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              Ahorras ${savings.toFixed(0)}
            </span>
          )}
        </div>

        {combo.sold_out && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-stone-700">
              No disponible
            </span>
          </div>
        )}

        {/* Precio (con el precio suelto tachado cuando hay ahorro) */}
        <span className="absolute bottom-2 right-2 z-[1] inline-flex items-baseline gap-1 rounded-full bg-black/55 px-2.5 py-1 shadow-lg ring-1 ring-white/10 backdrop-blur-md">
          {savings > 0 && (
            <span className="text-[9px] font-medium text-white/60 line-through">${combo.regular_price.toFixed(0)}</span>
          )}
          <span className="text-sm font-extrabold text-white">${combo.price}</span>
          <span className="text-[9px] font-medium text-white/70">MXN</span>
        </span>
      </div>

      <div className="relative flex min-h-[3.25rem] flex-1 flex-col justify-center bg-gradient-to-br from-amber-500 via-[#FACC15] to-[#EAB308] px-3 py-2.5">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
        <h3 className="line-clamp-2 text-center text-sm font-bold uppercase leading-tight tracking-wide text-white">
          {combo.name}
        </h3>
        <p className="mt-0.5 text-center text-[10px] font-semibold text-white/75">
          {totalPiezas} {totalPiezas === 1 ? 'producto incluido' : 'productos incluidos'}
        </p>
      </div>
    </button>
  )
}

// ── Modal de detalle ──────────────────────────────────────────────────────────
function ComboModal({
  combo,
  canOrder,
  onClose,
}: {
  combo: PublicCombo
  canOrder: boolean
  onClose: () => void
}) {
  const addItem = useCartStore(s => s.addItem)
  const [qty, setQty] = useState(1)
  const savings = comboSavings(combo)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const handleAdd = () => {
    addItem(
      {
        productId:   comboCartId(combo.id),
        productName: combo.name,
        image:       combo.image ?? '',
        unitPrice:   combo.price,
        comboId:     combo.id,
        includes:    combo.items.map(i => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)),
      },
      qty,
    )
    toast.success(`${combo.name} agregado`, {
      description: `${qty} × $${combo.price} = $${(combo.price * qty).toFixed(2)} MXN`,
      duration: 2500,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={combo.name}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#FAFAF8] shadow-2xl animate-fade-in-up sm:rounded-3xl"
        style={{ maxHeight: '92dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Portada. Alto elástico: en pantallas bajas (móvil apaisado, ventanas
            reducidas) cede espacio a la lista de contenido en vez de empujarla
            fuera del área visible. */}
        <div className="relative shrink-0 bg-stone-200 h-[clamp(6.5rem,24dvh,13rem)]">
          {combo.image ? (
            <Image src={combo.image} alt={combo.name} fill sizes="512px" className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">🥡</div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />

          <button
            onClick={onClose}
            aria-label="Cerrar paquete"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-4 bottom-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold text-stone-900 shadow">
              <PackageOpen className="h-3 w-3" /> Paquete
            </span>
            <h2 className="mt-1.5 text-xl font-extrabold leading-tight text-white drop-shadow">{combo.name}</h2>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>
          {combo.description && (
            <p className="text-sm leading-relaxed text-stone-600">{combo.description}</p>
          )}

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-700 dark:text-yellow-400">Qué incluye</p>
            <ul className="space-y-2">
              {combo.items.map(item => (
                <li
                  key={item.product_id}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm',
                    !item.available && 'opacity-55',
                  )}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill sizes="44px" className="object-cover" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-lg">🍽️</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-stone-800">{item.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {item.available ? `$${item.price.toFixed(2)} por separado` : 'Temporalmente sin disponibilidad'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#FACC15]/10 px-2.5 py-1 text-xs font-extrabold text-yellow-700 dark:text-yellow-400">
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {savings > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">
                Por separado costaría ${combo.regular_price.toFixed(2)} — con el paquete ahorras ${savings.toFixed(2)}.
              </p>
            </div>
          )}
        </div>

        {/* Pie: cantidad + agregar */}
        <div className="shrink-0 space-y-3 border-t border-stone-200/80 bg-[#FAFAF8] px-5 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Precio del paquete</p>
              <p className="text-2xl font-extrabold leading-none text-yellow-700">
                ${(combo.price * qty).toFixed(2)}
                <span className="ml-1 text-xs font-normal text-stone-400">MXN</span>
              </p>
            </div>

            {canOrder && !combo.sold_out && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  aria-label="Quitar una unidad"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-all active:scale-90 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-base font-extrabold tabular-nums text-stone-800">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  aria-label="Agregar una unidad"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FACC15]/10 text-yellow-700 dark:text-yellow-400 transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {combo.sold_out ? (
            <p className="rounded-2xl bg-stone-200/70 px-4 py-3 text-center text-sm font-semibold text-stone-500">
              Este paquete no está disponible por ahora
            </p>
          ) : canOrder ? (
            <button
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3.5 text-sm font-bold text-stone-950 shadow-lg shadow-[#FACC15]/30 transition-all hover:bg-[#EAB308] active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              Agregar paquete a mi pedido
            </button>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-stone-200/70 px-4 py-3 text-center text-sm font-semibold text-stone-500">
              <Check className="h-4 w-4" /> Consulta este paquete con tu mesero
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sección completa ──────────────────────────────────────────────────────────
export function PaquetesSection({
  combos,
  canOrder,
  scrollMarginTop,
  sectionRef,
  onSeeAll,
}: {
  combos: PublicCombo[]
  canOrder: boolean
  scrollMarginTop: number
  sectionRef?: (el: HTMLElement | null) => void
  onSeeAll?: () => void
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  const open = combos.find(c => c.id === openId) ?? null

  if (combos.length === 0) return null

  return (
    <>
      <section
        id={`cat-${PAQUETES_CAT_ID}`}
        data-cat-id={PAQUETES_CAT_ID}
        ref={sectionRef}
        style={{ scrollMarginTop }}
        className="carta-menu-section"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-amber-500 shadow-sm" />
          <h3 className="text-lg font-extrabold uppercase tracking-wide text-amber-600">Paquetes</h3>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-600">
            {combos.length}
          </span>
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-stone-400 transition-colors hover:text-yellow-700 dark:hover:text-yellow-400"
            >
              Ver sección
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
          {combos.map((combo, i) => (
            <ComboCard key={combo.id} combo={combo} idx={i} onOpen={() => setOpenId(combo.id)} />
          ))}
        </div>
      </section>

      {open && <ComboModal combo={open} canOrder={canOrder} onClose={() => setOpenId(null)} />}
    </>
  )
}
