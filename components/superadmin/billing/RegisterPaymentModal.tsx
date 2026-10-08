'use client'

/**
 * FoodIX — Modal de pago manual / adelantado (Billing CRM).
 * Permite cubrir 1 o varios meses en un solo pago; el backend calcula el nuevo
 * vencimiento (ancla día 1) y reconstruye el calendario.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Minus, Plus, Wallet } from 'lucide-react'
import { useRegisterManualPayment, useUploadReceipt } from '@/lib/api/queries'
import { PAYMENT_METHODS, formatMXN } from '@/lib/constants/subscription'
import type { SubscriptionPaymentMethodCRM } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReceiptUploader } from '@/components/billing/ReceiptUploader'
import { cn } from '@/lib/utils/cn'

export function RegisterPaymentModal({
  open,
  onOpenChange,
  branchId,
  priceMonthly,
  currency = 'MXN',
  defaultCoveredFrom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number | null
  priceMonthly: number
  currency?: string
  /** Periodo 'YYYY-MM' a cubrir (p. ej. al hacer click en un mes pendiente). */
  defaultCoveredFrom?: string
}) {
  const register = useUploadReceipt()
  const registerPayment = useRegisterManualPayment()

  const [months, setMonths] = useState(1)
  const [method, setMethod] = useState<SubscriptionPaymentMethodCRM>('transfer')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [coveredFrom, setCoveredFrom] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')

  // Inicializa el formulario al abrir.
  useEffect(() => {
    if (!open) return
    setMonths(1)
    setMethod('transfer')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setCoveredFrom(defaultCoveredFrom ?? '')
    setReference('')
    setNotes('')
    setReceiptUrl('')
  }, [open, defaultCoveredFrom])

  // Monto sugerido = precio × meses (recalcula al cambiar los meses).
  useEffect(() => {
    if (open) setAmount(String(Math.round(priceMonthly * months * 100) / 100))
  }, [open, months, priceMonthly])

  const confirm = async () => {
    if (!branchId) return
    const amt = Number(amount)
    if (isNaN(amt) || amt <= 0) { toast.error('Ingresa un monto válido mayor a 0'); return }
    try {
      const res = await registerPayment.mutateAsync({
        branchId,
        amount: amt,
        payment_method: method,
        months_count: months,
        payment_date: paymentDate,
        covered_from: coveredFrom ? `${coveredFrom}-01` : undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        receipt_url: receiptUrl || undefined,
      })
      toast.success(
        months > 1
          ? `Pago de ${months} meses registrado · cubre ${res.covered_months.length} periodos`
          : 'Pago registrado y suscripción reactivada',
      )
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo registrar el pago')
    }
  }

  const busy = registerPayment.isPending || register.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-emerald-400" /> Registrar pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meses a cubrir */}
          <div className="space-y-1.5">
            <Label className="text-neutral-400 text-xs uppercase tracking-wide">Meses a cubrir</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMonths(m => Math.max(1, m - 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-semibold tabular-nums">{months}</span>
                <span className="text-neutral-500 text-sm"> {months === 1 ? 'mes' : 'meses'}</span>
              </div>
              <button
                type="button"
                onClick={() => setMonths(m => Math.min(12, m + 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {months > 1 && (
              <p className="text-center text-[11px] text-amber-400">Pago adelantado · marca {months} meses como pagados</p>
            )}
          </div>

          {/* Mes inicial + método */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs uppercase tracking-wide">Desde el mes</Label>
              <Input
                type="month"
                value={coveredFrom}
                onChange={e => setCoveredFrom(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-10"
              />
              <p className="text-[10px] text-neutral-600">Vacío = siguiente periodo pendiente.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs uppercase tracking-wide">Método</Label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as SubscriptionPaymentMethodCRM)}
                className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-white/25 focus:outline-none"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value} className="bg-[#0a0a0a]">{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monto + fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs uppercase tracking-wide">Monto ({currency})</Label>
              <Input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs uppercase tracking-wide">Fecha de pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-10"
              />
            </div>
          </div>

          {/* Referencia + notas */}
          <div className="space-y-1.5">
            <Label className="text-neutral-400 text-xs uppercase tracking-wide">Referencia bancaria</Label>
            <Input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Ej. Folio SPEI 123456"
              className="bg-white/5 border-white/10 text-white h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-neutral-400 text-xs uppercase tracking-wide">Observaciones</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas internas (opcional)"
              className="bg-white/5 border-white/10 text-white h-10"
            />
          </div>

          {/* Comprobante */}
          <div className="space-y-1.5">
            <Label className="text-neutral-400 text-xs uppercase tracking-wide">Comprobante</Label>
            <ReceiptUploader
              value={receiptUrl}
              onChange={setReceiptUrl}
              upload={async (file) => (await register.mutateAsync(file)).receipt_url}
              brand="#10b981"
            />
          </div>

          {/* Resumen + acción */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-neutral-400">Total a registrar</span>
            <span className={cn('text-base font-semibold tabular-nums text-emerald-400')}>
              {formatMXN(Number(amount) || 0, currency)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy} className="text-neutral-400 hover:text-white">
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {registerPayment.isPending ? 'Registrando…' : 'Confirmar pago'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
