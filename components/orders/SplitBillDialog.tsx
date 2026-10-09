'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Users, ShoppingBag, Calculator, UserRound, Plus, Minus, Trash2, Check } from 'lucide-react'
import { useCreateSplits } from '@/lib/api/queries'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  splittableItems, lineUnit, buildPeopleSplits, buildItemSplits,
  validateSplitPlan, splitEvenly, defaultSplitLabel, roundMoney,
  type SplitDraft,
} from '@/lib/pos/splitBill'
import type { Order, SplitMode } from '@/lib/types'

interface SplitBillDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODES: { value: SplitMode; label: string; icon: typeof Users; hint: string }[] = [
  { value: 'people', label: 'Personas', icon: Users, hint: 'Dividir en partes iguales' },
  { value: 'items', label: 'Productos', icon: ShoppingBag, hint: 'Asignar cada producto' },
  { value: 'amount', label: 'Monto', icon: Calculator, hint: 'Montos personalizados' },
  { value: 'guest', label: 'Comensal', icon: UserRound, hint: 'Una cuenta por comensal' },
]

interface ItemGroup { label: string; alloc: Record<number, number> }

export function SplitBillDialog({ order, open, onOpenChange }: SplitBillDialogProps) {
  const createSplits = useCreateSplits()
  const items = useMemo(() => splittableItems(order.items), [order.items])
  const total = roundMoney(order.total)

  const [mode, setMode] = useState<SplitMode>('people')

  // Modo "personas" / base para "monto" igual.
  const [people, setPeople] = useState(2)

  // Modo "monto": filas con etiqueta + monto manual.
  const [amountRows, setAmountRows] = useState<{ label: string; amount: string }[]>([])

  // Modos "productos"/"comensal": grupos con asignación de cantidades.
  const [groups, setGroups] = useState<ItemGroup[]>([])
  const [activeGroup, setActiveGroup] = useState(0)

  // Reinicia el editor cada vez que se abre.
  useEffect(() => {
    if (!open) return
    setMode('people')
    setPeople(2)
    setAmountRows([
      { label: defaultSplitLabel(0), amount: '' },
      { label: defaultSplitLabel(1), amount: '' },
    ])
    setGroups([
      { label: defaultSplitLabel(0), alloc: {} },
      { label: defaultSplitLabel(1), alloc: {} },
    ])
    setActiveGroup(0)
  }, [open])

  // ── Cálculo de los borradores según el modo activo ─────────────────────────
  const drafts: SplitDraft[] = useMemo(() => {
    if (mode === 'people') return buildPeopleSplits(total, Math.max(2, people))
    if (mode === 'amount') {
      return amountRows.map(r => ({ label: r.label.trim() || 'División', total: roundMoney(parseFloat(r.amount) || 0), items: [] }))
    }
    // items / guest
    return buildItemSplits(
      groups.map(g => ({ label: g.label, alloc: new Map(Object.entries(g.alloc).map(([k, v]) => [Number(k), v])) })),
      items,
    )
  }, [mode, total, people, amountRows, groups, items])

  const validation = useMemo(() => validateSplitPlan(drafts, total, mode, items), [drafts, total, mode, items])
  const sum = useMemo(() => roundMoney(drafts.reduce((s, d) => s + d.total, 0)), [drafts])
  const remaining = roundMoney(total - sum)

  // ── Helpers modo monto ─────────────────────────────────────────────────────
  const addAmountRow = () =>
    setAmountRows(prev => [...prev, { label: defaultSplitLabel(prev.length), amount: '' }])
  const splitRest = (i: number) => {
    // Reparte el restante a la fila i.
    const others = amountRows.reduce((s, r, idx) => idx === i ? s : s + (parseFloat(r.amount) || 0), 0)
    const rest = Math.max(0, roundMoney(total - others))
    setAmountRows(prev => prev.map((r, idx) => idx === i ? { ...r, amount: rest.toFixed(2) } : r))
  }

  // ── Helpers modo productos/comensal ────────────────────────────────────────
  const usedFor = (itemId: number) => groups.reduce((s, g) => s + (g.alloc[itemId] ?? 0), 0)
  const assign = (itemId: number, delta: number, qty: number) => {
    setGroups(prev => prev.map((g, idx) => {
      if (idx !== activeGroup) return g
      const cur = g.alloc[itemId] ?? 0
      const used = prev.reduce((s, gg) => s + (gg.alloc[itemId] ?? 0), 0)
      const max = cur + (qty - used) // lo que ya tiene + lo que queda libre
      const next = Math.min(max, Math.max(0, cur + delta))
      return { ...g, alloc: { ...g.alloc, [itemId]: next } }
    }))
  }
  const addGroup = () => {
    setGroups(prev => [...prev, { label: defaultSplitLabel(prev.length), alloc: {} }])
    setActiveGroup(groups.length)
  }
  const removeGroup = (i: number) => {
    if (groups.length <= 2) return
    setGroups(prev => prev.filter((_, idx) => idx !== i))
    setActiveGroup(0)
  }

  const handleConfirm = async () => {
    if (!validation.ok) { toast.error(validation.message ?? 'Plan de división inválido'); return }
    try {
      await createSplits.mutateAsync({
        orderId: order.id,
        mode,
        splits: drafts.map(d => ({ label: d.label, total: d.total, items: d.items })),
      })
      toast.success(`Cuenta dividida en ${drafts.length} partes`)
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo dividir la cuenta'
      toast.error(msg)
    }
  }

  const ModeIcon = MODES.find(m => m.value === mode)?.icon ?? Users

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ModeIcon className="h-5 w-5 text-yellow-700 dark:text-yellow-400" /> Dividir cuenta
          </DialogTitle>
          <DialogDescription>
            Total a dividir: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Selector de modo */}
        <div className="grid grid-cols-4 gap-1.5">
          {MODES.map(m => {
            const Icon = m.icon
            const active = mode === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-[11px] font-medium transition-all',
                  active ? 'border-[#EAB308] bg-[#FACC15]/5 text-yellow-700 dark:text-yellow-400' : 'hover:border-primary/40 text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                {m.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          {/* ── Por personas ── */}
          {mode === 'people' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">¿Entre cuántas personas se divide?</p>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setPeople(p => Math.max(2, p - 1))}
                  className="grid h-11 w-11 place-items-center rounded-full border hover:bg-muted" aria-label="Menos personas">
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-12 text-center text-3xl font-bold tabular-nums">{people}</span>
                <button onClick={() => setPeople(p => Math.min(20, p + 1))}
                  className="grid h-11 w-11 place-items-center rounded-full border hover:bg-muted" aria-label="Más personas">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {splitEvenly(total, people).map((amt, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{defaultSplitLabel(i)}</span>
                    <span className="font-semibold">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Por monto ── */}
          {mode === 'amount' && (
            <div className="space-y-2">
              {amountRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={row.label}
                    onChange={e => setAmountRows(prev => prev.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r))}
                    placeholder={`Cliente ${i + 1}`}
                  />
                  <Input
                    type="number" inputMode="decimal" className="w-28"
                    value={row.amount}
                    onChange={e => setAmountRows(prev => prev.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))}
                    placeholder="0.00"
                  />
                  <button onClick={() => splitRest(i)} title="Asignar el restante"
                    className="shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    Resto
                  </button>
                  {amountRows.length > 2 && (
                    <button onClick={() => setAmountRows(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive" aria-label="Quitar división">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAmountRow} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar división
              </Button>
            </div>
          )}

          {/* ── Por productos / comensal ── */}
          {(mode === 'items' || mode === 'guest') && (
            <div className="space-y-3">
              {/* Pestañas de grupo */}
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveGroup(i)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all',
                      activeGroup === i ? 'border-[#EAB308] bg-[#FACC15]/10 text-yellow-800 dark:text-yellow-400' : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {g.label}
                    <span className="rounded-full bg-background/70 px-1.5 text-[10px]">{formatCurrency(drafts[i]?.total ?? 0)}</span>
                    {groups.length > 2 && (
                      <Trash2 className="h-3 w-3 opacity-50 hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); removeGroup(i) }} />
                    )}
                  </button>
                ))}
                <button onClick={addGroup}
                  className="rounded-full border-2 border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted" aria-label="Agregar comensal">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Asignando a <span className="font-semibold text-yellow-800 dark:text-yellow-400">{groups[activeGroup]?.label}</span>. Toca + en cada producto.
              </p>

              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {items.map(it => {
                  const used = usedFor(it.id)
                  const free = it.quantity - used
                  const inActive = groups[activeGroup]?.alloc[it.id] ?? 0
                  return (
                    <div key={it.id} className={cn(
                      'flex items-center gap-2 rounded-lg border p-2.5',
                      free === 0 ? 'bg-muted/40' : '',
                    )}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(lineUnit(it))} c/u · {free > 0 ? `${free} sin asignar` : 'asignado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => assign(it.id, -1, it.quantity)} disabled={inActive === 0}
                          className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-30 hover:bg-muted" aria-label="Quitar uno">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{inActive}</span>
                        <button onClick={() => assign(it.id, 1, it.quantity)} disabled={free === 0}
                          className="grid h-7 w-7 place-items-center rounded-full border disabled:opacity-30 hover:bg-muted" aria-label="Agregar uno">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resumen del reparto */}
        <div className={cn(
          'rounded-lg p-3 text-sm flex items-center justify-between',
          validation.ok ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground',
        )}>
          <span>{drafts.length} divisiones · suma {formatCurrency(sum)}</span>
          {Math.abs(remaining) > 0.05
            ? <span className="font-semibold">{remaining > 0 ? `Falta ${formatCurrency(remaining)}` : `Sobra ${formatCurrency(-remaining)}`}</span>
            : <span className="flex items-center gap-1 font-semibold"><Check className="h-4 w-4" /> Cuadra</span>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.ok || createSplits.isPending}
            className="flex-1 bg-[#FACC15] hover:bg-[#EAB308]"
          >
            {createSplits.isPending ? 'Dividiendo…' : 'Dividir cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
