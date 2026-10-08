/**
 * FoodIX — Panel de cocina (KDS)
 * Una sola pantalla que se adapta a la configuración de POS del establecimiento:
 *
 * - 1 POS  → vista unificada con filtro Todas / Caliente / Fría.
 * - 2 POS  → columnas separadas POS Caliente / POS Frío.
 *
 * En ambos casos cada ítem aparece solo en su área y la comanda conserva su
 * número de mesa/orden. Cambia en tiempo real al actualizar la config de POS.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CookingPot } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import { useStationsBoard, useUpdateItemStationStatus } from '@/lib/api/queries/useStationOrders'
import { useEstablishmentPosCount, useUpdateOrderItemStatus } from '@/lib/api/queries'
import { getKitchenViewMode, KITCHEN_AREA_EVENT } from '@/lib/pos/posConfig'
import type { PreparationArea, StationOrder } from '@/lib/types'
import { StationHeader } from './StationHeader'
import { StationOrderCard } from './StationOrderCard'
import { KitchenPOSColumns } from './KitchenPOSColumns'
import { KitchenUnifiedSplit } from './KitchenUnifiedSplit'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// Combina las órdenes de ambas estaciones en una sola lista por id de orden,
// etiquetando cada ítem con su estación de origen.
function mergeOrders(hot: StationOrder[], cold: StationOrder[]): StationOrder[] {
  const map = new Map<number, StationOrder>()
  const add = (orders: StationOrder[], st: 'hot' | 'cold') => {
    orders.forEach(o => {
      const items = o.items.map(it => ({ ...it, station: st }))
      const existing = map.get(o.id)
      if (existing) {
        existing.items = [...existing.items, ...items]
        existing.elapsed_seconds = Math.max(existing.elapsed_seconds, o.elapsed_seconds)
      } else {
        map.set(o.id, { ...o, items })
      }
    })
  }
  add(hot, 'hot')
  add(cold, 'cold')
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

/** Cuenta las órdenes que tienen al menos un ítem en el área dada. */
function ordersInArea(orders: StationOrder[], area: 'hot' | 'cold'): number {
  return orders.reduce((n, o) => (o.items.some(i => i.station === area) ? n + 1 : n), 0)
}

/** Cuenta los ítems activos (no cancelados) de un área. */
function itemsInArea(orders: StationOrder[], area: 'hot' | 'cold'): number {
  return orders.reduce(
    (n, o) => n + o.items.filter(i => i.station === area && i.station_status !== 'cancelled').length,
    0,
  )
}

const EMPTY_STATE = (
  <div className="grid place-items-center rounded-2xl border border-dashed border-stone-700 py-24 text-center">
    <CookingPot className="mb-3 h-12 w-12 text-stone-600" />
    <p className="text-lg font-medium text-stone-400">Sin comandas pendientes</p>
    <p className="text-sm text-stone-500">Las órdenes enviadas por meseros aparecerán aquí.</p>
  </div>
)

export function UnifiedStationPanel() {
  const user     = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const { data: board } = useStationsBoard(branchId)
  const hot  = board?.hot  ?? []
  const cold = board?.cold ?? []
  const updateItem = useUpdateItemStationStatus()
  const cancelItem = useUpdateOrderItemStatus()
  const { data: posCount = 1 } = useEstablishmentPosCount(branchId)
  const viewMode = getKitchenViewMode(posCount === 2 ? 2 : 1)

  const [itemToCancel, setItemToCancel] = useState<{ orderId: number; itemId: number; productName: string } | null>(null)
  const qc = useQueryClient()

  const orders = useMemo(() => mergeOrders(hot, cold), [hot, cold])

  // Tiempo real: si un ítem cambia de área de preparación (Caliente ↔ Frío),
  // refrescamos al instante para reubicarlo sin recargar la pantalla.
  useEffect(() => {
    const onAreaUpdated = () => qc.invalidateQueries({ queryKey: ['station-orders'] })
    window.addEventListener(KITCHEN_AREA_EVENT, onAreaUpdated)
    return () => window.removeEventListener(KITCHEN_AREA_EVENT, onAreaUpdated)
  }, [qc])

  const handleAction = async (
    orderItemId: number,
    newStatus: 'preparing' | 'ready' | 'delivered',
    station: 'hot' | 'cold',
  ) => {
    try {
      await updateItem.mutateAsync({ station, orderItemId, status: newStatus })
      if (newStatus === 'ready') toast.success('Platillo marcado como listo', { duration: 3000 })
      else if (newStatus === 'delivered') toast.success('Platillo entregado con éxito')
    } catch {
      toast.error('Error al actualizar el estado del platillo')
    }
  }

  const handleConfirmCancelItem = async () => {
    if (!itemToCancel) return
    try {
      await cancelItem.mutateAsync({
        orderId: itemToCancel.orderId,
        itemId: itemToCancel.itemId,
        status: 'cancelled',
        reason: 'Cancelado desde cocina',
      })
      toast.success('Producto cancelado')
    } catch {
      toast.error('Error al cancelar el producto')
    } finally {
      setItemToCancel(null)
    }
  }

  // Render de una columna/sección de órdenes filtrando ítems por área.
  const renderArea = (area: PreparationArea) =>
    orders.map(order => {
      const items = order.items.filter(i => i.station === area)
      if (items.length === 0) return null
      return (
        <StationOrderCard
          key={order.id}
          order={{ ...order, items }}
          station={area}
          onAction={handleAction}
          isUpdating={updateItem.isPending}
          onCancelItem={(orderId, itemId, productName) => setItemToCancel({ orderId, itemId, productName })}
        />
      )
    })

  const counts: Record<PreparationArea, number> = {
    hot: ordersInArea(orders, 'hot'),
    cold: ordersInArea(orders, 'cold'),
  }

  const cancelDialog = (
    <ConfirmDialog
      open={!!itemToCancel}
      onOpenChange={(open) => !open && setItemToCancel(null)}
      title="Cancelar producto"
      description={itemToCancel ? `¿Cancelar "${itemToCancel.productName}"? Esta acción no se puede deshacer y se notificará al mesero.` : ''}
      confirmLabel="Cancelar producto"
      cancelLabel="Volver"
      variant="destructive"
      loading={cancelItem.isPending}
      onConfirm={handleConfirmCancelItem}
    />
  )

  if (viewMode === 'split') {
    // ── 2 POS: columnas operativas separadas POS Caliente / POS Frío ──
    return (
      <div className="flex h-full flex-col" style={{ background: '#1c1917' }}>
        <StationHeader station="all" activeCount={orders.length} lastUpdated={null} />
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-16">
          {orders.length === 0 ? EMPTY_STATE : (
            <>
              <div className="mb-4 flex items-center">
                <span className="rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300">
                  2 POS · estaciones separadas
                </span>
                <span className="ml-auto text-sm font-medium text-stone-400">
                  {orders.length} comanda(s) activa(s)
                </span>
              </div>
              <KitchenPOSColumns
                hotCount={counts.hot ?? 0}
                coldCount={counts.cold ?? 0}
                hot={<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{renderArea('hot')}</div>}
                cold={<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{renderArea('cold')}</div>}
              />
            </>
          )}
        </div>
        {cancelDialog}
      </div>
    )
  }

  // ── 1 POS: una cocina unificada dividida en secciones Caliente / Frío ──
  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#1c1917' }}>
      <StationHeader station="all" activeCount={orders.length} lastUpdated={null} />
      <KitchenUnifiedSplit
        hot={{ node: renderArea('hot'), count: itemsInArea(orders, 'hot'), empty: ordersInArea(orders, 'hot') === 0 }}
        cold={{ node: renderArea('cold'), count: itemsInArea(orders, 'cold'), empty: ordersInArea(orders, 'cold') === 0 }}
      />
      {cancelDialog}
    </div>
  )
}
