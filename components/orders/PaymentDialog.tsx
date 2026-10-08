'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Banknote, CreditCard, ArrowLeftRight, Wallet, MoreHorizontal } from 'lucide-react'
import { usePayOrder } from '@/lib/api/queries'
import { usePrinter } from '@/hooks/usePrinter'
import { orderItemsToReceiptLines } from '@/lib/printing/orderLines'
import { useKioskMode } from '@/hooks/useKioskMode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Order, PaymentMethod, PaymentInput } from '@/lib/types'

interface PaymentDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transfer.', icon: ArrowLeftRight },
  { value: 'monedero', label: 'Monedero', icon: Wallet },
  { value: 'otro', label: 'Otro', icon: MoreHorizontal },
]

interface PayRow {
  method: PaymentMethod
  amount: string
  received: string
  reference: string
}

export function PaymentDialog({ order, open, onOpenChange }: PaymentDialogProps) {
  const payOrder = usePayOrder()
  const printer = usePrinter()
  const { isKiosk } = useKioskMode()

  const remaining = Math.max(0, order.total - order.paid)
  const [rows, setRows] = useState<PayRow[]>([
    { method: 'efectivo', amount: remaining.toFixed(2), received: '', reference: '' },
  ])
  const [tip, setTip] = useState('')
  const [complete, setComplete] = useState(true)
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    updated: Order
    payments: PaymentInput[]
    change: number
  } | null>(null)

  const hasInitializedRef = useRef(false)
  const initialRemainingRef = useRef(remaining)

  useEffect(() => {
    if (open) {
      if (!hasInitializedRef.current) {
        initialRemainingRef.current = remaining
        setRows([{ method: 'efectivo', amount: remaining.toFixed(2), received: '', reference: '' }])
        setTip('')
        setComplete(true)
        setPaymentSuccessData(null)
        hasInitializedRef.current = true
      }
    } else {
      hasInitializedRef.current = false
    }
  }, [open, order.id, remaining])

  const totalPaying = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [rows],
  )
  const tipNum = parseFloat(tip) || 0
  const afterRemaining = Math.max(0, remaining - totalPaying)

  // Cambio: suma de (recibido - monto) en filas de efectivo con recibido > monto.
  const change = useMemo(
    () =>
      rows.reduce((s, r) => {
        if (r.method !== 'efectivo') return s
        const rec = parseFloat(r.received) || 0
        const amt = parseFloat(r.amount) || 0
        return s + Math.max(0, rec - amt)
      }, 0),
    [rows],
  )

  const setRow = (i: number, patch: Partial<PayRow>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const addRow = () =>
    setRows(prev => [...prev, { method: 'efectivo', amount: afterRemaining.toFixed(2), received: '', reference: '' }])

  const removeRow = (i: number) =>
    setRows(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const handlePay = async () => {
    const payments: PaymentInput[] = rows
      .map(r => ({
        method: r.method,
        amount: parseFloat(r.amount) || 0,
        received: r.method === 'efectivo' && r.received ? parseFloat(r.received) : undefined,
        reference: r.reference.trim() || undefined,
      }))
      .filter(p => p.amount > 0)

    if (payments.length === 0) {
      toast.error('Ingresa al menos un monto a cobrar')
      return
    }
    // La propina se adjunta al primer pago.
    if (tipNum > 0 && payments[0]) payments[0].tip = tipNum

    try {
      const updated = await payOrder.mutateAsync({
        orderId: order.id,
        payments,
        complete,
      })
      toast.success(complete && updated.payment_status === 'paid' ? 'Cuenta cobrada y cerrada' : 'Pago registrado')

      const hasCash = payments.some(p => p.method === 'efectivo')
      if (hasCash && printer.enabled) await printer.openDrawer({ silent: true })

      setPaymentSuccessData({ updated, payments, change })
    } catch {
      toast.error('Error al registrar el pago')
    }
  }

  const handlePrint = async () => {
    if (!paymentSuccessData) return
    const { updated, payments } = paymentSuccessData
    
    await printer.printOrder({
      orderId: order.id,
      tableName: order.table_name,
      orderType: order.order_type,
      createdAt: formatDate(order.created_at),
      lines: orderItemsToReceiptLines(order.items),
      subtotal: order.subtotal,
      tax: order.tax,
      taxRate: order.subtotal - order.tax > 0 ? Math.round((order.tax / (order.subtotal - order.tax)) * 100) : 0,
      total: order.total,
      paid: updated.payment_status === 'paid',
      paymentMethods: Array.from(new Set(payments.map(p => p.method))),
    }, { silent: false })

    onOpenChange(false)
  }

  if (paymentSuccessData) {
    const displayType = order.order_type === 'dine_in'
      ? 'Establecimiento'
      : order.order_type === 'takeaway'
        ? 'Para llevar'
        : 'Domicilio'

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-extrabold text-green-600 flex flex-col items-center gap-2">
              <span className="text-5xl">🎉</span>
              ¡Cobro Exitoso!
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              El pago ha sido registrado correctamente para el pedido <strong>#{order.id}</strong>.
            </p>

            <div className="rounded-2xl bg-muted/60 p-4 space-y-2 text-sm max-w-xs mx-auto border">
              <div className="flex justify-between">
                <span>Total pagado:</span>
                <span className="font-semibold">{formatCurrency(totalPaying)}</span>
              </div>
              {paymentSuccessData.change > 0 && (
                <div className="flex justify-between border-t pt-1.5 text-green-600 font-bold">
                  <span>Cambio a entregar:</span>
                  <span>{formatCurrency(paymentSuccessData.change)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 text-base font-semibold text-foreground">
              ¿Deseas imprimir el ticket de venta?
            </div>
            <p className="text-xs text-muted-foreground">
              Tipo de pedido: <span className="font-medium text-foreground">{displayType}</span>
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-11 flex-1 font-semibold text-sm"
            >
              No, finalizar
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto bg-[#E85D04] hover:bg-[#C44D00] h-11 flex-1 font-semibold text-sm"
            >
              Sí, imprimir ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto w-full transition-all", isKiosk ? "sm:max-w-xl p-8" : "sm:max-w-md p-6")}>
        <DialogHeader>
          <DialogTitle className={cn(isKiosk && "text-2xl font-black")}>Cobrar pedido #{order.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className={cn("rounded-lg bg-muted p-3 space-y-1 text-sm", isKiosk && "p-4 text-base")}>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(order.total)}</span></div>
            {order.paid > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Pagado antes</span><span>{formatCurrency(order.paid)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Por cobrar</span><span className="font-semibold text-[#E85D04]">{formatCurrency(remaining)}</span></div>
          </div>

          {/* Filas de pago */}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-medium text-muted-foreground", isKiosk && "text-sm")}>Pago {i + 1}</span>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className={cn("h-3.5 w-3.5", isKiosk && "h-5 w-5")} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {METHODS.map(m => {
                    const Icon = m.icon
                    const active = row.method === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setRow(i, { method: m.value })}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-[10px] font-medium transition-all',
                          active ? 'border-[#E85D04] bg-[#E85D04]/5 text-[#E85D04]' : 'hover:border-primary/40 text-muted-foreground',
                          isKiosk && 'p-4 text-xs'
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isKiosk && "h-6 w-6")} />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`amount-${i}`} className={cn("text-xs", isKiosk && "text-sm font-semibold")}>Monto</Label>
                    <Input
                      id={`amount-${i}`}
                      type="number"
                      inputMode="decimal"
                      value={row.amount}
                      readOnly
                      className={cn("bg-muted cursor-not-allowed", isKiosk && "h-12 text-base")}
                      placeholder="0.00"
                    />
                  </div>
                  {row.method === 'efectivo' ? (
                    <div className="space-y-1">
                      <Label htmlFor={`received-${i}`} className={cn("text-xs", isKiosk && "text-sm font-semibold")}>Recibido</Label>
                      <Input
                        id={`received-${i}`}
                        type="number"
                        inputMode="decimal"
                        value={row.received}
                        onChange={e => setRow(i, { received: e.target.value })}
                        placeholder="0.00"
                        className={cn(isKiosk && "h-12 text-base")}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor={`reference-${i}`} className={cn("text-xs", isKiosk && "text-sm font-semibold")}>Referencia</Label>
                      <Input
                        id={`reference-${i}`}
                        value={row.reference}
                        onChange={e => setRow(i, { reference: e.target.value })}
                        placeholder="Folio / autorización"
                        className={cn(isKiosk && "h-12 text-base")}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow} className={cn("w-full", isKiosk && "h-11 text-sm")}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Dividir / agregar forma de pago
            </Button>
          </div>

          {/* Propina */}
          <div className="space-y-1">
            <Label htmlFor="tip-input" className={cn("text-xs", isKiosk && "text-sm font-semibold")}>Propina (opcional)</Label>
            <Input
              id="tip-input"
              type="number"
              inputMode="decimal"
              value={tip}
              onChange={e => setTip(e.target.value)}
              placeholder="0.00"
              className={cn(isKiosk && "h-12 text-base")}
            />
          </div>

          {/* Cambio a entregar (verde, grande, siempre visible si > 0) */}
          {change > 0 && (
            <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 text-center space-y-1 shadow-sm">
              <span className="text-xs uppercase tracking-wider font-extrabold text-green-700 dark:text-green-400">Cambio a entregar</span>
              <div className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tight">
                {formatCurrency(change)}
              </div>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Cerrar cuenta</p>
              <p className="text-xs text-muted-foreground">
                {afterRemaining > 0
                  ? `Faltarían ${formatCurrency(afterRemaining)}`
                  : 'Marca el pedido como completado'}
              </p>
            </div>
            <Switch checked={complete} onCheckedChange={setComplete} disabled={afterRemaining > 0.009} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handlePay}
            disabled={payOrder.isPending}
            className={cn("w-full bg-[#E85D04] hover:bg-[#C44D00] text-base font-bold", isKiosk ? "h-14 text-lg" : "h-12")}
          >
            {payOrder.isPending ? 'Procesando…' : `Cobrar ${formatCurrency(totalPaying)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
