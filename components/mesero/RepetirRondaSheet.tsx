'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Bottom-sheet para volver a pedir lo que ya lleva la mesa: la segunda ronda de
 * bebidas es el caso más repetido del salón y hoy obliga a buscar cada producto
 * otra vez. Aquí es un toque por línea, o uno solo para repetir todo.
 *
 * Sin lógica de negocio: filtra lo que no se puede repetir a ciegas y reporta
 * las líneas elegidas al padre, que las mete al borrador.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMemo, useState } from 'react'
import { Check, Plus, RotateCcw } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { isKgPrice, isOpenPrice } from '@/lib/utils/productSearch'
import type { OrderItem } from '@/lib/types'

interface RepetirRondaSheetProps {
  open: boolean
  onClose: () => void
  items: OrderItem[]
  onRepeat: (items: OrderItem[]) => void
}

/**
 * Líneas que sí se pueden repetir tal cual: las canceladas no cuentan y las de
 * precio por kilo / precio abierto necesitan captura manual, así que se omiten
 * en vez de repetirse con un precio que podría no corresponder.
 */
export function repeatableItems(items: OrderItem[]): OrderItem[] {
  return items.filter(item => {
    if (item.status === 'cancelled') return false
    if (item.price_pending) return false
    if (isKgPrice(item) || isOpenPrice(item)) return false
    return item.unit_price > 0
  })
}

function lineLabel(item: OrderItem): string {
  const extras = [
    ...(item.modifiers ?? []).map(m => m.name),
    ...(item.selectedModifiers ?? []),
  ]
  const note = item.item_notes?.trim()
  if (note) extras.push(note)
  return extras.join(' · ')
}

export function RepetirRondaSheet({ open, onClose, items, onRepeat }: RepetirRondaSheetProps) {
  const available = useMemo(() => repeatableItems(items), [items])
  const [added, setAdded] = useState<Set<number>>(new Set())

  // Al reabrir, los checks de "ya lo agregué en esta pasada" empiezan limpios.
  useMemo(() => { if (open) setAdded(new Set()) }, [open])

  const handleOne = (item: OrderItem) => {
    onRepeat([item])
    setAdded(prev => new Set(prev).add(item.id))
  }

  const handleAll = () => {
    onRepeat(available)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="pr-8 text-base font-bold">Repetir lo de esta mesa</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Toca una línea para agregarla otra vez al borrador.
      </p>

      {available.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay líneas que se puedan repetir automáticamente.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {available.map(item => {
              const label = lineLabel(item)
              const justAdded = added.has(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleOne(item)}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors active:scale-[0.99] touch-manipulation',
                      justAdded
                        ? 'border-[#E85D04]/50 bg-[#E85D04]/5'
                        : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {item.quantity > 1 && <span className="text-muted-foreground">{item.quantity}× </span>}
                        {item.product_name}
                      </p>
                      {label && <p className="truncate text-xs text-muted-foreground">{label}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#E85D04]">
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                        justAdded ? 'bg-[#E85D04] text-white' : 'bg-stone-100 text-stone-500 dark:bg-stone-800',
                      )}
                    >
                      {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background px-4 pt-3">
            <Button variant="brand" className="h-12 w-full text-base" onClick={handleAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Repetir todo · {available.length} línea{available.length === 1 ? '' : 's'}
            </Button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
