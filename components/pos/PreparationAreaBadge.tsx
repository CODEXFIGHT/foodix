/**
 * FoodIX — Badge de área de preparación (Caliente / Frío).
 * Componente visual reutilizable en productos, comandas y KDS.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { Flame, Snowflake } from 'lucide-react'
import type { PreparationArea, StationType } from '@/lib/types'
import { resolvePreparationArea } from '@/lib/pos/posConfig'
import { cn } from '@/lib/utils/cn'

interface PreparationAreaBadgeProps {
  area?: StationType | PreparationArea | null
  size?: 'sm' | 'md'
  /** Solo icono, sin texto (para espacios reducidos). */
  iconOnly?: boolean
  className?: string
}

const META: Record<PreparationArea, { label: string; classes: string; Icon: typeof Flame }> = {
  hot: {
    label: 'Caliente',
    Icon: Flame,
    classes:
      'bg-amber-50 text-yellow-800 ring-1 ring-amber-200/70 ' +
      'dark:bg-amber-500/10 dark:text-yellow-400 dark:ring-amber-500/20',
  },
  cold: {
    label: 'Frío',
    Icon: Snowflake,
    classes:
      'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70 ' +
      'dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  },
}

export function PreparationAreaBadge({ area, size = 'sm', iconOnly = false, className }: PreparationAreaBadgeProps) {
  const resolved = resolvePreparationArea(area ?? null)
  const { label, classes, Icon } = META[resolved]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        classes,
        className,
      )}
      title={label}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {!iconOnly && label}
    </span>
  )
}
