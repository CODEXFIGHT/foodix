'use client'

/**
 * FoodIX — Device Center
 * Alertas visuales derivadas del estado de la flota. Reglas: kiosko desconectado,
 * caja/lector/POS-8360 en error u offline, y establecimientos sin dispositivos online.
 */

import { AlertTriangle, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { deviceTypeMeta } from '@/lib/devices/constants'
import type { ConnectedDevice, DeviceType } from '@/lib/devices/types'

export interface DeviceAlert {
  id: string
  severity: 'error' | 'warning'
  message: string
}

/** Tipos críticos cuyo offline/error genera alerta. */
const CRITICAL_TYPES: DeviceType[] = ['kiosk', 'cash_register', 'pos_8360', 'barcode_scanner']

export function computeAlerts(devices: ConnectedDevice[]): DeviceAlert[] {
  const alerts: DeviceAlert[] = []

  for (const d of devices) {
    const isCritical = CRITICAL_TYPES.includes(d.type)
    const label = deviceTypeMeta(d.type).label
    const where = d.branch_name ? ` · ${d.branch_name}` : ''
    if (d.status === 'error') {
      alerts.push({ id: `err-${d.id}`, severity: 'error', message: `${label} "${d.name}" reportó un error${where}` })
    } else if (isCritical && d.status === 'offline') {
      alerts.push({ id: `off-${d.id}`, severity: 'warning', message: `${label} "${d.name}" se desconectó${where}` })
    }
  }

  // Establecimientos sin ningún dispositivo online/idle.
  const byBranch = new Map<number, { name: string; anyOnline: boolean }>()
  for (const d of devices) {
    const entry = byBranch.get(d.branch_id) ?? { name: d.branch_name ?? `Sucursal ${d.branch_id}`, anyOnline: false }
    if (d.status === 'online' || d.status === 'idle') entry.anyOnline = true
    byBranch.set(d.branch_id, entry)
  }
  for (const [branchId, info] of byBranch) {
    if (!info.anyOnline) {
      alerts.push({ id: `branch-${branchId}`, severity: 'warning', message: `${info.name} no tiene dispositivos online` })
    }
  }

  return alerts
}

export function DeviceAlerts({ devices }: { devices: ConnectedDevice[] }) {
  const alerts = computeAlerts(devices)
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.slice(0, 6).map(a => {
        const isError = a.severity === 'error'
        const Icon = isError ? AlertTriangle : WifiOff
        return (
          <div
            key={a.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm',
              isError
                ? 'border-amber-500/30 bg-amber-500/[0.07] text-yellow-300'
                : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-200',
            )}
          >
            <Icon className={cn('h-4 w-4 flex-shrink-0', isError ? 'text-yellow-400' : 'text-amber-300')} />
            <span className="min-w-0">{a.message}</span>
          </div>
        )
      })}
      {alerts.length > 6 && (
        <p className="text-neutral-500 text-xs px-1">+{alerts.length - 6} alerta(s) más</p>
      )}
    </div>
  )
}
