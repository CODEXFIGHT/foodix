'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Aparición al hacer scroll (misma implementación que la de page.tsx). */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        setShown(entry.isIntersecting)
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('reveal', shown && 'in-view', className)} style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}>
      {children}
    </div>
  )
}
