'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface BranchAddressTickerProps {
  address: string
}

/** Muestra la dirección completa sin romper el header en pantallas pequeñas. */
export function BranchAddressTicker({ address }: BranchAddressTickerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport || !content) return
      setIsOverflowing(content.scrollWidth > viewport.clientWidth + 2)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [address])

  const duration = `${Math.max(16, Math.min(34, address.length * 0.32))}s`

  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-stone-400" title={address}>
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D1400F]" aria-hidden="true" />
      <div ref={viewportRef} className="min-w-0 max-w-[min(78vw,34rem)] overflow-hidden text-xs leading-5" aria-label={`Dirección: ${address}`}>
        {isOverflowing ? (
          <div className="address-ticker-track flex w-max gap-8 whitespace-nowrap" style={{ animationDuration: duration }}>
            <span aria-hidden="true">{address}</span>
            <span aria-hidden="true">{address}</span>
          </div>
        ) : (
          <span ref={contentRef} className="block truncate">{address}</span>
        )}
      </div>
      <span className="sr-only">{address}</span>
    </div>
  )
}
