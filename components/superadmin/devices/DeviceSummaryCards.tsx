'use client'

/**
 * FoodIX — Device Center
 * Tarjetas de resumen (KPIs) del estado de la flota de dispositivos.
 */

import { cn } from '@/lib/utils/cn'
import { StatCard } from '@/components/superadmin/ui'
import { relativeTime, type DeviceSummary } from '@/lib/devices/status'

export function DeviceSummaryCards({
  summary,
  loading,
  now,
}: {
  summary: DeviceSummary
  loading?: boolean
  now: number
}) {
  const cards: { label: string; value: number | string; accent?: string }[] = [
    { label: 'Total dispositivos', value: summary.total },
    { label: 'Online', value: summary.online, accent: 'text-emerald-400' },
    { label: 'Inactivos', value: summary.idle, accent: summary.idle > 0 ? 'text-amber-400' : undefined },
    { label: 'Offline', value: summary.offline, accent: summary.offline > 0 ? 'text-red-400' : undefined },
    { label: 'Con error', value: summary.error, accent: summary.error > 0 ? 'text-orange-400' : undefined },
  ]

  return (
    <div className="space-y-3">
      <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 xl:grid-cols-5 sm:overflow-visible sm:pb-0">
        {cards.map(c => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            accent={c.accent}
            loading={loading}
            className="snap-start shrink-0 min-w-[40%] sm:min-w-0"
          />
        ))}
      </div>
      <p className="text-neutral-600 text-xs">
        Última sincronización: <span className="text-neutral-400">{relativeTime(summary.lastSync, now)}</span>
      </p>
    </div>
  )
}

/** Mini-cards por tipo de dispositivo (kioskos, cocina, lectores, cajas, POS-8360). */
export function DeviceTypeBreakdown({ summary }: { summary: DeviceSummary }) {
  const items = [
    { label: 'Kioskos activos', value: summary.kiosks },
    { label: 'Pantallas cocina', value: summary.kitchenScreens },
    { label: 'Lectores código', value: summary.barcodeScanners },
    { label: 'Cajas registradoras', value: summary.cashRegisters },
    { label: 'POS-8360', value: summary.pos8360 },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(i => (
        <div key={i.label} className="rounded-xl border border-white/10 bg-[#0a0a0a] p-3">
          <p className={cn('text-xl font-semibold tabular-nums', i.value > 0 ? 'text-white' : 'text-neutral-500')}>{i.value}</p>
          <p className="text-neutral-500 text-xs mt-0.5">{i.label}</p>
        </div>
      ))}
    </div>
  )
}
