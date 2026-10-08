/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Helpers puros de estado: derivación cliente de respaldo, tiempo relativo y
 * cálculo de resúmenes/contadores. Sin dependencias de React.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { IDLE_AFTER_MS, OFFLINE_AFTER_MS } from './constants'
import type { ConnectedDevice, DeviceStatus, DeviceType } from './types'

/**
 * Deriva el estado a partir de timestamps. El backend ya entrega `status`
 * efectivo; esto es un respaldo cliente (p. ej. para recalcular entre polls).
 */
export function deriveStatus(
  device: Pick<ConnectedDevice, 'is_peripheral' | 'status' | 'last_heartbeat_at' | 'last_activity_at'>,
  now: number = Date.now(),
): DeviceStatus {
  if (device.is_peripheral) return device.status ?? 'unknown'
  if (!device.last_heartbeat_at) return 'unknown'

  const hb = new Date(device.last_heartbeat_at).getTime()
  if (Number.isNaN(hb)) return 'unknown'

  const hbAge = now - hb
  if (hbAge > OFFLINE_AFTER_MS) return 'offline'
  if (device.status === 'error') return 'error'

  const act = device.last_activity_at ? new Date(device.last_activity_at).getTime() : hb
  if (now - act > IDLE_AFTER_MS) return 'idle'
  return 'online'
}

/** Texto relativo en español: "hace 12 segundos", "hace 3 minutos". */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'nunca'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'nunca'

  const diff = Math.max(0, now - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 5) return 'justo ahora'
  if (sec < 60) return `hace ${sec} segundos`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hrs / 24)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Etiqueta de presencia: "Activo hace 12 segundos" / "Offline hace 3 minutos". */
export function presenceLabel(device: ConnectedDevice, now: number = Date.now()): string {
  const ref = device.last_heartbeat_at ?? device.last_activity_at
  const rel = relativeTime(ref, now)
  switch (device.status) {
    case 'online':  return `Activo ${rel}`
    case 'idle':    return `Inactivo ${rel}`
    case 'offline': return `Offline ${rel}`
    case 'error':   return `Error · visto ${rel}`
    case 'in_test': return 'En prueba'
    default:        return rel === 'nunca' ? 'Sin conexión' : `Visto ${rel}`
  }
}

// ── Resumen / contadores ───────────────────────────────────────────────────────
export interface DeviceSummary {
  total: number
  online: number
  offline: number
  idle: number
  error: number
  kiosks: number
  kitchenScreens: number
  barcodeScanners: number
  cashRegisters: number
  pos8360: number
  /** ISO de la última sincronización observada (heartbeat más reciente). */
  lastSync: string | null
}

export function summarize(devices: ConnectedDevice[]): DeviceSummary {
  const s: DeviceSummary = {
    total: devices.length,
    online: 0, offline: 0, idle: 0, error: 0,
    kiosks: 0, kitchenScreens: 0, barcodeScanners: 0, cashRegisters: 0, pos8360: 0,
    lastSync: null,
  }
  let lastSyncTs = 0
  const activeOf = (t: DeviceType, d: ConnectedDevice) =>
    d.type === t && (d.status === 'online' || d.status === 'idle')

  for (const d of devices) {
    if (d.status === 'online') s.online++
    else if (d.status === 'offline') s.offline++
    else if (d.status === 'idle') s.idle++
    else if (d.status === 'error') s.error++

    if (activeOf('kiosk', d)) s.kiosks++
    if (activeOf('kitchen_screen', d)) s.kitchenScreens++
    if (activeOf('barcode_scanner', d)) s.barcodeScanners++
    if (activeOf('cash_register', d)) s.cashRegisters++
    if (activeOf('pos_8360', d)) s.pos8360++

    if (d.last_heartbeat_at) {
      const ts = new Date(d.last_heartbeat_at).getTime()
      if (!Number.isNaN(ts) && ts > lastSyncTs) lastSyncTs = ts
    }
  }
  if (lastSyncTs > 0) s.lastSync = new Date(lastSyncTs).toISOString()
  return s
}

/** Estados seleccionables manualmente para un periférico. */
export const PERIPHERAL_STATUSES: DeviceStatus[] = ['online', 'in_test', 'error', 'offline']
