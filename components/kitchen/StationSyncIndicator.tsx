'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

interface StationSyncIndicatorProps {
  lastUpdated: Date | null
  isError: boolean
  station: 'hot' | 'cold'
}

export function StationSyncIndicator({ lastUpdated, isError, station }: StationSyncIndicatorProps) {
  const [secondsAgo, setSecondsAgo] = useState(0)
  const accent = station === 'hot' ? 'text-amber-400' : 'text-cyan-400'

  useEffect(() => {
    if (!lastUpdated) return
    const update = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  if (isError) {
    return (
      <div className="fixed bottom-0 inset-x-0 h-8 bg-red-900/90 flex items-center justify-center text-xs text-red-300 font-semibold">
        ✗ Sin conexión — reconectando…
      </div>
    )
  }

  if (secondsAgo > 15) {
    return (
      <div className="fixed bottom-0 inset-x-0 h-8 bg-orange-900/90 flex items-center justify-center text-xs text-orange-300 font-semibold">
        ⚠ Verificando conexión… ({secondsAgo}s sin actualización)
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 inset-x-0 h-8 bg-black/60 flex items-center justify-center text-xs font-medium" style={{ color: '#555' }}>
      <span className={cn('mr-1', accent)}>🔄</span>
      Actualizado hace {secondsAgo}s
    </div>
  )
}
