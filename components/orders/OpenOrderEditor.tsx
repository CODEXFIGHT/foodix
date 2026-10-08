'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Minus, Trash2, Check, ChefHat, X } from 'lucide-react'
import {
  useAddOrderItems,
  useUpdateOrderItem,
  useRemoveOrderItem,
  useUpdateOrderItemStatus,
  type NewOrderItemInput,
} from '@/lib/api/queries'
import { useKioskMode } from '@/hooks/useKioskMode'
import { ProductPicker } from './ProductPicker'
import { CustomLineDialog } from './CustomLineDialog'
import type { DraftOrderItem } from './OrderSummary'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { isKgLine, isVariableLine } from '@/lib/utils/orderItemDisplay'
import type { Order, OrderItem, OrderItemStatus } from '@/lib/types'

const STATUS_META: Record<OrderItemStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-gray-100 text-gray-700' },
  preparing: { label: 'Preparando',  cls: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completado',  cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado',   cls: 'bg-red-100 text-red-700' },
}

interface OpenOrderEditorProps {
  order: Order
  /** Rol del usuario (controla cancelar ítems en preparación). */
  role: string
}

export function OpenOrderEditor({ order, role }: OpenOrderEditorProps) {
  const addItems = useAddOrderItems()
  const updateItem = useUpdateOrderItem()
  const removeItem = useRemoveOrderItem()
  const updateStatus = useUpdateOrderItemStatus()
  const { isKiosk } = useKioskMode()

  const [adding, setAdding] = useState(false)
  const [newItems, setNewItems] = useState<DraftOrderItem[]>([])
  const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [kgTarget, setKgTarget] = useState<OrderItem | null>(null)
  const [kgWeight, setKgWeight] = useState('')
  const [kgPrice, setKgPrice] = useState('')
  const [varTarget, setVarTarget] = useState<OrderItem | null>(null)
  const [varPrice, setVarPrice] = useState('')

  const busy = addItems.isPending || updateItem.isPending || removeItem.isPending || updateStatus.isPending

  // ── Edición de ítems existentes ──────────────────────────────────────────
  const changeQty = async (item: OrderItem, delta: number) => {
    const qty = item.quantity + delta
    if (qty < 1) return
    try {
      await updateItem.mutateAsync({ orderId: order.id, itemId: item.id, quantity: qty })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la cantidad')
    }
  }

  const setItemStatus = async (item: OrderItem, status: OrderItemStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, itemId: item.id, status })
      toast.success(`${item.product_name}: ${STATUS_META[status].label}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
    }
  }

  // Productos aún activos (pendientes o en preparación) que se pueden completar.
  const activeItems = order.items.filter(i => {
    const s = i.status ?? 'pending'
    return s === 'pending' || s === 'preparing'
  })

  // Marca TODA la cuenta como completada de un solo toque (sin imprimir nada).
  const completeAll = async () => {
    if (activeItems.length === 0) return
    try {
      await Promise.all(
        activeItems.map(it =>
          updateStatus.mutateAsync({ orderId: order.id, itemId: it.id, status: 'completed' }),
        ),
      )
      toast.success('Todos los productos se marcaron como completados')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron completar todos los productos')
    }
  }

  const handleRemove = async (item: OrderItem) => {
    // Pendiente: se elimina directo. En preparación: pide motivo (lo cancela).
    if ((item.status ?? 'pending') !== 'pending') {
      setCancelTarget(item)
      return
    }
    try {
      await removeItem.mutateAsync({ orderId: order.id, itemId: item.id })
      toast.success('Producto quitado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo quitar el producto')
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await removeItem.mutateAsync({ orderId: order.id, itemId: cancelTarget.id, reason: 'Cancelado por mesero/admin' })
      toast.success('Producto cancelado')
      setCancelTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar')
    }
  }

  // ── Agregar nuevos productos a la cuenta ──────────────────────────────────
  const addDraft = (item: DraftOrderItem) => setNewItems(prev => [...prev, item])
  const removeDraft = (uid: string) => setNewItems(prev => prev.filter(i => i.uid !== uid))
  const updateDraftQty = (uid: string, qty: number) =>
    setNewItems(prev => prev.map(i => (i.uid === uid ? { ...i, quantity: qty, subtotal: i.unit_price * qty } : i)))

  const newItemsTotal = newItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  const addCustomLine = async (item: NewOrderItemInput) => {
    try {
      await addItems.mutateAsync({ orderId: order.id, items: [item] })
      toast.success('Concepto agregado a la cuenta')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo agregar')
    }
  }

  const openKgConfirm = (item: OrderItem) => {
    setKgTarget(item)
    setKgWeight(item.weight_kg ? String(item.weight_kg) : '')
    setKgPrice(item.price_per_kg ? String(item.price_per_kg) : '')
  }

  const confirmKgPrice = async () => {
    if (!kgTarget) return
    const w = parseFloat(kgWeight) || 0
    const ppk = parseFloat(kgPrice) || 0
    if (w <= 0 || ppk <= 0) {
      toast.error('Ingresa peso y precio por KG válidos')
      return
    }
    try {
      await updateItem.mutateAsync({
        orderId: order.id, itemId: kgTarget.id,
        weight_kg: w, price_per_kg: ppk, price_pending: false,
      })
      toast.success('Precio confirmado')
      setKgTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo confirmar')
    }
  }

  const openVarEdit = (item: OrderItem) => {
    setVarTarget(item)
    setVarPrice(item.unit_price > 0 ? String(item.unit_price) : '')
  }

  const confirmVarPrice = async () => {
    if (!varTarget) return
    const p = parseFloat(varPrice) || 0
    if (p <= 0) { toast.error('Ingresa un precio válido (mayor a 0)'); return }
    try {
      await updateItem.mutateAsync({ orderId: order.id, itemId: varTarget.id, unit_price: Math.round(p * 100) / 100 })
      toast.success('Precio actualizado')
      setVarTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar')
    }
  }

  const confirmAdd = async () => {
    if (newItems.length === 0) return
    const payload: NewOrderItemInput[] = newItems.map(i => ({
      product_id: i.product_id || null,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      // Precio variable / por kilogramo: se conservan al agregar a la cuenta.
      price_type: i.price_type ?? undefined,
      weight_kg: i.weight_kg ?? undefined,
      price_per_kg: i.price_per_kg ?? undefined,
      price_pending: i.price_pending ?? undefined,
      modifiers: [
        ...(i.modifiers ?? []),
        ...(i.selectedModifiers ?? []).map(name => ({ name, price_delta: 0 }))
      ],
      item_notes: i.item_notes ?? null,
    }))
    try {
      await addItems.mutateAsync({ orderId: order.id, items: payload })
      toast.success(`${newItems.length} producto(s) agregado(s) a la cuenta`)
      setNewItems([])
      setAdding(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudieron agregar los productos')
    }
  }

  return (
    <div className="space-y-3">
      {/* Acción de cuenta: completar todos los productos de un toque (sin imprimir) */}
      {activeItems.length > 0 && (
        <Button
          variant="outline"
          onClick={completeAll}
          disabled={busy}
          className={cn(
            'w-full border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30',
            isKiosk && 'h-12 text-base',
          )}
        >
          <Check className={cn('h-4 w-4 mr-1.5', isKiosk && 'h-5 w-5')} />
          Completar todo ({activeItems.length})
        </Button>
      )}

      {/* Lista editable de ítems */}
      <div className="space-y-2">
        {order.items.map(item => {
          const status = item.status ?? 'pending'
          const cancelled = status === 'cancelled'
          // Un producto completado sigue siendo editable (cantidad/quitar) mientras
          // la cuenta esté abierta; solo los cancelados quedan bloqueados.
          const locked = status === 'cancelled'
          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border p-3',
                cancelled ? 'bg-red-50/50 border-red-100 opacity-70' : 'bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-medium', cancelled && 'line-through')}>
                      {item.product_name}
                    </span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_META[status].cls)}>
                      {STATUS_META[status].label}
                    </span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.modifiers.map(m => m.name).join(' · ')}
                    </p>
                  )}
                  {item.item_notes && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">Nota: {item.item_notes}</p>
                  )}
                  {cancelled && item.cancel_reason && (
                    <p className="text-xs text-red-600 mt-0.5">Motivo: {item.cancel_reason}</p>
                  )}
                  {item.price_per_kg != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.weight_kg ? `${item.weight_kg} kg × ` : ''}{formatCurrency(item.price_per_kg)}/kg
                      {item.price_pending && (
                        <span className="ml-1 text-amber-600 font-semibold">· precio estimado</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  {item.price_per_kg == null && (
                    <p className={cn("text-xs text-muted-foreground", isKiosk && "text-sm")}>{formatCurrency(item.unit_price)} c/u</p>
                  )}
                </div>
              </div>

              {!locked && (
                <div className={cn("flex items-center gap-2 mt-2 flex-wrap", isKiosk && "gap-3 mt-3")}>
                  {/* Cantidad (los productos por KG llevan cantidad fija = 1) */}
                  {item.price_per_kg == null && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => changeQty(item, -1)}
                        disabled={busy || item.quantity <= 1}
                        aria-label="Disminuir"
                        className={cn(
                          "rounded-full border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors",
                          isKiosk ? "w-11 h-11" : "w-7 h-7"
                        )}
                      >
                        <Minus className={cn("h-3 w-3", isKiosk && "h-5 w-5")} />
                      </button>
                      <span className={cn("text-center font-bold", isKiosk ? "w-10 text-base" : "w-7 text-sm")}>{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item, 1)}
                        disabled={busy}
                        aria-label="Aumentar"
                        className={cn(
                          "rounded-full border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors",
                          isKiosk ? "w-11 h-11" : "w-7 h-7"
                        )}
                      >
                        <Plus className={cn("h-3 w-3", isKiosk && "h-5 w-5")} />
                      </button>
                    </div>
                  )}

                  <div className="flex-1" />

                  {item.price_pending && (
                    <Button size="sm" className={cn("text-xs bg-amber-600 hover:bg-amber-700", isKiosk ? "h-11 px-4 text-sm" : "h-7")}
                      onClick={() => openKgConfirm(item)} disabled={busy}>
                      Confirmar precio
                    </Button>
                  )}
                  {/* Editar peso/precio de una línea por kg ya confirmada */}
                  {!item.price_pending && isKgLine(item) && (
                    <Button size="sm" variant="outline" className={cn("text-xs", isKiosk ? "h-11 px-4 text-sm" : "h-7")}
                      onClick={() => openKgConfirm(item)} disabled={busy}>
                      Editar peso/precio
                    </Button>
                  )}
                  {/* Editar el precio de una línea de precio variable */}
                  {isVariableLine(item) && (
                    <Button size="sm" variant="outline" className={cn("text-xs", isKiosk ? "h-11 px-4 text-sm" : "h-7")}
                      onClick={() => openVarEdit(item)} disabled={busy}>
                      Editar precio
                    </Button>
                  )}
                  {status === 'pending' && (
                    <Button size="sm" variant="outline" className={cn("text-xs", isKiosk ? "h-11 px-4 text-sm" : "h-7")}
                      onClick={() => setItemStatus(item, 'preparing')} disabled={busy}>
                      <ChefHat className={cn("h-3 w-3 mr-1", isKiosk && "h-4 w-4 mr-1.5")} /> Preparar
                    </Button>
                  )}
                  {(status === 'pending' || status === 'preparing') && (
                    <Button size="sm" variant="outline" className={cn("text-xs text-green-700 border-green-200", isKiosk ? "h-11 px-4 text-sm" : "h-7")}
                      onClick={() => setItemStatus(item, 'completed')} disabled={busy}>
                      <Check className={cn("h-3 w-3 mr-1", isKiosk && "h-4 w-4 mr-1.5")} /> Completar
                    </Button>
                  )}
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={busy}
                    aria-label={`Quitar ${item.product_name}`}
                    title="Quitar producto"
                    className={cn(
                      "rounded-full text-destructive hover:bg-destructive hover:text-white flex items-center justify-center disabled:opacity-40 transition-colors",
                      isKiosk ? "w-11 h-11" : "w-8 h-8"
                    )}
                  >
                    <Trash2 className={cn("h-4 w-4", isKiosk && "h-5 w-5")} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {order.items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">El pedido no tiene productos.</p>
        )}
      </div>

      {/* Agregar productos */}
      {!adding ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-dashed" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Agregar productos
          </Button>
          <Button variant="outline" className="border-dashed" onClick={() => setCustomOpen(true)}>
            Concepto / KG
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Agregar a la cuenta</p>
            <button onClick={() => { setAdding(false); setNewItems([]) }} aria-label="Cerrar"
              className="p-1 rounded-full hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[60vh] min-h-[360px]">
            <ProductPicker
              items={newItems}
              onAdd={addDraft}
              onRemove={removeDraft}
              onUpdateQty={updateDraftQty}
            />
          </div>
          <Button
            className="w-full bg-[#E85D04] hover:bg-[#C44D00] h-11"
            disabled={newItems.length === 0 || addItems.isPending}
            onClick={confirmAdd}
          >
            {addItems.isPending
              ? 'Agregando…'
              : `Agregar ${newItems.length} producto(s) · ${formatCurrency(newItemsTotal)}`}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancelar producto"
        description={`"${cancelTarget?.product_name}" ya está en preparación. Cancelarlo quedará registrado en la auditoría. ¿Continuar?`}
        confirmLabel="Cancelar producto"
        onConfirm={confirmCancel}
        variant="destructive"
        loading={removeItem.isPending}
      />

      <CustomLineDialog open={customOpen} onOpenChange={setCustomOpen} onAdd={addCustomLine} />

      {/* Confirmar precio final de un producto por KG */}
      <Dialog open={kgTarget !== null} onOpenChange={(o) => !o && setKgTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar precio · {kgTarget?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" inputMode="decimal" step="0.001" min="0" value={kgWeight}
                onChange={e => setKgWeight(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Precio por KG</Label>
              <Input type="number" inputMode="decimal" min="0" value={kgPrice}
                onChange={e => setKgPrice(e.target.value)} />
            </div>
          </div>
          <p className="text-right text-sm font-semibold">
            Total: {formatCurrency((parseFloat(kgWeight) || 0) * (parseFloat(kgPrice) || 0))}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKgTarget(null)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={confirmKgPrice} disabled={updateItem.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar precio de una línea de precio variable */}
      <Dialog open={varTarget !== null} onOpenChange={(o) => !o && setVarTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar precio · {varTarget?.product_name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Precio</Label>
            <Input type="number" inputMode="decimal" step="0.01" min="0" value={varPrice}
              onChange={e => setVarPrice(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmVarPrice() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarTarget(null)}>Cancelar</Button>
            <Button className="bg-[#E85D04] hover:bg-[#C44D00]" onClick={confirmVarPrice} disabled={updateItem.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
