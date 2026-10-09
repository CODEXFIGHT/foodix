/**
 * FoodIX — Modo Demo
 * Diálogo de creación/edición de producto demo (solo escribe en el store demo).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModifierTagsInput } from '@/components/products/ModifierTagsInput'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { demoActions } from '@/lib/demo/demo-store'
import type { DemoProduct, DemoCategory, DemoModifier, KitchenStation } from '@/lib/demo/demo-types'

const EMOJIS = ['🍽️', '🌮', '🥑', '🧀', '🍗', '🥩', '🫔', '🍹', '🍺', '🥤', '🍮', '🍩', '🌶️', '🥗', '🍝']

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Producto a editar; undefined = crear. */
  product?: DemoProduct
  categories: DemoCategory[]
  modifiers: DemoModifier[]
}

export function DemoProductDialog({ open, onOpenChange, product, categories, modifiers }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [station, setStation] = useState<KitchenStation>('hot')
  const [available, setAvailable] = useState(true)
  const [modifierIds, setModifierIds] = useState<string[]>([])
  const [customModifiers, setCustomModifiers] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setDescription(product?.description ?? '')
    setPrice(product ? String(product.price) : '')
    setCategoryId(product?.categoryId ?? categories[0]?.id ?? '')
    setEmoji(product?.emoji ?? '🍽️')
    setStation(product?.station ?? 'hot')
    setAvailable(product?.available ?? true)
    setModifierIds(product?.modifierIds ?? [])
    setCustomModifiers(product?.modifiers ?? [])
  }, [open, product, categories])

  function toggleModifier(id: string) {
    setModifierIds(prev => (prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]))
  }

  function handleSave() {
    const priceNum = Number(price)
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    if (!categoryId) return toast.error('Selecciona una categoría')
    if (!Number.isFinite(priceNum) || priceNum < 0) return toast.error('Precio inválido')

    demoActions.upsertProduct({
      id: product?.id,
      categoryId,
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      available,
      emoji,
      station,
      modifierIds,
      modifiers: customModifiers,
    })
    toast.success(product ? 'Producto actualizado' : 'Producto creado')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>Los cambios solo afectan tu demo local.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nombre</Label>
            <Input id="p-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Tacos al pastor" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea id="p-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ingredientes, presentación…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Precio (MXN)</Label>
              <Input id="p-price" type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Categoría</Label>
              <select
                id="p-cat"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ícono</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg border text-lg transition-all',
                    emoji === e ? 'border-[#D1400F] bg-[#D1400F]/10 scale-110' : 'border-stone-200 hover:bg-stone-50',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estación de cocina</Label>
            <div className="flex gap-2">
              {(['hot', 'cold'] as KitchenStation[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStation(s)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                    station === s ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#B03508]' : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                  )}
                >
                  {s === 'hot' ? '🔥 Caliente' : '❄️ Fría'}
                </button>
              ))}
            </div>
          </div>

          {modifiers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Modificadores disponibles</Label>
              <div className="flex flex-wrap gap-1.5">
                {modifiers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModifier(m.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      modifierIds.includes(m.id)
                        ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#B03508]'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50',
                    )}
                  >
                    {m.name}{m.price > 0 ? ` +$${m.price}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Modificadores</Label>
            <ModifierTagsInput
              value={customModifiers}
              onChange={setCustomModifiers}
              placeholder="Ej. Sin cebolla, con extra aguacate..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Disponible</p>
              <p className="text-xs text-stone-500">Visible en carta y para meseros</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" onClick={handleSave}>{product ? 'Guardar cambios' : 'Crear producto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
