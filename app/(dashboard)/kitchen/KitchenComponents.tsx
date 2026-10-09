'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Flame, CheckCircle2 } from 'lucide-react'
import { useInterval } from '@/hooks/useInterval'
import type { Order, OrderStatus } from '@/lib/types'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

export type KitchenTab = 'pending' | 'preparing' | 'ready'

export interface ColConfig {
  label: string
  shortLabel: string
  emptyMsg: string
  dot: string
  headerBg: string
  headerText: string
  colBg: string
  cardBorder: string
  cardBg: string
  qtyBg: string
  actionLabel: string
  actionNext: OrderStatus
  actionCls: string
  icon: string
}

export const COL: Record<KitchenTab, ColConfig> = {
  pending: {
    label:       'Nuevas órdenes',
    shortLabel:  'Nuevas',
    emptyMsg:    'Sin órdenes nuevas',
    dot:         'bg-amber-400 animate-pulse',
    headerBg:    'bg-amber-400',
    headerText:  'text-amber-900',
    colBg:       'bg-amber-50 dark:bg-amber-950/20',
    cardBorder:  'border-amber-300',
    cardBg:      'bg-white dark:bg-amber-950/30',
    qtyBg:       'bg-amber-400',
    actionLabel: 'Comenzar',
    actionNext:  'preparing',
    actionCls:   'bg-amber-500 hover:bg-amber-600 text-white',
    icon:        ICONS8.pending,
  },
  preparing: {
    label:       'En preparación',
    shortLabel:  'Preparando',
    emptyMsg:    'Nada en preparación',
    dot:         'bg-amber-400',
    headerBg:    'bg-amber-500',
    headerText:  'text-yellow-900',
    colBg:       'bg-amber-50 dark:bg-amber-950/20',
    cardBorder:  'border-amber-300',
    cardBg:      'bg-white dark:bg-amber-950/30',
    qtyBg:       'bg-amber-500',
    actionLabel: 'Marcar Listo',
    actionNext:  'ready',
    actionCls:   'bg-amber-500 hover:bg-amber-600 text-stone-950',
    icon:        ICONS8.preparing,
  },
  ready: {
    label:       'Listos para entregar',
    shortLabel:  'Listos',
    emptyMsg:    'Sin pedidos listos',
    dot:         'bg-emerald-400',
    headerBg:    'bg-emerald-500',
    headerText:  'text-emerald-900',
    colBg:       'bg-emerald-50 dark:bg-emerald-950/20',
    cardBorder:  'border-emerald-300',
    cardBg:      'bg-white dark:bg-emerald-950/30',
    qtyBg:       'bg-emerald-500',
    actionLabel: 'Marcar Entregado',
    actionNext:  'delivered',
    actionCls:   'bg-emerald-500 hover:bg-emerald-600 text-white',
    icon:        ICONS8.ready,
  },
}

export function elapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

export function elapsedLabel(createdAt: string): string {
  const m = elapsedMinutes(createdAt)
  if (m < 1) return 'Menos de 1 min'
  if (m === 1) return '1 min'
  return `${m} min`
}

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [, setTick] = useState(0)
  useInterval(() => setTick(t => t + 1), 60000)
  const m = elapsedMinutes(createdAt)
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
      m >= 20 ? 'bg-red-100 text-red-700' :
      m >= 10 ? 'bg-amber-100 text-amber-700' :
      'bg-white/30 text-white',
    )}>
      <Clock className="h-3 w-3" />
      {elapsedLabel(createdAt)}
    </div>
  )
}

function PriorityBanner({ createdAt }: { createdAt: string }) {
  const m = elapsedMinutes(createdAt)
  if (m < 15) return null
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold',
      m >= 25 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    )}>
      <Flame className="h-3 w-3" />
      {m >= 25 ? `¡URGENTE! ${m} min esperando` : `${m} min en espera`}
    </div>
  )
}

export function KitchenOrderCard({
  order,
  onAction,
  onViewDetail,
  isNew,
}: {
  order: Order
  onAction: (id: number, status: OrderStatus) => void
  onViewDetail: (order: Order) => void
  isNew: boolean
}) {
  const cfg = COL[order.status as KitchenTab]
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0)
  const [, setTick] = useState(0)
  useInterval(() => setTick(t => t + 1), 15000)
  const minutes = elapsedMinutes(order.created_at)

  return (
    <article className={cn(
      'border-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-300',
      cfg.cardBorder, cfg.cardBg,
      isNew && 'ring-2 ring-amber-400 ring-offset-2 animate-pulse-once',
      minutes >= 20 && 'border-red-400',
    )}>
      <div className={cn('flex items-center justify-between px-4 py-3', cfg.headerBg)}>
        <div className="flex items-center gap-2">
          <Icons8Image src={cfg.icon} alt={order.status} size={22} className="brightness-0 invert shrink-0" />
          <div>
            <p className="font-extrabold text-lg text-white leading-none">#{order.id}</p>
            <p className="text-white/80 text-xs font-medium">{order.table_name}</p>
          </div>
        </div>
        <OrderTimer createdAt={order.created_at} />
      </div>

      <div className="px-4 py-3 space-y-3">
        <PriorityBanner createdAt={order.created_at} />

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium truncate max-w-[55%]">
            👤 Mesa {order.table_name}
          </span>
          <span>{format(new Date(order.created_at), 'hh:mm a', { locale: es })}</span>
        </div>

        <div className="space-y-1.5">
          {order.items.map(item => (
            <div key={item.product_id} className="flex items-center gap-2.5">
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0',
                cfg.qtyBg,
              )}>
                {item.quantity}
              </span>
              <span className="text-sm font-semibold leading-tight line-clamp-1">
                {item.product_name}
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">Nota</p>
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 line-clamp-2">{order.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2">
          <span>{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
          <span className="font-semibold">{formatCurrency(order.total)}</span>
        </div>

        <div className="flex gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 text-xs font-semibold border-stone-300 text-stone-600 hover:border-stone-400"
            onClick={() => onViewDetail(order)}
          >
            Ver detalle
          </Button>
          <Button
            className={cn('flex-1 h-10 text-sm font-bold', cfg.actionCls)}
            onClick={() => onAction(order.id, cfg.actionNext)}
          >
            {cfg.actionLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}

export function KitchenColumn({
  tab,
  orders,
  newIds,
  onAction,
  onViewDetail,
}: {
  tab: KitchenTab
  orders: Order[]
  newIds: Set<number>
  onAction: (id: number, status: OrderStatus) => void
  onViewDetail: (order: Order) => void
}) {
  const cfg = COL[tab]

  return (
    <div className={cn('rounded-2xl overflow-hidden flex flex-col', cfg.colBg)}>
      <div className={cn('flex items-center gap-2.5 px-4 py-3', cfg.headerBg)}>
        <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
        <h2 className={cn('font-bold text-base', cfg.headerText)}>{cfg.label}</h2>
        <span className={cn(
          'ml-auto text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/25 text-white',
        )}>
          {orders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[calc(100vh-220px)]">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2 opacity-50">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">{cfg.emptyMsg}</p>
          </div>
        ) : (
          orders.map(order => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              isNew={newIds.has(order.id)}
              onAction={onAction}
              onViewDetail={onViewDetail}
            />
          ))
        )}
      </div>
    </div>
  )
}
