'use client'

/**
 * FoodIX — Cierre rápido de caja desde el indicador del Topbar.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { useCashReport, useCloseCash } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/formatters'

interface QuickCloseCashModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number | null
}

export function QuickCloseCashModal({ open, onOpenChange, branchId }: QuickCloseCashModalProps) {
  const { data: report } = useCashReport(branchId, open)
  const closeCash = useCloseCash()
  const [closeAmount, setCloseAmount] = useState('')

  const handleClose = async () => {
    try {
      const res = await closeCash.mutateAsync({ branch_id: branchId, closing_amount: parseFloat(closeAmount) || 0 })
      const diff = res.session.difference ?? 0
      toast.success(diff === 0 ? 'Caja cerrada · cuadró exacto' : `Caja cerrada · diferencia ${formatCurrency(diff)}`)
      setCloseAmount('')
      onOpenChange(false)
    } catch {
      toast.error('No se pudo cerrar la caja')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Lock className="h-4 w-4" />
            </span>
            Cerrar caja (Corte Z)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {report && (
            <div className="rounded-lg bg-muted p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Efectivo esperado</span>
              <span className="font-semibold">{formatCurrency(report.expected_cash)}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Efectivo contado en caja</Label>
            <Input type="number" inputMode="decimal" value={closeAmount}
              onChange={e => setCloseAmount(e.target.value)} placeholder="0.00" autoFocus />
            {report && closeAmount !== '' && (
              <p className="text-xs text-muted-foreground">
                Diferencia: {formatCurrency((parseFloat(closeAmount) || 0) - report.expected_cash)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleClose} disabled={closeCash.isPending} className="bg-red-600 hover:bg-red-700">
            {closeCash.isPending ? 'Cerrando…' : 'Cerrar caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
