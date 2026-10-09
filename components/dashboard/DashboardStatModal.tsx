'use client'

import { Fragment } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  Clock, CheckCircle2, ShoppingBag, Truck, ChefHat,
  Wallet, Receipt, UtensilsCrossed, TrendingUp, Package,
  X, ArrowRight,
} from 'lucide-react'
import type { Order, Table, SalesSummary } from '@/lib/types'
import Link from 'next/link'

export type StatModalType =
  | 'ventas'
  | 'activos'
  | 'mesas'
  | 'ticket'
  | 'abiertos'
  | 'cobrados'
  | 'pickup'
  | 'delivery'
  | 'platillos'

interface Props {
  open: boolean
  type: StatModalType | null
  onClose: () => void
  orders: Order[]
  tables: Table[]
  summary: SalesSummary | undefined
  today: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return 'ahora'
  if (diff < 60) return `hace ${diff} min`
  const h = Math.floor(diff / 60)
  return `hace ${h} h ${diff % 60} min`
}

function statusLabel(s: string) {
  return s === 'pending' ? 'Pendiente'
    : s === 'preparing' ? 'Preparando'
    : s === 'ready' ? 'Listo'
    : s === 'completed' ? 'Completado'
    : s === 'cancelled' ? 'Cancelado'
    : s
}

function statusColor(s: string) {
  return s === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : s === 'preparing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    : s === 'ready' ? 'bg-green-500/10 text-green-600 dark:text-green-400'
    : s === 'completed' ? 'bg-stone-500/10 text-stone-500'
    : 'bg-red-500/10 text-red-500'
}

function payLabel(s: string) {
  return s === 'paid' ? 'Pagado' : s === 'pending' ? 'Por cobrar' : s
}

function orderTypeLabel(t: string) {
  return t === 'dine_in' ? 'Mesa' : t === 'takeaway' ? 'Pickup' : 'Domicilio'
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors rounded-xl cursor-pointer group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
              #{order.id}
            </span>
            {order.table_name && (
              <span className="text-xs text-stone-500">{order.table_name}</span>
            )}
            <Badge className={cn('text-[10px]', statusColor(order.status))}>
              {statusLabel(order.status)}
            </Badge>
            <Badge className={cn(
              'text-[10px]',
              order.payment_status === 'paid'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
            )}>
              {payLabel(order.payment_status)}
            </Badge>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            {orderTypeLabel(order.order_type)} · {order.items.length} platillo{order.items.length !== 1 ? 's' : ''} · {timeAgo(order.created_at)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">{formatCurrency(order.total)}</p>
          <ArrowRight className="h-3 w-3 text-stone-300 ml-auto mt-0.5 group-hover:text-[#D1400F] transition-colors" />
        </div>
      </div>
    </Link>
  )
}

// ── Contenidos por tipo ───────────────────────────────────────────────────────

function VentasContent({ orders, summary }: { orders: Order[]; summary: SalesSummary | undefined }) {
  const todayKey = new Date().toDateString()
  const todays = orders.filter(o => new Date(o.created_at).toDateString() === todayKey)

  const byType = [
    { label: 'Mesa', type: 'dine_in', color: 'bg-orange-500' },
    { label: 'Pickup', type: 'takeaway', color: 'bg-blue-500' },
    { label: 'Domicilio', type: 'delivery', color: 'bg-purple-500' },
  ].map(t => ({
    ...t,
    count: todays.filter(o => o.order_type === t.type).length,
    revenue: todays.filter(o => o.order_type === t.type).reduce((s, o) => s + o.total, 0),
  }))

  // Top productos
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const order of todays) {
    for (const item of order.items) {
      const prev = itemMap.get(item.product_name) ?? { name: item.product_name, qty: 0, revenue: 0 }
      itemMap.set(item.product_name, {
        name: item.product_name,
        qty: prev.qty + item.quantity,
        revenue: prev.revenue + item.unit_price * item.quantity,
      })
    }
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ingresos', value: formatCurrency(summary?.today.revenue ?? 0), color: 'text-[#D1400F]' },
          { label: 'Pedidos', value: String(summary?.today.order_count ?? 0), color: 'text-blue-500' },
          { label: 'Esta semana', value: formatCurrency(summary?.week.revenue ?? 0), color: 'text-green-500' },
        ].map(k => (
          <div key={k.label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">{k.label}</p>
            <p className={cn('text-lg font-extrabold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Por tipo */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">Por tipo de pedido</p>
        <div className="space-y-2">
          {byType.map(t => (
            <div key={t.type} className="flex items-center gap-3">
              <span className={cn('h-2 w-2 rounded-full shrink-0', t.color)} />
              <span className="text-sm text-stone-700 dark:text-stone-300 flex-1">{t.label}</span>
              <span className="text-xs text-stone-400">{t.count} pedidos</span>
              <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 w-20 text-right">{formatCurrency(t.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top platillos */}
      {topItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">Top platillos hoy</p>
          <div className="space-y-1.5">
            {topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 py-1">
                <span className="text-xs font-bold text-stone-300 dark:text-stone-600 w-4">#{i + 1}</span>
                <span className="text-sm text-stone-700 dark:text-stone-300 flex-1 truncate">{item.name}</span>
                <span className="text-xs text-stone-400">×{item.qty}</span>
                <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 w-20 text-right">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActiveOrdersContent({ orders }: { orders: Order[] }) {
  const active = orders.filter(o => ['pending', 'preparing'].includes(o.status))
  if (active.length === 0) return (
    <div className="text-center py-10 text-stone-400">
      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No hay pedidos activos</p>
    </div>
  )
  return (
    <div className="space-y-1 -mx-2">
      {active.map(o => <OrderRow key={o.id} order={o} />)}
    </div>
  )
}

function TablesContent({ tables, orders }: { tables: Table[]; orders: Order[] }) {
  const sortedTables = [...tables].sort((a, b) => {
    if (a.status === 'ocupada' && b.status !== 'ocupada') return -1
    if (b.status === 'ocupada' && a.status !== 'ocupada') return 1
    return 0
  })

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Ocupadas', value: tables.filter(t => t.status === 'ocupada').length, color: 'text-[#D1400F]' },
          { label: 'Libres', value: tables.filter(t => t.status === 'libre').length, color: 'text-green-500' },
          { label: 'Total', value: tables.length, color: 'text-stone-500' },
        ].map(k => (
          <div key={k.label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">{k.label}</p>
            <p className={cn('text-xl font-extrabold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sortedTables.map(table => {
          const tableOrder = orders.find(o =>
            o.table_id === table.id && ['pending', 'preparing', 'ready'].includes(o.status),
          )
          const isOccupied = table.status === 'ocupada'
          return (
            <div key={table.id} className={cn(
              'rounded-xl border p-3 space-y-1.5',
              isOccupied
                ? 'bg-[#D1400F]/8 border-[#D1400F]/30 dark:bg-[#D1400F]/10'
                : 'bg-stone-50 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700',
            )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">{table.name}</span>
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  isOccupied ? 'bg-[#D1400F]' : 'bg-green-500',
                )} />
              </div>
              {tableOrder ? (
                <>
                  <p className="text-xs text-stone-500">Pedido #{tableOrder.id}</p>
                  <p className="text-xs font-bold text-[#D1400F]">{formatCurrency(tableOrder.total)}</p>
                  <p className="text-[10px] text-stone-400">{timeAgo(tableOrder.created_at)}</p>
                </>
              ) : (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Libre</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TicketContent({ orders, summary }: { orders: Order[]; summary: SalesSummary | undefined }) {
  const todayKey = new Date().toDateString()
  const paid = orders.filter(o =>
    new Date(o.created_at).toDateString() === todayKey && o.payment_status === 'paid',
  )
  const totals = paid.map(o => o.total).sort((a, b) => a - b)
  const avg = totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : 0
  const max = totals.at(-1) ?? 0
  const min = totals[0] ?? 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Promedio', value: formatCurrency(avg), color: 'text-purple-500' },
          { label: 'Mayor', value: formatCurrency(max), color: 'text-green-500' },
          { label: 'Menor', value: formatCurrency(min), color: 'text-stone-400' },
        ].map(k => (
          <div key={k.label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">{k.label}</p>
            <p className={cn('text-base font-extrabold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Esta semana', value: formatCurrency(summary?.week.revenue ?? 0), sub: `${summary?.week.order_count ?? 0} pedidos` },
          { label: 'Este mes', value: formatCurrency(summary?.month.revenue ?? 0), sub: `${summary?.month.order_count ?? 0} pedidos` },
        ].map(k => (
          <div key={k.label} className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">{k.label}</p>
            <p className="text-lg font-extrabold text-stone-900 dark:text-stone-100">{k.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {paid.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">Tickets cobrados hoy</p>
          <div className="space-y-1 -mx-2">
            {paid.slice(0, 8).map(o => <OrderRow key={o.id} order={o} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function FilteredOrdersContent({
  orders, filter, emptyText, emptyIcon,
}: {
  orders: Order[]
  filter: (o: Order) => boolean
  emptyText: string
  emptyIcon: React.ReactNode
}) {
  const filtered = orders.filter(filter)
  if (filtered.length === 0) return (
    <div className="text-center py-10 text-stone-400">
      <div className="mx-auto mb-2 opacity-40 w-fit">{emptyIcon}</div>
      <p className="text-sm">{emptyText}</p>
    </div>
  )
  return (
    <div className="space-y-1 -mx-2">
      {filtered.map(o => <OrderRow key={o.id} order={o} />)}
    </div>
  )
}

function PlatillosContent({ orders }: { orders: Order[] }) {
  const pending: { orderID: number; table: string; name: string; qty: number }[] = []
  for (const order of orders) {
    for (const item of order.items) {
      if ((item.status ?? 'pending') === 'pending') {
        pending.push({
          orderID: order.id,
          table: order.table_name ?? `#${order.id}`,
          name: item.product_name,
          qty: item.quantity,
        })
      }
    }
  }

  if (pending.length === 0) return (
    <div className="text-center py-10 text-stone-400">
      <ChefHat className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No hay platillos pendientes</p>
    </div>
  )

  return (
    <div className="space-y-1.5">
      {pending.map((item, i) => (
        <div key={i} className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl px-4 py-3">
          <ChefHat className="h-4 w-4 text-[#D1400F] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">{item.name}</p>
            <p className="text-xs text-stone-400">Pedido #{item.orderID} · {item.table}</p>
          </div>
          <span className="text-sm font-bold text-[#D1400F] shrink-0">×{item.qty}</span>
        </div>
      ))}
    </div>
  )
}

// ── Config de cada modal ──────────────────────────────────────────────────────

const MODAL_CONFIG: Record<StatModalType, { title: string; icon: React.ReactNode }> = {
  ventas:    { title: 'Ventas de hoy',          icon: <Wallet className="h-5 w-5 text-[#D1400F]" /> },
  activos:   { title: 'Pedidos activos',         icon: <Package className="h-5 w-5 text-blue-500" /> },
  mesas:     { title: 'Estado de mesas',         icon: <UtensilsCrossed className="h-5 w-5 text-green-500" /> },
  ticket:    { title: 'Ticket promedio',         icon: <Receipt className="h-5 w-5 text-purple-500" /> },
  abiertos:  { title: 'Tickets abiertos',        icon: <Clock className="h-5 w-5 text-amber-500" /> },
  cobrados:  { title: 'Cobrados hoy',            icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
  pickup:    { title: 'Pickup hoy',              icon: <ShoppingBag className="h-5 w-5 text-blue-500" /> },
  delivery:  { title: 'Domicilio hoy',           icon: <Truck className="h-5 w-5 text-indigo-500" /> },
  platillos: { title: 'Platillos pendientes',    icon: <ChefHat className="h-5 w-5 text-[#D1400F]" /> },
}

const todayKey = () => new Date().toDateString()

// ── Modal principal ───────────────────────────────────────────────────────────

export function DashboardStatModal({ open, type, onClose, orders, tables, summary }: Props) {
  if (!type) return null
  const cfg = MODAL_CONFIG[type]

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === todayKey())

  const content = (() => {
    switch (type) {
      case 'ventas':
        return <VentasContent orders={orders} summary={summary} />
      case 'activos':
        return <ActiveOrdersContent orders={orders} />
      case 'mesas':
        return <TablesContent tables={tables} orders={orders} />
      case 'ticket':
        return <TicketContent orders={orders} summary={summary} />
      case 'abiertos':
        return (
          <FilteredOrdersContent
            orders={orders}
            filter={o => !['completed', 'cancelled'].includes(o.status) && o.payment_status !== 'paid'}
            emptyText="No hay tickets abiertos"
            emptyIcon={<Clock className="h-10 w-10" />}
          />
        )
      case 'cobrados':
        return (
          <FilteredOrdersContent
            orders={todayOrders}
            filter={o => o.payment_status === 'paid'}
            emptyText="Sin cobros registrados hoy"
            emptyIcon={<CheckCircle2 className="h-10 w-10" />}
          />
        )
      case 'pickup':
        return (
          <FilteredOrdersContent
            orders={todayOrders}
            filter={o => o.order_type === 'takeaway'}
            emptyText="Sin pedidos de pickup hoy"
            emptyIcon={<ShoppingBag className="h-10 w-10" />}
          />
        )
      case 'delivery':
        return (
          <FilteredOrdersContent
            orders={todayOrders}
            filter={o => o.order_type === 'delivery'}
            emptyText="Sin pedidos a domicilio hoy"
            emptyIcon={<Truck className="h-10 w-10" />}
          />
        )
      case 'platillos':
        return <PlatillosContent orders={orders} />
    }
  })()

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg w-full max-h-[88vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            <span className="h-8 w-8 rounded-xl bg-stone-100 dark:bg-stone-800 grid place-items-center shrink-0">
              {cfg.icon}
            </span>
            {cfg.title}
          </DialogTitle>
        </DialogHeader>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
