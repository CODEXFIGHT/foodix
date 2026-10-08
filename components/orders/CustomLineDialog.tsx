'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import type { NewOrderItemInput } from '@/lib/api/queries'

interface CustomLineDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdd: (item: NewOrderItemInput) => void
}

type Mode = 'open' | 'kg'

/** Diálogo para agregar una línea de precio abierto o un producto por KG. */
export function CustomLineDialog({ open, onOpenChange, onAdd }: CustomLineDialogProps) {
  const [mode, setMode] = useState<Mode>('open')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')      // precio abierto (total unitario)
  const [qty, setQty] = useState('1')
  const [pricePerKg, setPricePerKg] = useState('')
  const [weight, setWeight] = useState('')     // kg
  const [estimated, setEstimated] = useState(false)
  const [notes, setNotes] = useState('')

  const reset = () => {
    setName(''); setPrice(''); setQty('1'); setPricePerKg(''); setWeight('')
    setEstimated(false); setNotes(''); setMode('open')
  }

  const kgSubtotal = (parseFloat(weight) || 0) * (parseFloat(pricePerKg) || 0)
  const openSubtotal = (parseFloat(price) || 0) * (parseInt(qty) || 1)

  const canAdd = name.trim() !== '' && (
    mode === 'open'
      ? (parseFloat(price) || 0) >= 0 && (parseInt(qty) || 0) >= 1
      : (parseFloat(pricePerKg) || 0) > 0 && (estimated || (parseFloat(weight) || 0) > 0)
  )

  const handleAdd = () => {
    if (!canAdd) return
    if (mode === 'open') {
      onAdd({
        product_id: null,
        product_name: name.trim(),
        quantity: parseInt(qty) || 1,
        unit_price: parseFloat(price) || 0,
        item_notes: notes.trim() || null,
      })
    } else {
      const w = parseFloat(weight) || 0
      const ppk = parseFloat(pricePerKg) || 0
      onAdd({
        product_id: null,
        product_name: name.trim(),
        quantity: 1,
        unit_price: estimated && w === 0 ? 0 : Math.round(w * ppk * 100) / 100,
        weight_kg: estimated && w === 0 ? null : w,
        price_per_kg: ppk,
        price_pending: estimated,
        item_notes: notes.trim() || null,
      })
    }
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar concepto</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('open')}
            className={cn('h-11 rounded-lg border text-sm font-medium',
              mode === 'open' ? 'bg-[#E85D04] text-white border-[#E85D04]' : 'hover:bg-muted')}
          >
            Precio abierto
          </button>
          <button
            onClick={() => setMode('kg')}
            className={cn('h-11 rounded-lg border text-sm font-medium',
              mode === 'kg' ? 'bg-[#E85D04] text-white border-[#E85D04]' : 'hover:bg-muted')}
          >
            Por kilogramo
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <Label>Concepto</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder={mode === 'kg' ? 'Mojarra por KG' : 'Especial del día'} autoFocus />
          </div>

          {mode === 'open' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio</Label>
                <Input type="number" inputMode="decimal" min="0" value={price}
                  onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" inputMode="numeric" min="1" value={qty}
                  onChange={e => setQty(e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio por KG</Label>
                  <Input type="number" inputMode="decimal" min="0" value={pricePerKg}
                    onChange={e => setPricePerKg(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" inputMode="decimal" min="0" step="0.001" value={weight}
                    onChange={e => setWeight(e.target.value)} placeholder="0.000"
                    disabled={estimated && weight === ''} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={estimated} onChange={e => setEstimated(e.target.checked)} />
                Precio estimado (confirmar al pesar). Se podrá enviar a cocina pero no cobrar.
              </label>
            </>
          )}

          <div>
            <Label>Nota (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucción especial" />
          </div>

          <div className="text-right text-sm font-semibold">
            Subtotal: {formatCurrency(mode === 'open' ? openSubtotal : kgSubtotal)}
            {mode === 'kg' && estimated && (parseFloat(weight) || 0) === 0 && ' (pendiente)'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancelar</Button>
          <Button className="bg-[#E85D04] hover:bg-[#C44D00]" disabled={!canAdd} onClick={handleAdd}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
