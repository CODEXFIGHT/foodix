/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Hooks de TanStack Query para el Device Center (lista en vivo, eventos y
 * mutaciones de gestión). El "tiempo real" se logra con polling (refetchInterval).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import { MONITOR_POLL_MS } from '@/lib/devices/constants'
import {
  fetchConnectedDevices, fetchDeviceEvents, deviceRegistry,
  type RegisterPeripheralInput,
} from '@/lib/devices/registry'
import type { ConnectedDevice, DeviceEvent, DeviceStatus, DeviceType } from '@/lib/devices/types'

const KEY = 'connected-devices'

/** Lista de dispositivos conectados (todas las sucursales o una). Polling en vivo. */
export function useConnectedDevices(branchId?: number | null) {
  return useQuery({
    queryKey: [KEY, branchId ?? 'all'],
    queryFn: () => fetchConnectedDevices(branchId),
    refetchInterval: MONITOR_POLL_MS,
    // Seguir refrescando aunque el superadmin tenga la pestaña en segundo plano:
    // el monitoreo "en vivo" debe reflejar la realidad aunque no se esté mirando.
    refetchIntervalInBackground: true,
  })
}

/** Eventos recientes de un dispositivo. */
export function useDeviceEvents(deviceId: number | null) {
  return useQuery({
    queryKey: [KEY, 'events', deviceId],
    queryFn: () => fetchDeviceEvents(deviceId as number),
    enabled: deviceId !== null,
    refetchInterval: MONITOR_POLL_MS,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: [KEY] })
}

export function useUpdateConnectedDevice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; type?: DeviceType; model?: string; serial_number?: string; notes?: string }) =>
      apiRequest<ConnectedDevice>(`/device-monitor/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  })
}

export function useSetDeviceStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: DeviceStatus }) =>
      apiRequest<ConnectedDevice>(`/device-monitor/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  })
}

export function useDeleteConnectedDevice() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => apiRequest<{ success: boolean }>(`/device-monitor/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useRegisterPeripheral() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: RegisterPeripheralInput) => deviceRegistry.registerPeripheral(input),
    onSuccess: invalidate,
  })
}

export type { DeviceEvent }
