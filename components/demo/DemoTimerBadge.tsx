/**
 * FoodIX — Modo Demo
 * Contador visible de la prueba: "Demo: 29:45 restantes". Al llegar a 00:00
 * limpia los datos demo y regresa al login con el aviso de fin de prueba.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlarmClock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useDemoTimer } from '@/lib/demo/demo-hooks'

/** Umbral de "urgencia" visual: último minuto. */
const URGENT_MS = 60 * 1000
/** Umbral de "alerta" visual: últimos 5 minutos. */
const WARN_MS = 5 * 60 * 1000

export function DemoTimerBadge({ className }: { className?: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const onExpire = useCallback(() => {
    router.replace('/demo?demo_expired=1')
  }, [router])

  const { label, remainingMs, hasSession } = useDemoTimer(onExpire)

  // Evita desajuste de hidratación: el contador solo aparece en cliente.
  useEffect(() => setMounted(true), [])

  if (!mounted || !hasSession) return null

  const urgent = remainingMs <= URGENT_MS
  const warn = !urgent && remainingMs <= WARN_MS

  return (
    <span
      title="Tiempo restante de tu prueba demo"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 transition-colors',
        urgent
          ? 'bg-red-500/15 text-red-600 ring-red-500/30 animate-pulse'
          : warn
            ? 'bg-amber-500/15 text-amber-700 ring-amber-500/30'
            : 'bg-[#D1400F]/10 text-[#B03508] ring-[#D1400F]/25',
        className,
      )}
    >
      {urgent ? <AlarmClock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      <span>Demo: {label}</span>
      <span className="hidden sm:inline">restantes</span>
    </span>
  )
}
