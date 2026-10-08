'use client'

/**
 * FoodIX — Calendario mensual de pagos (Billing CRM).
 * Vista anual (por defecto 2026–2030) con una celda por mes coloreada según su
 * estado. Click en un mes → callback con el periodo y la celda (si existe).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CALENDAR_CELL } from '@/lib/constants/subscription'
import type { CalendarCellStatus, SubscriptionCalendarCell } from '@/lib/types'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MIN_YEAR = 2026
const MAX_YEAR = 2030

export function SubscriptionCalendar({
  cells,
  onSelectMonth,
}: {
  cells: SubscriptionCalendarCell[]
  onSelectMonth: (period: string, cell: SubscriptionCalendarCell | null) => void
}) {
  const byPeriod = useMemo(() => {
    const m = new Map<string, SubscriptionCalendarCell>()
    cells.forEach(c => m.set(c.period, c))
    return m
  }, [cells])

  const [year, setYear] = useState(() => {
    const now = new Date().getFullYear()
    return Math.min(MAX_YEAR, Math.max(MIN_YEAR, now))
  })

  const nowPeriod = new Date().toISOString().slice(0, 7)

  return (
    <div className="space-y-3">
      {/* Navegación de año */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => Math.max(MIN_YEAR, y - 1))}
          disabled={year <= MIN_YEAR}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-neutral-400 transition-colors hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white tabular-nums">{year}</span>
        <button
          onClick={() => setYear(y => Math.min(MAX_YEAR, y + 1))}
          disabled={year >= MAX_YEAR}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-neutral-400 transition-colors hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Rejilla de meses */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {MONTHS.map((label, i) => {
          const period = `${year}-${String(i + 1).padStart(2, '0')}`
          const cell = byPeriod.get(period) ?? null
          const status: CalendarCellStatus = cell?.status ?? 'none'
          const meta = CALENDAR_CELL[status]
          const isNow = period === nowPeriod
          return (
            <button
              key={period}
              onClick={() => onSelectMonth(period, cell)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-lg border py-3 text-xs font-medium transition-transform hover:scale-[1.03]',
                meta.cell,
                isNow && 'ring-1 ring-white/40',
              )}
              title={meta.label}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
        {(['paid', 'prepaid', 'pending', 'suspended', 'canceled'] as CalendarCellStatus[]).map(s => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span className={cn('h-2 w-2 rounded-full', CALENDAR_CELL[s].dot)} />
            {CALENDAR_CELL[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}
