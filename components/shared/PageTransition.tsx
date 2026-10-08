'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Envuelve el contenido de una ruta y anima su entrada/salida en cada
 * navegación (fade + slide + scale), usando la key del pathname.
 * Usa Framer Motion (transform/opacity, acelerado por GPU en todos
 * los navegadores modernos) y respeta prefers-reduced-motion.
 *
 * Importante: la animación NO usa `filter`. Framer deja el valor de reposo
 * inline (`filter: blur(0px)`), y cualquier filter distinto de `none` crea
 * un containing block permanente que rompe `position: fixed` dentro de la
 * página — era la causa de que el navbar flotante de la landing no
 * apareciera al hacer scroll.
 *
 * El wrapper animado solo se monta después del primer render en cliente:
 * si Framer Motion aplicara sus estilos iniciales (opacity/blur/transform)
 * ya durante el SSR, el primer render del cliente no coincidiría con el
 * HTML del servidor y React marcaría un hydration mismatch. Retrasarlo un
 * tick evita eso sin perder la animación (sigue disparando en la carga
 * inicial, apenas 1 frame después).
 *
 * Al terminar la animación de entrada se limpian `transform`/`filter` del
 * nodo: mientras tengan un valor (aunque sea la identidad), crean un nuevo
 * containing block y rompen `position: sticky`/`fixed` dentro del contenido
 * (headers pegajosos, barras flotantes, etc.) durante el resto de la vida
 * de la página, no solo mientras dura la transición.
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const nodeRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        ref={nodeRef}
        className={className}
        initial={{ opacity: 0, y: 22, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.985 }}
        transition={{ duration: 0.5, ease: EASE }}
        onAnimationComplete={() => {
          // Framer Motion entrega la definición de animación como objeto en
          // este callback, no como la cadena "animate". La comparación
          // anterior impedía limpiar estos estilos y dejaba un containing
          // block permanente, rompiendo `position: fixed` y `sticky`.
          if (!nodeRef.current) return
          nodeRef.current.style.transform = ''
          nodeRef.current.style.filter = ''
          // `will-change: transform/filter` crea un containing block igual que
          // un transform real: si queda puesto, `position: fixed` sigue roto
          // aunque ya hayamos limpiado transform/filter.
          nodeRef.current.style.willChange = ''
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
