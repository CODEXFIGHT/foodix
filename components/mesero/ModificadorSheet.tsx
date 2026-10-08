'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Selector de modificadores INLINE (bottom-sheet), abierto por long-press
 * sobre un producto. Misma validación de min/max/obligatorio que el modal de
 * escritorio (ver components/orders/ModifierDialog.tsx), en formato táctil.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { describeConfig, type LastLineConfig } from '@/lib/utils/lastLineConfig'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import type { ModifierGroup, ChosenModifier, Product } from '@/lib/types'

export interface ModificadorSheetConfirmInput {
  modifiers: ChosenModifier[]
  selectedModifiers: string[]
  notes: string
  quantity: number
  unitPrice: number
}

interface ModificadorSheetProps {
  product: Product | null
  groups: ModifierGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: ModificadorSheetConfirmInput) => void
  /** Última configuración usada para este producto en el dispositivo, si la hay. */
  lastConfig?: LastLineConfig | null
}

export function ModificadorSheet({ product, groups, open, onOpenChange, onConfirm, lastConfig }: ModificadorSheetProps) {
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [selectedCustom, setSelectedCustom] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)

  const groupsKey = groups.map(g => g.id).join(',')
  useMemo(() => {
    if (open) {
      setSelected({})
      setSelectedCustom([])
      setNotes('')
      setQty(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id, groupsKey])

  const toggle = (group: ModifierGroup, optIndex: number) => {
    setSelected(prev => {
      const current = prev[group.id] ?? []
      const has = current.includes(optIndex)
      let next: number[]
      if (group.max_select <= 1) {
        next = has ? [] : [optIndex]
      } else if (has) {
        next = current.filter(i => i !== optIndex)
      } else {
        if (current.length >= group.max_select) {
          toast.error(`Máximo ${group.max_select} en "${group.name}"`)
          return prev
        }
        next = [...current, optIndex]
      }
      return { ...prev, [group.id]: next }
    })
  }

  /**
   * Precarga la última configuración usada para este producto. Solo selecciona,
   * no confirma: el mesero ve lo que quedó marcado y aún puede ajustarlo, y las
   * validaciones de min/max siguen corriendo al agregar.
   */
  const applyLastConfig = () => {
    if (!lastConfig) return
    const savedNames = new Set(lastConfig.modifiers.map(m => m.name))
    const next: Record<number, number[]> = {}

    for (const g of groups) {
      const limit = g.max_select > 0 ? g.max_select : 1
      const indexes = g.options
        .map((opt, idx) => (savedNames.has(opt.name) ? idx : -1))
        .filter(idx => idx >= 0)
        .slice(0, limit)
      if (indexes.length > 0) next[g.id] = indexes
    }

    setSelected(next)
    // Los extras sueltos pueden haber cambiado en el catálogo desde entonces.
    setSelectedCustom(lastConfig.selectedModifiers.filter(m => product?.modifiers?.includes(m)))
    setNotes(lastConfig.notes)
  }

  const { chosen, extraPrice } = useMemo(() => {
    const list: ChosenModifier[] = []
    let extra = 0
    for (const g of groups) {
      for (const idx of selected[g.id] ?? []) {
        const opt = g.options[idx]
        if (opt) {
          list.push({ name: opt.name, price_delta: opt.price_delta })
          extra += opt.price_delta
        }
      }
    }
    return { chosen: list, extraPrice: extra }
  }, [groups, selected])

  if (!product) return null
  const unitPrice = product.price + extraPrice
  const lastConfigLabel = lastConfig ? describeConfig(lastConfig) : ''

  const handleConfirm = () => {
    for (const g of groups) {
      const count = (selected[g.id] ?? []).length
      if (g.required && count === 0) { toast.error(`Selecciona una opción en "${g.name}"`); return }
      if (count < g.min_select) { toast.error(`Elige al menos ${g.min_select} en "${g.name}"`); return }
    }
    onConfirm({ modifiers: chosen, selectedModifiers: selectedCustom, notes: notes.trim(), quantity: qty, unitPrice })
    onOpenChange(false)
  }

  return (
    <BottomSheet open={open} onClose={() => onOpenChange(false)}>
      <h2 className="pr-8 text-base font-bold">
        {product.emoji ? `${product.emoji} ` : ''}{product.name}
      </h2>
      {product.description && <p className="mt-0.5 text-sm text-muted-foreground">{product.description}</p>}

      {lastConfigLabel && (
        <button
          type="button"
          onClick={applyLastConfig}
          className="mt-3 flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-[#E85D04]/30 bg-[#E85D04]/5 px-3 py-2 text-left transition-colors active:scale-[0.99] touch-manipulation"
        >
          <RotateCcw className="h-4 w-4 shrink-0 text-[#E85D04]" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[#E85D04]">Repetir última</span>
            <span className="block truncate text-xs text-muted-foreground">{lastConfigLabel}</span>
          </span>
        </button>
      )}

      <div className="mt-4 space-y-4">
        {groups.map(group => (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">
                {group.name}
                {group.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              <span className="text-xs text-muted-foreground">
                {group.max_select <= 1 ? 'Elige 1' : `Hasta ${group.max_select}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.options.map((opt, idx) => {
                const active = (selected[group.id] ?? []).includes(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggle(group, idx)}
                    className={cn(
                      'flex min-h-[44px] items-center justify-between gap-2 rounded-lg border-2 p-2.5 text-left text-sm transition-all touch-manipulation',
                      active ? 'border-[#E85D04] bg-[#E85D04]/5' : 'border-transparent bg-muted/40 hover:border-primary/40',
                    )}
                  >
                    <span className="truncate">{opt.name}</span>
                    {opt.price_delta !== 0 && (
                      <span className={cn('shrink-0 text-xs font-medium', opt.price_delta > 0 ? 'text-muted-foreground' : 'text-green-600')}>
                        {opt.price_delta > 0 ? '+' : ''}{formatCurrency(opt.price_delta)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {product.modifiers && product.modifiers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Modificadores (selección múltiple)</Label>
            <div className="flex flex-wrap gap-1.5">
              {product.modifiers.map(mod => {
                const active = selectedCustom.includes(mod)
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setSelectedCustom(prev => prev.includes(mod) ? prev.filter(x => x !== mod) : [...prev, mod])}
                    className={cn(
                      'min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 touch-manipulation',
                      active
                        ? 'border-[#E85D04] bg-[#E85D04] text-white shadow-sm'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900',
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
          <Label className="text-xs">Nota para cocina (opcional)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ej. sin cebolla, término medio…"
            rows={2}
            maxLength={200}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Cantidad</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-900"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => q + 1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-900"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background px-4 pt-3">
        <Button variant="brand" className="h-12 w-full text-base" onClick={handleConfirm}>
          Agregar · {formatCurrency(unitPrice * qty)}
        </Button>
      </div>
    </BottomSheet>
  )
}
