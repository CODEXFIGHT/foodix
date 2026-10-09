'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import type { ModifierGroup, ChosenModifier, Product } from '@/lib/types'

interface ModifierDialogProps {
  product: Product | null
  groups: ModifierGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    modifiers: ChosenModifier[],
    notes: string,
    extraPrice: number,
    selectedModifiers?: string[]
  ) => void
}

export function ModifierDialog({
  product,
  groups,
  open,
  onOpenChange,
  onConfirm,
}: ModifierDialogProps) {
  // selección: { [groupId]: Set<optionIndex> }
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [notes, setNotes] = useState('')
  const [selectedCustom, setSelectedCustom] = useState<string[]>([])

  // Reinicia el estado cada vez que se abre con un producto.
  const groupsKey = groups.map(g => g.id).join(',')
  useMemo(() => {
    if (open) {
      setSelected({})
      setNotes('')
      setSelectedCustom([])
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

  const handleConfirm = () => {
    // Valida requeridos y mínimos.
    for (const g of groups) {
      const count = (selected[g.id] ?? []).length
      if (g.required && count === 0) {
        toast.error(`Selecciona una opción en "${g.name}"`)
        return
      }
      if (count < g.min_select) {
        toast.error(`Elige al menos ${g.min_select} en "${g.name}"`)
        return
      }
    }
    onConfirm(chosen, notes.trim(), extraPrice, selectedCustom)
    onOpenChange(false)
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">
                  {group.name}
                  {group.required && <span className="text-destructive ml-1">*</span>}
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
                        'flex items-center justify-between gap-2 p-2.5 border-2 rounded-lg text-left text-sm transition-all',
                        active ? 'border-[#D1400F] bg-[#D1400F]/5' : 'hover:border-primary/40',
                      )}
                    >
                      <span className="truncate">{opt.name}</span>
                      {opt.price_delta !== 0 && (
                        <span className={cn('text-xs font-medium shrink-0', opt.price_delta > 0 ? 'text-muted-foreground' : 'text-green-600')}>
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
              <Label className="font-semibold text-sm">Modificadores (selección múltiple)</Label>
              <div className="flex flex-wrap gap-1.5">
                {product.modifiers.map(mod => {
                  const active = selectedCustom.includes(mod)
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => {
                        setSelectedCustom(prev =>
                          prev.includes(mod) ? prev.filter(x => x !== mod) : [...prev, mod]
                        )
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 touch-manipulation',
                        active
                          ? 'border-[#D1400F] bg-[#D1400F] text-white shadow-sm'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
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
            <Label className="text-xs">Notas para cocina (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. sin cebolla, término medio…"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full bg-[#D1400F] hover:bg-[#B03508]">
            Agregar — {formatCurrency(product.price + extraPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
