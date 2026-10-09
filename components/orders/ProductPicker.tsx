'use client'

import { useMemo, useState, useEffect } from 'react'
import { Minus, Plus, Search, X, LayoutGrid, UtensilsCrossed, GlassWater, SlidersHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useProducts, useCategories, useModifiers } from '@/lib/api/queries'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useDebounce } from '@/hooks/useDebounce'
import { useKioskMode } from '@/hooks/useKioskMode'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { filterProducts, canAddProduct, resolveQuickAdd, findMergeableLine, isOpenPrice, isKgPrice } from '@/lib/utils/productSearch'
import { ModifierDialog } from './ModifierDialog'
import { OpenPriceDialog } from './OpenPriceDialog'
import { KgPriceDialog, type KgCapture } from './KgPriceDialog'
import type { DraftOrderItem } from './OrderSummary'
import type { Product, ChosenModifier, ModifierGroup, MenuGroup } from '@/lib/types'

interface ProductPickerProps {
  items: DraftOrderItem[]
  onAdd: (item: DraftOrderItem) => void
  onRemove: (uid: string) => void
  onUpdateQty: (uid: string, qty: number) => void
}

function makeUid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ProductPicker({ items, onAdd, onRemove, onUpdateQty }: ProductPickerProps) {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const { isKiosk } = useKioskMode()
  const [group, setGroup] = useState<MenuGroup | null>(null)
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState<string | null>(null)
  const [modProduct, setModProduct] = useState<Product | null>(null)
  const [modOpen, setModOpen] = useState(false)
  const [priceProduct, setPriceProduct] = useState<Product | null>(null)
  const [priceOpen, setPriceOpen] = useState(false)
  const [kgProduct, setKgProduct] = useState<Product | null>(null)
  const [kgOpen, setKgOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 250)

  const { data: products = [], isLoading: loadingProducts } = useProducts(branchId)
  const { data: categories = [] } = useCategories(branchId)
  const { data: modifierGroups = [] } = useModifiers(branchId)

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [Number(c.id), c])),
    [categories],
  )

  // Grupos presentes (solo mostramos Alimentos/Bebidas si hay categorías de ambos).
  const groupsPresent = useMemo(() => {
    const s = new Set<MenuGroup>()
    categories.forEach(c => s.add(c.menu_group ?? 'alimento'))
    return s
  }, [categories])
  const showGroupTabs = groupsPresent.size > 1

  // Categorías visibles según el grupo elegido (subcategorías del grupo).
  const categoriesInView = useMemo(
    () => (group == null ? categories : categories.filter(c => (c.menu_group ?? 'alimento') === group)),
    [categories, group],
  )

  // Productos acotados al grupo antes de aplicar búsqueda/categoría.
  const productsInGroup = useMemo(
    () => (group == null ? products : products.filter(p => (categoriesById.get(Number(p.category_id))?.menu_group ?? 'alimento') === group)),
    [products, categoriesById, group],
  )

  // Si la categoría elegida no pertenece al grupo activo, la deseleccionamos.
  useEffect(() => {
    if (selectedCat != null && group != null && (categoriesById.get(selectedCat)?.menu_group ?? 'alimento') !== group) {
      setSelectedCat(null)
    }
  }, [group, selectedCat, categoriesById])

  // Filtrado memoizado: no recalcula salvo que cambien datos/consulta/categoría/grupo.
  const filtered = useMemo(
    () => filterProducts(productsInGroup, categoriesById, { query: debouncedSearch, categoryId: selectedCat }),
    [productsInGroup, categoriesById, debouncedSearch, selectedCat],
  )

  const quickProducts = useMemo(
    () => productsInGroup
      .filter(p => canAddProduct(p) && ['Popular', 'Recomendado', 'Promo', 'Especialidad'].includes(p.badge ?? ''))
      .slice(0, 10),
    [productsInGroup],
  )

  const groupsForProduct = (productId: number): ModifierGroup[] =>
    modifierGroups.filter(g => g.product_ids.includes(productId))

  useBarcodeScanner((code) => {
    const found = products.find(p => p.barcode === code)
    if (found) {
      handleProductTap(found)
      setBarcodeProduct(found.name)
      setTimeout(() => setBarcodeProduct(null), 3000)
    }
  }, true)

  // Cantidad total de un producto (sumando todas sus líneas).
  const getQty = (productId: number) =>
    items.filter(i => i.product_id === productId).reduce((s, i) => s + i.quantity, 0)

  // Tap en la tarjeta/imagen: siempre alta rápida (1 toque = 1 unidad), para
  // poder agregar varios platillos seguido sin que el modal de modificadores
  // interrumpa cada vez. Kg/precio abierto siguen exigiendo su captura (son
  // datos obligatorios, no una personalización opcional). Los modificadores
  // se eligen aparte con el botón "Personalizar" (ver handleOpenModifiers).
  const handleProductTap = (product: Product) => {
    if (!canAddProduct(product)) {
      toast.error(
        !product.available
          ? `${product.name} no está disponible`
          : `${product.name} no tiene un precio válido`,
      )
      return
    }
    // Por kilogramo: capturar peso y precio/kg (total = peso × precio/kg).
    if (isKgPrice(product)) {
      setKgProduct(product)
      setKgOpen(true)
      return
    }
    // Precio variable: capturar el monto final al momento de la venta.
    if (isOpenPrice(product)) {
      setPriceProduct(product)
      setPriceOpen(true)
      return
    }
    quickAdd(product)
  }

  /** Botón "Personalizar": abre el modal de modificadores explícitamente (no bloquea el alta rápida). */
  const handleOpenModifiers = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setModProduct(product)
    setModOpen(true)
  }

  // Confirma el precio capturado de un producto de precio abierto y lo agrega
  // como línea normal (ligada al producto real).
  const handleConfirmOpenPrice = (unitPrice: number, notes: string) => {
    if (!priceProduct) return
    onAdd({
      uid: makeUid(),
      product_id: priceProduct.id,
      product_name: priceProduct.name,
      quantity: 1,
      unit_price: unitPrice,
      subtotal: unitPrice,
      price_type: 'open',
      selectedModifiers: [],
      item_notes: notes || undefined,
    })
    toast.success(`${priceProduct.name} agregado`, { duration: 1200 })
  }

  // Confirma peso × precio/kg de un producto por kilogramo y lo agrega como línea
  // (cantidad fija = 1; el subtotal es el total calculado).
  const handleConfirmKg = (cap: KgCapture) => {
    if (!kgProduct) return
    onAdd({
      uid: makeUid(),
      product_id: kgProduct.id,
      product_name: kgProduct.name,
      quantity: 1,
      unit_price: cap.unit_price,
      subtotal: cap.unit_price,
      price_type: 'kg',
      weight_kg: cap.weight_kg,
      price_per_kg: cap.price_per_kg,
      selectedModifiers: [],
      item_notes: cap.notes || undefined,
    })
    toast.success(`${kgProduct.name} agregado`, { duration: 1200 })
  }

  // Alta rápida: fusiona en la línea sin modificadores si ya existe.
  const quickAdd = (product: Product) => {
    const resolution = resolveQuickAdd(items, product.id)
    if (resolution.type === 'increment') {
      onUpdateQty(resolution.uid, resolution.quantity)
    } else {
      onAdd({
        uid: makeUid(),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price,
        selectedModifiers: [],
      })
    }
    toast.success(`${product.name} agregado`, { duration: 1200 })
  }

  const handleConfirmModifiers = (
    modifiers: ChosenModifier[],
    notes: string,
    extraPrice: number,
    selectedModifiers?: string[]
  ) => {
    if (!modProduct) return
    const unitPrice = modProduct.price + extraPrice
    // Si ya existe una línea con la misma configuración (mismos modificadores y
    // nota), fusionamos incrementando su cantidad en vez de duplicar la línea.
    const existing = findMergeableLine(items, {
      product_id: modProduct.id,
      modifiers,
      selectedModifiers: selectedModifiers || [],
      item_notes: notes || undefined,
    })
    if (existing) {
      onUpdateQty(existing.uid, existing.quantity + 1)
    } else {
      onAdd({
        uid: makeUid(),
        product_id: modProduct.id,
        product_name: modProduct.name,
        quantity: 1,
        unit_price: unitPrice,
        subtotal: unitPrice,
        modifiers,
        item_notes: notes || undefined,
        selectedModifiers: selectedModifiers || [],
      })
    }
    toast.success(`${modProduct.name} agregado`, { duration: 1200 })
  }

  // Incrementa la última línea de ese producto sin reabrir el diálogo de
  // modificadores (el mesero ya eligió la configuración al agregarlo).
  const handleIncrease = (productId: number) => {
    const lines = items.filter(i => i.product_id === productId)
    const last = lines[lines.length - 1]
    if (last) onUpdateQty(last.uid, last.quantity + 1)
  }

  // Decrementa la última línea de ese producto.
  const handleDecrease = (productId: number) => {
    const lines = items.filter(i => i.product_id === productId)
    const last = lines[lines.length - 1]
    if (!last) return
    if (last.quantity <= 1) onRemove(last.uid)
    else onUpdateQty(last.uid, last.quantity - 1)
  }

  return (
    <div className="flex flex-col h-full">
      {barcodeProduct && (
        <div className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <span>📷 Scanner activo</span>
          <span className="font-semibold">{barcodeProduct}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="mb-3 rounded-2xl border bg-card p-2 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar platillo, bebida, categoría o código…"
            aria-label="Buscar productos"
            className="h-12 border-0 bg-muted/50 pl-10 pr-10 text-base shadow-none focus-visible:ring-1 focus-visible:ring-[#CA8A04]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de grupo: Alimentos / Bebidas (solo si hay de ambos) */}
      {showGroupTabs && (
        <div className="grid grid-cols-3 gap-1 p-1 mb-3 rounded-2xl bg-muted/60">
          {([
            { value: null,       label: 'Todo',      Icon: LayoutGrid },
            { value: 'alimento', label: 'Alimentos', Icon: UtensilsCrossed },
            { value: 'bebida',   label: 'Bebidas',   Icon: GlassWater },
          ] as const).map(t => (
            <button
              key={t.label}
              onClick={() => setGroup(t.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold transition-colors',
                group === t.value ? 'bg-white text-yellow-700 shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Filtros rápidos de categoría (subcategorías del grupo) */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCat(null)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors',
            selectedCat === null ? 'bg-[#FACC15] text-stone-950' : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Todos
        </button>
        {categoriesInView.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(c => c === Number(cat.id) ? null : Number(cat.id))}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5',
              selectedCat === Number(cat.id) ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            style={selectedCat === Number(cat.id) ? { backgroundColor: cat.color } : {}}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedCat === Number(cat.id) ? '#fff' : cat.color }} />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {!debouncedSearch && selectedCat == null && quickProducts.length > 0 && (
        <div className="mb-4 rounded-2xl border bg-[#FFFBEB] p-3 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-yellow-200">
              <Sparkles className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
              Rápidos y populares
            </p>
            <span className="text-[11px] font-medium text-stone-500 dark:text-yellow-300/70">1 toque para agregar</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickProducts.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductTap(product)}
                className="min-w-[170px] max-w-[190px] rounded-xl border border-amber-200 bg-white p-2 text-left shadow-sm transition-all hover:border-[#EAB308] hover:shadow-md active:scale-[0.98] dark:border-amber-900/40 dark:bg-stone-950"
              >
                <span className="block truncate text-sm font-bold">{product.name}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{product.badge}</span>
                  <span className="text-sm font-extrabold text-yellow-700 dark:text-yellow-400">{formatCurrency(product.price)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : (
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 scrollbar-thin pr-1 pb-2", isKiosk && "gap-4")}>
          {filtered.map(product => {
            const qty = getQty(product.id)
            const addable = canAddProduct(product)
            const openPrice = isOpenPrice(product)
            const kgPrice = isKgPrice(product)
            const cat = categoriesById.get(Number(product.category_id))
            const hasMods = groupsForProduct(product.id).length > 0 || (Array.isArray(product.modifiers) && product.modifiers.length > 0)
            return (
              <div
                key={product.id}
                className={cn(
                  'group relative border rounded-2xl overflow-hidden bg-card flex flex-col transition-all shadow-sm',
                  !addable ? 'opacity-60 cursor-not-allowed' :
                  qty > 0 ? 'border-[#EAB308] ring-2 ring-[#FACC15]/20 cursor-pointer shadow-md' :
                  'hover:border-[#EAB308]/60 hover:shadow-md cursor-pointer active:scale-[0.99]',
                )}
                onClick={() => handleProductTap(product)}
              >
                {/* Imagen estilo carta */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 overflow-hidden">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={cn('w-full h-full object-cover transition-transform duration-300 group-hover:scale-105', !product.available && 'grayscale')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">{product.emoji ?? '🍽️'}</div>
                  )}
                  {product.badge && product.available && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full bg-white/95 text-yellow-700 shadow">
                      {product.badge}
                    </span>
                  )}
                  {qty > 0 && (
                    <span className="absolute top-2 left-2 min-w-5 h-5 px-1 rounded-full bg-[#FACC15] text-stone-950 text-[11px] font-bold flex items-center justify-center shadow">{qty}</span>
                  )}
                  {!product.available && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shadow">Agotado</span>
                  )}
                  <span className="absolute bottom-2 right-2 inline-flex items-center rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-white text-xs font-extrabold shadow">
                    {kgPrice
                      ? `${formatCurrency(product.price_per_kg ?? 0)}/kg`
                      : openPrice
                        ? 'Precio variable'
                        : formatCurrency(product.price)}
                  </span>
                </div>

                {/* Info + controles */}
                <div className={cn("p-3 flex flex-col flex-1", isKiosk && "p-3.5")}>
                  <p className={cn("text-sm font-bold leading-tight line-clamp-2", isKiosk && "text-sm")}>{product.name}</p>
                  {cat && (
                    <p className={cn("mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground leading-tight", isKiosk && "text-xs")}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </p>
                  )}

                  {hasMods && addable && !openPrice && !kgPrice && (
                    <button
                      type="button"
                      onClick={e => handleOpenModifiers(product, e)}
                      aria-label={`Personalizar ${product.name} (modificadores)`}
                      className={cn(
                        "mt-1 flex items-center gap-1 text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded border border-[#EAB308]/20 w-fit transition-colors hover:bg-amber-100 active:scale-95 dark:hover:bg-amber-900/30",
                        isKiosk && "text-xs px-2.5 py-1.5",
                      )}
                    >
                      <SlidersHorizontal className={cn("h-2.5 w-2.5", isKiosk && "h-3.5 w-3.5")} />
                      Personalizar
                    </button>
                  )}

                  {!addable ? (
                    <span className={cn("mt-2 w-full py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-center text-muted-foreground", isKiosk && "text-xs py-2")}>
                      No disponible
                    </span>
                  ) : qty > 0 && !openPrice && !kgPrice ? (
                    <div className="mt-auto flex items-center justify-between pt-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDecrease(product.id)}
                        aria-label={`Quitar uno de ${product.name}`}
                        className={cn(
                          "rounded-full border border-[#EAB308] flex items-center justify-center text-yellow-700 dark:text-yellow-400 hover:bg-[#FACC15] hover:text-stone-950 transition-colors",
                          isKiosk ? "w-11 h-11" : "w-9 h-9"
                        )}
                      >
                        <Minus className={cn("h-3 w-3", isKiosk && "h-5 w-5")} />
                      </button>
                      <span className={cn("text-base font-extrabold tabular-nums", isKiosk && "text-base")}>{qty}</span>
                      <button
                        onClick={() => handleIncrease(product.id)}
                        aria-label={`Agregar uno de ${product.name}`}
                        className={cn(
                          "rounded-full bg-[#FACC15] flex items-center justify-center text-stone-950 hover:bg-[#EAB308] transition-colors",
                          isKiosk ? "w-11 h-11" : "w-9 h-9"
                        )}
                      >
                        <Plus className={cn("h-3 w-3", isKiosk && "h-5 w-5")} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleProductTap(product) }}
                      className={cn(
                        "mt-auto w-full rounded-xl bg-[#FACC15] py-2.5 text-sm font-bold text-stone-950 hover:bg-[#EAB308] transition-colors",
                        isKiosk ? "py-2.5 text-sm" : "py-2.5 text-sm"
                      )}
                    >
                      {kgPrice ? 'Pesar y agregar' : openPrice ? 'Capturar precio' : 'Agregar'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
              No se encontraron productos
            </div>
          )}
        </div>
      )}

      <ModifierDialog
        product={modProduct}
        groups={modProduct ? groupsForProduct(modProduct.id) : []}
        open={modOpen}
        onOpenChange={setModOpen}
        onConfirm={handleConfirmModifiers}
      />

      <OpenPriceDialog
        product={priceProduct}
        open={priceOpen}
        onOpenChange={setPriceOpen}
        onConfirm={handleConfirmOpenPrice}
      />

      <KgPriceDialog
        product={kgProduct}
        open={kgOpen}
        onOpenChange={setKgOpen}
        onConfirm={handleConfirmKg}
      />
    </div>
  )
}
