'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Users, Clock, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useReservations, useCreateReservation, useUpdateReservation, useDeleteReservation,
} from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Reservation, ReservationStatus } from '@/lib/types'

const STATUS: Record<ReservationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending:   { label: 'Pendiente',  variant: 'secondary' },
  confirmed: { label: 'Confirmada', variant: 'default' },
  seated:    { label: 'Sentada',    variant: 'default' },
  cancelled: { label: 'Cancelada',  variant: 'destructive' },
  no_show:   { label: 'No llegó',   variant: 'destructive' },
}
const NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated:    [],
  cancelled: [],
  no_show:   [],
}

function today() { return new Date().toISOString().slice(0, 10) }

export default function ReservationsPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const [date, setDate] = useState(today())
  const { data: reservations = [], isLoading } = useReservations(branchId, date)
  const create = useCreateReservation()
  const update = useUpdateReservation()
  const remove = useDeleteReservation()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ customer_name: '', phone: '', party_size: '2', reserved_at: '', notes: '' })

  const openNew = () => {
    setForm({ customer_name: '', phone: '', party_size: '2', reserved_at: `${date}T20:00`, notes: '' })
    setOpen(true)
  }

  const handleCreate = async () => {
    if (!form.customer_name.trim() || !form.reserved_at) { toast.error('Nombre y fecha/hora requeridos'); return }
    try {
      await create.mutateAsync({
        branch_id: branchId,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        party_size: parseInt(form.party_size) || 2,
        reserved_at: form.reserved_at.replace('T', ' ') + ':00',
        notes: form.notes.trim() || null,
      })
      toast.success('Reservación creada'); setOpen(false)
    } catch { toast.error('Error al crear') }
  }

  const setStatus = async (r: Reservation, status: ReservationStatus) => {
    try { await update.mutateAsync({ id: r.id, status }); toast.success('Estado actualizado') }
    catch { toast.error('Error al actualizar') }
  }

  const handleDelete = async (r: Reservation) => {
    try { await remove.mutateAsync(r.id); toast.success('Reservación eliminada') }
    catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Reservaciones"
        description="Agenda de reservas por día"
        actions={<Button onClick={openNew} className="bg-[#E85D04] hover:bg-[#C44D00]"><Plus className="h-4 w-4 mr-1" />Nueva</Button>}
      />

      <div className="flex items-center gap-2">
        <Label className="text-sm">Fecha</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : reservations.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin reservaciones este día</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reservations.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.customer_name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground items-center flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.reserved_at.slice(11, 16)}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.party_size}</span>
                      {r.phone && <span>{r.phone}</span>}
                    </div>
                    {r.notes && <p className="text-xs italic text-muted-foreground mt-1">“{r.notes}”</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>
                    <button onClick={() => handleDelete(r)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {NEXT[r.status].length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {NEXT[r.status].map(s => (
                      <Button key={s} size="sm" variant="outline" onClick={() => setStatus(r, s)} className="h-7 text-xs">
                        {STATUS[s].label}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva reservación</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre del cliente</Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Personas</Label>
                <Select value={form.party_size} onValueChange={(v) => setForm(f => ({ ...f, party_size: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,8,10,12].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Fecha y hora</Label>
              <Input type="datetime-local" value={form.reserved_at} onChange={e => setForm(f => ({ ...f, reserved_at: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notas</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ocasión, preferencias…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
