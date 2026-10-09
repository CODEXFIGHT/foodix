/**
 * FoodIX — Modo Demo · Panel Admin
 * Dashboard, gestión de menú (productos/categorías), mesas, órdenes y cobro
 * simulado. Todo opera sobre el store demo (localStorage namespaced).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useMemo, useState } from 'react'
import {
  DollarSign, ClipboardList, Armchair, UtensilsCrossed,
  Plus, Pencil, Trash2, FolderPlus, Eye, EyeOff, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { DemoShell } from '@/components/demo/DemoShell'
import { DemoProductDialog } from '@/components/demo/DemoProductDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { useDemoStore, demoActions, computeTotals, formatMoney, orderItemTotal } from '@/lib/demo/demo-store'
import type { DemoProduct, DemoCategory, DemoModifier } from '@/lib/demo/demo-types'
import { POSConfigSelector } from '@/components/pos/POSConfigSelector'
import { PreparationAreaBadge } from '@/components/pos/PreparationAreaBadge'
import { DEMO_ESTABLISHMENT_ID } from '@/lib/pos/posConfig'

export default function DemoAdminPage() {
  return (
    <DemoShell role="admin" title="Panel de administración">
      <AdminContent />
    </DemoShell>
  )
}

function AdminContent() {
  const restaurant = useDemoStore(s => s.restaurant)
  const products = useDemoStore(s => s.products)
  const categories = useDemoStore(s => s.categories)
  const modifiers = useDemoStore(s => s.modifiers)
  const tables = useDemoStore(s => s.tables)
  const orders = useDemoStore(s => s.orders)

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'closed'), [orders])
  const closedToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return orders.filter(o => o.status === 'closed' && (o.closedAt ?? 0) >= start.getTime())
  }, [orders])

  const salesToday = useMemo(
    () => closedToday.reduce((s, o) => s + computeTotals(o, restaurant.taxRate).total, 0),
    [closedToday, restaurant.taxRate],
  )
  const occupied = tables.filter(t => t.status !== 'free').length

  return (
    <div className="space-y-5">
      <Tabs defaultValue="resumen">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="menu">Menú</TabsTrigger>
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes</TabsTrigger>
          <TabsTrigger value="operacion">Operación</TabsTrigger>
        </TabsList>

        {/* RESUMEN ---------------------------------------------------------- */}
        <TabsContent value="resumen" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={DollarSign} label="Ventas de hoy" value={formatMoney(salesToday, restaurant.currency)} accent="text-green-600" />
            <Kpi icon={ClipboardList} label="Órdenes activas" value={String(activeOrders.length)} accent="text-blue-600" />
            <Kpi icon={Armchair} label="Mesas ocupadas" value={`${occupied}/${tables.length}`} accent="text-[#D1400F]" />
            <Kpi icon={UtensilsCrossed} label="Productos" value={String(products.length)} accent="text-purple-600" />
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Productos por categoría</h3>
              <div className="space-y-2">
                {categories.map(c => {
                  const count = products.filter(p => p.categoryId === c.id).length
                  const pct = products.length ? Math.round((count / products.length) * 100) : 0
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-24 sm:w-32 shrink-0 truncate text-xs text-stone-600">{c.emoji} {c.name}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-[#D1400F] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-medium text-stone-500">{count}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPERACIÓN — cantidad de POS (Caliente / Frío) -------------------- */}
        <TabsContent value="operacion" className="pt-4">
          <Card>
            <CardContent className="p-5">
              <POSConfigSelector establishmentId={DEMO_ESTABLISHMENT_ID} demo variant="light" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MENÚ ------------------------------------------------------------- */}
        <TabsContent value="menu" className="pt-4">
          <MenuManager products={products} categories={categories} modifiers={modifiers} />
        </TabsContent>

        {/* MESAS ------------------------------------------------------------ */}
        <TabsContent value="mesas" className="pt-4">
          <TablesManager />
        </TabsContent>

        {/* ÓRDENES ---------------------------------------------------------- */}
        <TabsContent value="ordenes" className="space-y-3 pt-4">
          {activeOrders.length === 0 && (
            <p className="py-10 text-center text-sm text-stone-400">No hay órdenes activas.</p>
          )}
          {activeOrders.map(o => {
            const table = tables.find(t => t.id === o.tableId)
            const totals = computeTotals(o, restaurant.taxRate)
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{table?.label ?? 'Mesa'}</span>
                      <Badge variant={o.status === 'sent' ? 'info' : 'warning'}>
                        {o.status === 'sent' ? 'En cocina' : 'Abierta'}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{formatMoney(totals.total, restaurant.currency)}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-stone-600">
                    {o.items.map(i => (
                      <li key={i.id} className="flex justify-between gap-2">
                        <span>{i.qty}× {i.emoji} {i.name}</span>
                        <span className="text-stone-400">{formatMoney(orderItemTotal(i), restaurant.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: typeof DollarSign; label: string; value: string; accent: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <div className={cn('grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-lg bg-stone-100', accent)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-stone-500 font-medium leading-tight line-clamp-2">{label}</p>
          <p className="truncate text-base sm:text-lg font-bold leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Gestión de menú
// ---------------------------------------------------------------------------

function MenuManager({
  products, categories, modifiers,
}: {
  products: DemoProduct[]
  categories: DemoCategory[]
  modifiers: DemoModifier[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DemoProduct | undefined>(undefined)
  const [catOpen, setCatOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catEmoji, setCatEmoji] = useState('🍴')

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(p: DemoProduct) { setEditing(p); setDialogOpen(true) }

  function handleAddCategory() {
    if (!catName.trim()) return toast.error('Nombre de categoría requerido')
    demoActions.addCategory({ name: catName.trim(), emoji: catEmoji.trim() || '🍴' })
    toast.success('Categoría creada')
    setCatName(''); setCatEmoji('🍴'); setCatOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="brand" size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Nuevo producto</Button>
        <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}><FolderPlus className="h-4 w-4" /> Nueva categoría</Button>
      </div>

      {categories.map(c => {
        const items = products.filter(p => p.categoryId === c.id)
        return (
          <div key={c.id}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
              <span>{c.emoji} {c.name}</span>
              <span className="text-xs font-normal text-stone-400">({items.length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(p => (
                <div key={p.id} className={cn('flex items-start gap-3 rounded-xl border bg-white p-3 transition-colors', p.available ? 'border-stone-200' : 'border-stone-200 opacity-60')}>
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="line-clamp-1 text-xs text-stone-500">{p.description || '—'}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-bold text-[#D1400F]">{formatMoney(p.price)}</p>
                      <PreparationAreaBadge area={p.station} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => demoActions.toggleProductAvailable(p.id)} title={p.available ? 'Ocultar' : 'Mostrar'} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                      {p.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(p)} title="Editar" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { demoActions.deleteProduct(p.id); toast.success('Producto eliminado') }} title="Eliminar" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-stone-400">Sin productos en esta categoría.</p>}
            </div>
          </div>
        )
      })}

      <DemoProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} categories={categories} modifiers={modifiers} />

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>Agrupa productos en tu carta demo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-emoji">Ícono</Label>
              <Input id="c-emoji" value={catEmoji} onChange={e => setCatEmoji(e.target.value)} className="text-center text-lg" maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nombre</Label>
              <Input id="c-name" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ej. Especiales" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatOpen(false)}>Cancelar</Button>
            <Button variant="brand" onClick={handleAddCategory}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mesas + cobro simulado
// ---------------------------------------------------------------------------

function TablesManager() {
  const tables = useDemoStore(s => s.tables)
  const orders = useDemoStore(s => s.orders)
  const restaurant = useDemoStore(s => s.restaurant)
  const [billTableId, setBillTableId] = useState<string | null>(null)

  const billTable = tables.find(t => t.id === billTableId)
  const billOrder = orders.find(o => o.tableId === billTableId && o.status !== 'closed')
  const totals = computeTotals(billOrder, restaurant.taxRate)

  function handleCharge() {
    if (billOrder) {
      demoActions.closeOrder(billOrder.id)
      toast.success('Cobro simulado', { description: `${billTable?.label}: ${formatMoney(totals.total, restaurant.currency)}` })
    }
    setBillTableId(null)
  }

  const statusStyle: Record<string, string> = {
    free: 'border-stone-200 bg-white',
    occupied: 'border-[#D1400F]/40 bg-[#D1400F]/5',
    billing: 'border-amber-400 bg-amber-50',
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map(t => {
          const order = orders.find(o => o.tableId === t.id && o.status !== 'closed')
          const tot = computeTotals(order, restaurant.taxRate)
          return (
            <button
              key={t.id}
              onClick={() => setBillTableId(t.id)}
              className={cn('rounded-xl border p-3 text-left transition-all hover:shadow-md active:scale-[0.98]', statusStyle[t.status])}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.label}</span>
                <Badge variant={t.status === 'free' ? 'muted' : t.status === 'billing' ? 'warning' : 'orange'}>
                  {t.status === 'free' ? 'Libre' : t.status === 'billing' ? 'Cobro' : 'Ocupada'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-500">{t.zone} · {t.seats} pers.</p>
              {order && <p className="mt-1 text-sm font-bold text-[#D1400F]">{formatMoney(tot.total, restaurant.currency)}</p>}
            </button>
          )
        })}
      </div>

      <Dialog open={!!billTableId} onOpenChange={v => !v && setBillTableId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Cuenta · {billTable?.label}</DialogTitle>
            <DialogDescription>{billTable?.zone} · {billTable?.seats} personas</DialogDescription>
          </DialogHeader>

          {billOrder ? (
            <div className="space-y-3">
              <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
                {billOrder.items.map(i => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{i.qty}× {i.emoji} {i.name}</span>
                    <span className="font-medium">{formatMoney(orderItemTotal(i), restaurant.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 text-sm">
                <Row label="Subtotal" value={formatMoney(totals.subtotal, restaurant.currency)} />
                <Row label={`IVA (${Math.round(restaurant.taxRate * 100)}%)`} value={formatMoney(totals.tax, restaurant.currency)} />
                <Row label="Total" value={formatMoney(totals.total, restaurant.currency)} bold />
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">Esta mesa no tiene consumo activo.</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBillTableId(null)}>Cerrar</Button>
            <Button variant="brand" onClick={handleCharge} disabled={!billOrder}>
              <DollarSign className="h-4 w-4" /> Simular cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex justify-between', bold && 'border-t border-stone-200 pt-1.5 text-base font-bold')}>
      <span className={bold ? '' : 'text-stone-500'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
