/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Servicio reutilizable `deviceRegistry`: registro, heartbeat, actividad,
 * marcado offline y alta de periféricos. Capa fina sobre la API REST; cualquier
 * módulo (kiosk/kitchen/admin/pos) la consume vía el hook useDeviceHeartbeat.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { apiRequest } from '@/lib/api/client'
import type {
  ConnectedDevice, DeviceEvent, DeviceType, DeviceStatus, HeartbeatPayload,
} from './types'

export interface HeartbeatResult {
  ok: boolean
  device_id: number
  status: DeviceStatus
}

export interface RegisterPeripheralInput {
  name: string
  type: DeviceType
  model?: string
  serial_number?: string
  branch_id?: number
  parent_device_id?: number | null
  status?: DeviceStatus
  notes?: string
}

/**
 * Servicio de registro de dispositivos. Todas las operaciones son tolerantes a
 * fallos de red en el caso del heartbeat (no deben romper el módulo que las usa).
 */
export const deviceRegistry = {
  /** Registra o actualiza el dispositivo + marca heartbeat. Idempotente por uid. */
  async sendHeartbeat(payload: HeartbeatPayload): Promise<HeartbeatResult | null> {
    try {
      return await apiRequest<HeartbeatResult>('/device-monitor/heartbeat', {
        method: 'POST',
        // El backend acepta auth (token) o branch_id en el cuerpo (kioskos).
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {
      return null
    }
  },

  /** Alias semántico: el primer heartbeat actúa como registro. */
  async registerDevice(payload: HeartbeatPayload): Promise<HeartbeatResult | null> {
    return this.sendHeartbeat(payload)
  },

  /** Heartbeat marcando actividad reciente del usuario (resetea idle). */
  async updateActivity(payload: HeartbeatPayload): Promise<HeartbeatResult | null> {
    return this.sendHeartbeat({ ...payload, activity: true })
  },

  /** Marca el dispositivo como desconectado de forma lógica. */
  async markOffline(deviceId: number): Promise<void> {
    try {
      await apiRequest(`/device-monitor/${deviceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'offline' }),
      })
    } catch {
      /* mejor esfuerzo: el backend igual lo marcará offline por timeout */
    }
  },

  /** Reporta un error de conexión / periférico. */
  async reportError(payload: HeartbeatPayload, error?: Record<string, unknown>): Promise<void> {
    await apiRequest('/device-monitor/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ ...payload, status: 'error', error: error ?? null }),
    }).catch(() => {})
  },

  /** Alta manual de un periférico (lector, impresora, caja…). */
  async registerPeripheral(input: RegisterPeripheralInput): Promise<ConnectedDevice> {
    return apiRequest<ConnectedDevice>('/device-monitor/peripheral', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}

export async function fetchConnectedDevices(branchId?: number | null): Promise<ConnectedDevice[]> {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return apiRequest<ConnectedDevice[]>(`/device-monitor${params}`)
}

export async function fetchDeviceEvents(deviceId: number): Promise<DeviceEvent[]> {
  return apiRequest<DeviceEvent[]>(`/device-monitor/${deviceId}/events`)
}
