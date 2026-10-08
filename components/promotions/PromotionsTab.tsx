'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de promociones: descuentos por día/horario sobre toda la orden,
 * una categoría o un producto.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import {
  usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion,
} from '@/lib/api/queries/usePromotions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Promotion, DiscountType, DayOfWeek } from '@/lib/types'

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Lun' }, { value: 'tue', label: 'Mar' }, { value: 'wed', label: 'Mié' },
  { value: 'thu', label: 'Jue' }, { value: 'fri', label: 'Vie' }, { value: 'sat', label: 'Sáb' }, { value: 'sun', label: 'Dom' },
]

export function PromotionsTab({ branchId }: { branchId: number | null }) {
  const { data: promotions = [], isLoading } = usePromotions(branchId)
  const create = useCreatePromotion()
  const update = useUpdatePromotion()
  const remove = useDeletePromotion()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<DiscountType>('discount_percent')
  const [value, setValue] = useState('')
  const [days, setDays] = useState<DayOfWeek[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null)

  const openNew = () => {
    setEditing(null); setName(''); setType('discount_percent'); setValue(''); setDays([]); setStartTime(''); setEndTime('')
    setOpen(true)
  }
  const openEdit = (p: Promotion) => {
    setEditing(p); setName(p.name); setType(p.type); setValue(String(p.value))
    setDays(p.days_of_week ?? []); setStartTime(p.start_time ?? ''); setEndTime(p.end_time ?? '')
    setOpen(true)
  }

  const toggleDay = (d: DayOfWeek) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nombre requerido'); return }
    if (!value || Number(value) <= 0) { toast.error('Valor inválido'); return }
    try {
      const body = {
        branch_id: branchId, name: name.trim(), type, value: Number(value),
        applies_to: 'order' as const,
        days_of_week: days.length > 0 ? days : null,
        start_time: startTime || null,
        end_time: endTime || null,
      }
      if (editing) await update.mutateAsync({ id: editing.id, ...body })
      else await create.mutateAsync(body)
      toast.success('Promoción guardada')
      setOpen(false)
    } catch { toast.error('Error al guardar la promoción') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await remove.mutateAsync(deleteTarget.id); toast.success('Promoción eliminada') }
    catch { toast.error('Error al eliminar') }
    setDeleteTarget(null)
  }

  const toggleActive = async (p: Promotion) => {
    try { await update.mutateAsync({ id: p.id, active: !p.active }) }
    catch { toast.error('Error al actualizar') }
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-[#E85D04] hover:bg-[#C44D00]"><Plus className="h-4 w-4 mr-1" /> Nueva promoción</Button>
      </div>

      {promotions.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aún no tienes promociones. Crea descuentos por día u horario (ej. "Martes 2x1", "Happy hour 2-5pm").</p>
      ) : (
        <div className="space-y-2">
          {promotions.map(p => (
            <Card key={p.id} className={!p.active ? 'opacity-60' : undefined}>
              <CardContent className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold flex items-center gap-1.5"><Tag className="h-4 w-4 text-[#E85D04]" /> {p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.type === 'discount_percent' ? `${p.value}% de descuento` : `$${p.value} MXN de descuento`}
                    {p.days_of_week && ` · ${p.days_of_week.map(d => DAYS.find(x => x.value === d)?.label).join(', ')}`}
                    {p.start_time && p.end_time && ` · ${p.start_time.slice(0, 5)}-${p.end_time.slice(0, 5)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Activa' : 'Inactiva'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>{p.active ? 'Desactivar' : 'Activar'}</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Martes de 2x1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as DiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_percent">% de descuento</SelectItem>
                    <SelectItem value="discount_amount">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input type="number" min="0" step="0.5" value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'discount_percent' ? '20' : '50'} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Días (opcional — vacío = todos los días)</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <button
                    key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${days.includes(d.value) ? 'border-[#E85D04] bg-[#E85D04]/10 text-[#C44D00]' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Hora inicio (opcional)</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Hora fin (opcional)</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#E85D04] hover:bg-[#C44D00]">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar promoción?"
        description={`Se eliminará "${deleteTarget?.name}" permanentemente.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
