/**
 * FoodIX — Sistema de gestión para restaurantes
 * Hooks de órdenes por estación de cocina (KDS) en tiempo real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import type { StationOrder } from '@/lib/types'
import { readStationSnapshot, readStationSnapshotTimestamp, writeStationSnapshot } from '@/lib/offline/stationSnapshot'

export function useStationOrders(
  station: 'hot' | 'cold',
  branchId: number | null,
) {
  return useQuery({
    queryKey: ['station-orders', station, branchId],
    queryFn: async () => {
      const data = await apiRequest<StationOrder[]>(`/stations/${station}/orders?branch_id=${branchId}`)
      writeStationSnapshot(station, branchId, data)
      return data
    },
    enabled:         branchId !== null,
    refetchInterval: 2_000,
    staleTime:       0,
    // Última foto conocida: evita un tablero vacío si el reload ocurre sin
    // conexión (cocina es solo-lectura offline, no encola escrituras).
    initialData: () => readStationSnapshot<StationOrder[]>(station, branchId),
    initialDataUpdatedAt: () => readStationSnapshotTimestamp(station, branchId),
  })
}

export interface StationsBoard {
  hot: StationOrder[]
  cold: StationOrder[]
}

/**
 * Comandas de AMBAS estaciones (hot + cold) en UNA sola petición.
 * Optimiza el KDS unificado: en lugar de 2 requests cada 2 s por pantalla de
 * cocina, hace 1 — la mitad de carga en el servidor.
 */
export function useStationsBoard(branchId: number | null) {
  return useQuery({
    queryKey: ['station-orders', 'board', branchId],
    queryFn: async () => {
      const data = await apiRequest<StationsBoard>(`/stations/orders?branch_id=${branchId}`)
      writeStationSnapshot('board', branchId, data)
      return data
    },
    enabled:         branchId !== null,
    refetchInterval: 2_000,
    staleTime:       0,
    initialData: () => readStationSnapshot<StationsBoard>('board', branchId),
    initialDataUpdatedAt: () => readStationSnapshotTimestamp('board', branchId),
  })
}

export function useUpdateItemStationStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      station,
      orderItemId,
      status,
    }: {
      station:     'hot' | 'cold'
      orderItemId: number
      status:      'preparing' | 'ready' | 'delivered'
    }) =>
      apiRequest<{
        updated:            boolean
        order_fully_ready:  boolean
        order_id:           number
      }>(`/stations/${station}/items/${orderItemId}`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      }),

    onSuccess: (data) => {
      // Invalida tanto las vistas por estación como el tablero combinado.
      qc.invalidateQueries({ queryKey: ['station-orders'] })
      if (data.order_fully_ready) {
        qc.invalidateQueries({ queryKey: ['orders'] })
        qc.invalidateQueries({ queryKey: ['order', data.order_id] })
      }
    },
  })
}
