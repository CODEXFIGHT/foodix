'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Banknote, CreditCard, ArrowLeftRight, Wallet, MoreHorizontal } from 'lucide-react'
import { usePaySplit } from '@/lib/api/queries'
import { usePrinter } from '@/hooks/usePrinter'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { roundMoney } from '@/lib/pos/splitBill'
import type { Order, OrderSplit, PaymentMethod, PaymentInput } from '@/lib/types'

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

interface SplitPaymentDialogProps {
  order: Order
  split: OrderSplit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Cobra una división individual de la cuenta. Permite varias formas de pago. */
export function SplitPaymentDialog({ order, split, open, onOpenChange }: SplitPaymentDialogProps) {
  const paySplit = usePaySplit()
  const printer = usePrinter()

  const remaining = split ? Math.max(0, roundMoney(split.total - split.paid)) : 0

  const [rows, setRows] = useState<PayRow[]>([
    { method: 'efectivo', amount: remaining.toFixed(2), received: '', reference: '' },
  ])

  useEffect(() => {
    if (open && split) {
      setRows([{ method: 'efectivo', amount: remaining.toFixed(2), received: '', reference: '' }])
    }
    // Solo reiniciamos al abrir o cambiar de división; `remaining` ya refleja el split.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, split?.id, remaining])

  const totalPaying = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [rows],
  )
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

  const covers = totalPaying + 0.05 >= remaining
  const setRow = (i: number, patch: Partial<PayRow>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () =>
    setRows(prev => [...prev, { method: 'tarjeta', amount: Math.max(0, remaining - totalPaying).toFixed(2), received: '', reference: '' }])
  const removeRow = (i: number) =>
    setRows(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const handlePay = async () => {
    if (!split) return
    const payments: PaymentInput[] = rows
      .map(r => ({
        method: r.method,
        amount: parseFloat(r.amount) || 0,
        received: r.method === 'efectivo' && r.received ? parseFloat(r.received) : undefined,
        reference: r.reference.trim() || undefined,
      }))
      .filter(p => p.amount > 0)

    if (payments.length === 0) { toast.error('Ingresa al menos un monto a cobrar'); return }
    if (!covers) { toast.error(`El pago no cubre el total de la división (${formatCurrency(remaining)})`); return }

    try {
      const updated = await paySplit.mutateAsync({ orderId: order.id, splitId: split.id, payments })
      const allPaid = updated.payment_status === 'paid'
      toast.success(allPaid ? 'Última división cobrada · cuenta cerrada' : `División cobrada: ${split.label}`)

      const hasCash = payments.some(p => p.method === 'efectivo')
      if (hasCash && printer.enabled) await printer.openDrawer({ silent: true })

      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cobrar la división'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrar {split?.label ?? 'división'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de la división</span>
              <span className="font-semibold">{formatCurrency(split?.total ?? 0)}</span>
            </div>
            {split && split.paid > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado antes</span>
                <span>{formatCurrency(split.paid)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Por cobrar</span>
              <span className="font-semibold text-[#E85D04]">{formatCurrency(remaining)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Pago {i + 1}</span>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar forma de pago">
                      <Trash2 className="h-3.5 w-3.5" />
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
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Monto</Label>
                    <Input type="number" inputMode="decimal" value={row.amount}
                      onChange={e => setRow(i, { amount: e.target.value })} placeholder="0.00" />
                  </div>
                  {row.method === 'efectivo' ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Recibido</Label>
                      <Input type="number" inputMode="decimal" value={row.received}
                        onChange={e => setRow(i, { received: e.target.value })} placeholder="0.00" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Referencia</Label>
                      <Input value={row.reference}
                        onChange={e => setRow(i, { reference: e.target.value })} placeholder="Folio / autorización" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar forma de pago
            </Button>
          </div>

          {change > 0 && (
            <div className="flex justify-between items-center rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
              <span className="text-sm text-muted-foreground">Cambio a entregar</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handlePay}
            disabled={paySplit.isPending || !covers}
            className="w-full bg-green-600 hover:bg-green-700 text-base h-12"
          >
            {paySplit.isPending ? 'Procesando…' : `Cobrar ${formatCurrency(totalPaying)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
