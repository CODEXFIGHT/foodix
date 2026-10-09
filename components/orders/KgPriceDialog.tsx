'use client'

import { useEffect, useState } from 'react'
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
import { NumericKeypad } from './NumericKeypad'
import type { Product } from '@/lib/types'

export interface KgCapture {
  weight_kg: number
  price_per_kg: number
  unit_price: number
  notes: string
}

interface KgPriceDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (capture: KgCapture) => void
}

type Field = 'weight' | 'price'

/**
 * Diálogo táctil para productos por kilogramo (ej. ceviche marlin, mariscos por
 * peso). Captura peso y precio/kg con un teclado numérico grande y calcula el
 * total en tiempo real: Total = Peso × Precio/kg. El precio/kg se precarga del
 * producto pero el mesero puede ajustarlo.
 *
 * Validaciones: peso > 0, precio/kg > 0, sin negativos, acepta decimales.
 */
export function KgPriceDialog({ product, open, onOpenChange, onConfirm }: KgPriceDialogProps) {
  const [weight, setWeight] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [notes, setNotes] = useState('')
  const [field, setField] = useState<Field>('weight')

  useEffect(() => {
    if (open) {
      setWeight('')
      setPricePerKg(product?.price_per_kg && product.price_per_kg > 0 ? String(product.price_per_kg) : '')
      setNotes('')
      setField('weight')
    }
  }, [open, product?.id, product?.price_per_kg])

  const w = parseFloat(weight) || 0
  const ppk = parseFloat(pricePerKg) || 0
  const total = Math.round(w * ppk * 100) / 100
  const valid = w > 0 && ppk > 0

  const handleConfirm = () => {
    if (w <= 0) { toast.error('Ingresa un peso válido (mayor a 0)'); return }
    if (ppk <= 0) { toast.error('Ingresa un precio por kg válido (mayor a 0)'); return }
    onConfirm({ weight_kg: w, price_per_kg: ppk, unit_price: total, notes: notes.trim() })
    onOpenChange(false)
  }

  if (!product) return null

  const activeValue = field === 'weight' ? weight : pricePerKg
  const setActiveValue = field === 'weight' ? setWeight : setPricePerKg

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#D1400F] bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded">
              Por kilogramo
            </span>
          </DialogTitle>
          <p className="text-base font-semibold leading-tight pt-1">{product.name}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selectores de campo (tocar para editar con el teclado) */}
          <div className="grid grid-cols-2 gap-2">
            <FieldChip
              label="Peso (kg)"
              value={weight ? `${weight} kg` : '—'}
              active={field === 'weight'}
              onClick={() => setField('weight')}
            />
            <FieldChip
              label="Precio / kg"
              value={pricePerKg ? formatCurrency(ppk) : '—'}
              active={field === 'price'}
              onClick={() => setField('price')}
            />
          </div>

          {/* Total en grande */}
          <div className="rounded-2xl border-2 border-[#D1400F]/40 bg-orange-50/50 dark:bg-orange-950/10 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Total {valid ? `(${weight} kg × ${formatCurrency(ppk)})` : ''}
            </p>
            <p className="text-4xl font-extrabold tabular-nums text-[#D1400F] mt-1">
              {formatCurrency(total)}
            </p>
          </div>

          <NumericKeypad
            value={activeValue}
            onChange={setActiveValue}
            maxDecimals={field === 'weight' ? 3 : 2}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. sin cebolla, para llevar…"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!valid} className="w-full h-12 text-base bg-[#D1400F] hover:bg-[#B03508]">
            Agregar{valid ? ` · ${formatCurrency(total)}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldChip({ label, value, active, onClick }: {
  label: string; value: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 p-2.5 text-left transition-all',
        active ? 'border-[#D1400F] bg-orange-50/60 dark:bg-orange-950/20' : 'border-border hover:border-[#D1400F]/40',
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
    </button>
  )
}
