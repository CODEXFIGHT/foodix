'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gestión de cupones: código canjeable por el cliente al confirmar su pedido
 * (POS, mesero o WhatsApp — ver `coupon_code` en POST /orders).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Ticket } from 'lucide-react'
import {
  useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon,
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
import type { Coupon, DiscountType } from '@/lib/types'

export function CouponsTab({ branchId }: { branchId: number | null }) {
  const { data: coupons = [], isLoading } = useCoupons(branchId)
  const create = useCreateCoupon()
  const update = useUpdateCoupon()
  const remove = useDeleteCoupon()

  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<DiscountType>('discount_percent')
  const [value, setValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)

  const openNew = () => {
    setCode(''); setType('discount_percent'); setValue(''); setMaxUses(''); setExpiresAt('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!code.trim()) { toast.error('Código requerido'); return }
    if (!value || Number(value) <= 0) { toast.error('Valor inválido'); return }
    try {
      await create.mutateAsync({
        branch_id: branchId,
        code: code.trim().toUpperCase(),
        type, value: Number(value),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
      })
      toast.success('Cupón creado')
      setOpen(false)
    } catch { toast.error('Error al crear el cupón (¿código repetido?)') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await remove.mutateAsync(deleteTarget.id); toast.success('Cupón eliminado') }
    catch { toast.error('Error al eliminar') }
    setDeleteTarget(null)
  }

  const toggleActive = async (c: Coupon) => {
    try { await update.mutateAsync({ id: c.id, active: !c.active }) }
    catch { toast.error('Error al actualizar') }
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-[#D1400F] hover:bg-[#B03508]"><Plus className="h-4 w-4 mr-1" /> Nuevo cupón</Button>
      </div>

      {coupons.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Aún no tienes cupones. Créalos para campañas de bienvenida o recompra.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map(c => (
            <Card key={c.id} className={!c.active ? 'opacity-60' : undefined}>
              <CardContent className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold flex items-center gap-1.5 font-mono">
                    <Ticket className="h-4 w-4 text-[#D1400F]" /> {c.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.type === 'discount_percent' ? `${c.value}% de descuento` : `$${c.value} MXN de descuento`}
                    {' · '}{c.uses_count} uso(s){c.max_uses !== null ? ` de ${c.max_uses}` : ''}
                    {c.expires_at && ` · vence ${new Date(c.expires_at).toLocaleDateString('es-MX')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={c.active ? 'success' : 'muted'}>{c.active ? 'Activo' : 'Inactivo'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>{c.active ? 'Desactivar' : 'Activar'}</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo cupón</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Código</Label><Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="BIENVENIDA10" /></div>
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
                <Input type="number" min="0" step="0.5" value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'discount_percent' ? '10' : '50'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Máx. usos (opcional)</Label><Input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Ilimitado" /></div>
              <div className="space-y-1.5"><Label>Vence (opcional)</Label><Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#D1400F] hover:bg-[#B03508]">Crear cupón</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar cupón?"
        description={`Se eliminará el código "${deleteTarget?.code}" permanentemente.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
