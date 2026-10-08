'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, PackageCheck, Ban } from 'lucide-react'
import {
  usePurchases, usePurchase, useCreatePurchase, useReceivePurchase, useCancelPurchase,
  useSuppliers, useInventory,
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
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { PurchaseOrder } from '@/lib/types'

interface POLine { inventory_item_id: number; quantity: string; unit_cost: string }

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  partially_received: { label: 'Recibida parcial', variant: 'secondary' },
  received: { label: 'Recibida', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export function ComprasTab({ branchId }: { branchId: number | null }) {
  const { data: purchases = [], isLoading } = usePurchases(branchId)
  const { data: suppliers = [] } = useSuppliers(branchId)
  const { data: inventory = [] } = useInventory(branchId)
  const create = useCreatePurchase()
  const receive = useReceivePurchase()
  const cancel = useCancelPurchase()

  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState<string>('')
  const [lines, setLines] = useState<POLine[]>([{ inventory_item_id: 0, quantity: '', unit_cost: '' }])

  const [receiveId, setReceiveId] = useState<number | null>(null)
  const { data: receivePO } = usePurchase(receiveId)
  const [receiveQty, setReceiveQty] = useState<Record<number, string>>({})

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0)

  const addLine = () => setLines(prev => [...prev, { inventory_item_id: 0, quantity: '', unit_cost: '' }])
  const setLine = (i: number, patch: Partial<POLine>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLine = (i: number) => setLines(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const openNew = () => { setSupplierId(''); setLines([{ inventory_item_id: 0, quantity: '', unit_cost: '' }]); setOpen(true) }

  const handleCreate = async () => {
    const items = lines
      .filter(l => l.inventory_item_id > 0 && parseFloat(l.quantity) > 0)
      .map(l => ({ inventory_item_id: l.inventory_item_id, quantity: parseFloat(l.quantity), unit_cost: parseFloat(l.unit_cost) || 0 }))
    if (items.length === 0) { toast.error('Agrega al menos un insumo'); return }
    try {
      await create.mutateAsync({ branch_id: branchId, supplier_id: supplierId ? Number(supplierId) : null, items })
      toast.success('Orden de compra creada'); setOpen(false)
    } catch { toast.error('Error al crear la compra') }
  }

  const openReceive = (po: PurchaseOrder) => {
    setReceiveId(po.id)
    setReceiveQty({})
  }

  const handleReceiveAll = async (id: number) => {
    try {
      await receive.mutateAsync({ id })
      toast.success('Compra recibida · stock actualizado')
      setReceiveId(null)
    } catch { toast.error('Error al recibir') }
  }

  const handleReceivePartial = async () => {
    if (!receivePO?.items) return
    const items = receivePO.items
      .map(it => ({ id: it.id!, received_quantity: parseFloat(receiveQty[it.id!] ?? '') || 0 }))
      .filter(it => it.received_quantity > 0)
    if (items.length === 0) { toast.error('Indica al menos una cantidad a recibir'); return }
    try {
      await receive.mutateAsync({ id: receivePO.id, items })
      toast.success('Recepción registrada · stock actualizado')
      setReceiveId(null)
    } catch { toast.error('Error al recibir') }
  }

  const handleCancel = async (id: number) => {
    try { await cancel.mutateAsync(id); toast.success('Compra cancelada') }
    catch { toast.error('Error al cancelar') }
  }

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm" className="bg-[#E85D04] hover:bg-[#C44D00]" disabled={inventory.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nueva compra
        </Button>
      </div>

      {purchases.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin órdenes de compra</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {purchases.map(po => (
            <Card key={po.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Compra #{po.id} {po.supplier_name && <span className="text-muted-foreground font-normal">· {po.supplier_name}</span>}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(po.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(po.total)}</p>
                    <Badge variant={STATUS[po.status].variant}>{STATUS[po.status].label}</Badge>
                  </div>
                </div>
                {(po.status === 'pending' || po.status === 'partially_received') && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => openReceive(po)} disabled={receive.isPending}>
                      <PackageCheck className="h-3.5 w-3.5 mr-1" /> Recibir
                    </Button>
                    {po.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancel(po.id)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva orden de compra</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Proveedor (opcional)</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
                <Input className="w-20" type="number" inputMode="decimal" value={l.quantity}
                  onChange={e => setLine(i, { quantity: e.target.value })} placeholder="Cant." />
                <Input className="w-24" type="number" inputMode="decimal" value={l.unit_cost}
                  onChange={e => setLine(i, { unit_cost: e.target.value })} placeholder="Costo" />
                <button onClick={() => removeLine(i)} className="px-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar insumo</Button>

            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span><span className="text-[#E85D04]">{formatCurrency(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">Crear compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveId !== null} onOpenChange={(v) => !v && setReceiveId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Recibir compra #{receiveId}</DialogTitle></DialogHeader>
          {!receivePO?.items ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Indica cuánto llegó de cada insumo. Deja en 0 lo que no llegó — la orden queda como
                &quot;recibida parcial&quot; y podrás volver a recibir el resto después.
              </p>
              {receivePO.items.map(it => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pendiente: {it.pending_quantity ?? it.quantity} {it.unit}
                    </p>
                  </div>
                  <Input className="w-24" type="number" inputMode="decimal"
                    value={receiveQty[it.id!] ?? String(it.pending_quantity ?? it.quantity)}
                    onChange={e => setReceiveQty(prev => ({ ...prev, [it.id!]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReceiveId(null)}>Cancelar</Button>
            <Button variant="outline" onClick={handleReceivePartial} disabled={receive.isPending || !receivePO?.items}>
              Recibir cantidades indicadas
            </Button>
            <Button onClick={() => receiveId && handleReceiveAll(receiveId)} disabled={receive.isPending}
              className="bg-green-600 hover:bg-green-700">
              Recibir todo lo pendiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
