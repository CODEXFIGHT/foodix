/**
 * FoodIX — Cocina/KDS en modo "1 POS" (flujo unificado con secciones).
 *
 * Una sola cocina dividida visualmente en dos áreas internas: Caliente y Frío.
 * No son dos POS separados: es una misma pantalla con secciones claras.
 *
 * - Desktop / tablet horizontal → dos columnas (Caliente | Frío) con
 *   encabezado propio, contador de ítems, scroll interno y divisor central.
 * - Mobile / tablet vertical → tabs grandes touch (Caliente / Frío) que
 *   muestran una sola área a la vez para no encimar cards.
 *
 * Es presentacional: recibe el contenido ya renderizado de cada área. La
 * separación de ítems Caliente/Frío y la reactividad en tiempo real las
 * resuelve quien lo consume (KDS real y demo).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useState, type ReactNode } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type Area = 'hot' | 'cold'

/** Contenido y métricas de un área de preparación. */
export interface KitchenAreaPane {
  /** Cards ya renderizadas del área. */
  node: ReactNode
  /** Cantidad de ítems activos del área (para el contador del encabezado). */
  count: number
  /** `true` si el área no tiene comandas pendientes. */
  empty: boolean
}

interface KitchenUnifiedSplitProps {
  hot: KitchenAreaPane
  cold: KitchenAreaPane
}

const AREA = {
  hot: {
    label: 'Caliente',
    Icon: Flame,
    headerBg: 'bg-[#FACC15]/15 ring-1 ring-inset ring-[#FACC15]/30',
    text: 'text-yellow-300',
    badge: 'bg-[#FACC15] text-stone-950',
    tabActive: 'bg-[#FACC15] text-stone-950 shadow-sm shadow-[#FACC15]/30',
    accent: 'text-yellow-400',
    emptyTitle: 'Sin pendientes calientes',
    emptyHint: 'Los platillos calientes aparecerán aquí.',
  },
  cold: {
    label: 'Frío',
    Icon: Snowflake,
    headerBg: 'bg-sky-500/15 ring-1 ring-inset ring-sky-400/30',
    text: 'text-sky-200',
    badge: 'bg-sky-500 text-white',
    tabActive: 'bg-sky-500 text-white shadow-sm shadow-sky-500/30',
    accent: 'text-sky-400',
    emptyTitle: 'Sin pendientes fríos',
    emptyHint: 'Las bebidas y platillos fríos aparecerán aquí.',
  },
} as const

// ── Encabezado de área (sticky dentro de su columna) ─────────────────────────
function AreaHeader({ area, count }: { area: Area; count: number }) {
  const a = AREA[area]
  return (
    <div className={cn('sticky top-0 z-10 flex items-center justify-between rounded-xl px-4 py-3 backdrop-blur', a.headerBg)}>
      <span className={cn('flex items-center gap-2 text-base font-bold tracking-tight', a.text)}>
        <a.Icon className="h-5 w-5" />
        {a.label}
      </span>
      <span className={cn('inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums', a.badge)}>
        {count}
      </span>
    </div>
  )
}

// ── Estado vacío premium por área ────────────────────────────────────────────
function AreaEmpty({ area }: { area: Area }) {
  const a = AREA[area]
  return (
    <div className="grid flex-1 place-items-center px-4 py-16 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <span className={cn('mb-4 grid h-16 w-16 place-items-center rounded-2xl ring-1 ring-inset ring-white/10', a.headerBg)}>
          <a.Icon className={cn('h-8 w-8', a.accent)} />
        </span>
        <p className="text-lg font-semibold text-stone-200">{a.emptyTitle}</p>
        <p className="mt-1 max-w-[16rem] text-sm text-stone-500">{a.emptyHint}</p>
      </div>
    </div>
  )
}

// ── Columna de área (encabezado + scroll interno) ────────────────────────────
function AreaColumn({ area, pane, divider }: { area: Area; pane: KitchenAreaPane; divider?: boolean }) {
  const a = AREA[area]
  return (
    <section
      aria-label={a.label}
      className={cn('flex min-h-0 flex-col px-3', divider && 'lg:border-l lg:border-white/10')}
    >
      <div className="pt-3">
        <AreaHeader area={area} count={pane.count} />
      </div>
      <div className="mt-3 flex-1 overflow-y-auto pb-6 [scrollbar-color:theme(colors.stone.600)_transparent] [scrollbar-width:thin]">
        {pane.empty ? (
          <AreaEmpty area={area} />
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">{pane.node}</div>
        )}
      </div>
    </section>
  )
}

// ── Tab grande touch (mobile / tablet vertical) ──────────────────────────────
function AreaTab({ area, active, count, onClick }: { area: Area; active: boolean; count: number; onClick: () => void }) {
  const a = AREA[area]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition-all active:scale-[0.98]',
        active ? a.tabActive : 'bg-stone-800 text-stone-300 hover:bg-stone-700',
      )}
    >
      <a.Icon className="h-5 w-5" />
      {a.label}
      <span
        className={cn(
          'ml-0.5 inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-1.5 py-0.5 text-sm font-bold tabular-nums',
          active ? 'bg-white/25 text-white' : 'bg-stone-900/70 text-stone-300',
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function KitchenUnifiedSplit({ hot, cold }: KitchenUnifiedSplitProps) {
  // lg: 1024px → columnas; por debajo → tabs (mobile / tablet vertical).
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [tab, setTab] = useState<Area>('hot')

  if (isWide) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-0 px-2 pb-2 sm:px-3">
        <AreaColumn area="hot" pane={hot} />
        <AreaColumn area="cold" pane={cold} divider />
      </div>
    )
  }

  const active = tab === 'hot' ? hot : cold
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      <div className="flex gap-2 py-3">
        <AreaTab area="hot" active={tab === 'hot'} count={hot.count} onClick={() => setTab('hot')} />
        <AreaTab area="cold" active={tab === 'cold'} count={cold.count} onClick={() => setTab('cold')} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
        {active.empty ? (
          <AreaEmpty area={tab} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{active.node}</div>
        )}
      </div>
    </div>
  )
}
