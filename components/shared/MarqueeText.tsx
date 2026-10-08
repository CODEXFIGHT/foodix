'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Texto que se trunca normalmente y, solo si desborda su contenedor, pasa a
 * un efecto de deslizamiento continuo (mismo patrón que
 * app/carta/BranchAddressTicker.tsx, generalizado para reutilizarse).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface MarqueeTextProps {
  text: string
  /** Tipografía/color aplicados al texto (mismas clases en ambos modos). */
  className?: string
  /** Ancho/alto del contenedor visible (define dónde se corta/desliza). */
  viewportClassName?: string
}

export function MarqueeText({ text, className, viewportClassName }: MarqueeTextProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  // Medidor invisible siempre presente (independiente del modo activo): si
  // solo midiéramos el span visible, al quedar en modo marquee perderíamos
  // la referencia y un texto más corto después ya no podría "des-marquesear".
  const measureRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current
      const measureEl = measureRef.current
      if (!viewport || !measureEl) return
      setIsOverflowing(measureEl.scrollWidth > viewport.clientWidth + 2)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [text])

  const duration = `${Math.max(10, Math.min(24, text.length * 0.28))}s`

  return (
    <div ref={viewportRef} className={cn('relative min-w-0 overflow-hidden', viewportClassName)} title={text}>
      <span ref={measureRef} aria-hidden="true" className={cn('invisible absolute whitespace-nowrap', className)}>
        {text}
      </span>

      {isOverflowing ? (
        <div className="address-ticker-track flex w-max gap-10 whitespace-nowrap" style={{ animationDuration: duration }}>
          <span aria-hidden="true" className={className}>{text}</span>
          <span aria-hidden="true" className={className}>{text}</span>
        </div>
      ) : (
        <span className={cn('block truncate', className)}>{text}</span>
      )}

      <span className="sr-only">{text}</span>
    </div>
  )
}
