/**
 * FoodIX — Modo Demo · Panel Mesero
 * Selección de mesa, toma de orden con modificadores/notas, envío a cocina,
 * cuenta y cierre simulado. Sincroniza con Cocina en tiempo real (local).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Minus, Trash2, Send, Receipt, DollarSign, ChefHat, SplitSquareHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { DemoShell } from '@/components/demo/DemoShell'
import { DemoSplitBill } from '@/components/demo/DemoSplitBill'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import {
  useDemoStore, demoActions, computeTotals, formatMoney, orderItemTotal,
} from '@/lib/demo/demo-store'
import { getDemoUser } from '@/lib/demo/demo-seed'
import type { DemoProduct } from '@/lib/demo/demo-types'

const WAITER_NAME = getDemoUser('waiter').name

export default function DemoWaiterPage() {
  return (
    <DemoShell role="waiter" title="Toma de órdenes" fullBleed>
      <WaiterContent />
    </DemoShell>
  )
}

function WaiterContent() {
  const tables = useDemoStore(s => s.tables)
  const orders = useDemoStore(s => s.orders)
  const products = useDemoStore(s => s.products)
  const categories = useDemoStore(s => s.categories)
  const modifiers = useDemoStore(s => s.modifiers)
  const restaurant = useDemoStore(s => s.restaurant)

  const [tableId, setTableId] = useState<string | null>(null)
  const [configProduct, setConfigProduct] = useState<DemoProduct | null>(null)
  const [billOpen, setBillOpen] = useState(false)
  const [splitting, setSplitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'menu' | 'ticket'>('menu')

  // Si la mesa se libera (cobro), deselecciona.
  useEffect(() => {
    if (tableId && !tables.some(t => t.id === tableId)) setTableId(null)
  }, [tables, tableId])

  const order = useMemo(
    () => orders.find(o => o.tableId === tableId && o.status !== 'closed'),
    [orders, tableId],
  )
  const totals = computeTotals(order, restaurant.taxRate)
  const availableProducts = useMemo(() => products.filter(p => p.available), [products])

  function selectTable(id: string) {
    setTableId(id)
    demoActions.getOrCreateOrder(id, WAITER_NAME)
    setActiveTab('menu')
  }

  function handleSend() {
    if (!order || order.items.length === 0) return
    demoActions.sendOrder(order.id)
    toast.success('Orden enviada a cocina', { description: `${order.items.length} platillo(s)` })
  }

  function handleClose() {
    if (order) {
      demoActions.closeOrder(order.id)
      toast.success('Cuenta cerrada', { description: formatMoney(totals.total, restaurant.currency) })
    }
    setBillOpen(false)
    setSplitting(false)
    setTableId(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      {/* Selector de mesa */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Mesas</p>
        <div className="flex flex-wrap gap-2">
          {tables.map(t => {
            const tOrder = orders.find(o => o.tableId === t.id && o.status !== 'closed')
            return (
              <button
                key={t.id}
                onClick={() => selectTable(t.id)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-95',
                  tableId === t.id
                    ? 'border-[#D1400F] bg-[#D1400F] text-white shadow'
                    : tOrder
                      ? 'border-[#D1400F]/40 bg-[#D1400F]/5 text-stone-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
                )}
              >
                {t.label}
                {tOrder && tableId !== t.id && (
                  <span className="ml-1.5 text-xs text-[#D1400F]">●</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!tableId ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-stone-300 py-20 text-center">
          <ChefHat className="mb-2 h-10 w-10 text-stone-300" />
          <p className="text-sm font-medium text-stone-500">Selecciona una mesa para comenzar</p>
        </div>
      ) : (
        <>
          {/* Selector de pestañas móvil */}
          <div className="mb-4 flex border-b border-stone-200 lg:hidden">
            <button
              onClick={() => setActiveTab('menu')}
              className={cn(
                'flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-all',
                activeTab === 'menu'
                  ? 'border-[#D1400F] text-[#D1400F]'
                  : 'border-transparent text-stone-500 hover:text-stone-700',
              )}
            >
              Menú
            </button>
            <button
              onClick={() => setActiveTab('ticket')}
              className={cn(
                'flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5',
                activeTab === 'ticket'
                  ? 'border-[#D1400F] text-[#D1400F]'
                  : 'border-transparent text-stone-500 hover:text-stone-700',
              )}
            >
              <span>Orden actual</span>
              {order && order.items.length > 0 && (
                <Badge variant="orange" className="h-5 min-w-5 justify-center rounded-full p-0 text-[10px] font-bold">
                  {order.items.reduce((s, i) => s + i.qty, 0)}
                </Badge>
              )}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Menú */}
            <div className={cn('space-y-4', activeTab === 'menu' ? 'block' : 'hidden lg:block')}>
            {categories.map(c => {
              const items = availableProducts.filter(p => p.categoryId === c.id)
              if (items.length === 0) return null
              return (
                <div key={c.id}>
                  <h3 className="mb-2 text-sm font-semibold text-stone-700">{c.emoji} {c.name}</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setConfigProduct(p)}
                        className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition-all hover:border-[#D1400F]/40 hover:shadow-sm active:scale-[0.98]"
                      >
                        <span className="text-2xl">{p.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="text-sm font-bold text-[#D1400F]">{formatMoney(p.price)}</p>
                        </div>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition-colors group-hover:bg-[#D1400F] group-hover:text-white">
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ticket */}
          <div className={cn('lg:sticky lg:top-20 lg:self-start', activeTab === 'ticket' ? 'block' : 'hidden lg:block')}>
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 p-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-stone-400" />
                  <span className="text-sm font-semibold">Orden actual</span>
                </div>
                {order && (
                  <Badge variant={order.status === 'sent' ? 'info' : 'warning'}>
                    {order.status === 'sent' ? 'En cocina' : 'Abierta'}
                  </Badge>
                )}
              </div>

              <div className="max-h-[45vh] space-y-2 overflow-y-auto p-3 scrollbar-thin">
                {!order || order.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">Agrega platillos del menú.</p>
                ) : (
                  order.items.map(i => (
                    <div key={i.id} className="rounded-lg border border-stone-100 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{i.emoji} {i.name}</p>
                        <button onClick={() => demoActions.removeItem(order.id, i.id)} className="text-stone-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {i.modifiers.length > 0 && (
                        <p className="mt-0.5 text-xs text-stone-500">{i.modifiers.map(m => m.name).join(', ')}</p>
                      )}
                      {i.note && <p className="mt-0.5 text-xs italic text-amber-600">“{i.note}”</p>}
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => demoActions.changeItemQty(order.id, i.id, -1)} className="grid h-6 w-6 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{i.qty}</span>
                          <button onClick={() => demoActions.changeItemQty(order.id, i.id, 1)} className="grid h-6 w-6 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">{formatMoney(orderItemTotal(i), restaurant.currency)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-stone-100 p-3">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Subtotal</span><span>{formatMoney(totals.subtotal, restaurant.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>IVA ({Math.round(restaurant.taxRate * 100)}%)</span><span>{formatMoney(totals.tax, restaurant.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-1.5 text-base font-bold">
                  <span>Total</span><span>{formatMoney(totals.total, restaurant.currency)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="brand" onClick={handleSend} disabled={!order || order.items.length === 0}>
                    <Send className="h-4 w-4" /> Enviar
                  </Button>
                  <Button variant="outline" onClick={() => setBillOpen(true)} disabled={!order || order.items.length === 0}>
                    <Receipt className="h-4 w-4" /> Cuenta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}

      {/* Configurar platillo */}
      <ItemConfigDialog
        product={configProduct}
        modifiers={modifiers}
        currency={restaurant.currency}
        onClose={() => setConfigProduct(null)}
        onAdd={(item) => {
          if (!tableId) return
          const oid = demoActions.getOrCreateOrder(tableId, WAITER_NAME)
          demoActions.addItem(oid, item)
          toast.success('Agregado', { description: configProduct?.name })
          setConfigProduct(null)
        }}
      />

      {/* Cuenta / cierre */}
      <Dialog open={billOpen} onOpenChange={(o) => { setBillOpen(o); if (!o) setSplitting(false) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Cuenta de la mesa</DialogTitle>
            <DialogDescription>Revisa el consumo, divide o simula el cierre.</DialogDescription>
          </DialogHeader>

          {(() => {
            const hasSplits = (order?.splits?.length ?? 0) > 0
            if (order && (splitting || hasSplits)) {
              return (
                <DemoSplitBill
                  order={order}
                  currency={restaurant.currency}
                  onAllPaid={() => { setBillOpen(false); setSplitting(false); setTableId(null) }}
                />
              )
            }
            return (
              <>
                {order && (
                  <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 text-sm">
                    {order.items.map(i => (
                      <li key={i.id} className="flex justify-between px-3 py-2">
                        <span>{i.qty}× {i.emoji} {i.name}</span>
                        <span className="font-medium">{formatMoney(orderItemTotal(i), restaurant.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
                  <span>Total</span><span>{formatMoney(totals.total, restaurant.currency)}</span>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setSplitting(true)} disabled={!order || order.items.length === 0}>
                    <SplitSquareHorizontal className="h-4 w-4" /> Dividir cuenta
                  </Button>
                  <Button variant="brand" onClick={handleClose}><DollarSign className="h-4 w-4" /> Cerrar cuenta</Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diálogo de configuración de platillo (cantidad, modificadores, nota)
// ---------------------------------------------------------------------------

function ItemConfigDialog({
  product, modifiers, currency, onClose, onAdd,
}: {
  product: DemoProduct | null
  modifiers: import('@/lib/demo/demo-types').DemoModifier[]
  currency: string
  onClose: () => void
  onAdd: (item: {
    productId: string; name: string; emoji: string
    station: DemoProduct['station']; basePrice: number; qty: number
    modifiers: { id: string; name: string; price: number }[]; note: string
    selectedModifiers?: string[]
  }) => void
}) {
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [selectedCustom, setSelectedCustom] = useState<string[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (product) { setQty(1); setSelected([]); setSelectedCustom([]); setNote('') }
  }, [product])

  if (!product) return null

  const applicable = modifiers.filter(m => product.modifierIds.includes(m.id))
  const chosen = applicable.filter(m => selected.includes(m.id))
  const unit = product.price + chosen.reduce((s, m) => s + m.price, 0)

  return (
    <Dialog open={!!product} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.emoji} {product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {applicable.length > 0 && (
            <div className="space-y-1.5">
              <Label>Opciones de Modificadores</Label>
              <div className="flex flex-wrap gap-1.5">
                {applicable.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id])}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      selected.includes(m.id) ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#B03508]' : 'border-stone-200 text-stone-500 hover:bg-stone-50',
                    )}
                  >
                    {m.name}{m.price > 0 ? ` +$${m.price}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.modifiers && product.modifiers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Modificadores (selección múltiple)</Label>
              <div className="flex flex-wrap gap-1.5">
                {product.modifiers.map(mod => {
                  const active = selectedCustom.includes(mod)
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setSelectedCustom(p => p.includes(mod) ? p.filter(x => x !== mod) : [...p, mod])}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 touch-manipulation',
                        active ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#B03508] shadow-sm' : 'border-stone-200 text-stone-500 hover:bg-stone-50',
                      )}
                    >
                      {mod}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note">Nota para cocina</Label>
            <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ej. sin picante, término medio…" />
          </div>

          <div className="flex items-center justify-between">
            <Label>Cantidad</Label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 hover:bg-stone-50">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 hover:bg-stone-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="brand"
            onClick={() => onAdd({
              productId: product.id, name: product.name, emoji: product.emoji,
              station: product.station, basePrice: product.price, qty,
              modifiers: [
                ...chosen.map(m => ({ id: m.id, name: m.name, price: m.price })),
                ...selectedCustom.map(name => ({ id: `c-${name}`, name, price: 0 }))
              ],
              selectedModifiers: selectedCustom,
              note: note.trim(),
            })}
          >
            <Plus className="h-4 w-4" /> Agregar · {formatMoney(unit * qty, currency)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
