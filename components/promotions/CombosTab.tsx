'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de combos: bundles de productos vendidos a precio fijo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { useProducts } from '@/lib/api/queries'
import { useCombos, useCreateCombo, useUpdateCombo, useDeleteCombo } from '@/lib/api/queries/usePromotions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Combo, ComboItem } from '@/lib/types'

interface DraftItem { product_id: number; quantity: number; name: string }

export function CombosTab({ branchId }: { branchId: number | null }) {
  const { data: combos = [], isLoading } = useCombos(branchId)
  const { data: products = [] } = useProducts(branchId)
  const create = useCreateCombo()
  const update = useUpdateCombo()
  const remove = useDeleteCombo()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [pickProduct, setPickProduct] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null)

  const openNew = () => {
    setEditing(null); setName(''); setDescription(''); setPrice(''); setItems([]); setPickProduct('')
    setOpen(true)
  }
  const openEdit = (c: Combo) => {
    setEditing(c)
    setName(c.name)
    setDescription(c.description ?? '')
    setPrice(String(c.price))
    setItems(c.items.map((i: ComboItem) => ({ product_id: i.product_id, quantity: i.quantity, name: i.name ?? '' })))
    setPickProduct('')
    setOpen(true)
  }

  const addItem = () => {
    const productId = Number(pickProduct)
    const product = products.find(p => p.id === productId)
    if (!product) return
    if (items.some(i => i.product_id === productId)) { toast.error('Ese producto ya está en el combo'); return }
    setItems(prev => [...prev, { product_id: productId, quantity: 1, name: product.name }])
    setPickProduct('')
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nombre requerido'); return }
    if (!price || Number(price) <= 0) { toast.error('Precio inválido'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    try {
      const body = {
        branch_id: branchId,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      }
      if (editing) await update.mutateAsync({ id: editing.id, ...body })
      else await create.mutateAsync(body)
      toast.success('Combo guardado')
      setOpen(false)
    } catch { toast.error('Error al guardar el combo') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await remove.mutateAsync(deleteTarget.id); toast.success('Combo eliminado') }
    catch { toast.error('Error al eliminar') }
    setDeleteTarget(null)
  }

  const toggleActive = async (c: Combo) => {
    try { await update.mutateAsync({ id: c.id, active: !c.active }) }
    catch { toast.error('Error al actualizar') }
  }

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-[#FACC15] hover:bg-[#EAB308]"><Plus className="h-4 w-4 mr-1" /> Nuevo combo</Button>
      </div>

      {combos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aún no tienes combos. Crea el primero para subir tu ticket promedio.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {combos.map(c => (
            <Card key={c.id} className={!c.active ? 'opacity-60' : undefined}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate flex items-center gap-1.5"><Package className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> {c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                  <Badge variant={c.active ? 'success' : 'muted'}>{c.active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <p className="text-lg font-extrabold text-yellow-700 dark:text-yellow-400">{formatCurrency(c.price)}</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {c.items.map(i => <li key={i.id}>{i.quantity}× {i.name ?? `Producto #${i.product_id}`}</li>)}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>{c.active ? 'Desactivar' : 'Activar'}</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar combo' : 'Nuevo combo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Combo Taquero" /></div>
            <div className="space-y-1.5"><Label>Descripción (opcional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
            <div className="space-y-1.5"><Label>Precio del combo</Label><Input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value)} placeholder="85" /></div>

            <div className="space-y-1.5">
              <Label>Productos incluidos</Label>
              <div className="flex gap-2">
                <Select value={pickProduct} onValueChange={setPickProduct}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addItem} disabled={!pickProduct}>Agregar</Button>
              </div>
              {items.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                  {items.map((it, idx) => (
                    <li key={it.product_id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <span className="flex-1 truncate">{it.name}</span>
                      <Input
                        type="number" min="1" value={it.quantity} className="w-16 h-8"
                        onChange={e => setItems(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Math.max(1, Number(e.target.value)) } : p))}
                      />
                      <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="text-stone-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#FACC15] hover:bg-[#EAB308]">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar combo?"
        description={`Se eliminará "${deleteTarget?.name}" permanentemente.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
