'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Reglas de lealtad: "compra X veces y recibe Y" (producto gratis o descuento).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Gift } from 'lucide-react'
import { useProducts } from '@/lib/api/queries'
import {
  useLoyaltyRules, useCreateLoyaltyRule, useUpdateLoyaltyRule, useDeleteLoyaltyRule,
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
import type { LoyaltyRule, LoyaltyRewardType } from '@/lib/types'

export function LoyaltyTab({ branchId }: { branchId: number | null }) {
  const { data: rules = [], isLoading } = useLoyaltyRules(branchId)
  const { data: products = [] } = useProducts(branchId)
  const create = useCreateLoyaltyRule()
  const update = useUpdateLoyaltyRule()
  const remove = useDeleteLoyaltyRule()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [purchasesRequired, setPurchasesRequired] = useState('')
  const [rewardType, setRewardType] = useState<LoyaltyRewardType>('free_product')
  const [rewardValue, setRewardValue] = useState('')
  const [rewardProductId, setRewardProductId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<LoyaltyRule | null>(null)

  const openNew = () => {
    setName(''); setPurchasesRequired(''); setRewardType('free_product'); setRewardValue(''); setRewardProductId('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nombre requerido'); return }
    const required = Number(purchasesRequired)
    if (!required || required < 1) { toast.error('Indica cuántas compras se requieren'); return }
    if (rewardType === 'free_product' && !rewardProductId) { toast.error('Selecciona el producto de regalo'); return }
    if (rewardType !== 'free_product' && (!rewardValue || Number(rewardValue) <= 0)) { toast.error('Valor de recompensa inválido'); return }
    try {
      await create.mutateAsync({
        branch_id: branchId,
        name: name.trim(),
        purchases_required: required,
        reward_type: rewardType,
        reward_value: rewardType !== 'free_product' ? Number(rewardValue) : null,
        reward_product_id: rewardType === 'free_product' ? Number(rewardProductId) : null,
      })
      toast.success('Regla de lealtad creada')
      setOpen(false)
    } catch { toast.error('Error al crear la regla') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await remove.mutateAsync(deleteTarget.id); toast.success('Regla eliminada') }
    catch { toast.error('Error al eliminar') }
    setDeleteTarget(null)
  }

  const toggleActive = async (r: LoyaltyRule) => {
    try { await update.mutateAsync({ id: r.id, active: !r.active }) }
    catch { toast.error('Error al actualizar') }
  }

  const rewardLabel = (r: LoyaltyRule) => {
    if (r.reward_type === 'free_product') {
      const p = products.find(p => p.id === r.reward_product_id)
      return `${p?.name ?? 'Producto'} gratis`
    }
    return r.reward_type === 'discount_percent' ? `${r.reward_value}% de descuento` : `$${r.reward_value} MXN de descuento`
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-[#D1400F] hover:bg-[#B03508]"><Plus className="h-4 w-4 mr-1" /> Nueva regla</Button>
      </div>

      {rules.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aún no tienes reglas de lealtad. Crea una para premiar a tus clientes frecuentes (ej. "compra 10 veces y llévate un café gratis").</p>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <Card key={r.id} className={!r.active ? 'opacity-60' : undefined}>
              <CardContent className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold flex items-center gap-1.5"><Gift className="h-4 w-4 text-[#D1400F]" /> {r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compra {r.purchases_required} veces → {rewardLabel(r)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.active ? 'success' : 'muted'}>{r.active ? 'Activa' : 'Inactiva'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(r)}>{r.active ? 'Desactivar' : 'Activar'}</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva regla de lealtad</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Recompensa por frecuencia" /></div>
            <div className="space-y-1.5"><Label>Compras requeridas</Label><Input type="number" min="1" value={purchasesRequired} onChange={e => setPurchasesRequired(e.target.value)} placeholder="10" /></div>
            <div className="space-y-1.5">
              <Label>Recompensa</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as LoyaltyRewardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_product">Producto gratis</SelectItem>
                  <SelectItem value="discount_percent">% de descuento</SelectItem>
                  <SelectItem value="discount_amount">Monto fijo de descuento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rewardType === 'free_product' ? (
              <div className="space-y-1.5">
                <Label>Producto de regalo</Label>
                <Select value={rewardProductId} onValueChange={setRewardProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Valor de la recompensa</Label>
                <Input type="number" min="0" step="0.5" value={rewardValue} onChange={e => setRewardValue(e.target.value)} placeholder={rewardType === 'discount_percent' ? '15' : '50'} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#D1400F] hover:bg-[#B03508]">Crear regla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar regla de lealtad?"
        description={`Se eliminará "${deleteTarget?.name}" permanentemente.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
