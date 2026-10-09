/**
 * FoodIX — Visor de platillo estilo "Vips" para la carta digital.
 *
 * Overlay a pantalla completa (mobile-first) que se abre al tocar un platillo:
 * imagen grande, flechas y swipe para navegar ENTRE platillos de la lista
 * filtrada, contador, nombre + descripción, precio con agregar al carrito y una
 * tira de miniaturas inferior con el platillo activo resaltado.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Share2, Clock, Flame, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { BADGE_CONFIG, type MenuItem } from '@/lib/data/menuData'
import { useCartStore } from '@/lib/stores/cartStore'

interface CartaItemViewerProps {
  items: MenuItem[]
  /** id del platillo activo; null = cerrado */
  activeId: string | null
  onActiveIdChange: (id: string) => void
  onClose: () => void
  /** Nombre de la sección a la que pertenece el platillo (para el breadcrumb) */
  categoryName?: (item: MenuItem) => string
  /** Si es false, la carta es solo informativa: sin cantidad ni agregar al carrito */
  canOrder?: boolean
}

export function CartaItemViewer({ items, activeId, onActiveIdChange, onClose, categoryName, canOrder = true }: CartaItemViewerProps) {
  const addItem = useCartStore(s => s.addItem)
  const [qty, setQty] = useState(1)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomedIn, setZoomedIn] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  // El visor debe vivir fuera de PageTransition. Ese wrapper usa transform y
  // filter durante la navegación, lo que convierte los elementos `fixed` en
  // relativos al wrapper y puede recortar/desenfocar el modal en móviles.
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Reinicia la cantidad al cambiar de platillo.
  useEffect(() => {
    setQty(1)
    setZoomOpen(false)
    setZoomedIn(false)
    setPanOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }, [activeId])

  // Bloquea el scroll del fondo y habilita teclado mientras está abierto.
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

  // Si el platillo activo deja de existir (cambió un filtro), cerramos.
  useEffect(() => {
    if (activeId != null && index < 0) onClose()
  }, [activeId, index, onClose])

  // Centra la miniatura activa en la tira inferior.
  useEffect(() => {
    if (index < 0) return
    const strip = stripRef.current
    const thumb = strip?.children[index] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index])

  if (!item || !mounted) return null

  const badge = item.badge ? BADGE_CONFIG[item.badge] : null
  const section = categoryName?.(item) ?? 'Menú'

  const handleAdd = () => {
    addItem({ productId: item.id, productName: item.name, image: item.image, unitPrice: item.price }, qty)
    toast.success(`${item.name} agregado`, {
      description: `${qty} × $${item.price} = $${(item.price * qty).toFixed(2)} MXN`,
      duration: 2500,
    })
    onClose()
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://restauros.app/carta'
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: item.name, text: `${item.description} — $${item.price} MXN`, url }) } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  const handleDragStart = (clientX: number, clientY: number) => {
    if (!zoomedIn) return
    setIsDragging(true)
    dragStart.current = { x: clientX, y: clientY }
    hasMoved.current = false
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return
    const dx = clientX - dragStart.current.x
    const dy = clientY - dragStart.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved.current = true
    }
    setPanOffset((prev) => {
      const limitX = typeof window !== 'undefined' ? window.innerWidth * 0.7 : 400
      const limitY = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 400
      return {
        x: Math.max(-limitX, Math.min(limitX, prev.x + dx)),
        y: Math.max(-limitY, Math.min(limitY, prev.y + dy)),
      }
    })
    dragStart.current = { x: clientX, y: clientY }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return createPortal((
    <>
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in p-0 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
    >
      {/* Tarjeta modal centrada y fija: NUNCA scrollea en su conjunto. La
          imagen queda fija arriba (columna izquierda en escritorio) y la tira
          de miniaturas fija abajo; solo la sección de info hace scroll interno.
          Así la imagen y las miniaturas permanecen siempre visibles y nada se
          desborda del viewport. Pantalla casi completa en móvil, tarjeta de dos
          columnas en escritorio. */}
      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-br from-[#F26611] via-[#D1400F] to-[#B03508] text-white shadow-2xl sm:h-[min(92vh,48rem)] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 lg:h-[min(88vh,44rem)] lg:max-w-4xl lg:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Columna de imagen — fija (no scrollea). Alto fijo arriba en móvil;
            columna izquierda completa en escritorio. */}
        <div className="relative shrink-0 lg:h-full lg:w-1/2">
          {/* Barra flotante sobre la imagen: contador + compartir + cerrar */}
          <div
            className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/45 to-transparent px-3 pb-8"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <span className="text-sm font-bold tabular-nums tracking-wide drop-shadow">
              {index + 1} <span className="text-white/70">/ {items.length}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                aria-label="Compartir"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 active:scale-90 transition-all"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 active:scale-90 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Imagen con flechas — alto fijo en mobile (nunca se colapsa),
              llena la columna completa en escritorio. */}
          <div
            key={`viewer-image-${item.id}`}
            className="relative h-[44vh] min-h-[280px] w-full overflow-hidden bg-white shadow-inner animate-viewer-image-in lg:h-full lg:min-h-0"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {item.image ? (
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                className="relative h-full w-full block cursor-zoom-in focus:outline-none group"
                aria-label="Ampliar imagen"
              >
                {/* Fondo borroso para rellenar sin recortar el platillo */}
                <Image src={item.image} alt="" aria-hidden fill className="object-cover scale-110 blur-2xl opacity-40" unoptimized />
                <Image
                  key={item.id}
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width:1023px) 100vw, 32rem"
                  className="object-contain animate-fade-in transition-transform duration-300 group-hover:scale-[1.02]"
                  unoptimized
                  priority
                />

                {/* Indicador visual de zoom */}
                <div className="absolute right-3 top-14 w-8 h-8 rounded-full bg-black/40 text-white/80 group-hover:text-white group-hover:bg-black/60 flex items-center justify-center backdrop-blur transition-all active:scale-95 shadow shadow-black/20 z-10">
                  <ZoomIn className="h-4.5 w-4.5" />
                </div>
              </button>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-50 to-stone-200">
                <span className="text-7xl opacity-90">🍽️</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Sin imagen</span>
              </div>
            )}

            {badge && (
              <span className={cn('absolute top-14 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full shadow z-10', badge.bg)}>
                {badge.label}
              </span>
            )}

            {items.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    go(-1)
                  }}
                  aria-label="Anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition-all z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    go(1)
                  }}
                  aria-label="Siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition-all z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Columna de info — breadcrumb fijo arriba, sección central con scroll
            interno y tira de miniaturas fija abajo (misma mecánica en móvil y
            escritorio). `min-h-0` permite que el hijo con overflow encoja. */}
        <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:w-1/2">
          <div className="shrink-0 truncate px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] lg:pt-5">
            <span className="text-white/55">Menú</span> <span className="text-white/35">»</span> <span className="text-white">{section}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-3">
            {/* Card del platillo con glassmorphism */}
            <div key={`info-card-${item.id}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/15 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_32px_-16px_rgba(0,0,0,0.55)] transition-shadow duration-300 hover:shadow-2xl animate-info-card-in before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/20 before:content-['']">
              {/* Cabecera: Nombre y Badges */}
              <div className="flex flex-col gap-1">
                <h2 className="text-left text-lg sm:text-xl font-extrabold uppercase tracking-wide leading-tight text-white">
                  {item.name}
                </h2>

                {/* Badges de atributos si existen */}
                {(item.prepTime || (item.spiceLevel !== undefined && item.spiceLevel > 0)) && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {item.prepTime && (
                      <span className="flex items-center gap-1 text-[10px] text-white/85 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/5 font-semibold">
                        <Clock className="h-3 w-3" /> {item.prepTime} min
                      </span>
                    )}
                    {item.spiceLevel !== undefined && item.spiceLevel > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-200 bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/10 font-semibold animate-pulse">
                        <Flame className="h-3 w-3" /> Picante
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Descripción sin truncamiento (UX intuitiva para ver ingredientes) */}
              {item.description && (
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed text-left select-text">
                  {item.description}
                </p>
              )}

              {/* Separador fino */}
              <div className="border-t border-white/5 my-1" />

              {/* Fila de precio y cantidad */}
              <div className="flex items-center justify-between gap-3">
                <div className="leading-none shrink-0 flex items-baseline gap-1">
                  <p className="text-[1.75rem] font-extrabold tabular-nums drop-shadow-sm">${item.price}</p>
                  <p className="text-[10px] text-white/70 font-semibold">MXN</p>
                </div>

                {canOrder && (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Menos"
                      className="w-8 h-8 rounded-full border border-white/30 hover:border-white/50 flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all bg-white/5"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-base font-extrabold w-5 text-center tabular-nums">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(20, q + 1))}
                      disabled={qty >= 20}
                      aria-label="Más"
                      className="w-8 h-8 rounded-full border border-white/30 hover:border-white/50 flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all bg-white/5"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de compra */}
              {canOrder && (
                <button
                  onClick={handleAdd}
                  className="h-12 w-full rounded-xl bg-white text-[#B03508] text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_10px_22px_-8px_rgba(0,0,0,0.5)] ring-1 ring-black/5 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span key={qty} className="animate-price-pop">Agregar al pedido · ${(item.price * qty).toFixed(2)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tira de miniaturas */}
          <div
            ref={stripRef}
            className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] bg-black/10"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => onActiveIdChange(it.id)}
                aria-label={it.name}
                aria-current={i === index}
                className={cn(
                  'relative shrink-0 h-16 w-16 rounded-xl overflow-hidden transition-all duration-200',
                  i === index ? 'ring-[3px] ring-white scale-110 shadow-lg shadow-black/30' : 'opacity-55 hover:opacity-100 hover:scale-105',
                )}
              >
                {it.image ? (
                  <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" unoptimized />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-200 text-2xl">🍽️</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full Screen Lightbox Overlay */}
      {zoomOpen && item.image && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-sm flex flex-col justify-center items-center select-none animate-fade-in"
          onClick={() => {
            setZoomOpen(false)
            setZoomedIn(false)
            setPanOffset({ x: 0, y: 0 })
          }}
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoomOpen(false)
              setZoomedIn(false)
              setPanOffset({ x: 0, y: 0 })
            }}
            aria-label="Cerrar zoom"
            className="absolute top-4 right-4 z-[90] w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow shadow-black/10"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoomedIn(value => !value)
              setPanOffset({ x: 0, y: 0 })
            }}
            aria-label={zoomedIn ? 'Alejar imagen' : 'Acercar imagen'}
            className="absolute top-4 right-20 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur transition-all hover:bg-white/20 active:scale-90"
          >
            {zoomedIn ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
          </button>

          {/* Imagen interactiva */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] p-4 flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.name}
              draggable={false}
              className={cn(
                "max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none",
                zoomedIn ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              )}
              style={{
                transform: zoomedIn
                  ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(2.2)`
                  : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: zoomedIn ? 'none' : 'auto',
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                if (!zoomedIn) {
                  setZoomedIn(true)
                  setPanOffset({ x: 0, y: 0 })
                } else {
                  handleDragStart(e.clientX, e.clientY)
                }
              }}
              onMouseMove={(e) => {
                if (zoomedIn) handleDragMove(e.clientX, e.clientY)
              }}
              onMouseUp={() => {
                if (zoomedIn) {
                  handleDragEnd()
                  if (!hasMoved.current) {
                    setZoomedIn(false)
                    setPanOffset({ x: 0, y: 0 })
                  }
                }
              }}
              onMouseLeave={() => {
                if (zoomedIn) handleDragEnd()
              }}
              onTouchStart={(e) => {
                if (!zoomedIn) {
                  setZoomedIn(true)
                  setPanOffset({ x: 0, y: 0 })
                } else if (e.touches.length === 1) {
                  handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
                }
              }}
              onTouchMove={(e) => {
                if (zoomedIn && e.touches.length === 1) {
                  handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
                }
              }}
              onTouchEnd={() => {
                if (zoomedIn) {
                  handleDragEnd()
                  if (!hasMoved.current) {
                    setZoomedIn(false)
                    setPanOffset({ x: 0, y: 0 })
                  }
                }
              }}
            />
          </div>

          <div className="absolute bottom-6 text-center text-xs text-white/60 pointer-events-none px-4">
            <p className="font-semibold text-white/90 text-sm mb-1">{item.name}</p>
            <p>
              {zoomedIn
                ? 'Arrastra para explorar la imagen · Toca para alejar'
                : 'Toca o haz clic para ampliar imagen'}
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  ), document.body)
}
