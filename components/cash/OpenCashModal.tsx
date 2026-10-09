'use client'

/**
 * FoodIX — Modal premium "Abrir caja / Iniciar turno".
 *
 * Reutilizable: lo abre tanto el indicador de caja del dashboard como el modal
 * de bloqueo cuando se intenta cobrar sin turno. Muestra el contexto del turno
 * (usuario, rol, POS, fecha/hora), pide el fondo inicial y notas, y confirma
 * visualmente la apertura.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Unlock, User as UserIcon, ShieldCheck, MonitorSmartphone, Clock, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOpenCash } from '@/lib/api/queries'
import { getActivePosId } from '@/lib/pos/activePos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', mesero: 'Mesero', cocina: 'Cocina', superadmin: 'Superadmin', caja: 'Cajero',
}

interface OpenCashModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Mensaje opcional (p. ej. cuando se llega aquí por un cobro bloqueado). */
  reason?: string
  /** Se llama tras abrir la caja con éxito. */
  onOpened?: () => void
}

export function OpenCashModal({ open, onOpenChange, reason, onOpened }: OpenCashModalProps) {
  const user = useAuthStore(s => s.user)
  const openCash = useOpenCash()

  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [confirmed, setConfirmed] = useState(false)

  // Reloj vivo mientras el modal está abierto.
  useEffect(() => {
    if (!open) return
    setConfirmed(false)
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [open])

  const posId = getActivePosId()
  const roleLabel = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : '—'

  const handleOpen = async () => {
    try {
      await openCash.mutateAsync({
        branch_id: user?.branch_id ?? null,
        opening_amount: parseFloat(amount) || 0,
        notes: notes.trim() || undefined,
      })
      setConfirmed(true)
      toast.success('Caja abierta · turno iniciado')
      onOpened?.()
      // Breve confirmación visual antes de cerrar.
      setTimeout(() => {
        onOpenChange(false)
        setAmount(''); setNotes(''); setConfirmed(false)
      }, 1100)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo abrir la caja'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !openCash.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Encabezado de marca */}
        <DialogHeader className="px-5 pt-5 pb-4 bg-gradient-to-br from-[#D1400F] to-[#B03508] text-white">
          <DialogTitle className="flex items-center gap-2 text-white text-lg">
            <Unlock className="h-5 w-5" /> Abrir caja · Iniciar turno
          </DialogTitle>
          {reason && <p className="text-sm text-white/85 mt-1">{reason}</p>}
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold">Caja abierta</p>
            <p className="text-sm text-muted-foreground">Tu turno quedó registrado. Ya puedes cobrar.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Contexto del turno */}
            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile icon={<UserIcon className="h-4 w-4" />} label="Usuario" value={user?.name ?? '—'} />
              <InfoTile icon={<ShieldCheck className="h-4 w-4" />} label="Rol" value={roleLabel} />
              <InfoTile icon={<MonitorSmartphone className="h-4 w-4" />} label="POS" value={`POS ${posId}`} />
              <InfoTile
                icon={<Clock className="h-4 w-4" />}
                label="Fecha y hora"
                value={now.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              />
            </div>

            {/* Monto inicial */}
            <div className="space-y-1.5">
              <Label htmlFor="cash-open-amount">Monto inicial en caja</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="cash-open-amount"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="pl-7 h-12 text-lg"
                />
              </div>
              <p className="text-xs text-muted-foreground">Efectivo con el que arranca el turno (fondo de caja).</p>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="cash-open-notes">Notas (opcional)</Label>
              <Input
                id="cash-open-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. fondo entregado por turno anterior"
              />
            </div>

            <Button
              onClick={handleOpen}
              disabled={openCash.isPending}
              className="w-full h-12 text-base bg-[#D1400F] hover:bg-[#B03508]"
            >
              {openCash.isPending ? 'Iniciando turno…' : 'Iniciar turno'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</div>
      <p className="font-semibold text-sm truncate mt-0.5">{value}</p>
    </div>
  )
}
