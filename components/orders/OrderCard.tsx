'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '@/lib/types'
import { useUpdateOrderStatus } from '@/lib/api/queries'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency, formatTimeAgo } from '@/lib/utils/formatters'
import { orderPrimaryLabel } from '@/lib/utils/orderLabels'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const STATUS_META: Record<OrderStatus, { icon: string; iconBg: string; borderColor: string }> = {
  pending:   { icon: ICONS8.pending,   iconBg: 'bg-amber-100 dark:bg-amber-900/30',   borderColor: 'border-l-amber-400' },
  preparing: { icon: ICONS8.preparing, iconBg: 'bg-orange-100 dark:bg-orange-900/30', borderColor: 'border-l-[#D1400F]' },
  ready:     { icon: ICONS8.ready,     iconBg: 'bg-blue-100 dark:bg-blue-900/30',     borderColor: 'border-l-blue-400' },
  delivered: { icon: ICONS8.delivered, iconBg: 'bg-purple-100 dark:bg-purple-900/30', borderColor: 'border-l-purple-400' },
  completed: { icon: ICONS8.completed, iconBg: 'bg-green-100 dark:bg-green-900/30',   borderColor: 'border-l-green-500' },
  cancelled: { icon: ICONS8.cancelled, iconBg: 'bg-gray-100 dark:bg-gray-800/50',     borderColor: 'border-l-gray-300 dark:border-l-gray-600' },
}

const ACTIVE: OrderStatus[] = ['pending', 'preparing', 'ready']

export const CHANNEL_LABEL: Record<string, string> = {
  pos: 'Mostrador',
  mesero: 'Mesero',
  whatsapp: 'WhatsApp',
}

function ChannelBadge({ source }: { source: string }) {
  const label = CHANNEL_LABEL[source] ?? source
  return (
    <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
      {label}
    </span>
  )
}

export function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]
  const isActive = ACTIVE.includes(order.status)
  const minsSince = (Date.now() - new Date(order.created_at).getTime()) / 60_000
  const isUrgent = isActive && minsSince > 30
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const updateStatus = useUpdateOrderStatus()

  const previewText =
    order.items
      .slice(0, 2)
      .map(i => (i.quantity > 1 ? `${i.quantity}× ${i.product_name}` : i.product_name))
      .join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2} más` : '')

  const handleCancel = async () => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: 'cancelled' })
      toast.success('Pedido cancelado')
      setConfirmOpen(false)
    } catch {
      toast.error('No se pudo cancelar el pedido')
    }
  }

  return (
    <>
      <Link href={`/orders/${order.id}`}>
        <div className={cn(
          'group relative bg-card rounded-xl border border-border border-l-4 transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-0.5',
          meta.borderColor,
          isUrgent && 'ring-1 ring-red-400/50',
        )}>
          <div className="p-4 flex items-center gap-4">
            <div className={cn(
              'shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center',
              meta.iconBg,
              isUrgent && 'animate-pulse',
            )}>
              <Icons8Image src={meta.icon} alt={order.status} size={30} />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Jerarquía alta: la MESA es lo más importante para cocina/kiosko. */}
                <span className="font-heading font-bold text-lg leading-none tracking-tight flex items-center gap-1.5">
                  <Icons8Image src={ICONS8.tableIcon} alt="mesa" size={18} />
                  {orderPrimaryLabel(order)}
                </span>
                <OrderStatusBadge status={order.status} />
                {order.source && order.source !== 'pos' && <ChannelBadge source={order.source} />}
                {isUrgent && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Urgente
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {/* Jerarquía baja: el folio del pedido es dato secundario. */}
                <span className="font-medium">Pedido #{order.id}</span>
                <span className="text-border">·</span>
                <span>{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</span>
                <span className="text-border">·</span>
                <span>{formatTimeAgo(order.created_at)}</span>
              </div>

              <p className="text-xs text-muted-foreground/60 truncate leading-none">{previewText}</p>
            </div>

            <div className="shrink-0 flex items-center gap-2 pl-2">
              <div className="text-right">
                <p className="font-heading font-bold text-base tabular-nums">{formatCurrency(order.total)}</p>
                <p className="text-xs text-muted-foreground">{totalItems} pzas</p>
              </div>
              {isActive && (
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmOpen(true) }}
                  aria-label="Cancelar pedido"
                  title="Cancelar pedido"
                  className="w-8 h-8 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </Link>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancelar pedido"
        description={`¿Cancelar el pedido #${order.id} (${orderPrimaryLabel(order)})? Esta acción no se puede deshacer.`}
        confirmLabel="Cancelar pedido"
        cancelLabel="Volver"
        variant="destructive"
        loading={updateStatus.isPending}
        onConfirm={handleCancel}
      />
    </>
  )
}
