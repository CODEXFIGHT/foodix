'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm, type DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useCategories, useProducts,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useUploadProductImages, useDeleteProductImage,
} from '@/lib/api/queries'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { productSchema, categorySchema, type ProductInput, type CategoryInput } from '@/lib/validators/schemas'
import type { Category, Product } from '@/lib/types'
import { ModifierTagsInput } from '@/components/products/ModifierTagsInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils/cn'
import {
  Plus, Pencil, Trash2, Upload, X, Barcode, Camera, ImagePlus, Eye, Sparkles, Flame, Snowflake,
  Tag, Scale, Banknote, Coins, Search, Loader2, type LucideIcon,
} from 'lucide-react'

const MXN = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

// Valor centinela: Radix Select no admite items con value="".
const SELECT_EMPTY = '__none__'

interface FieldSelectOption {
  value: string
  label: string
  icon?: LucideIcon
  hint?: string
}

/**
 * Select de formulario con el diseño de FoodIX (Radix + naranja del sistema),
 * en lugar del desplegable nativo del SO. Maneja el valor vacío como centinela.
 */
function FieldSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: FieldSelectOption[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select
      value={value === '' ? SELECT_EMPTY : value}
      onValueChange={(v) => onChange(v === SELECT_EMPTY ? '' : v)}
    >
      <SelectTrigger
        className={cn(
          'h-11 rounded-xl border-input bg-background text-sm font-medium',
          'focus:ring-2 focus:ring-[#E85D04] focus:ring-offset-0 focus:border-[#E85D04]',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((opt) => (
          <SelectItem
            key={opt.value || SELECT_EMPTY}
            value={opt.value === '' ? SELECT_EMPTY : opt.value}
            className="rounded-lg focus:bg-orange-50 focus:text-[#C2410C] data-[state=checked]:text-[#E85D04] dark:focus:bg-orange-500/10 dark:focus:text-orange-300"
          >
            <span className="flex items-center gap-2">
              {opt.icon && <opt.icon className="h-4 w-4 shrink-0 text-[#E85D04]" />}
              <span className="flex flex-col">
                <span>{opt.label}</span>
                {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const MAX_IMAGES = 5

const ALLERGEN_OPTIONS = [
  'Gluten', 'Lácteos', 'Huevo', 'Pescado', 'Mariscos',
  'Cacahuates', 'Nueces', 'Soya', 'Apio', 'Mostaza', 'Sulfitos',
]

const BADGE_OPTIONS = ['Nuevo', 'Popular', 'Recomendado', 'Especialidad', 'Promo']

// ─── Category Panel ───────────────────────────────────────────────────────────

function CategoryPanel({
  branchId,
  selectedId,
  onSelect,
}: {
  branchId: number
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const { data: categories = [], isLoading } = useCategories(branchId)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', color: '#E85D04', station: 'hot' as 'hot'|'cold'|'both' })

  const handleSave = async () => {
    if (!form.name.trim()) return
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, ...form, branch_id: branchId })
        toast.success('Categoría actualizada')
        setEditingId(null)
      } else {
        const cat = await createCategory.mutateAsync({ ...form, branch_id: branchId })
        toast.success('Categoría creada')
        onSelect(cat.id)
      }
      setShowForm(false)
      setForm({ name: '', color: '#E85D04', station: 'hot' })
    } catch {
      toast.error('Error al guardar categoría')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCategory.mutateAsync(deleteId)
      toast.success('Categoría eliminada')
      if (selectedId === deleteId) onSelect(null)
      setDeleteId(null)
    } catch {
      toast.error('Error al eliminar categoría')
    }
  }

  return (
    <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Categorías</h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => { setEditingId(null); setForm({ name: '', color: '#E85D04', station: 'hot' }); setShowForm(true) }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* All products option */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          selectedId === null
            ? 'bg-[#E85D04] text-white'
            : 'hover:bg-muted text-muted-foreground',
        )}
      >
        <span>🍽️</span>
        <span className="font-medium">Todos los productos</span>
      </button>

      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
        : categories.map(cat => (
          <div
            key={cat.id}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer',
              selectedId === cat.id ? 'bg-muted ring-1 ring-[#E85D04]' : 'hover:bg-muted',
            )}
            onClick={() => onSelect(cat.id)}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: cat.color }}
            />
            <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
            <span className="text-xs opacity-50">{cat.station === 'hot' ? '🔥' : cat.station === 'cold' ? '🧊' : '🔥🧊'}</span>
            <div className="hidden group-hover:flex gap-1">
              <button
                onClick={e => {
                  e.stopPropagation()
                  setEditingId(cat.id)
                  setForm({ name: cat.name, color: cat.color, station: cat.station ?? 'hot' })
                  setShowForm(true)
                }}
                className="p-1 rounded hover:bg-background text-muted-foreground"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteId(cat.id) }}
                className="p-1 rounded hover:bg-background text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))
      }

      {/* Inline form */}
      {showForm && (
        <div className="border rounded-lg p-3 space-y-2 bg-card">
          <Input
            placeholder="Nombre de categoría"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="h-8 w-10 rounded border cursor-pointer p-0.5"
            />
            <span className="text-xs text-muted-foreground">Color de la categoría</span>
          </div>
          <select
            value={form.station}
            onChange={e => setForm(f => ({ ...f, station: e.target.value as 'hot'|'cold'|'both' }))}
            className="w-full h-8 text-xs bg-background border border-input rounded-md px-2"
          >
            <option value="hot">🔥 Caliente (Cocina)</option>
            <option value="cold">🧊 Fría/Bar (Barra)</option>
            <option value="both">🔥🧊 Ambas estaciones</option>
          </select>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-[#E85D04] hover:bg-[#C44D00]"
              onClick={handleSave}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {editingId ? 'Guardar' : 'Agregar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setShowForm(false); setEditingId(null) }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => !open && setDeleteId(null)}
        title="Eliminar categoría"
        description="¿Seguro que deseas eliminar esta categoría? Los productos no se eliminarán."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggle,
}: {
  product: Product
  onEdit: () => void
  onDelete: () => void
  onToggle: (available: boolean) => void | Promise<void>
}) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async (available: boolean) => {
    setToggling(true)
    try {
      await onToggle(available)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={cn(
      'group relative bg-card border rounded-xl overflow-hidden transition-all hover:shadow-md',
      !product.available && 'opacity-60',
    )}>
      {/* Image area */}
      <div className="relative h-40 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className={cn(
              'w-full h-full object-cover',
              !product.available && 'grayscale',
            )}
          />
        ) : (
          <span className="text-5xl">🍽️</span>
        )}

        {/* Unavailable overlay */}
        {!product.available && !toggling && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">No disponible</Badge>
          </div>
        )}

        {/* Loading overlay (mientras se actualiza la disponibilidad) */}
        {toggling && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* Available toggle */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Switch
            checked={product.available}
            onCheckedChange={handleToggle}
            disabled={toggling}
            className="scale-75"
          />
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="absolute bottom-2 right-2 bg-white/90 dark:bg-stone-800/90 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-sm truncate flex-1">{product.name}</p>
          <span className="text-xs flex-shrink-0 opacity-60" title="Estación">
            {product.station_override === 'hot'  ? '🔥' :
             product.station_override === 'cold' ? '🧊' :
             product.station_override === 'both' ? '🔥🧊' : ''}
          </span>
        </div>
        <p className="text-[#E85D04] font-bold text-sm mt-0.5">{MXN(product.price)}</p>
        {product.description && (
          <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {product.barcode && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Barcode className="h-3 w-3" />
              {product.barcode}
            </span>
          )}
          <button
            onClick={onDelete}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vista previa estilo carta ──────────────────────────────────────────────
// Refleja en vivo cómo se verá la tarjeta del producto en /carta/{slug}.
function ProductPreview({
  name, price, badge, image, category, stationOverride,
}: {
  name?: string
  price?: number
  badge?: string
  image?: string
  category?: Category
  stationOverride?: string | null
}) {
  const station = stationOverride || category?.station
  const stMeta =
    station === 'hot' ? { label: 'Caliente', cls: 'bg-orange-500' }
    : station === 'cold' ? { label: 'Frío', cls: 'bg-sky-500' }
    : null

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
        <Eye className="h-3.5 w-3.5" /> Vista previa en la carta
      </p>
      <div className="mx-auto max-w-[180px] sm:max-w-[240px] rounded-2xl overflow-hidden border bg-white shadow-sm">
        <div className="relative aspect-square bg-stone-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl">🍽️</div>
          )}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E85D04] text-white shadow">{badge}</span>
            )}
            {stMeta && (
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow', stMeta.cls)}>{stMeta.label}</span>
            )}
          </div>
          <span className="absolute bottom-2 right-2 inline-flex items-center rounded-full bg-black/60 px-2.5 py-1 text-white text-sm font-extrabold shadow">
            ${Number.isFinite(price) ? price : 0}
            <span className="text-[9px] font-medium text-white/70 ml-0.5">MXN</span>
          </span>
        </div>
        <div className="bg-[#E85D04] px-3 py-2.5">
          <h3 className="text-center text-sm font-bold uppercase tracking-wide text-white line-clamp-2">
            {name?.trim() || 'Nombre del platillo'}
          </h3>
        </div>
      </div>
      {category && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Sección: <span className="font-semibold" style={{ color: category.color }}>{category.name}</span>
        </p>
      )}
    </div>
  )
}

// ─── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({
  open,
  onClose,
  branchId,
  categories,
  editing,
}: {
  open: boolean
  onClose: () => void
  branchId: number
  categories: Category[]
  editing: Product | null
}) {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const uploadImages = useUploadProductImages()
  const deleteImage = useDeleteProductImage()

  // Imágenes ya guardadas (modo edición) y nuevas pendientes de subir.
  const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>(
    editing?.images ?? (editing?.image_url ? [{ id: 0, url: editing.image_url }] : []),
  )
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([])
  const [pendingUrls, setPendingUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [allergens, setAllergens] = useState<string[]>(
    editing?.allergens ? editing.allergens.split(',').map(s => s.trim()).filter(Boolean) : [],
  )
  const [scannerActive, setScannerActive] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [customModifiers, setCustomModifiers] = useState<string[]>([])
  const barcodeRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const totalImages = existingImages.length + pendingFiles.length + pendingUrls.length

  // Agrega una imagen por URL (cualquier dominio https/http).
  const addUrl = useCallback(() => {
    const u = urlInput.trim()
    if (!u) return
    if (!/^https?:\/\/.+/i.test(u)) { toast.error('Ingresa una URL válida (http/https)'); return }
    setPendingUrls(prev => {
      if (existingImages.length + pendingFiles.length + prev.length >= MAX_IMAGES) {
        toast.error(`Máximo ${MAX_IMAGES} imágenes por producto`)
        return prev
      }
      if (prev.includes(u) || existingImages.some(x => x.url === u)) {
        toast.error('Esa imagen ya está agregada')
        return prev
      }
      return [...prev, u]
    })
    setUrlInput('')
  }, [urlInput, existingImages, pendingFiles.length])

  const removePendingUrl = (idx: number) =>
    setPendingUrls(prev => prev.filter((_, i) => i !== idx))

  useBarcodeScanner((code) => {
    if (!scannerActive) return
    if (barcodeRef.current) barcodeRef.current.value = code
    setValue('barcode', code)
    setScannerActive(false)
    toast.success(`Código escaneado: ${code}`)
  }, scannerActive)

  const buildDefaults = (p: Product | null): DefaultValues<ProductInput> => p
    ? {
        name: p.name,
        description: p.description ?? '',
        ingredients: p.ingredients ?? '',
        badge: p.badge ?? '',
        price: p.price,
        // Normaliza el tipo legado 'variable': con precio/kg = por kilogramo;
        // sin él = precio variable (captura al vender).
        price_type: p.price_type === 'variable'
          ? (p.price_per_kg ? 'kg' : 'open')
          : (p.price_type ?? 'fixed'),
        price_per_kg: p.price_per_kg ?? undefined,
        station: p.category_station === 'cold' ? 'cold' : 'hot',
        barcode: p.barcode ?? '',
        station_override: p.station_override ?? '',
        available: p.available,
        sort_order: p.sort_order,
      }
    : { available: true, sort_order: 0, station_override: '', badge: '', price_type: 'fixed' as const, station: 'hot' }

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: buildDefaults(editing),
  })

  const priceType = watch('price_type') ?? 'fixed'
  const pricePerKg = watch('price_per_kg')
  // "Por kilogramo": precio base por KG, total calculado por el peso al vender.
  const isKg = priceType === 'kg'
  // "Precio variable": el admin no captura precio; el cajero lo define al vender.
  const isOpen = priceType === 'open'

  // Cuando el precio depende del peso, el precio del producto se toma del precio
  // por KG (el campo "Precio MXN" de arriba queda deshabilitado).
  useEffect(() => {
    if (isKg) setValue('price', Number(pricePerKg) || 0, { shouldValidate: true })
  }, [isKg, pricePerKg, setValue])

  // Precio abierto: no se pide precio en el admin (se guarda en 0 y se captura
  // al momento de la venta), por lo que el campo "Precio MXN" queda en 0.
  useEffect(() => {
    if (isOpen) setValue('price', 0, { shouldValidate: true })
  }, [isOpen, setValue])

  // El modal permanece montado, por lo que reinicializamos el formulario y las
  // imágenes/alérgenos cada vez que se abre o cambia el producto en edición.
  // Sin esto, al editar otro producto se verían datos vacíos u obsoletos.
  useEffect(() => {
    if (!open) return
    reset(buildDefaults(editing))
    setExistingImages(editing?.images ?? (editing?.image_url ? [{ id: 0, url: editing.image_url }] : []))
    setPendingFiles(prev => { prev.forEach(p => URL.revokeObjectURL(p.preview)); return [] })
    setPendingUrls([])
    setUrlInput('')
    setAllergens(editing?.allergens ? editing.allergens.split(',').map(s => s.trim()).filter(Boolean) : [])
    setCustomModifiers(editing?.modifiers ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  // Agrega archivos validando tipo, tamaño y el máximo de 5 imágenes.
  const addFiles = useCallback((files: File[]) => {
    setPendingFiles(prev => {
      const room = MAX_IMAGES - existingImages.length - prev.length
      if (room <= 0) {
        toast.error(`Máximo ${MAX_IMAGES} imágenes por producto`)
        return prev
      }
      const valid: { file: File; preview: string }[] = []
      for (const f of files.slice(0, room)) {
        if (!f.type.startsWith('image/')) { toast.error(`${f.name}: no es una imagen`); continue }
        if (f.size > 2 * 1024 * 1024) { toast.error(`${f.name}: supera 2MB`); continue }
        valid.push({ file: f, preview: URL.createObjectURL(f) })
      }
      if (files.length > room) toast.error(`Solo se agregaron ${room}; máximo ${MAX_IMAGES}`)
      return [...prev, ...valid]
    })
  }, [existingImages.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 2 * 1024 * 1024,
    noClick: true, // usamos botones explícitos para móvil/desktop
  })

  const removePending = (idx: number) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx]?.preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const removeExisting = async (img: { id: number; url: string }) => {
    // Imágenes legado (id 0) o de producto nuevo: solo quitar del estado.
    if (!editing || img.id === 0) {
      setExistingImages(prev => prev.filter(x => x.url !== img.url))
      return
    }
    try {
      await deleteImage.mutateAsync({ productId: editing.id, imageId: img.id })
      setExistingImages(prev => prev.filter(x => x.id !== img.id))
    } catch {
      toast.error('No se pudo eliminar la imagen')
    }
  }

  const toggleAllergen = (a: string) =>
    setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  // Rellena descripción e ingredientes con IA (el proveedor vive en el servidor).
  const generateWithAI = async () => {
    const name = (watch('name') ?? '').trim()
    if (!name) { toast.error('Escribe primero el nombre del platillo'); return }
    const category = categories.find(c => c.station === watch('station'))?.name ?? ''
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/product-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
      })
      if (!res.ok) throw new Error('ai')
      const data = await res.json() as { description?: string; ingredients?: string }
      if (data.description) setValue('description', data.description, { shouldDirty: true })
      if (data.ingredients) setValue('ingredients', data.ingredients, { shouldDirty: true })
      if (!data.description && !data.ingredients) throw new Error('empty')
      toast.success('Campos generados con IA ✨')
    } catch {
      toast.error('No se pudo generar el contenido. Inténtalo de nuevo.')
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = async (data: ProductInput) => {
    try {
      const fd = new FormData()
      fd.append('branch_id', String(branchId))
      fd.append('name', data.name)
      fd.append('price', String(data.price))
      fd.append('station', data.station)
      fd.append('available', data.available ? '1' : '0')
      if (data.description) fd.append('description', data.description)
      // Campos que se envían siempre (incluso vacíos) para poder limpiarlos
      fd.append('ingredients', data.ingredients ?? '')
      fd.append('allergens', allergens.join(', '))
      fd.append('badge', data.badge ?? '')
      fd.append('station_override', data.station_override ?? '')
      fd.append('price_type', data.price_type ?? 'fixed')
      fd.append('price_per_kg', data.price_per_kg != null ? String(data.price_per_kg) : '')
      if (data.barcode) fd.append('barcode', data.barcode)
      if (data.sort_order !== undefined) fd.append('sort_order', String(data.sort_order))
      fd.append('modifiers', JSON.stringify(customModifiers))

      const productId = editing
        ? (await updateProduct.mutateAsync({ id: editing.id, formData: fd }), editing.id)
        : (await createProduct.mutateAsync(fd)).id

      // Subir las imágenes nuevas a la galería (archivos y/o URLs; hasta 5).
      if (pendingFiles.length || pendingUrls.length) {
        await uploadImages.mutateAsync({
          id: productId,
          files: pendingFiles.map(p => p.file),
          urls: pendingUrls,
        })
      }

      toast.success(editing ? 'Producto actualizado' : 'Producto creado')
      onClose()
    } catch (err) {
      console.error('Error saving product:', err)
      const message = err instanceof Error ? err.message : 'Error al guardar producto'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="p-0 gap-0 flex flex-col overflow-hidden border-0 sm:border
        inset-0 left-0 top-0 w-full h-full max-w-none max-h-none translate-x-0 translate-y-0 rounded-none
        sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:w-full sm:max-w-3xl sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <DialogHeader className="shrink-0 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-6 pb-3 border-b text-left">
          <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
          {/* Cuerpo desplazable: encabezado y acciones quedan fijos */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-5 lg:gap-6">
              {/* Vista previa: arriba en móvil, columna derecha en desktop */}
              <aside className="order-1 lg:order-2">
                <div className="lg:sticky lg:top-0">
                  <ProductPreview
                    name={watch('name')}
                    price={watch('price')}
                    badge={watch('badge')}
                    image={existingImages[0]?.url ?? pendingFiles[0]?.preview ?? pendingUrls[0] ?? ''}
                    category={categories.find(c => c.station === watch('station'))}
                    stationOverride={watch('station_override')}
                  />
                </div>
              </aside>

              <div className="order-2 lg:order-1 min-w-0 space-y-4">
          {/* Galería de imágenes (hasta 5) */}
          <div className="space-y-2">
            <Label>Fotos del platillo <span className="text-muted-foreground font-normal">({totalImages}/{MAX_IMAGES})</span></Label>

            {/* Inputs ocultos: cámara (móvil) y galería/archivos */}
            <input
              ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
            />
            <input
              ref={galleryInputRef} type="file" accept="image/*" multiple
              className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
            />

            {/* Miniaturas */}
            <div className="flex flex-wrap gap-2">
              {existingImages.map(img => (
                <div key={`e-${img.id}-${img.url}`} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExisting(img)}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingFiles.map((pf, i) => (
                <div key={`p-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-[#E85D04]/80 text-white text-[9px] text-center">nueva</span>
                  <button type="button" onClick={() => removePending(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingUrls.map((url, i) => (
                <div key={`u-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  <span className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[9px] text-center">URL</span>
                  <button type="button" onClick={() => removePendingUrl(i)}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {totalImages === 0 && (
                <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center text-3xl flex-shrink-0">🍽️</div>
              )}
            </div>

            {/* Zona de arrastre (desktop) + botones cámara/galería (móvil) */}
            {totalImages < MAX_IMAGES && (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-3 transition-colors',
                  isDragActive ? 'border-[#E85D04] bg-[#E85D04]/5' : 'border-border',
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
                  <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    {isDragActive ? 'Suelta las imágenes…' : 'Arrastra imágenes aquí o'}
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none"
                      onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-1.5" /> Cámara
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none"
                      onClick={() => galleryInputRef.current?.click()}>
                      <ImagePlus className="h-4 w-4 mr-1.5" /> Galería
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  JPG, PNG o WebP · máx. 2MB c/u · hasta {MAX_IMAGES} fotos. La primera es la principal.
                </p>
              </div>
            )}

            {/* Agregar por URL */}
            {totalImages < MAX_IMAGES && (
              <div className="flex gap-2">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="…o pega la URL de una imagen (https://…)"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addUrl} disabled={!urlInput.trim()}>
                  Agregar
                </Button>
              </div>
            )}
          </div>

          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...register('name')} placeholder="Tacos al pastor" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>Precio MXN {isOpen ? '' : '*'}</span>
                {isKg && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E85D04]">
                    <Scale className="h-3 w-3" /> Se usa el precio por KG
                  </span>
                )}
                {isOpen && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E85D04]">
                    <Banknote className="h-3 w-3" /> Se captura al vender
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className={cn(
                  'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold',
                  isKg || isOpen ? 'text-muted-foreground/50' : 'text-[#E85D04]',
                )}>$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder={isOpen ? 'Sin precio' : '89.00'}
                  disabled={isKg || isOpen}
                  aria-label="Precio en pesos"
                  className="h-11 rounded-xl pl-8 pr-14 text-base font-semibold tabular-nums disabled:opacity-60"
                  {...register('price', { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MXN</span>
              </div>
              {isKg ? (
                <p className="text-xs text-muted-foreground">
                  Este producto se cobra por kilogramo. Define el precio abajo en <strong>Precio por KG</strong>.
                </p>
              ) : isOpen ? (
                <p className="text-xs text-muted-foreground">
                  No se define precio aquí. El cajero lo captura al agregar el producto al pedido.
                </p>
              ) : (
                errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Estación / Categoría */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipo de Preparación / Estación *</Label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none",
                  "hover:bg-orange-50/50 hover:border-orange-250 dark:hover:bg-orange-950/20 dark:hover:border-orange-900/50",
                  watch('station') === 'hot'
                    ? "border-orange-500 bg-orange-50/70 text-orange-700 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-300 shadow-sm"
                    : "border-input bg-background text-muted-foreground"
                )}
              >
                <input
                  type="radio"
                  value="hot"
                  {...register('station')}
                  className="sr-only"
                />
                <div className={cn(
                  "p-2 rounded-lg transition-colors duration-200",
                  watch('station') === 'hot' ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Flame className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-sm">Caliente</span>
                  <span className="text-xs opacity-80">Mesa Caliente</span>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none",
                  "hover:bg-blue-50/50 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-900/50",
                  watch('station') === 'cold'
                    ? "border-blue-500 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm"
                    : "border-input bg-background text-muted-foreground"
                )}
              >
                <input
                  type="radio"
                  value="cold"
                  {...register('station')}
                  className="sr-only"
                />
                <div className={cn(
                  "p-2 rounded-lg transition-colors duration-200",
                  watch('station') === 'cold' ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Snowflake className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-sm">Fría</span>
                  <span className="text-xs opacity-80">Mesa Fría</span>
                </div>
              </label>
            </div>
            {errors.station && <p className="text-xs text-destructive mt-1">{errors.station.message}</p>}
          </div>

          {/* Descripción + Ingredientes (con asistente IA) */}
          <div className="relative space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Descripción</Label>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  aria-label="Rellenar con inteligencia artificial"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white shadow bg-gradient-to-r from-[#E85D04] via-fuchsia-500 to-indigo-500 animate-ai-flow hover:brightness-110 active:scale-95 transition disabled:opacity-70"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {aiLoading ? 'Generando…' : 'Rellenar con IA'}
                </button>
              </div>
              <Textarea
                {...register('description')}
                placeholder="Descripción del platillo…"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-1.5">
              <Label>Ingredientes</Label>
              <Textarea
                {...register('ingredients')}
                placeholder="Un ingrediente por línea — ej.&#10;Camarón&#10;Pulpo&#10;Aguacate&#10;Limón"
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Escribe un ingrediente por línea. Se mostrarán en la carta digital del cliente.
              </p>
            </div>

            {/* Overlay de "ondas de color" mientras la IA genera el contenido */}
            {aiLoading && (
              <div className="absolute inset-0 z-10 rounded-xl bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
                <div className="flex items-end gap-1 h-9">
                  {[0, 1, 2, 3, 4].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-full rounded-full bg-gradient-to-t from-[#E85D04] via-fuchsia-500 to-indigo-500 animate-ai-bar"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
                <p
                  className="text-sm font-bold bg-gradient-to-r from-[#E85D04] via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent animate-ai-flow"
                  style={{ backgroundSize: '220% 220%' }}
                >
                  Generando con IA…
                </p>
              </div>
            )}
          </div>

          {/* Allergens + Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Alérgenos</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_OPTIONS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergen(a)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      allergens.includes(a)
                        ? 'bg-[#E85D04] text-white border-[#E85D04]'
                        : 'bg-background text-muted-foreground border-input hover:border-[#E85D04]/50',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Etiqueta destacada</Label>
              <FieldSelect
                value={watch('badge') ?? ''}
                onChange={(v) => setValue('badge', v as ProductInput['badge'], { shouldDirty: true })}
                placeholder="Sin etiqueta"
                options={[
                  { value: '', label: 'Sin etiqueta' },
                  ...BADGE_OPTIONS.map(b => ({ value: b, label: b, icon: Tag })),
                ]}
              />
              <p className="text-xs text-muted-foreground">Se muestra como distintivo en la carta.</p>
            </div>
          </div>

          {/* Barcode */}
          <div className="space-y-1.5">
            <Label>Código de barras</Label>
            <div className="flex gap-2">
              <Input
                {...register('barcode')}
                ref={barcodeRef}
                placeholder="1234567890"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannerActive(a => !a)}
                className={cn(scannerActive && 'border-[#E85D04] text-[#E85D04]')}
              >
                <Barcode className="h-4 w-4 mr-1.5" />
                {scannerActive ? 'Escaneando…' : 'Escanear'}
              </Button>
            </div>
            {scannerActive && (
              <p className="text-xs text-[#E85D04] animate-pulse">
                Scanner activo — apunta el lector al código
              </p>
            )}
          </div>

          {/* Tipo de precio */}
          <div className="space-y-1.5">
            <Label>Tipo de precio</Label>
            <FieldSelect
              value={priceType}
              onChange={(v) => setValue('price_type', v as ProductInput['price_type'], { shouldDirty: true })}
              options={[
                { value: 'fixed', label: 'Precio fijo', hint: 'El precio de siempre', icon: Coins },
                { value: 'open', label: 'Precio variable', hint: 'Se captura el monto al vender', icon: Banknote },
                { value: 'kg', label: 'Por kilogramo', hint: 'Total = peso × precio/kg', icon: Scale },
              ]}
            />
            {isKg && (
              <div className="mt-3 rounded-xl border border-[#E85D04]/30 bg-orange-50/60 p-3 dark:border-[#E85D04]/25 dark:bg-orange-500/10">
                <Label className="flex items-center gap-1.5 text-[#C2410C] dark:text-orange-300">
                  <Scale className="h-4 w-4" /> Precio por KG (base) *
                </Label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold text-[#E85D04]">$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    autoFocus
                    {...register('price_per_kg', { valueAsNumber: true })}
                    placeholder="280.00"
                    className="h-11 rounded-xl pl-8 pr-20 text-base font-semibold tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MXN / kg</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Es el precio que se usará para este producto. El total se calcula por el peso al vender.
                </p>
              </div>
            )}
          </div>

          {/* Station override */}
          <div className="space-y-1.5">
            <Label>Override de estación (opcional)</Label>
            <FieldSelect
              value={watch('station_override') ?? ''}
              onChange={(v) => setValue('station_override', v as ProductInput['station_override'], { shouldDirty: true })}
              placeholder="Usar estación de categoría"
              options={[
                { value: '', label: 'Usar estación de categoría' },
                { value: 'hot', label: 'Caliente', hint: 'Forzar a cocina', icon: Flame },
                { value: 'cold', label: 'Fría / Bar', hint: 'Forzar a barra', icon: Snowflake },
                { value: 'both', label: 'Ambas estaciones', hint: 'Cocina y barra', icon: Scale },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Modificadores personalizados</Label>
            <ModifierTagsInput
              value={customModifiers}
              onChange={setCustomModifiers}
              placeholder="Ej. Sin cebolla, con extra aguacate..."
            />
          </div>

          {/* Available + Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="available"
                checked={watch('available')}
                onCheckedChange={v => setValue('available', v)}
              />
              <Label htmlFor="available">Disponible para venta</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground text-xs">Orden</Label>
              <Input
                type="number"
                {...register('sort_order', { valueAsNumber: true })}
                className="w-16 h-8 text-sm"
                min="0"
              />
            </div>
          </div>

              </div>
            </div>
          </div>

          {/* Acciones fijas (siempre visibles) */}
          <div
            className="shrink-0 border-t bg-background px-6 py-3 flex gap-3 justify-end"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#E85D04] hover:bg-[#C44D00]"
            >
              {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [isSticky, setIsSticky] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: categories = [] } = useCategories(branchId)
  const { data: products = [], isLoading } = useProducts(branchId, {
    categoryId: selectedCategory ?? undefined,
  })

  useEffect(() => {
    const handleScroll = () => {
      if (!searchRef.current) return
      const rect = searchRef.current.getBoundingClientRect()
      setIsSticky(rect.bottom < 64)
    }

    const scrollContainer = searchRef.current?.closest('main')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const handleToggleAvailable = async (product: Product, available: boolean) => {
    const fd = new FormData()
    fd.append('available', available ? '1' : '0')
    try {
      await updateProduct.mutateAsync({ id: product.id, formData: fd })
    } catch {
      toast.error('Error al actualizar disponibilidad')
    }
  }

  const handleDelete = async () => {
    if (!deleteProductId) return
    try {
      await deleteProduct.mutateAsync(deleteProductId)
      toast.success('Producto eliminado')
      setDeleteProductId(null)
    } catch {
      toast.error('Error al eliminar producto')
    }
  }

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      product.name.toLowerCase().includes(term) ||
      (product.description && product.description.toLowerCase().includes(term)) ||
      (product.barcode && product.barcode.toLowerCase().includes(term))
    )
  })

  const renderSearchInput = (id: string, isStickyVariant: boolean) => {
    return (
      <div
        className={cn(
          "relative flex items-center transition-all duration-300 ease-in-out rounded-xl border border-input bg-muted/40 hover:bg-muted/60 focus-within:bg-background focus-within:ring-2 focus-within:ring-[#E85D04] focus-within:border-[#E85D04]",
          isStickyVariant
            ? "w-full max-w-sm sm:max-w-md focus-within:max-w-xl"
            : "w-full sm:w-64 md:w-72 focus-within:sm:w-[380px] focus-within:md:w-[440px]"
        )}
      >
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-[#E85D04]" />
        <Input
          id={id}
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-10 pl-10 pr-9 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  if (!branchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sin sucursal asignada</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sticky Floating Search Bar */}
      <div className="sticky top-0 z-30 h-0 overflow-visible pointer-events-none">
        <div
          className={cn(
            "w-full bg-background/95 backdrop-blur-md border-b shadow-sm transition-all duration-300 ease-in-out py-3 px-4 sm:px-6 -mx-4 sm:-mx-6",
            isSticky
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-xs">
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.name ?? 'Menú'
                  : 'Todos los productos'}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap bg-muted px-2 py-1 rounded-full">
                {filteredProducts.length} items
              </span>
            </div>
            {renderSearchInput('menu-search-sticky', true)}
            <div className="w-10 sm:w-20 md:w-32 flex justify-end">
              {/* Espacio para balancear el diseño */}
            </div>
          </div>
        </div>
      </div>
      <PageHeader
        title="Carta / Menú"
        description="Gestiona categorías y productos de tu sucursal"
        actions={
          <Button
            onClick={() => { setEditingProduct(null); setModalOpen(true) }}
            className="bg-[#E85D04] hover:bg-[#C44D00]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar Producto
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Category panel */}
        <CategoryPanel
          branchId={branchId}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Products grid */}
        <div className="flex-1">
          <div ref={searchRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
              {selectedCategory
                ? ` en "${categories.find(c => c.id === selectedCategory)?.name ?? ''}"`
                : ' en total'}
              {searchTerm && (
                <span>
                  {' '}
                  que coinciden con <span className="font-semibold text-foreground">"{searchTerm}"</span>
                </span>
              )}
            </p>
            {renderSearchInput('menu-search-inline', false)}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icons8Image src={ICONS8.products} alt="productos" size={64} className="mb-4 opacity-30" />
              <p className="text-muted-foreground font-medium">No hay productos</p>
              <p className="text-muted-foreground text-sm mt-1">
                Agrega tu primer producto usando el botón de arriba
              </p>
              <Button
                className="mt-4 bg-[#E85D04] hover:bg-[#C44D00]"
                onClick={() => { setEditingProduct(null); setModalOpen(true) }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Agregar producto
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Icons8Image src={ICONS8.products} alt="productos" size={64} className="mb-4 opacity-30 animate-pulse" />
              <p className="text-muted-foreground font-medium">No se encontraron productos</p>
              <p className="text-muted-foreground text-sm mt-1">
                No hay resultados para "{searchTerm}". Prueba con otros términos.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-[#E85D04] text-[#E85D04] hover:bg-[#E85D04]/10 hover:text-[#E85D04]"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4 mr-1.5" />
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => { setEditingProduct(product); setModalOpen(true) }}
                  onDelete={() => setDeleteProductId(product.id)}
                  onToggle={v => handleToggleAvailable(product, v)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null) }}
        branchId={branchId}
        categories={categories}
        editing={editingProduct}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteProductId !== null}
        onOpenChange={open => !open && setDeleteProductId(null)}
        title="Eliminar producto"
        description="¿Seguro que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
