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
import { formatCurrency } from '@/lib/utils/formatters'
import { NumericKeypad } from './NumericKeypad'
import type { Product } from '@/lib/types'

interface OpenPriceDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Confirma el precio capturado para esta venta (precio unitario) y la nota. */
  onConfirm: (unitPrice: number, notes: string) => void
}

/**
 * Diálogo táctil para capturar el precio de un producto de "precio variable"
 * al momento de tomar el pedido (ej. carne tártara, tostada o platillo cuyo
 * monto cambia por porción/preparación). Teclado numérico grande para meseros.
 *
 * Validaciones: precio requerido, > 0, no negativo, acepta decimales.
 */
export function OpenPriceDialog({ product, open, onOpenChange, onConfirm }: OpenPriceDialogProps) {
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  // Reinicia los campos cada vez que se abre con un producto.
  useEffect(() => {
    if (open) {
      setPrice(product && product.price > 0 ? String(product.price) : '')
      setNotes('')
    }
  }, [open, product?.id, product?.price])

  const parsed = parseFloat(price)
  const valid = Number.isFinite(parsed) && parsed > 0

  const handleConfirm = () => {
    if (!valid) {
      toast.error('Ingresa un precio válido (mayor a 0)')
      return
    }
    onConfirm(Math.round(parsed * 100) / 100, notes.trim())
    onOpenChange(false)
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
              Precio variable
            </span>
          </DialogTitle>
          <p className="text-base font-semibold leading-tight pt-1">{product.name}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto en grande */}
          <div className="rounded-2xl border-2 border-[#EAB308]/40 bg-amber-50/50 dark:bg-amber-950/10 py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">Precio de esta venta</p>
            <p className="text-4xl font-extrabold tabular-nums text-yellow-700 dark:text-yellow-400 mt-1">
              {valid ? formatCurrency(parsed) : (price ? `$${price}` : '$0.00')}
            </p>
          </div>

          <NumericKeypad value={price} onChange={setPrice} maxDecimals={2} />

          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. para llevar, sin cebolla, término medio…"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!valid} className="w-full h-12 text-base bg-[#FACC15] hover:bg-[#EAB308]">
            Agregar{valid ? ` · ${formatCurrency(parsed)}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
