/**
 * FoodIX — Modo Demo · Panel Cocina (KDS)
 * Recibe órdenes en tiempo real (local) y permite cambiar el estado de cada
 * ítem: Nuevo → En preparación → Listo. UI touch-friendly para kioskos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Flame, Snowflake, Check, CookingPot, CircleDot } from 'lucide-react'
import { DemoShell } from '@/components/demo/DemoShell'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { useDemoStore, demoActions } from '@/lib/demo/demo-store'
import type { OrderItemStatus, KitchenStation, DemoOrder } from '@/lib/demo/demo-types'
import { usePOSConfig, DEMO_ESTABLISHMENT_ID } from '@/lib/pos/posConfig'
import { KitchenPOSColumns } from '@/components/kitchen/KitchenPOSColumns'
import { KitchenUnifiedSplit } from '@/components/kitchen/KitchenUnifiedSplit'

export default function DemoKitchenPage() {
  return (
    <DemoShell role="kitchen" title="Estación de cocina" fullBleed>
      <KitchenContent />
    </DemoShell>
  )
}

const NEXT_STATUS: Record<OrderItemStatus, OrderItemStatus> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: 'served',
}

const STATUS_META: Record<OrderItemStatus, { label: string; chip: string; btn: string; icon: typeof CircleDot }> = {
  new: { label: 'Nuevo', chip: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700', icon: CircleDot },
  preparing: { label: 'Preparando', chip: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600', icon: CookingPot },
  ready: { label: 'Listo', chip: 'bg-green-100 text-green-700', btn: 'bg-green-600 hover:bg-green-700', icon: Check },
  served: { label: 'Entregado', chip: 'bg-stone-200 text-stone-600', btn: 'bg-stone-400', icon: Check },
}

function minutesAgo(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000))
  return m === 0 ? 'ahora' : `${m} min`
}

const EMPTY_STATE = (
  <div className="grid place-items-center rounded-2xl border border-dashed border-stone-700 py-24 text-center">
    <CookingPot className="mb-3 h-12 w-12 text-stone-600" />
    <p className="text-lg font-medium text-stone-400">Sin comandas pendientes</p>
    <p className="text-sm text-stone-500">Las órdenes enviadas por meseros aparecerán aquí.</p>
  </div>
)

/** Tarjeta de comanda demo, filtrando ítems por área (all/hot/cold). */
function DemoOrderCard({ order, area, tableLabel }: { order: DemoOrder; area: KitchenStation | 'all'; tableLabel: string }) {
  const items = order.items.filter(i => area === 'all' || i.station === area)
  if (items.length === 0) return null
  const allReady = items.every(i => i.status === 'ready' || i.status === 'served')
  return (
    <div
      className={cn(
        'animate-fade-in-up flex flex-col overflow-hidden rounded-2xl bg-white text-stone-900 shadow-lg ring-2 transition-all',
        allReady ? 'ring-green-500' : 'ring-transparent',
      )}
    >
      <div className="flex items-center justify-between bg-stone-100 px-4 py-2.5">
        <div>
          <p className="text-base font-bold leading-tight">{tableLabel}</p>
          <p className="text-xs text-stone-500">{order.waiterName}</p>
        </div>
        <Badge variant="muted" className="gap-1">
          <Clock className="h-3 w-3" /> {minutesAgo(order.createdAt)}
        </Badge>
      </div>

      <ul className="flex-1 divide-y divide-stone-100">
        {items.map(i => {
          const meta = STATUS_META[i.status]
          const StationIcon = i.station === 'hot' ? Flame : Snowflake
          return (
            <li key={i.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-stone-900 text-xs font-bold text-white">
                      {i.qty}
                    </span>
                    <span className="truncate">{i.name}</span>
                  </p>
                  {i.modifiers.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {i.modifiers.map((m, idx) => (
                        <span
                          key={`${m.name}-${idx}`}
                          className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {i.note && (
                    <p className="mt-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-xs italic text-amber-700">
                      📝 {i.note}
                    </p>
                  )}
                </div>
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.chip)}>
                  <StationIcon className="h-3 w-3" />
                </span>
              </div>

              {i.status === 'served' ? (
                <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-stone-100 py-2 text-xs font-semibold text-stone-400">
                  <Check className="h-4 w-4" /> Entregado
                </div>
              ) : (
                <button
                  onClick={() => demoActions.setItemStatus(order.id, i.id, NEXT_STATUS[i.status])}
                  className={cn(
                    'mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white transition-all active:scale-95',
                    meta.btn,
                  )}
                >
                  <meta.icon className="h-4 w-4" />
                  {i.status === 'new' && 'Comenzar preparación'}
                  {i.status === 'preparing' && 'Marcar listo'}
                  {i.status === 'ready' && 'Marcar entregado'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function countOrdersInArea(orders: DemoOrder[], area: KitchenStation): number {
  return orders.reduce((n, o) => (o.items.some(i => i.station === area && i.status !== 'served') ? n + 1 : n), 0)
}

/** Cantidad de ítems activos (no entregados) de un área. */
function countItemsInArea(orders: DemoOrder[], area: KitchenStation): number {
  return orders.reduce((n, o) => n + o.items.filter(i => i.station === area && i.status !== 'served').length, 0)
}

function KitchenContent() {
  const orders = useDemoStore(s => s.orders)
  const tables = useDemoStore(s => s.tables)
  const { viewMode } = usePOSConfig(DEMO_ESTABLISHMENT_ID, { demo: true })
  const [, setTick] = useState(0)

  // Refresca los contadores de tiempo cada 30s.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const sentOrders = useMemo(
    () =>
      orders
        .filter(o => o.status === 'sent' && o.items.some(i => i.status !== 'served'))
        .sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  )

  const tableLabel = (tableId: string) => tables.find(t => t.id === tableId)?.label ?? 'Mesa'

  const renderCards = (area: KitchenStation | 'all') =>
    sentOrders.map(o => (
      <DemoOrderCard key={o.id} order={o} area={area} tableLabel={tableLabel(o.tableId)} />
    ))

  if (viewMode === 'split') {
    // ── 2 POS: columnas operativas separadas POS Caliente / POS Frío ──
    const counts: Record<KitchenStation, number> = {
      hot: countOrdersInArea(sentOrders, 'hot'),
      cold: countOrdersInArea(sentOrders, 'cold'),
    }
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-stone-900 px-3 py-4 sm:px-5">
        {sentOrders.length === 0 ? EMPTY_STATE : (
          <>
            <div className="mb-4 flex items-center">
              <span className="rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300">
                2 POS · estaciones separadas
              </span>
              <span className="ml-auto text-sm text-stone-400">{sentOrders.length} comanda(s) activa(s)</span>
            </div>
            <KitchenPOSColumns
              hotCount={counts.hot ?? 0}
              coldCount={counts.cold ?? 0}
              hot={<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{renderCards('hot')}</div>}
              cold={<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{renderCards('cold')}</div>}
            />
          </>
        )}
      </div>
    )
  }

  // ── 1 POS: una cocina unificada dividida en secciones Caliente / Frío ──
  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col bg-stone-900">
      <KitchenUnifiedSplit
        hot={{ node: renderCards('hot'), count: countItemsInArea(sentOrders, 'hot'), empty: countOrdersInArea(sentOrders, 'hot') === 0 }}
        cold={{ node: renderCards('cold'), count: countItemsInArea(sentOrders, 'cold'), empty: countOrdersInArea(sentOrders, 'cold') === 0 }}
      />
    </div>
  )
}
