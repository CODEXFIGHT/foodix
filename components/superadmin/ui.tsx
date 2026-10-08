'use client'

/**
 * Primitivas de UI del Panel de Administración Global.
 * Estilo "Vercel": fondo negro, tarjetas con borde hairline, tipografía contenida,
 * acento monocromo (blanco) y colores semánticos solo para estados.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

// ── Tokens compartidos ────────────────────────────────────────────────────────
export const SURFACE = 'rounded-xl border border-white/10 bg-[#0a0a0a]'
export const SURFACE_HOVER = 'transition-colors hover:border-white/20'

// ── Encabezado de página ──────────────────────────────────────────────────────
export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description && <p className="text-neutral-500 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── Título de sección ─────────────────────────────────────────────────────────
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-[11px] font-medium uppercase tracking-wider text-neutral-500', className)}>
      {children}
    </h2>
  )
}

// ── Tarjeta base ──────────────────────────────────────────────────────────────
export function Surface({
  children,
  className,
  hover,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  return <div className={cn(SURFACE, hover && SURFACE_HOVER, className)}>{children}</div>
}

// ── Tarjeta de métrica (KPI) ──────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  accent,
  loading,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: string
  loading?: boolean
  className?: string
}) {
  return (
    <div className={cn(SURFACE, 'p-4 sm:p-5', className)}>
      <p className="text-neutral-500 text-xs font-medium">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-20 rounded bg-white/5 animate-pulse" />
      ) : (
        <p className={cn('mt-2 text-2xl font-semibold tracking-tight tabular-nums truncate', accent ?? 'text-white')}>
          {value}
        </p>
      )}
      {hint && <p className="text-neutral-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ── Chip de filtro ────────────────────────────────────────────────────────────
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors border',
        active
          ? 'bg-white text-black border-white'
          : 'bg-transparent text-neutral-400 border-white/10 hover:text-white hover:border-white/20',
      )}
    >
      {children}
    </button>
  )
}

// ── Punto de estado ───────────────────────────────────────────────────────────
const DOT_COLORS: Record<string, string> = {
  green:   'bg-emerald-400',
  red:     'bg-red-400',
  yellow:  'bg-amber-400',
  orange:  'bg-orange-400',
  neutral: 'bg-neutral-500',
  blue:    'bg-blue-400',
}

export function StatusDot({ color = 'neutral', pulse }: { color?: keyof typeof DOT_COLORS; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      {pulse && (
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', DOT_COLORS[color])} />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT_COLORS[color])} />
    </span>
  )
}

// ── Botón primario blanco (estilo Vercel) ─────────────────────────────────────
export const PRIMARY_BTN = 'bg-white text-black hover:bg-neutral-200 font-medium'

// ── Estado vacío ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-3 opacity-40 w-fit">{icon}</div>}
      <p className="text-neutral-400 text-sm">{title}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
