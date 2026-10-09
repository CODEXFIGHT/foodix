'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowRightLeft, Ban } from 'lucide-react'
import {
  useInventoryTransfers, useCreateInventoryTransfer, useReceiveInventoryTransfer,
  useCancelInventoryTransfer, useWarehouses, useInventory,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils/formatters'

interface TrLine { inventory_item_id: number; quantity: string }

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  completed: { label: 'Completada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export function TransferenciasTab({ branchId }: { branchId: number | null }) {
  const { data: transfers = [], isLoading } = useInventoryTransfers(branchId)
  const { data: warehouses = [] } = useWarehouses(branchId)
  const { data: inventory = [] } = useInventory(branchId)
  const create = useCreateInventoryTransfer()
  const receiveTransfer = useReceiveInventoryTransfer()
  const cancel = useCancelInventoryTransfer()

  const [open, setOpen] = useState(false)
  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [lines, setLines] = useState<TrLine[]>([{ inventory_item_id: 0, quantity: '' }])

  const addLine = () => setLines(prev => [...prev, { inventory_item_id: 0, quantity: '' }])
  const setLine = (i: number, patch: Partial<TrLine>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLine = (i: number) => setLines(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const openNew = () => {
    setFromId(''); setToId(''); setLines([{ inventory_item_id: 0, quantity: '' }]); setOpen(true)
  }

  const handleCreate = async () => {
    if (!fromId || !toId || fromId === toId) { toast.error('Elige almacén de origen y destino distintos'); return }
    const items = lines
      .filter(l => l.inventory_item_id > 0 && parseFloat(l.quantity) > 0)
      .map(l => ({ inventory_item_id: l.inventory_item_id, quantity: parseFloat(l.quantity) }))
    if (items.length === 0) { toast.error('Agrega al menos un insumo'); return }
    try {
      await create.mutateAsync({
        branch_id: branchId, from_warehouse_id: Number(fromId), to_warehouse_id: Number(toId), items,
      })
      toast.success('Transferencia creada'); setOpen(false)
    } catch { toast.error('Error al crear la transferencia') }
  }

  const handleReceive = async (id: number) => {
    try { await receiveTransfer.mutateAsync(id); toast.success('Transferencia recibida · stock actualizado') }
    catch { toast.error('Error al recibir la transferencia') }
  }
  const handleCancel = async (id: number) => {
    try { await cancel.mutateAsync(id); toast.success('Transferencia cancelada') }
    catch { toast.error('Error al cancelar') }
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="bg-[#D1400F] hover:bg-[#B03508]"
          disabled={warehouses.length < 2 || inventory.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nueva transferencia
        </Button>
      </div>
      {warehouses.length < 2 && (
        <p className="text-xs text-muted-foreground">Necesitas al menos dos almacenes en esta sucursal para transferir insumos.</p>
      )}

      {transfers.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin transferencias</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {transfers.map(t => (
            <Card key={t.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium flex items-center gap-1.5">
                      {t.from_warehouse_name} <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" /> {t.to_warehouse_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <Badge variant={STATUS[t.status].variant}>{STATUS[t.status].label}</Badge>
                </div>
                {t.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleReceive(t.id)} disabled={receiveTransfer.isPending}>
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Confirmar recepción
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancel(t.id)}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva transferencia entre almacenes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Origen</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger><SelectValue placeholder="Almacén…" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger><SelectValue placeholder="Almacén…" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => String(w.id) !== fromId).map(w => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label>Insumos</Label>
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={l.inventory_item_id ? String(l.inventory_item_id) : ''}
                  onValueChange={(v) => setLine(i, { inventory_item_id: Number(v) })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Insumo…" /></SelectTrigger>
                  <SelectContent>
                    {inventory.map(it => <SelectItem key={it.id} value={String(it.id)}>{it.name} ({it.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-24" type="number" inputMode="decimal" value={l.quantity}
                  onChange={e => setLine(i, { quantity: e.target.value })} placeholder="Cant." />
                <button onClick={() => removeLine(i)} className="px-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar insumo</Button>
            <p className="text-xs text-muted-foreground">
              El stock del almacén destino se incrementa hasta que confirmes la recepción.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-[#D1400F] hover:bg-[#B03508]">Crear transferencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
