'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Flame, Snowflake } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useStationOrders, useUpdateItemStationStatus } from '@/lib/api/queries/useStationOrders'
import { useUpdateOrderItemStatus } from '@/lib/api/queries'
import { useStationSound } from '@/hooks/useStationSound'
import { usePrinter } from '@/hooks/usePrinter'
import type { StationOrder } from '@/lib/types'
import { StationHeader } from './StationHeader'
import { StationOrderCard } from './StationOrderCard'
import { StationEmptyState } from './StationEmptyState'
import { StationSyncIndicator } from './StationSyncIndicator'
import { cn } from '@/lib/utils/cn'
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface StationPanelProps {
  station: 'hot' | 'cold'
  fullscreen?: boolean
}

// Referencia legible del pedido para la comanda de cocina.
function orderRef(o: StationOrder): string {
  if (o.order_type === 'takeaway') return `Para llevar #${o.id}`
  if (o.order_type === 'delivery') return `Domicilio #${o.id}`
  return `Mesa ${o.table_name}`
}

const nowHm = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function StationPanel({ station, fullscreen }: StationPanelProps) {
  const user     = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const { data: orders = [], isError, dataUpdatedAt } = useStationOrders(station, branchId)
  const updateItem = useUpdateItemStationStatus()
  const cancelItem = useUpdateOrderItemStatus()
  const { playNewOrder, playOrderReady, playItemDone } = useStationSound()
  const printer = usePrinter()

  const [itemToCancel, setItemToCancel] = useState<{ orderId: number; itemId: number; productName: string } | null>(null)

  const prevIdsRef = useRef<Set<number>>(new Set())
  const hasInitRef = useRef(false)
  const prevItemIdsRef = useRef<Set<number>>(new Set())
  const cancelAlertedRef = useRef<Set<number>>(new Set())

  // El objeto de usePrinter cambia cada render; lo guardamos en ref para no
  // alterar las dependencias del efecto de polling.
  const printerRef = useRef(printer)
  printerRef.current = printer

  const stationLabel = station === 'hot' ? 'COCINA CALIENTE' : 'COCINA FRÍA / BARRA'
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const isHot = station === 'hot'
  const bg    = '#1c1917' // stone-900 — mismo charcoal que el demo KDS

  // Detecta órdenes nuevas (llegan por polling cada 2 s) y lanza un toast por
  // cada una. Al abrir la pantalla se siembran las existentes SIN notificar.
  useEffect(() => {
    if (!dataUpdatedAt) return
    if (orders.length) setLastUpdated(new Date())

    const currentIds = new Set<number>(orders.map(o => o.id))
    const currentItemIds = new Set<number>(orders.flatMap(o => o.items.map(it => it.order_item_id)))

    if (!hasInitRef.current) {
      hasInitRef.current = true
      prevIdsRef.current = currentIds
      prevItemIdsRef.current = currentItemIds
      // Siembra los cancelados ya presentes para no reimprimirlos al abrir.
      orders.forEach(o => o.items.forEach(it => {
        if (it.station_status === 'cancelled') cancelAlertedRef.current.add(it.order_item_id)
      }))
      return
    }

    const newOrders = orders.filter(o => !prevIdsRef.current.has(o.id))
    if (newOrders.length > 0) {
      playNewOrder()
      newOrders.forEach(o => {
        const count = o.items.reduce((n, it) => n + it.quantity, 0)
        toast(isHot ? '🔥 Cocina caliente' : '🧊 Cocina fría / Bar', {
          description: `Nueva orden${o.table_name ? ` · ${o.table_name}` : ''} · ${count} platillo${count !== 1 ? 's' : ''}`,
          duration: 4000,
        })
      })
    }

    // Ítems AGREGADOS a una mesa ya abierta: avisa una sola vez (cuando el id
    // del ítem aparece por primera vez), no en cada poll. Reimprime comanda.
    let addedSound = false
    orders.forEach(o => {
      if (!prevIdsRef.current.has(o.id)) return // orden nueva: ya se anunció arriba
      const news = o.items.filter(it => it.is_new && it.station_status === 'pending' && !prevItemIdsRef.current.has(it.order_item_id))
      if (news.length === 0) return
      addedSound = true
      toast('➕ Agregado a mesa', {
        description: `${o.table_name ?? `#${o.id}`}${o.waiter_name ? ` · ${o.waiter_name}` : ''} · ${news.map(n => `${n.quantity}× ${n.product_name}`).join(', ')}`,
        duration: 5000,
      })
      void printerRef.current.printKitchen({
        stationLabel,
        banner: 'AGREGADO A MESA',
        orderRef: orderRef(o),
        waiter: o.waiter_name,
        time: nowHm(),
        items: news.map(n => ({
          qty: n.quantity,
          name: n.product_name,
          modifiers: (n.modifiers ?? []).map(m => m.name),
          notes: n.item_notes,
        })),
      })
    })
    if (addedSound) playNewOrder()

    // Ítems CANCELADOS: alerta + comanda "CANCELAR PRODUCTO" una sola vez.
    orders.forEach(o => {
      const cancels = o.items.filter(
        it => it.station_status === 'cancelled' && !cancelAlertedRef.current.has(it.order_item_id),
      )
      if (cancels.length === 0) return
      cancels.forEach(c => cancelAlertedRef.current.add(c.order_item_id))
      toast.error('✕ Producto removido', {
        description: `${o.table_name ?? `#${o.id}`}${o.waiter_name ? ` · ${o.waiter_name}` : ''} · ${cancels.map(c => `${c.quantity}× ${c.product_name}`).join(', ')}`,
        duration: 6000,
      })
      void printerRef.current.printKitchen({
        stationLabel,
        banner: 'CANCELAR PRODUCTO',
        orderRef: orderRef(o),
        waiter: o.waiter_name,
        time: nowHm(),
        items: cancels.map(c => ({ qty: c.quantity, name: c.product_name })),
      })
    })

    prevIdsRef.current = currentIds
    prevItemIdsRef.current = currentItemIds
  }, [orders, dataUpdatedAt, isHot, playNewOrder, stationLabel])

  // Update item status mutation wrapper
  const handleUpdateItemStatus = async (
    orderItemId: number, newStatus: 'preparing' | 'ready' | 'delivered', st: 'hot' | 'cold' = station,
  ) => {
    try {
      await updateItem.mutateAsync({ station: st, orderItemId, status: newStatus })
      if (newStatus === 'ready') {
        playOrderReady()
        toast.success('Platillo marcado como listo', { duration: 3000 })
      } else if (newStatus === 'delivered') {
        playItemDone()
        toast.success('Platillo entregado con éxito')
      } else {
        playItemDone()
      }
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

  const content = (
    <div
      className={cn('flex flex-col', fullscreen ? 'min-h-screen' : 'h-full')}
      style={{ background: bg }}
    >
      <StationHeader
        station={station}
        activeCount={orders.length}
        lastUpdated={lastUpdated}
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-16">
        {/* Subheader Filter Bar matching the screenshot style */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-stone-950 select-none',
              isHot ? 'bg-[#FACC15]' : 'bg-blue-600'
            )}>
              {isHot ? <Flame className="h-4 w-4 shrink-0" /> : <Snowflake className="h-4 w-4 shrink-0" />}
              {isHot ? 'Caliente' : 'Fría'}
            </span>
          </div>
          <span className="text-sm text-stone-400 font-medium">
            {orders.length} comanda(s) activa(s)
          </span>
        </div>

        {user?.role === 'cocina' && (
          <PushNotificationToggle
            label="Cocina"
            compact
            context={{ userId: user.id, role: user.role, branchId }}
            className="mb-4 border-white/10 bg-white/[0.03] text-white shadow-none [&_p]:text-white [&_p.text-muted-foreground]:text-stone-400"
          />
        )}

        {orders.length === 0 ? (
          <StationEmptyState station={station} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map(order => (
              <StationOrderCard
                key={order.id}
                order={order}
                station={station}
                onAction={handleUpdateItemStatus}
                isUpdating={updateItem.isPending}
                onCancelItem={(orderId, itemId, productName) => setItemToCancel({ orderId, itemId, productName })}
              />
            ))}
          </div>
        )}
      </div>

      <StationSyncIndicator
        lastUpdated={lastUpdated}
        isError={isError}
        station={station}
      />

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
    </div>
  )

  return content
}
