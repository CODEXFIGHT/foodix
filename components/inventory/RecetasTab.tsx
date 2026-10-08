'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import { useProducts, useInventory, useRecipe, useSaveRecipe, useRecipeCost } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { RecipeItem } from '@/lib/types'

export function RecetasTab({ branchId }: { branchId: number | null }) {
  const { data: products = [] } = useProducts(branchId)
  const { data: inventory = [] } = useInventory(branchId)
  const [productId, setProductId] = useState<number | null>(null)
  const { data: recipe } = useRecipe(productId)
  const { data: cost } = useRecipeCost(productId)
  const saveRecipe = useSaveRecipe()

  const [rows, setRows] = useState<RecipeItem[]>([])

  useEffect(() => {
    if (recipe) setRows(recipe)
  }, [recipe])

  const addRow = () => setRows(prev => [...prev, { inventory_item_id: 0, quantity: 0, waste_percent: 0 }])
  const setRow = (i: number, patch: Partial<RecipeItem>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!productId) return
    const items = rows.filter(r => r.inventory_item_id > 0 && r.quantity > 0)
    try {
      await saveRecipe.mutateAsync({ productId, items })
      toast.success('Receta guardada')
    } catch { toast.error('Error al guardar la receta') }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 max-w-sm">
        <Label>Producto</Label>
        <Select value={productId ? String(productId) : ''} onValueChange={(v) => setProductId(Number(v))}>
          <SelectTrigger><SelectValue placeholder="Elige un producto…" /></SelectTrigger>
          <SelectContent>
            {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {productId && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Insumos que consume</Label>
              {inventory.length === 0 && <span className="text-xs text-muted-foreground">Crea insumos primero</span>}
            </div>

            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={row.inventory_item_id ? String(row.inventory_item_id) : ''}
                  onValueChange={(v) => setRow(i, { inventory_item_id: Number(v) })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Insumo…" /></SelectTrigger>
                  <SelectContent>
                    {inventory.map(it => <SelectItem key={it.id} value={String(it.id)}>{it.name} ({it.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-24" type="number" inputMode="decimal" value={row.quantity || ''}
                  onChange={e => setRow(i, { quantity: parseFloat(e.target.value) || 0 })} placeholder="Cant." />
                <Input className="w-20" type="number" inputMode="decimal" value={row.waste_percent || ''}
                  onChange={e => setRow(i, { waste_percent: parseFloat(e.target.value) || 0 })} placeholder="Merma %" />
                <button onClick={() => removeRow(i)} className="px-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={addRow} disabled={inventory.length === 0}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar insumo
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveRecipe.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">
                <Save className="h-3.5 w-3.5 mr-1" /> Guardar receta
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Al vender este producto se descuenta automáticamente el stock de estos insumos (más el % de merma indicado).
            </p>
          </CardContent>
        </Card>
      )}

      {productId && cost && cost.price > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Label>Costeo</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Costo receta</p>
                <p className="font-semibold">${cost.total_cost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Precio venta</p>
                <p className="font-semibold">${cost.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Food cost %</p>
                <p className={`font-semibold ${(cost.food_cost_percent ?? 0) > 35 ? 'text-destructive' : ''}`}>
                  {cost.food_cost_percent ?? '—'}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Margen</p>
                <p className={`font-semibold ${(cost.margin_percent ?? 0) < 0 ? 'text-destructive' : ''}`}>
                  ${cost.margin.toFixed(2)} ({cost.margin_percent ?? '—'}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
