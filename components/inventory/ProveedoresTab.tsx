'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import {
  useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
} from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { Supplier } from '@/lib/types'

export function ProveedoresTab({ branchId }: { branchId: number | null }) {
  const { data: suppliers = [], isLoading } = useSuppliers(branchId)
  const create = useCreateSupplier()
  const update = useUpdateSupplier()
  const remove = useDeleteSupplier()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', notes: '' })

  const openNew = () => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', notes: '' }); setOpen(true) }
  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({ name: s.name, contact: s.contact ?? '', phone: s.phone ?? '', email: s.email ?? '', notes: s.notes ?? '' })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...form })
      else await create.mutateAsync({ branch_id: branchId, ...form })
      toast.success('Proveedor guardado'); setOpen(false)
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (s: Supplier) => {
    try { await remove.mutateAsync(s.id); toast.success('Proveedor eliminado') }
    catch { toast.error('Error al eliminar') }
  }

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="bg-[#FACC15] hover:bg-[#EAB308]">
          <Plus className="h-4 w-4 mr-1" /> Nuevo proveedor
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin proveedores</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {suppliers.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {s.contact && <span>{s.contact}</span>}
                    {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(s)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Razón social o nombre" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Contacto</Label>
                <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Persona" /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="" /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="" /></div>
            <div className="space-y-1.5"><Label>Notas</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || create.isPending || update.isPending} className="bg-[#FACC15] hover:bg-[#EAB308]">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
