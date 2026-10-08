'use client'

import { useState } from 'react'
import { useInterval } from '@/hooks/useInterval'
import { cn } from '@/lib/utils/cn'

interface StationTimerBadgeProps {
  elapsedSeconds: number
  station: 'hot' | 'cold'
  className?: string
}

function pad(n: number) { return String(n).padStart(2, '0') }

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${pad(m)}:${pad(s)}`
}

function urgencyClass(seconds: number, station: 'hot' | 'cold'): string {
  const min = seconds / 60
  if (station === 'hot') {
    if (min > 12) return 'bg-red-600 text-white animate-pulse'
    if (min > 8)  return 'bg-orange-500 text-white'
    return 'bg-amber-500/20 text-amber-300'
  } else {
    if (min > 8)  return 'bg-purple-600 text-white animate-pulse'
    if (min > 5)  return 'bg-blue-600 text-white'
    return 'bg-cyan-500/20 text-cyan-300'
  }
}

export function StationTimerBadge({ elapsedSeconds, station, className }: StationTimerBadgeProps) {
  const [elapsed, setElapsed] = useState(elapsedSeconds)
  useInterval(() => setElapsed(e => e + 1), 1000)

  return (
    <span className={cn(
      'font-mono text-sm font-bold px-2 py-1 rounded-lg transition-colors',
      urgencyClass(elapsed, station),
      className,
    )}>
      ⏱ {formatElapsed(elapsed)}
    </span>
  )
}

export function useUrgencyStyle(elapsedSeconds: number, station: 'hot' | 'cold') {
  const min = elapsedSeconds / 60
  if (station === 'hot') {
    if (min > 12) return { border: 'border-l-red-500',    bg: 'bg-red-950',    pulse: true }
    if (min > 8)  return { border: 'border-l-orange-500', bg: 'bg-orange-950', pulse: false }
    return               { border: 'border-l-amber-500',  bg: 'bg-stone-900',  pulse: false }
  } else {
    if (min > 8)  return { border: 'border-l-purple-500', bg: 'bg-purple-950', pulse: true }
    if (min > 5)  return { border: 'border-l-blue-500',   bg: 'bg-blue-950',   pulse: false }
    return               { border: 'border-l-cyan-500',   bg: 'bg-slate-900',  pulse: false }
  }
}
