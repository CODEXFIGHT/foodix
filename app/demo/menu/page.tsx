/**
 * FoodIX — Modo Demo · Carta Digital
 * Menú para el cliente: navegación por categorías, detalle de producto y
 * simulación de "agregar a una mesa" demo. Experiencia visual premium.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useMemo, useRef, useState } from 'react'
import { Plus, Sparkles, Flame, Snowflake, X } from 'lucide-react'
import { toast } from 'sonner'
import { DemoShell } from '@/components/demo/DemoShell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { useDemoStore, demoActions, formatMoney } from '@/lib/demo/demo-store'
import { getDemoUser } from '@/lib/demo/demo-seed'
import type { DemoProduct } from '@/lib/demo/demo-types'

const CLIENT_WAITER = getDemoUser('menu').name

export default function DemoMenuPage() {
  return (
    <DemoShell role="menu" title="Carta digital" fullBleed>
      <MenuContent />
    </DemoShell>
  )
}

function MenuContent() {
  const restaurant = useDemoStore(s => s.restaurant)
  const categories = useDemoStore(s => s.categories)
  const products = useDemoStore(s => s.products)
  const tables = useDemoStore(s => s.tables)

  const [active, setActive] = useState<string | null>(null)
  const [detail, setDetail] = useState<DemoProduct | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const available = useMemo(() => products.filter(p => p.available), [products])
  const sortedCats = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories])

  function scrollTo(id: string) {
    setActive(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-stone-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#1C1917] px-5 py-10 text-center text-white">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[#D1400F]/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[#F5A623]/20 blur-3xl" aria-hidden />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F5A623]">
          <Sparkles className="h-3.5 w-3.5" /> Menú digital
        </span>
        <h1 className="mt-3 font-heading text-3xl font-bold">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-white/70">{restaurant.tagline}</p>
      </div>

      {/* Nav categorías */}
      <div className="sticky top-14 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-thin">
          {sortedCats.map(c => (
            <button
              key={c.id}
              onClick={() => scrollTo(c.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                active === c.id ? 'border-[#D1400F] bg-[#D1400F] text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-[#D1400F]/40',
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        {sortedCats.map(c => {
          const items = available.filter(p => p.categoryId === c.id)
          if (items.length === 0) return null
          return (
            <section
              key={c.id}
              ref={el => { sectionRefs.current[c.id] = el }}
              className="scroll-mt-32 animate-carta-section"
            >
              <h2 className="mb-3 font-heading text-xl font-bold text-stone-800">{c.emoji} {c.name}</h2>
              <div className="space-y-3">
                {items.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDetail(p)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                  >
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-stone-100 text-3xl transition-transform group-hover:scale-110">
                      {p.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-900">{p.name}</p>
                      <p className="line-clamp-2 text-sm text-stone-500">{p.description}</p>
                      <p className="mt-1 font-bold text-[#D1400F]">{formatMoney(p.price, restaurant.currency)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <ProductDetail
        product={detail}
        tables={tables}
        currency={restaurant.currency}
        onClose={() => setDetail(null)}
        onAddToTable={(tableId) => {
          if (!detail) return
          const oid = demoActions.getOrCreateOrder(tableId, CLIENT_WAITER)
          demoActions.addItem(oid, {
            productId: detail.id, name: detail.name, emoji: detail.emoji,
            station: detail.station, basePrice: detail.price, qty: 1, modifiers: [], note: '',
          })
          const table = tables.find(t => t.id === tableId)
          toast.success('Agregado a la mesa', { description: `${detail.name} → ${table?.label}` })
          setDetail(null)
        }}
      />
    </div>
  )
}

function ProductDetail({
  product, tables, currency, onClose, onAddToTable,
}: {
  product: DemoProduct | null
  tables: import('@/lib/demo/demo-types').DemoTable[]
  currency: string
  onClose: () => void
  onAddToTable: (tableId: string) => void
}) {
  const [tableId, setTableId] = useState('')
  if (!product) return null
  const StationIcon = product.station === 'hot' ? Flame : Snowflake

  return (
    <Dialog open={!!product} onOpenChange={v => !v && onClose()}>
      <DialogContent className="overflow-hidden p-0">
        <div className="relative grid h-40 place-items-center bg-gradient-to-br from-[#D1400F] to-[#F5A623] text-7xl">
          {product.emoji}
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white hover:bg-black/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>{product.name}</span>
              <span className="text-[#D1400F]">{formatMoney(product.price, currency)}</span>
            </DialogTitle>
            <DialogDescription>{product.description}</DialogDescription>
          </DialogHeader>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
            <StationIcon className="h-3.5 w-3.5" />
            {product.station === 'hot' ? 'Cocina caliente' : 'Cocina fría'}
          </span>

          <div className="space-y-1.5 border-t border-stone-100 pt-3">
            <Label htmlFor="tableSel">Simular: agregar a una mesa</Label>
            <select
              id="tableSel"
              value={tableId}
              onChange={e => setTableId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecciona una mesa…</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.label} · {t.zone}</option>
              ))}
            </select>
            <Button
              variant="brand"
              className="w-full"
              disabled={!tableId}
              onClick={() => onAddToTable(tableId)}
            >
              <Plus className="h-4 w-4" /> Agregar a la mesa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
