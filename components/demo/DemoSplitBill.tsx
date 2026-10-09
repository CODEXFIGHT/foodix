/**
 * FoodIX — Modo Demo · Dividir Cuenta
 * Planificador y cobro de cuenta dividida en el panel mesero del demo.
 * Todo se simula sobre el store demo (localStorage); no toca datos reales.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Users, ShoppingBag, Calculator, UserRound, Plus, Minus, Trash2, Check, DollarSign, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { demoActions, formatMoney, orderItemTotal } from '@/lib/demo/demo-store'
import { splitEvenly, roundMoney, defaultSplitLabel } from '@/lib/pos/splitBill'
import type { DemoOrder, DemoSplitMode } from '@/lib/demo/demo-types'

const MODES: { value: DemoSplitMode; label: string; icon: typeof Users }[] = [
  { value: 'people', label: 'Personas', icon: Users },
  { value: 'items', label: 'Productos', icon: ShoppingBag },
  { value: 'amount', label: 'Monto', icon: Calculator },
  { value: 'guest', label: 'Comensal', icon: UserRound },
]

interface ItemGroup { label: string; alloc: Record<string, number> }

export function DemoSplitBill({ order, currency, onAllPaid }: {
  order: DemoOrder
  currency: string
  onAllPaid: () => void
}) {
  const total = roundMoney(order.items.reduce((s, i) => s + orderItemTotal(i), 0))
  const splits = order.splits ?? []

  // ── Fase de cobro: ya hay un plan creado ──────────────────────────────────
  if (splits.length > 0) {
    const paid = splits.filter(s => s.status === 'paid').length
    const percent = Math.round((paid / splits.length) * 100)
    const anyPaid = paid > 0
    const allPaid = paid === splits.length

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Cuenta dividida</span>
          <span className="text-stone-500">{paid}/{splits.length} cobradas</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div className={cn('h-full rounded-full transition-all', allPaid ? 'bg-green-500' : 'bg-[#D1400F]')} style={{ width: `${percent}%` }} />
        </div>

        <div className="space-y-2">
          {splits.map(s => (
            <div key={s.id} className={cn('flex items-center gap-2 rounded-lg border p-2.5', s.status === 'paid' ? 'border-green-200 bg-green-50/60' : 'border-stone-200')}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
              <span className="text-sm font-semibold">{formatMoney(s.total, currency)}</span>
              {s.status === 'paid' ? (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"><Check className="h-3.5 w-3.5" /> Pagado</span>
              ) : (
                <Button size="sm" variant="brand" onClick={() => {
                  demoActions.paySplit(order.id, s.id)
                  const willCloseAll = splits.filter(x => x.status === 'pending').length === 1
                  toast.success(willCloseAll ? 'Cuenta cerrada' : `Cobrado: ${s.label}`)
                  if (willCloseAll) onAllPaid()
                }}>
                  <DollarSign className="h-4 w-4" /> Cobrar
                </Button>
              )}
            </div>
          ))}
        </div>

        {!anyPaid && (
          <button onClick={() => demoActions.clearOrderSplits(order.id)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" /> Deshacer división
          </button>
        )}
      </div>
    )
  }

  // ── Fase de planificación ─────────────────────────────────────────────────
  return <DemoSplitPlanner order={order} total={total} currency={currency} />
}

function DemoSplitPlanner({ order, total, currency }: { order: DemoOrder; total: number; currency: string }) {
  const [mode, setMode] = useState<DemoSplitMode>('people')
  const [people, setPeople] = useState(2)
  const [amountRows, setAmountRows] = useState([
    { label: defaultSplitLabel(0), amount: '' },
    { label: defaultSplitLabel(1), amount: '' },
  ])
  const [groups, setGroups] = useState<ItemGroup[]>([
    { label: defaultSplitLabel(0), alloc: {} },
    { label: defaultSplitLabel(1), alloc: {} },
  ])
  const [active, setActive] = useState(0)

  const unit = (itemId: string) => {
    const it = order.items.find(i => i.id === itemId)
    return it && it.qty > 0 ? orderItemTotal(it) / it.qty : 0
  }
  const usedFor = (itemId: string) => groups.reduce((s, g) => s + (g.alloc[itemId] ?? 0), 0)
  const groupTotal = (g: ItemGroup) => roundMoney(Object.entries(g.alloc).reduce((s, [id, q]) => s + unit(id) * q, 0))

  const drafts = useMemo(() => {
    if (mode === 'people') return splitEvenly(total, Math.max(2, people)).map((amt, i) => ({ label: defaultSplitLabel(i), total: amt, items: [] as { itemId: string; quantity: number }[] }))
    if (mode === 'amount') return amountRows.map(r => ({ label: r.label.trim() || 'División', total: roundMoney(parseFloat(r.amount) || 0), items: [] as { itemId: string; quantity: number }[] }))
    return groups.map(g => ({
      label: g.label,
      total: groupTotal(g),
      items: Object.entries(g.alloc).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity })),
    }))
  }, [mode, total, people, amountRows, groups]) // eslint-disable-line react-hooks/exhaustive-deps

  const sum = roundMoney(drafts.reduce((s, d) => s + d.total, 0))
  const cuadra = Math.abs(sum - total) <= 0.05 && drafts.every(d => d.total > 0)
  const fullyAssigned = mode === 'people' || mode === 'amount' ||
    order.items.every(it => usedFor(it.id) === it.qty)
  const canSplit = drafts.length >= 2 && cuadra && fullyAssigned

  const assign = (itemId: string, delta: number, qty: number) => {
    setGroups(prev => prev.map((g, idx) => {
      if (idx !== active) return g
      const cur = g.alloc[itemId] ?? 0
      const used = prev.reduce((s, gg) => s + (gg.alloc[itemId] ?? 0), 0)
      const next = Math.min(cur + (qty - used), Math.max(0, cur + delta))
      return { ...g, alloc: { ...g.alloc, [itemId]: next } }
    }))
  }

  const handleSplit = () => {
    if (!canSplit) { toast.error('La suma de las divisiones debe igualar el total'); return }
    demoActions.setOrderSplits(order.id, mode, drafts)
    toast.success(`Cuenta dividida en ${drafts.length} partes`)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {MODES.map(m => {
          const Icon = m.icon
          return (
            <button key={m.value} onClick={() => setMode(m.value)}
              className={cn('flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[11px] font-medium transition-all',
                mode === m.value ? 'border-[#D1400F] bg-[#D1400F]/5 text-[#D1400F]' : 'border-stone-200 text-stone-500')}>
              <Icon className="h-4 w-4" /> {m.label}
            </button>
          )
        })}
      </div>

      {mode === 'people' && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setPeople(p => Math.max(2, p - 1))} className="grid h-10 w-10 place-items-center rounded-full border"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center text-2xl font-bold">{people}</span>
            <button onClick={() => setPeople(p => Math.min(20, p + 1))} className="grid h-10 w-10 place-items-center rounded-full border"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {splitEvenly(total, people).map((amt, i) => (
              <div key={i} className="flex justify-between rounded-lg border px-3 py-1.5 text-sm"><span className="text-stone-500">{defaultSplitLabel(i)}</span><span className="font-semibold">{formatMoney(amt, currency)}</span></div>
            ))}
          </div>
        </div>
      )}

      {mode === 'amount' && (
        <div className="space-y-2">
          {amountRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" value={row.label} onChange={e => setAmountRows(p => p.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r))} />
              <Input type="number" inputMode="decimal" className="w-24" value={row.amount} placeholder="0.00"
                onChange={e => setAmountRows(p => p.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))} />
              {amountRows.length > 2 && (
                <button onClick={() => setAmountRows(p => p.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => setAmountRows(p => [...p, { label: defaultSplitLabel(p.length), amount: '' }])}>
            <Plus className="h-3.5 w-3.5" /> Agregar división
          </Button>
        </div>
      )}

      {(mode === 'items' || mode === 'guest') && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={cn('rounded-full border-2 px-3 py-1 text-xs font-semibold', active === i ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#B03508]' : 'border-stone-200 text-stone-500')}>
                {g.label} · {formatMoney(groupTotal(g), currency)}
              </button>
            ))}
            <button onClick={() => { setGroups(p => [...p, { label: defaultSplitLabel(p.length), alloc: {} }]); setActive(groups.length) }}
              className="rounded-full border-2 border-dashed px-2 py-1 text-xs text-stone-400"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {order.items.map(it => {
              const free = it.qty - usedFor(it.id)
              const inActive = groups[active]?.alloc[it.id] ?? 0
              return (
                <div key={it.id} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.emoji} {it.name}</p>
                    <p className="text-xs text-stone-400">{free > 0 ? `${free} sin asignar` : 'asignado'}</p>
                  </div>
                  <button onClick={() => assign(it.id, -1, it.qty)} disabled={inActive === 0} className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-5 text-center text-sm font-semibold">{inActive}</span>
                  <button onClick={() => assign(it.id, 1, it.qty)} disabled={free === 0} className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={cn('flex items-center justify-between rounded-lg p-2.5 text-sm', canSplit ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-500')}>
        <span>{drafts.length} divisiones · {formatMoney(sum, currency)}</span>
        {canSplit ? <span className="flex items-center gap-1 font-semibold"><Check className="h-4 w-4" /> Cuadra</span> : <span>de {formatMoney(total, currency)}</span>}
      </div>

      <Button variant="brand" className="w-full" onClick={handleSplit} disabled={!canSplit}>Dividir cuenta</Button>
    </div>
  )
}
