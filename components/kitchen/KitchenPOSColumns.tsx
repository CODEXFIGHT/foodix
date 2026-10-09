/**
 * FoodIX — Layout de Cocina/KDS en modo "2 POS".
 * Muestra dos columnas operativas separadas: POS Caliente y POS Frío.
 * Es presentacional: recibe el contenido ya renderizado de cada estación.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import type { ReactNode } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface KitchenPOSColumnsProps {
  hot: ReactNode
  cold: ReactNode
  hotCount: number
  coldCount: number
}

function ColumnHeader({ area, count }: { area: 'hot' | 'cold'; count: number }) {
  const isHot = area === 'hot'
  return (
    <div
      className={cn(
        'sticky top-0 z-10 mb-3 flex items-center justify-between rounded-xl px-4 py-2.5 backdrop-blur',
        isHot
          ? 'bg-[#D1400F]/15 ring-1 ring-[#D1400F]/30'
          : 'bg-sky-500/15 ring-1 ring-sky-400/30',
      )}
    >
      <span className={cn('flex items-center gap-2 text-sm font-bold', isHot ? 'text-orange-200' : 'text-sky-200')}>
        {isHot ? <Flame className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
        POS {isHot ? 'Caliente' : 'Frío'}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-bold',
          isHot ? 'bg-[#D1400F] text-white' : 'bg-sky-500 text-white',
        )}
      >
        {count} comanda(s)
      </span>
    </div>
  )
}

export function KitchenPOSColumns({ hot, cold, hotCount, coldCount }: KitchenPOSColumnsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        className="rounded-2xl border border-[#D1400F]/20 bg-black/20 p-3"
        aria-label="POS Caliente"
      >
        <ColumnHeader area="hot" count={hotCount} />
        <div className="space-y-4">{hot}</div>
      </section>
      <section
        className="rounded-2xl border border-sky-400/20 bg-black/20 p-3"
        aria-label="POS Frío"
      >
        <ColumnHeader area="cold" count={coldCount} />
        <div className="space-y-4">{cold}</div>
      </section>
    </div>
  )
}
