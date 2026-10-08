'use client'

/**
 * FoodIX — Device Center
 * Piezas de presentación reutilizables: badge de estado, punto de presencia e
 * icono por tipo de dispositivo. Centralizan colores/iconos vía lib/devices.
 */

import { cn } from '@/lib/utils/cn'
import {
  deviceStatusMeta, deviceTypeMeta,
} from '@/lib/devices/constants'
import type { DeviceStatus, DeviceType } from '@/lib/devices/types'

export function DeviceStatusDot({ status, className }: { status: DeviceStatus; className?: string }) {
  const s = deviceStatusMeta(status)
  return (
    <span className={cn('relative flex h-2.5 w-2.5 flex-shrink-0', className)}>
      {s.pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', s.dot)} />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', s.dot)} />
    </span>
  )
}

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const s = deviceStatusMeta(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium border whitespace-nowrap', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

export function DeviceTypeIcon({ type, size = 40 }: { type: DeviceType; size?: number }) {
  const meta = deviceTypeMeta(type)
  const { Icon } = meta
  return (
    <span
      className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon className={cn(meta.tint)} style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  )
}
