'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { useProducts } from '@/lib/api/queries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import type { ModifierGroup } from '@/lib/types'

interface ModifierGroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: number | null
  group: ModifierGroup | null
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}

interface OptionRow { name: string; price_delta: string }

export function ModifierGroupForm({
  open, onOpenChange, branchId, group, onSave, saving,
}: ModifierGroupFormProps) {
  const { data: products = [] } = useProducts(branchId)

  const [name, setName] = useState('')
  const [maxSelect, setMaxSelect] = useState(1)
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<OptionRow[]>([{ name: '', price_delta: '' }])
  const [productIds, setProductIds] = useState<number[]>([])
  const [search, setSearch] = useState('')

  // Carga los valores al abrir (nuevo o edición).
  useEffect(() => {
    if (!open) return
    if (group) {
      setName(group.name)
      setMaxSelect(group.max_select)
      setRequired(group.required)
      setOptions(group.options.length
        ? group.options.map(o => ({ name: o.name, price_delta: o.price_delta ? String(o.price_delta) : '' }))
        : [{ name: '', price_delta: '' }])
      setProductIds(group.product_ids)
    } else {
      setName(''); setMaxSelect(1); setRequired(false)
      setOptions([{ name: '', price_delta: '' }]); setProductIds([])
    }
    setSearch('')
  }, [open, group])

  const setOption = (i: number, patch: Partial<OptionRow>) =>
    setOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const addOption = () => setOptions(prev => [...prev, { name: '', price_delta: '' }])
  const removeOption = (i: number) =>
    setOptions(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const toggleProduct = (id: number) =>
    setProductIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]))

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSubmit = () => {
    const cleanOptions = options
      .filter(o => o.name.trim())
      .map(o => ({ name: o.name.trim(), price_delta: parseFloat(o.price_delta) || 0 }))

    onSave({
      name: name.trim(),
      min_select: required ? 1 : 0,
      max_select: Math.max(1, maxSelect),
      required,
      options: cleanOptions,
      product_ids: productIds,
    })
  }

  const valid = name.trim().length > 0 && options.some(o => o.name.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo' : 'Nuevo grupo de modificadores'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre del grupo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Término de la carne, Extras" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Máx. selecciones</Label>
              <Input type="number" min={1} max={20} value={maxSelect}
                onChange={e => setMaxSelect(Math.max(1, Number(e.target.value) || 1))} />
              <p className="text-[11px] text-muted-foreground">1 = opción única</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-xs">Obligatorio</Label>
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            <Label>Opciones</Label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" value={o.name}
                  onChange={e => setOption(i, { name: e.target.value })} placeholder="Nombre (ej. Queso extra)" />
                <Input className="w-28" type="number" inputMode="decimal" value={o.price_delta}
                  onChange={e => setOption(i, { price_delta: e.target.value })} placeholder="+$0" />
                <button onClick={() => removeOption(i)} className="px-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar opción
            </Button>
          </div>

          {/* Asignación de productos */}
          <div className="space-y-2">
            <Label>Aplicar a productos ({productIds.length})</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" />
            </div>
            <div className="max-h-44 overflow-y-auto border rounded-lg divide-y scrollbar-thin">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors',
                    productIds.includes(p.id) ? 'bg-[#FACC15]/5' : 'hover:bg-muted',
                  )}
                >
                  <span>{p.name}</span>
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                    productIds.includes(p.id) ? 'bg-[#FACC15] border-[#EAB308] text-stone-950' : 'border-muted-foreground/40',
                  )}>
                    {productIds.includes(p.id) && '✓'}
                  </span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin productos</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving} className="bg-[#FACC15] hover:bg-[#EAB308]">
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
