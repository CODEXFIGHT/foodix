'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Lock, Unlock, ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useCurrentCashSession,
  useCashReport,
  useCashSessions,
  useOpenCash,
  useCloseCash,
  useAddCashMovement,
} from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { CashReportCard } from '@/components/cash/CashReportCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

export default function CashPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const { data: session, isLoading } = useCurrentCashSession(branchId)
  const { data: report } = useCashReport(branchId, !!session)
  const { data: sessions = [] } = useCashSessions(branchId)
  const openCash = useOpenCash()
  const closeCash = useCloseCash()
  const addMovement = useAddCashMovement()

  const [openAmount, setOpenAmount] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeAmount, setCloseAmount] = useState('')
  const [moveOpen, setMoveOpen] = useState<false | 'in' | 'out'>(false)
  const [moveAmount, setMoveAmount] = useState('')
  const [moveReason, setMoveReason] = useState('')

  const handleOpen = async () => {
    try {
      await openCash.mutateAsync({ branch_id: branchId, opening_amount: parseFloat(openAmount) || 0 })
      toast.success('Caja abierta')
      setOpenAmount('')
    } catch {
      toast.error('No se pudo abrir la caja')
    }
  }

  const handleClose = async () => {
    try {
      const res = await closeCash.mutateAsync({ branch_id: branchId, closing_amount: parseFloat(closeAmount) || 0 })
      const diff = res.session.difference ?? 0
      toast.success(diff === 0 ? 'Caja cerrada · cuadró exacto' : `Caja cerrada · diferencia ${formatCurrency(diff)}`)
      setCloseOpen(false); setCloseAmount('')
    } catch {
      toast.error('No se pudo cerrar la caja')
    }
  }

  const handleMovement = async () => {
    if (!moveOpen) return
    try {
      await addMovement.mutateAsync({
        branch_id: branchId, type: moveOpen,
        amount: parseFloat(moveAmount) || 0, reason: moveReason.trim() || undefined,
      })
      toast.success(moveOpen === 'in' ? 'Entrada registrada' : 'Salida registrada')
      setMoveOpen(false); setMoveAmount(''); setMoveReason('')
    } catch {
      toast.error('No se pudo registrar el movimiento')
    }
  }

  if (isLoading) {
    return <div className="space-y-4 max-w-2xl"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Caja" description="Apertura, cortes y arqueo de efectivo" />

      {!session ? (
        // ── Caja cerrada: abrir ──
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Unlock className="h-4 w-4" /> Abrir caja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fondo inicial (efectivo en caja)</Label>
              <Input type="number" inputMode="decimal" value={openAmount}
                onChange={e => setOpenAmount(e.target.value)} placeholder="0.00" />
            </div>
            <Button onClick={handleOpen} disabled={openCash.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">
              {openCash.isPending ? 'Abriendo…' : 'Abrir caja'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        // ── Caja abierta ──
        <>
          <Card>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Caja abierta desde</p>
                <p className="font-semibold">{formatDate(session.opened_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setMoveOpen('in')}>
                  <ArrowDownToLine className="h-4 w-4 mr-1" /> Entrada
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMoveOpen('out')}>
                  <ArrowUpFromLine className="h-4 w-4 mr-1" /> Salida
                </Button>
              </div>
            </CardContent>
          </Card>

          {report && <CashReportCard report={report} />}

          {user?.role === 'admin' ? (
            <Button onClick={() => setCloseOpen(true)} className="w-full bg-red-600 hover:bg-red-700 h-11">
              <Lock className="h-4 w-4 mr-1" /> Cerrar caja (Corte Z)
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Solo un administrador puede cerrar la caja.
            </p>
          )}
        </>
      )}

      {/* Historial */}
      {sessions.filter(s => s.status === 'closed').length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Turnos anteriores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.filter(s => s.status === 'closed').slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="font-medium">{formatDate(s.opened_at)}</p>
                  <p className="text-xs text-muted-foreground">Cierre: {s.closed_at ? formatDate(s.closed_at) : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(s.closing_amount ?? 0)}</p>
                  <p className={`text-xs ${(s.difference ?? 0) === 0 ? 'text-muted-foreground' : (s.difference ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Dif: {formatCurrency(s.difference ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Diálogo cerrar caja */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cerrar caja</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={closeCash.isPending} className="bg-red-600 hover:bg-red-700">
              {closeCash.isPending ? 'Cerrando…' : 'Cerrar caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo movimiento */}
      <Dialog open={!!moveOpen} onOpenChange={(o) => !o && setMoveOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveOpen === 'in' ? 'Entrada de efectivo' : 'Salida de efectivo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input type="number" inputMode="decimal" value={moveAmount}
                onChange={e => setMoveAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input value={moveReason} onChange={e => setMoveReason(e.target.value)}
                placeholder={moveOpen === 'in' ? 'Ej. fondo adicional' : 'Ej. pago a proveedor'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleMovement} disabled={addMovement.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">
              {addMovement.isPending ? 'Guardando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
