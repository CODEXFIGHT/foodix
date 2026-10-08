/**
 * FoodIX — Modo Demo
 * Marca del shell demo. Replica el markup de BrandLogo pero muestra el nombre
 * del restaurante demo sin consultar el auth store real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { cn } from '@/lib/utils/cn'
import { DEMO_RESTAURANT_NAME } from '@/lib/demo/demo-seed'

interface Props {
  size?: number
  showName?: boolean
  className?: string
  nameClassName?: string
}

export function DemoBrand({ size = 32, showName = false, className, nameClassName }: Props) {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div
        className="rounded-lg bg-[#E85D04] text-white font-bold flex items-center justify-center font-heading flex-shrink-0 shadow-sm border border-stone-100/10"
        style={{ width: size, height: size, fontSize: `${size * 0.55}px` }}
      >
        R
      </div>
      {showName && (
        <span className={cn('font-bold tracking-tight truncate', nameClassName)}>
          {DEMO_RESTAURANT_NAME}
        </span>
      )}
    </div>
  )
}
