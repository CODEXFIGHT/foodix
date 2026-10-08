'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, AlertTriangle, Printer, Inbox, DollarSign, Split } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOrder, useUpdateOrderStatus } from '@/lib/api/queries'
import { usePrinter } from '@/hooks/usePrinter'
import { orderItemsToReceiptLines } from '@/lib/printing/orderLines'
import { PaymentDialog } from '@/components/orders/PaymentDialog'
import { SplitBillDialog } from '@/components/orders/SplitBillDialog'
import { SplitProgressPanel } from '@/components/orders/SplitProgressPanel'
import { PageHeader } from '@/components/shared/PageHeader'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline'
import { OrderSummary } from '@/components/orders/OrderSummary'
import { orderPrimaryLabel } from '@/lib/utils/orderLabels'
import { OpenOrderEditor } from '@/components/orders/OpenOrderEditor'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

// Un solo paso: desde cualquier estado activo se completa directo, sin
// tener que ir marcando preparando → listo → entregado uno por uno. El
// seguimiento fino por estación (KDS) sigue funcionando aparte, por ítem.

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const { data: order, isLoading } = useOrder(id ? Number(id) : null)
  const updateStatus = useUpdateOrderStatus()
  const printer = usePrinter()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Pedido no encontrado"
          actions={<Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>}
        />
        <p className="text-muted-foreground">El pedido #{id} no existe.</p>
      </div>
    )
  }

  const role = user?.role ?? 'mesero'
  // El ticket permanece editable mientras la mesa esté abierta y sin cobrar (incluso si está completada/ticket abierto).
  const editable = order.status !== 'cancelled' && order.payment_status !== 'paid'

  const handleComplete = async () => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: 'completed' })
      toast.success('Pedido completado')
    } catch {
      toast.error('Error al completar el pedido')
    }
  }

  const handleCancel = async () => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: 'cancelled' })
      toast.success('Pedido cancelado')
      setCancelOpen(false)
      router.push('/orders')
    } catch {
      toast.error('Error al cancelar pedido')
    }
  }

  const handlePrint = () =>
    printer.printOrder({
      orderId: order.id,
      tableName: order.table_name,
      orderType: order.order_type,
      createdAt: formatDate(order.created_at),
      // No se imprimen los productos cancelados en la cuenta del cliente.
      lines: orderItemsToReceiptLines(order.items),
      subtotal: order.subtotal,
      tax: order.tax,
      taxRate: order.subtotal - order.tax > 0 ? Math.round((order.tax / (order.subtotal - order.tax)) * 100) : 0,
      total: order.total,
      discountBreakdown,
      paid: order.payment_status === 'paid',
    })

  const draftItems = order.items.map(i => ({
    uid: String(i.id),
    product_id: i.product_id,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.subtotal,
    modifiers: i.modifiers,
    item_notes: i.item_notes ?? undefined,
    combo_id: i.combo_id ?? undefined,
  }))

  const discountBreakdown = order.discounts_applied?.map(d => ({ label: d.label, amount: d.amount }))

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title={orderPrimaryLabel(order)}
        description={`Pedido #${order.id}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Pedido</p>
              <p className="font-semibold">#{order.id}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <OrderStatusTimeline status={order.status} />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Creado</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            {order.completed_at && (
              <div>
                <p className="text-muted-foreground">Completado</p>
                <p className="font-medium">{formatDate(order.completed_at)}</p>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {editable ? 'Editar pedido' : 'Detalle del pedido'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editable ? (
            <div className="space-y-4">
              <OpenOrderEditor order={order} role={role} />
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  discountBreakdown && discountBreakdown.length > 0 ? (
                    discountBreakdown.map((d, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span className="truncate pr-2">{d.label}</span><span className="shrink-0">-{formatCurrency(d.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Descuento</span><span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )
                )}
                {order.tip > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Propina</span><span>{formatCurrency(order.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span><span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <OrderSummary
              items={draftItems}
              subtotal={order.subtotal}
              tax={order.tax}
              total={order.total}
              discount={order.discount}
              discountBreakdown={discountBreakdown}
              tip={order.tip}
            />
          )}
        </CardContent>
      </Card>

      {/* Cuenta dividida: panel de cobro por división (la mesa no se cierra hasta cobrar todas). */}
      {(order.splits?.length ?? 0) > 0 && order.status !== 'cancelled' && (
        <SplitProgressPanel order={order} />
      )}

      {/* Cuenta única: cobrar todo o dividir. */}
      {order.status !== 'cancelled' && order.payment_status !== 'paid' && (order.splits?.length ?? 0) === 0 && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => setPayOpen(true)}
            className="flex-1 min-w-[160px] bg-green-600 hover:bg-green-700 text-base h-12"
          >
            <DollarSign className="h-5 w-5 mr-1" />
            Cobrar {formatCurrency(Math.max(0, order.total - order.paid))}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSplitOpen(true)}
            className="flex-1 min-w-[160px] h-12 text-base border-[#E85D04]/40 text-[#C44D00] hover:bg-[#E85D04]/5"
          >
            <Split className="h-5 w-5 mr-1" />
            Dividir cuenta
          </Button>
        </div>
      )}

      {order.payment_status === 'paid' && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 p-3 text-sm font-medium text-center">
          ✓ Pagado {order.tip > 0 && `· Propina ${formatCurrency(order.tip)}`}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" className="flex-1 min-w-[140px]" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Imprimir ticket
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-w-[140px]"
          onClick={() => printer.openDrawer()}
          disabled={!printer.enabled}
        >
          <Inbox className="h-4 w-4 mr-1" />
          Abrir cajón
        </Button>
      </div>

      {!['completed', 'cancelled'].includes(order.status) && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleComplete}
            disabled={updateStatus.isPending}
            className="flex-1 bg-[#E85D04] hover:bg-[#C44D00]"
          >
            {updateStatus.isPending ? 'Completando…' : 'Completar pedido'}
          </Button>
          {role === 'admin' && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setCancelOpen(true)}
              disabled={updateStatus.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      )}

      <PaymentDialog order={order} open={payOpen} onOpenChange={setPayOpen} />

      <SplitBillDialog order={order} open={splitOpen} onOpenChange={setSplitOpen} />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pedido"
        description={`¿Cancelar el pedido #${order.id}? Esta acción no se puede deshacer.`}
        confirmLabel="Cancelar pedido"
        onConfirm={handleCancel}
        variant="destructive"
        loading={updateStatus.isPending}
      />
    </div>
  )
}
