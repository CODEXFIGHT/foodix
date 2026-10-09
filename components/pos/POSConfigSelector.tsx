/**
 * FoodIX — Selector de cantidad de POS por establecimiento (Superadmin).
 * Cards seleccionables (1 POS / 2 POS) con guardado en tiempo real, estado
 * actual visible y texto de ayuda para usuarios no técnicos.
 *
 * - Modo real → persiste en el backend (tabla branches.pos_count) vía PATCH.
 * - Modo demo → persiste en localStorage namespaced (sin tocar datos reales).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { toast } from 'sonner'
import { Check, Flame, Snowflake, MonitorSmartphone, SplitSquareHorizontal, Info } from 'lucide-react'
import type { PosCount } from '@/lib/types'
import { usePOSConfig } from '@/lib/pos/posConfig'
import { useBranch, useUpdateBranch } from '@/lib/api/queries'
import { cn } from '@/lib/utils/cn'

interface POSConfigSelectorProps {
  establishmentId: number | string
  /** true → persistencia demo (local). false/omitido → backend real. */
  demo?: boolean
  variant?: 'dark' | 'light'
}

const HELP_TEXT =
  'Con 1 POS, FoodIX divide automáticamente la operación en Caliente y Frío dentro del mismo flujo. ' +
  'Con 2 POS, envía cada área a su propia estación.'

function successToast(value: PosCount) {
  toast.success(
    value === 1
      ? 'Establecimiento configurado con 1 POS (flujo unificado)'
      : 'Establecimiento configurado con 2 POS (Caliente / Frío separados)',
  )
}

export function POSConfigSelector({ establishmentId, demo, variant = 'dark' }: POSConfigSelectorProps) {
  if (demo) {
    return <DemoPOSConfig establishmentId={String(establishmentId)} variant={variant} />
  }
  return <RealPOSConfig branchId={Number(establishmentId)} variant={variant} />
}

// ── Fuente de datos: demo (estado local) ────────────────────────────────────
function DemoPOSConfig({ establishmentId, variant }: { establishmentId: string; variant: 'dark' | 'light' }) {
  const { posCount, setPosCount } = usePOSConfig(establishmentId, { demo: true })
  return (
    <POSConfigView
      posCount={posCount}
      variant={variant}
      onSelect={value => {
        if (value === posCount) return
        setPosCount(value)
        successToast(value)
      }}
    />
  )
}

// ── Fuente de datos: backend real (branches.pos_count) ──────────────────────
function RealPOSConfig({ branchId, variant }: { branchId: number; variant: 'dark' | 'light' }) {
  const { data: branch } = useBranch(Number.isNaN(branchId) ? null : branchId)
  const updateBranch = useUpdateBranch()
  const posCount: PosCount = branch?.pos_count === 2 ? 2 : 1

  return (
    <POSConfigView
      posCount={posCount}
      variant={variant}
      busy={updateBranch.isPending}
      onSelect={async value => {
        if (value === posCount || updateBranch.isPending) return
        try {
          await updateBranch.mutateAsync({ id: branchId, pos_count: value })
          successToast(value)
        } catch {
          toast.error('No se pudo guardar la configuración de POS')
        }
      }}
    />
  )
}

// ── Vista presentacional compartida ─────────────────────────────────────────

interface Option {
  value: PosCount
  title: string
  subtitle: string
  Icon: typeof MonitorSmartphone
  points: { Icon: typeof Flame; text: string }[]
}

const OPTIONS: Option[] = [
  {
    value: 1,
    title: '1 POS',
    subtitle: 'Flujo unificado',
    Icon: MonitorSmartphone,
    points: [
      { Icon: Flame, text: 'Caliente y Frío en un mismo POS lógico' },
      { Icon: Snowflake, text: 'Cocina filtra por sección' },
    ],
  },
  {
    value: 2,
    title: '2 POS',
    subtitle: 'Estaciones separadas',
    Icon: SplitSquareHorizontal,
    points: [
      { Icon: Flame, text: 'POS Caliente recibe sus ítems' },
      { Icon: Snowflake, text: 'POS Frío recibe los suyos' },
    ],
  },
]

interface POSConfigViewProps {
  posCount: PosCount
  onSelect: (value: PosCount) => void
  variant: 'dark' | 'light'
  busy?: boolean
}

function POSConfigView({ posCount, onSelect, variant, busy = false }: POSConfigViewProps) {
  const dark = variant === 'dark'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={cn('text-base font-semibold', dark ? 'text-white' : 'text-stone-900 dark:text-white')}>
            Cantidad de POS
          </h3>
          <p className={cn('text-sm', dark ? 'text-neutral-400' : 'text-stone-500 dark:text-zinc-400')}>
            Define cómo se organiza la operación Caliente / Frío de este establecimiento.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FACC15]/15 px-3 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-400 ring-1 ring-[#FACC15]/25">
          <Check className="h-3.5 w-3.5" />
          Actual: {posCount} POS
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(opt => {
          const selected = posCount === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              disabled={busy}
              aria-pressed={selected}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-[#EAB308] ring-2 ring-[#FACC15]/30'
                  : dark
                    ? 'border-white/10 hover:border-white/25'
                    : 'border-stone-200 hover:border-stone-300 dark:border-white/10 dark:hover:border-white/25',
                selected
                  ? dark ? 'bg-[#FACC15]/10' : 'bg-amber-50/70 dark:bg-[#FACC15]/10'
                  : dark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-white hover:bg-stone-50 dark:bg-white/[0.03]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors',
                    selected ? 'bg-[#FACC15] text-stone-950' : dark ? 'bg-white/10 text-neutral-300' : 'bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-zinc-300',
                  )}
                >
                  <opt.Icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-full border-2 transition-all',
                    selected ? 'border-[#EAB308] bg-[#FACC15] text-stone-950' : dark ? 'border-white/20' : 'border-stone-300 dark:border-white/20',
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
              </div>

              <p className={cn('mt-4 text-lg font-bold', dark ? 'text-white' : 'text-stone-900 dark:text-white')}>
                {opt.title}
              </p>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{opt.subtitle}</p>

              <ul className="mt-3 space-y-1.5">
                {opt.points.map(p => (
                  <li
                    key={p.text}
                    className={cn('flex items-center gap-2 text-xs', dark ? 'text-neutral-400' : 'text-stone-600 dark:text-zinc-400')}
                  >
                    <p.Icon className="h-3.5 w-3.5 shrink-0 text-yellow-700 dark:text-yellow-400/80" />
                    {p.text}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl p-3.5 text-sm',
          dark
            ? 'bg-white/[0.03] text-neutral-300 ring-1 ring-white/10'
            : 'bg-amber-50/60 text-stone-600 ring-1 ring-amber-100 dark:bg-white/[0.03] dark:text-zinc-300 dark:ring-white/10',
        )}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-400" />
        <p className="leading-relaxed">{HELP_TEXT}</p>
      </div>
    </div>
  )
}
