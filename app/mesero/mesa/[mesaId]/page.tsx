'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Vista "Mesa Activa": pantalla única de toma de comandas del mesero.
 * Una acción por pantalla — sin sidebar, sin modales apilados. La vista solo
 * orquesta hooks y componentes; la lógica de negocio vive en el store y los
 * hooks de datos (lib/stores/orderDraftStore.ts, lib/api/queries/useMesero.ts).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { use, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RotateCcw, Search, X } from 'lucide-react'
import { Input } from '@heroui/react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useMenu, useMesaOrden, useEnviarOrden, isNetworkFailure } from '@/lib/api/queries/useMesero'
import { ApiError } from '@/lib/api/client'
import {
  useOrderDraftStore, useMesaDraft, useMesaDraftNote, draftTotal, makeDraftUid,
} from '@/lib/stores/orderDraftStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOutboxStatus } from '@/hooks/useOutboxStatus'
import { OfflineQueueBanner } from '@/components/mesero/OfflineQueueBanner'
import { canAddProduct, filterProducts, isKgPrice, isOpenPrice, resolveSearchSubmit } from '@/lib/utils/productSearch'
import { readLastConfig, saveLastConfig, type LastLineConfig } from '@/lib/utils/lastLineConfig'
import { useDebounce } from '@/hooks/useDebounce'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { formatCurrency } from '@/lib/utils/formatters'
import { MesaActivaHeader } from '@/components/mesero/MesaActivaHeader'
import { CategoryTabs } from '@/components/mesero/CategoryTabs'
import { ItemMenuCard } from '@/components/mesero/ItemMenuCard'
import { ModificadorSheet, type ModificadorSheetConfirmInput } from '@/components/mesero/ModificadorSheet'
import { CarritoFlotante } from '@/components/mesero/CarritoFlotante'
import { VoiceOrderButton } from '@/components/mesero/VoiceOrderButton'
import { VoiceConfirmSheet, type VoiceReviewLine } from '@/components/mesero/VoiceConfirmSheet'
import { ConflictBanner } from '@/components/mesero/ConflictBanner'
import { RepetirRondaSheet, repeatableItems } from '@/components/mesero/RepetirRondaSheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrderItem, Product, VoiceParseResult } from '@/lib/types'

const CONFIDENCE_THRESHOLD = 0.75

export default function MesaActivaPage({ params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId: mesaIdParam } = use(params)
  const parsedMesaId = Number(mesaIdParam)
  const mesaId = Number.isFinite(parsedMesaId) ? parsedMesaId : -1

  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const haptic = useHapticFeedback()

  const { data: mesaData, isLoading: loadingMesa } = useMesaOrden(mesaId)
  const table = mesaData?.table ?? null
  const order = mesaData?.order ?? null

  const { products, categories, modifierGroups, isLoading: loadingMenu } = useMenu(branchId)

  const draftItems = useMesaDraft(mesaId)
  const draftNote = useMesaDraftNote(mesaId)
  const addItem = useOrderDraftStore(s => s.addItem)
  const incrementLine = useOrderDraftStore(s => s.incrementLine)
  const decrementLine = useOrderDraftStore(s => s.decrementLine)
  const removeLine = useOrderDraftStore(s => s.removeLine)
  const clearDraft = useOrderDraftStore(s => s.clearDraft)

  const enviarOrden = useEnviarOrden(mesaId)
  const isOnline = useOnlineStatus()
  const outbox = useOutboxStatus()

  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const [modProduct, setModProduct] = useState<Product | null>(null)
  const [modOpen, setModOpen] = useState(false)
  const [modLastConfig, setModLastConfig] = useState<LastLineConfig | null>(null)
  const [repeatOpen, setRepeatOpen] = useState(false)
  const [voiceResult, setVoiceResult] = useState<VoiceParseResult | null>(null)

  // Detección de conflicto: si `updated_at` cambia respecto al valor que
  // teníamos al empezar a editar (y no fue por nuestro propio envío), otra
  // estación tocó la mesa mientras armábamos el pedido.
  const baselineRef = useRef<string | null>(null)
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    if (!order) return
    if (baselineRef.current === null) {
      baselineRef.current = order.updated_at
      return
    }
    if (order.updated_at !== baselineRef.current) setConflict(true)
  }, [order])

  const modifierGroupsForProduct = (productId: number) =>
    modifierGroups.filter(g => g.product_ids.includes(productId))

  const categoriesById = useMemo(
    () => new Map(categories.map(c => [Number(c.id), c])),
    [categories],
  )

  const filteredProducts = useMemo(
    () => filterProducts(products, categoriesById, { query: debouncedSearch, categoryId: activeCategory }),
    [products, categoriesById, debouncedSearch, activeCategory],
  )

  const repeatableCount = useMemo(() => repeatableItems(order?.items ?? []).length, [order])

  /** Pista bajo el buscador: usa el mismo resolutor que Enter, así nunca miente. */
  const searchHint = useMemo(
    () => (debouncedSearch ? resolveSearchSubmit(filteredProducts, debouncedSearch)?.name ?? null : null),
    [debouncedSearch, filteredProducts],
  )

  const getQty = (productId: number) =>
    draftItems.filter(i => i.product_id === productId).reduce((s, i) => s + i.quantity, 0)

  const quickAdd = (product: Product) => {
    addItem(mesaId, {
      uid: makeDraftUid(),
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
      selectedModifiers: [],
    })
    haptic()
    toast.success(`${product.name} agregado`, { duration: 1200 })
  }

  const handleTap = (product: Product) => {
    if (isKgPrice(product) || isOpenPrice(product)) {
      toast.error(`${product.name} requiere captura de precio — usa "Tomar pedido" clásico`)
      return
    }
    if (!canAddProduct(product)) {
      toast.error(`${product.name} no tiene un precio válido`)
      return
    }
    quickAdd(product)
  }

  const handleLongPress = (product: Product) => {
    if (isKgPrice(product) || isOpenPrice(product)) {
      toast.error(`${product.name} requiere captura de precio — usa "Tomar pedido" clásico`)
      return
    }
    const hasMods = modifierGroupsForProduct(product.id).length > 0 || (product.modifiers?.length ?? 0) > 0
    if (!hasMods) { quickAdd(product); return }
    setModProduct(product)
    // Se lee al abrir, no en render: el atajo "Repetir última" vive en
    // localStorage y así refleja siempre la última configuración guardada.
    setModLastConfig(readLastConfig(product.id))
    setModOpen(true)
  }

  /**
   * Enter en el buscador agrega directo cuando no hay ambigüedad: escribir
   * "coca" + Enter evita tener que localizar y tocar la card en la cuadrícula.
   * También cubre el caso de un lector de código de barras, que teclea el código
   * y termina en Enter.
   */
  const handleSearchSubmit = () => {
    const matches = filterProducts(products, categoriesById, { query: search, categoryId: activeCategory })
    const product = resolveSearchSubmit(matches, search)
    if (!product) {
      if (matches.length > 1) toast.info(`${matches.length} coincidencias — elige una`, { duration: 1400 })
      return
    }
    handleTap(product)
    setSearch('')
  }

  const handleRepeat = (items: OrderItem[]) => {
    items.forEach(item => {
      addItem(mesaId, {
        uid: makeDraftUid(),
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
        modifiers: item.modifiers,
        selectedModifiers: item.selectedModifiers ?? [],
        item_notes: item.item_notes ?? undefined,
      })
    })
    haptic()
    toast.success(
      items.length === 1 ? `${items[0].product_name} agregado` : `${items.length} líneas agregadas`,
      { duration: 1400 },
    )
  }

  const handleConfirmModifiers = (input: ModificadorSheetConfirmInput) => {
    if (!modProduct) return
    saveLastConfig(modProduct.id, {
      modifiers: input.modifiers,
      selectedModifiers: input.selectedModifiers,
      notes: input.notes,
    })
    addItem(mesaId, {
      uid: makeDraftUid(),
      product_id: modProduct.id,
      product_name: modProduct.name,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      subtotal: input.unitPrice * input.quantity,
      modifiers: input.modifiers,
      selectedModifiers: input.selectedModifiers,
      item_notes: input.notes || undefined,
    })
    toast.success(`${modProduct.name} agregado`, { duration: 1200 })
  }

  const handleVoiceResolved = (result: VoiceParseResult) => {
    const resolved = result.items.map(item => ({ item, product: products.find(p => p.id === item.productoId) }))
    const allResolved = resolved.length > 0 && resolved.every(r => !!r.product)

    if (result.confianza >= CONFIDENCE_THRESHOLD && result.ambiguedades.length === 0 && allResolved) {
      resolved.forEach(({ item, product }) => {
        if (!product) return
        addItem(mesaId, {
          uid: makeDraftUid(),
          product_id: product.id,
          product_name: product.name,
          quantity: item.cantidad,
          unit_price: product.price,
          subtotal: product.price * item.cantidad,
          selectedModifiers: item.modificadores,
        })
      })
      toast.success('Pedido agregado por voz')
      return
    }
    // Confianza baja o ambigüedades: nunca se agrega sin confirmación visual.
    setVoiceResult(result)
  }

  const handleVoiceConfirmLines = (lines: VoiceReviewLine[]) => {
    lines.forEach(l => {
      addItem(mesaId, {
        uid: makeDraftUid(),
        product_id: l.productId,
        product_name: l.productName,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        subtotal: l.unitPrice * l.quantity,
        selectedModifiers: [],
      })
    })
    toast.success('Pedido agregado desde la confirmación por voz')
  }

  const handleSend = async () => {
    if (draftItems.length === 0 || !branchId) return
    try {
      const result = await enviarOrden.mutateAsync({
        branchId,
        createdBy: user?.id,
        tableName: table?.name ?? `Mesa ${mesaId}`,
        existingOrderId: order?.id ?? null,
        items: draftItems,
        notes: draftNote,
        clientRequestId: makeDraftUid(),
      })
      baselineRef.current = result.order.updated_at
      setConflict(false)
      clearDraft(mesaId)
      toast.success('Pedido enviado a cocina', { description: `${draftItems.length} línea(s)` })
    } catch (err) {
      if (isNetworkFailure(err)) {
        // Ya quedó encolado en el outbox offline (ver onError de
        // useEnviarOrden) — el mesero no perdió el pedido, solo espera señal.
        clearDraft(mesaId)
        toast.info('Sin conexión — el pedido se enviará automáticamente al reconectar')
        return
      }
      toast.error(err instanceof ApiError ? err.message : 'No se pudo enviar el pedido, intenta de nuevo')
    }
  }

  const handleViewChanges = () => {
    if (order) {
      toast.info(`Mesa actualizada: ${order.items.length} línea(s) · ${formatCurrency(order.total)}`)
      baselineRef.current = order.updated_at
    }
    setConflict(false)
  }

  if (loadingMesa || loadingMenu) {
    return (
      <div className="flex h-full flex-col gap-3 p-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (mesaId === -1) {
    return <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">Mesa inválida</div>
  }

  return (
    <div className="flex h-full flex-col">
      <MesaActivaHeader table={table} order={order} />

      {conflict && (
        <ConflictBanner
          waiterName={order?.waiter_name}
          onViewChanges={handleViewChanges}
          onDismiss={() => setConflict(false)}
        />
      )}

      <OfflineQueueBanner
        pendingCount={outbox.pendingCount}
        failedCount={outbox.failedCount}
        isSyncing={outbox.isSyncing}
        isOnline={isOnline}
        onRetryFailed={outbox.retryFailed}
      />

      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 pt-2">
        <Input
          value={search}
          onValueChange={setSearch}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleSearchSubmit() }
          }}
          placeholder="Buscar platillo, bebida o código…"
          aria-label="Buscar productos"
          radius="full"
          size="lg"
          variant="flat"
          startContent={<Search className="h-4 w-4 text-muted-foreground" />}
          endContent={search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          classNames={{
            base: 'flex-1',
            inputWrapper: 'bg-muted/50 shadow-none data-[hover=true]:bg-muted/70 group-data-[focus=true]:ring-1 group-data-[focus=true]:ring-[#FACC15]',
          }}
        />

        {repeatableCount > 0 && (
          <button
            type="button"
            onClick={() => { haptic(); setRepeatOpen(true) }}
            aria-label={`Repetir lo de esta mesa (${repeatableCount} líneas)`}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-[#EAB308]/30 bg-[#FACC15]/5 px-4 text-sm font-bold text-yellow-700 dark:text-yellow-400 transition-colors active:scale-95 touch-manipulation"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Repetir</span>
          </button>
        )}
      </div>

      {searchHint && (
        <p className="mx-auto w-full max-w-5xl px-4 pt-1 text-xs text-muted-foreground">
          Enter para agregar <span className="font-semibold">{searchHint}</span>
        </p>
      )}

      <div className="mx-auto w-full max-w-5xl">
        <CategoryTabs categories={categories} activeId={activeCategory} onChange={setActiveCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-40 scrollbar-thin">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map(product => (
            <ItemMenuCard
              key={product.id}
              product={product}
              qtyInCart={getQty(product.id)}
              onTap={() => handleTap(product)}
              onLongPress={() => handleLongPress(product)}
            />
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'No hay productos en esta categoría'}
            </p>
          )}
        </div>
      </div>

      <CarritoFlotante
        items={draftItems}
        total={draftTotal(draftItems)}
        sending={enviarOrden.isPending}
        onIncrement={uid => incrementLine(mesaId, uid)}
        onDecrement={uid => decrementLine(mesaId, uid)}
        onRemove={uid => removeLine(mesaId, uid)}
        onSend={handleSend}
      />

      <VoiceOrderButton mesaId={mesaId} onResolved={handleVoiceResolved} />

      <ModificadorSheet
        product={modProduct}
        groups={modProduct ? modifierGroupsForProduct(modProduct.id) : []}
        open={modOpen}
        onOpenChange={setModOpen}
        onConfirm={handleConfirmModifiers}
        lastConfig={modLastConfig}
      />

      <RepetirRondaSheet
        open={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        items={order?.items ?? []}
        onRepeat={handleRepeat}
      />

      <VoiceConfirmSheet
        result={voiceResult}
        products={products}
        onClose={() => setVoiceResult(null)}
        onConfirm={handleVoiceConfirmLines}
      />
    </div>
  )
}
