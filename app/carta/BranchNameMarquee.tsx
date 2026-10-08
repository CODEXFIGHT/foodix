'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface BranchNameMarqueeProps {
  name: string
}

/**
 * Título del nombre del restaurante en el header de la carta.
 *
 * Si el nombre cabe en el ancho disponible se muestra tal cual. Si NO cabe,
 * en vez de recortarlo con "…" hace un scroll horizontal suave de lado a lado
 * y regresa (ping-pong): avanza lento hasta revelar el final, hace una pausa,
 * y vuelve al inicio con easing en ambos extremos. No es un marquee infinito
 * en un solo sentido: siempre va y vuelve mostrando el nombre completo.
 *
 * Respeta `prefers-reduced-motion`: sin animación, recorta con elipsis.
 */
export function BranchNameMarquee({ name }: BranchNameMarqueeProps) {
  const textRef = useRef<HTMLHeadingElement>(null)
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    const measure = () => {
      const el = textRef.current
      if (!el) return
      // scrollWidth = ancho real del texto; clientWidth = ancho visible (viewport).
      const diff = el.scrollWidth - el.clientWidth
      setOverflow(diff > 4 ? diff : 0)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (textRef.current) observer.observe(textRef.current)
    return () => observer.disconnect()
  }, [name])

  const isOverflowing = overflow > 0
  // Duración proporcional al recorrido para mantener una velocidad lenta y
  // constante (~28px/s en el tramo de avance), acotada para nombres extremos.
  const duration = Math.min(24, Math.max(9, overflow * 0.055 + 8))

  return (
    <div className="overflow-hidden">
      <h1
        ref={textRef}
        title={name}
        className={cn(
          'whitespace-nowrap text-xl font-black leading-tight tracking-tight',
          isOverflowing
            ? 'branch-name-pingpong motion-reduce:animate-none motion-reduce:overflow-hidden motion-reduce:text-ellipsis'
            : 'truncate',
        )}
        style={
          isOverflowing
            ? ({ '--bn-overflow': `${overflow}px`, animationDuration: `${duration}s` } as React.CSSProperties)
            : undefined
        }
      >
        {name}
      </h1>
    </div>
  )
}
