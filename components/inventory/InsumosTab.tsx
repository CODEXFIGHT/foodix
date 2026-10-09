'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, AlertTriangle, SlidersHorizontal } from 'lucide-react'
import {
  useInventory, useCreateInventoryItem, useUpdateInventoryItem,
  useAdjustInventory,
} from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/formatters'
import type { InventoryItem } from '@/lib/types'

export function InsumosTab({ branchId }: { branchId: number | null }) {
  const { data: items = [], isLoading } = useInventory(branchId)
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const adjust = useAdjustInventory()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'pza', stock: '', min_stock: '', cost: '' })

  const [adjItem, setAdjItem] = useState<InventoryItem | null>(null)
  const [adjType, setAdjType] = useState<'waste' | 'adjustment'>('waste')
  const [adjQty, setAdjQty] = useState('')
  const [adjReason, setAdjReason] = useState('')

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', unit: 'pza', stock: '', min_stock: '', cost: '' })
    setFormOpen(true)
  }
  const openEdit = (i: InventoryItem) => {
    setEditing(i)
    setForm({ name: i.name, unit: i.unit, stock: String(i.stock), min_stock: String(i.min_stock), cost: String(i.cost) })
    setFormOpen(true)
  }

  const handleSave = async () => {
    const body = {
      name: form.name.trim(),
      unit: form.unit.trim() || 'pza',
      min_stock: parseFloat(form.min_stock) || 0,
      cost: parseFloat(form.cost) || 0,
      ...(editing ? {} : { stock: parseFloat(form.stock) || 0 }),
    }
    try {
      if (editing) await updateItem.mutateAsync({ id: editing.id, ...body })
      else await createItem.mutateAsync({ branch_id: branchId, ...body })
      toast.success('Insumo guardado')
      setFormOpen(false)
    } catch { toast.error('Error al guardar') }
  }

  const handleAdjust = async () => {
    if (!adjItem) return
    try {
      await adjust.mutateAsync({
        id: adjItem.id, type: adjType,
        quantity: parseFloat(adjQty) || 0, reason: adjReason.trim() || undefined,
      })
      toast.success(adjType === 'waste' ? 'Merma registrada' : 'Ajuste aplicado')
      setAdjItem(null); setAdjQty(''); setAdjReason('')
    } catch { toast.error('Error en el ajuste') }
  }

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="bg-[#D1400F] hover:bg-[#B03508]">
          <Plus className="h-4 w-4 mr-1" /> Nuevo insumo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin insumos registrados</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(i => (
            <Card key={i.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{i.name}</p>
                    {i.low_stock && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Bajo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i.stock} {i.unit} · {formatCurrency(i.cost)}/{i.unit} · mín {i.min_stock}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setAdjItem(i); setAdjType('waste') }}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(i)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form crear/editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar insumo' : 'Nuevo insumo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Tortilla de maíz" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unidad</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, g, l, ml, pza" />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label>Stock inicial</Label>
                  <Input type="number" inputMode="decimal" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <Input type="number" inputMode="decimal" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Costo / unidad</Label>
                <Input type="number" inputMode="decimal" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || createItem.isPending || updateItem.isPending} className="bg-[#D1400F] hover:bg-[#B03508]">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajuste / merma */}
      <Dialog open={!!adjItem} onOpenChange={(o) => !o && setAdjItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar stock · {adjItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={adjType === 'waste' ? 'default' : 'outline'} onClick={() => setAdjType('waste')}
                className={adjType === 'waste' ? 'bg-[#D1400F] hover:bg-[#B03508]' : ''}>Merma</Button>
              <Button variant={adjType === 'adjustment' ? 'default' : 'outline'} onClick={() => setAdjType('adjustment')}
                className={adjType === 'adjustment' ? 'bg-[#D1400F] hover:bg-[#B03508]' : ''}>Ajuste</Button>
            </div>
            <div className="space-y-1.5">
              <Label>{adjType === 'waste' ? 'Cantidad a descontar' : 'Cantidad (+ entra / − sale)'}</Label>
              <Input type="number" inputMode="decimal" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder={adjType === 'waste' ? 'Ej. caducado, dañado' : 'Ej. recuento físico'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjItem(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={adjust.isPending} className="bg-[#D1400F] hover:bg-[#B03508]">Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
