'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useTables, useCreateOrder, useCustomers, useCreateCustomer, useUpdateCustomer } from '@/lib/api/queries'
import { ApiError } from '@/lib/api/client'
import { usePrinter } from '@/hooks/usePrinter'
import { useBranchTaxFor } from '@/hooks/useBranchTax'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductPicker } from '@/components/orders/ProductPicker'
import { ComboPicker } from '@/components/orders/ComboPicker'
import { OrderSummary, type DraftOrderItem } from '@/components/orders/OrderSummary'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { ArrowLeft, ArrowRight, Check, ClipboardList, MapPin, Truck, UtensilsCrossed, Bike } from 'lucide-react'
import type { Customer } from '@/lib/types'

const STEPS = ['Servicio', 'Menú', 'Enviar'] as const

const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Coahuila', 'Colima', 'Ciudad de México', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'Estado de México', 'Michoacán', 'Morelos',
  'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas'
]

type DeliveryFields = {
  alias: string; street: string; number: string; colony: string; city: string; state: string; phone: string; references: string
}

/** Compone los campos de domicilio en un texto limpio y legible para cocina/repartidor/ticket. */
function composeAddress(d: DeliveryFields): string {
  const calle  = [d.street.trim(), d.number.trim() && `#${d.number.trim()}`].filter(Boolean).join(' ')
  const lugar  = [calle, d.colony.trim() && `Col. ${d.colony.trim()}`, d.city.trim(), d.state.trim()]
    .filter(Boolean).join(', ')
  const extra  = [d.phone.trim() && `Tel: ${d.phone.trim()}`, d.references.trim() && `Ref: ${d.references.trim()}`]
    .filter(Boolean).join(' · ')
  return [lugar, extra].filter(Boolean).join('. ')
}

function splitDeliveryAddress(address?: string | null): Partial<DeliveryFields> {
  if (!address) return {}

  const [placePart = '', extraPart = ''] = address.split('. ')
  const place = placePart.split(',').map(part => part.trim()).filter(Boolean)
  const streetMatch = (place[0] ?? '').match(/^(.*?)(?:\s+#(.+))?$/)
  const phoneMatch = extraPart.match(/Tel:\s*([^·]+)/i)
  const referencesMatch = extraPart.match(/Ref:\s*(.+)$/i)

  return {
    street: streetMatch?.[1]?.trim() ?? '',
    number: streetMatch?.[2]?.trim() ?? '',
    colony: (place.find(part => /^Col\.\s*/i.test(part)) ?? '').replace(/^Col\.\s*/i, ''),
    city: place.find(part => !/^Col\.\s*/i.test(part) && part !== place[0] && part !== place[place.length - 1]) ?? '',
    state: place.length > 2 ? place[place.length - 1] : '',
    phone: phoneMatch?.[1]?.trim() ?? '',
    references: referencesMatch?.[1]?.trim() ?? '',
  }
}

function NewOrderInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTable = searchParams.get('table')

  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const branchTax = useBranchTaxFor(branchId)
  const createOrder = useCreateOrder()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const printer = usePrinter()
  const { data: tables = [], isLoading: loadingTables } = useTables(branchId)

  const [step, setStep] = useState<0 | 1 | 2>(preselectedTable ? 1 : 0)
  const [selectedTableId, setSelectedTableId] = useState<number | 'takeaway' | 'delivery' | null>(
    preselectedTable ? Number(preselectedTable) : null
  )
  const [delivery, setDelivery] = useState({
    alias: '', street: '', number: '', colony: '', city: '', state: '', phone: '', references: '',
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [items, setItems] = useState<DraftOrderItem[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeField, setActiveField] = useState<'alias' | 'street' | 'colony' | 'state' | null>(null)
  const { data: frequentCustomers = [], isLoading: loadingCustomers } = useCustomers(
    branchId,
    selectedTableId === 'delivery' ? customerSearch.trim() : '',
  )

  const orderType: 'dine_in' | 'takeaway' | 'delivery' =
    selectedTableId === 'delivery' ? 'delivery'
    : selectedTableId === 'takeaway' ? 'takeaway'
    : 'dine_in'

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])
  // Los precios del menú ya incluyen IVA: el total es la suma de productos y el
  // IVA se desglosa como porción contenida (informativo), no se suma encima.
  // Si la sucursal tiene el IVA desactivado, no se desglosa (tax = 0).
  const tax = branchTax.enabled ? subtotal - subtotal / (1 + branchTax.rate / 100) : 0
  const total = subtotal

  const availableTables = tables.filter(t => t.status !== 'ocupada')
  const selectedTable = typeof selectedTableId === 'number'
    ? tables.find(t => t.id === selectedTableId)
    : null
  const tableName = selectedTableId === 'takeaway' ? 'Para Llevar'
    : selectedTableId === 'delivery' ? 'Domicilio'
    : selectedTable?.name ?? ''
  const selectedCustomer = selectedCustomerId
    ? frequentCustomers.find(customer => customer.id === selectedCustomerId) ?? null
    : null

  // Mínimo para entregar: calle, colonia y teléfono (para llamar al cliente).
  const deliveryReady = delivery.street.trim() !== '' && delivery.colony.trim() !== '' && delivery.phone.trim() !== ''
  const setField = (k: keyof DeliveryFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDelivery(prev => ({ ...prev, [k]: e.target.value }))

  useEffect(() => {
    if (activeField !== 'street' && activeField !== 'colony') return

    const query = activeField === 'street' ? delivery.street : delivery.colony
    if (!query || query.trim().length < 3) {
      setSuggestions([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=mx&q=${encodeURIComponent(
            query.trim()
          )}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [delivery.street, delivery.colony, activeField])

  const selectCustomer = (customer: Customer) => {
    const saved = splitDeliveryAddress(customer.address)
    setSelectedCustomerId(customer.id)
    setDelivery(prev => ({
      ...prev,
      alias: customer.name,
      street: saved.street || prev.street,
      number: saved.number || prev.number,
      colony: saved.colony || prev.colony,
      city: saved.city || prev.city,
      state: saved.state || prev.state,
      phone: customer.phone || saved.phone || prev.phone,
      references: saved.references || prev.references,
    }))
    setCustomerSearch(customer.name)
    setShowSuggestions(false)
    setActiveField(null)
    toast.success(`Cliente frecuente seleccionado: ${customer.name}`)
  }

  const clearSelectedCustomer = () => {
    setSelectedCustomerId(null)
    setCustomerSearch(delivery.alias)
  }

  const stateSuggestions = useMemo(() => {
    if (activeField !== 'state') return []
    const q = delivery.state.toLowerCase().trim()
    return MEXICAN_STATES.filter(s => s.toLowerCase().includes(q))
  }, [delivery.state, activeField])

  const handleSelectSuggestion = (item: any) => {
    const address = item.address || {}
    const road = address.road || address.pedestrian || address.footway || address.cycleway || ''
    const number = address.house_number || ''
    const colony = address.suburb || address.neighbourhood || address.village || address.hamlet || address.residential || ''
    const city = address.city || address.town || address.municipality || address.county || address.city_district || ''
    const state = address.state || ''

    setDelivery(prev => ({
      ...prev,
      street: road || prev.street,
      number: number || prev.number,
      colony: colony || prev.colony,
      city: city || prev.city,
      state: state || prev.state,
    }))
    setSuggestions([])
    setShowSuggestions(false)
    setActiveField(null)
  }

  const addItem = (item: DraftOrderItem) => setItems(prev => [...prev, item])

  const removeItem = (uid: string) =>
    setItems(prev => prev.filter(i => i.uid !== uid))

  const updateQty = (uid: string, qty: number) =>
    setItems(prev => prev.map(i =>
      i.uid === uid
        ? { ...i, quantity: qty, subtotal: i.unit_price * qty }
        : i
    ))

  const updateItemNotes = (uid: string, item_notes: string) =>
    setItems(prev => prev.map(i =>
      i.uid === uid ? { ...i, item_notes: item_notes || undefined } : i
    ))

  const handleConfirm = async () => {
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (!branchId) { toast.error('Sin sucursal asignada'); return }

    setSubmitting(true)
    try {
      let customerId: number | null = null
      const deliveryAddress = orderType === 'delivery' ? composeAddress(delivery) || null : null

      if (orderType === 'delivery' && delivery.alias.trim()) {
        const customerPayload = {
          branch_id: branchId,
          name: delivery.alias.trim(),
          phone: delivery.phone.trim() || null,
          address: deliveryAddress,
        }
        const customer = selectedCustomerId
          ? await updateCustomer.mutateAsync({ id: selectedCustomerId, ...customerPayload })
          : await createCustomer.mutateAsync(customerPayload)
        customerId = customer.id
        setSelectedCustomerId(customer.id)
      }

      const order = await createOrder.mutateAsync({
        branch_id: branchId,
        table_id: typeof selectedTableId === 'number' ? selectedTableId : null,
        table_name: tableName,
        order_type: orderType,
        // Canal de origen real: distingue mesero (toma de pedidos) de mostrador/admin (POS).
        source: user?.role === 'mesero' ? 'mesero' : 'pos',
        customer_id: customerId,
        delivery_address: deliveryAddress,
        notes: notes.trim() || null,
        subtotal,
        tax,
        total,
        created_by: user?.id,
        items: items.map(i => (
          // Un combo se manda solo como {combo_id, quantity} — el backend es la
          // única fuente de verdad sobre su composición/precio (lo expande y
          // reprecia server-side, igual que "no confiar en el cliente" para totales).
          i.combo_id
            ? { combo_id: i.combo_id, quantity: i.quantity }
            : {
                product_id: i.product_id,
                product_name: i.product_name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                // Precio variable / por kilogramo: se persisten para cocina, ticket y reportes.
                price_type: i.price_type ?? undefined,
                weight_kg: i.weight_kg ?? undefined,
                price_per_kg: i.price_per_kg ?? undefined,
                price_pending: i.price_pending ?? undefined,
                modifiers: [
                  ...(i.modifiers ?? []),
                  ...(i.selectedModifiers ?? []).map(name => ({ name, price_delta: 0 }))
                ],
                item_notes: i.item_notes ?? null,
              }
        )),
      })
      toast.success('Pedido creado exitosamente')

      // Se removió la impresión automática al confirmar el pedido
      if (printer.config.openDrawerOnSale && printer.enabled) {
        await printer.openDrawer({ silent: true })
      }

      router.push('/orders')
    } catch (err: any) {
      // La mesa ya tenía una comanda abierta (creada por otro dispositivo mientras
      // esta pantalla estaba abierta): en vez de perderla, vamos directo a ella.
      if (err instanceof ApiError && err.status === 409 && (err.data as any)?.existing_order_id) {
        toast.error('Esta mesa ya tiene una comanda abierta — te llevamos ahí')
        router.push(`/orders/${(err.data as any).existing_order_id}`)
        return
      }
      toast.error(err?.message || 'Error al crear el pedido')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Tomar pedido"
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        }
      />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-[#D1400F] text-white' :
              'bg-muted text-muted-foreground',
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm hidden sm:block', i === step ? 'font-semibold' : 'text-muted-foreground')}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: Select table */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg">¿Cómo será el pedido?</h2>
            <p className="text-sm text-muted-foreground">Elige primero el tipo de servicio; después agrega productos como en un POS rápido.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() => { setSelectedTableId('takeaway'); setStep(1) }}
              className={cn(
                'w-full flex items-center gap-4 p-5 border-2 rounded-2xl transition-all text-left bg-card min-h-[112px]',
                selectedTableId === 'takeaway' ? 'border-[#D1400F] bg-[#D1400F]/5' : 'hover:border-primary/40',
              )}
            >
              <span className="h-12 w-12 rounded-2xl bg-[#D1400F]/10 text-[#D1400F] flex items-center justify-center shrink-0">
                <Truck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold">Para llevar</p>
                <p className="text-sm text-muted-foreground">Entrega rápida en mostrador</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedTableId('delivery')}
              className={cn(
                'w-full flex items-center gap-4 p-5 border-2 rounded-2xl transition-all text-left bg-card min-h-[112px]',
                selectedTableId === 'delivery' ? 'border-[#D1400F] bg-[#D1400F]/5' : 'hover:border-primary/40',
              )}
            >
              <span className="h-12 w-12 rounded-2xl bg-[#D1400F]/10 text-[#D1400F] flex items-center justify-center shrink-0">
                <Bike className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold">Domicilio</p>
                <p className="text-sm text-muted-foreground">Captura dirección y teléfono</p>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed bg-muted/30 min-h-[112px]">
              <span className="h-12 w-12 rounded-2xl bg-white text-muted-foreground flex items-center justify-center shrink-0">
                <UtensilsCrossed className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold">Servicio en mesa</p>
                <p className="text-sm text-muted-foreground">Selecciona una mesa disponible abajo</p>
              </div>
            </div>
          </div>

          {selectedTableId === 'delivery' && (
            <div className="space-y-3 rounded-xl border p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-[#D1400F]" />
                <h3 className="font-semibold text-sm">Dirección de entrega</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                {/* Alias / cliente frecuente */}
                <div className="space-y-1 sm:col-span-6 relative">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="d-alias">Alias del cliente frecuente</Label>
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={clearSelectedCustomer}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cambiar cliente
                      </button>
                    )}
                  </div>
                  <Input
                    id="d-alias"
                    value={delivery.alias}
                    onChange={(e) => {
                      const value = e.target.value
                      setDelivery(prev => ({ ...prev, alias: value }))
                      setCustomerSearch(value)
                      if (selectedCustomerId) setSelectedCustomerId(null)
                      setActiveField('alias')
                      setShowSuggestions(true)
                    }}
                    onFocus={() => {
                      setCustomerSearch(delivery.alias)
                      setActiveField('alias')
                      setShowSuggestions(true)
                    }}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false)
                      setActiveField(null)
                    }, 250)}
                    placeholder="Casa Juan, Oficina Ana, Cliente López..."
                  />
                  {showSuggestions && activeField === 'alias' && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md text-popover-foreground">
                      {loadingCustomers ? (
                        <div className="p-2 text-xs text-muted-foreground">Buscando clientes frecuentes...</div>
                      ) : frequentCustomers.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">
                          Sin clientes guardados. Captura un alias para guardarlo al confirmar.
                        </div>
                      ) : (
                        frequentCustomers.slice(0, 8).map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full rounded p-2 text-left transition-colors hover:bg-muted"
                          >
                            <span className="block text-sm font-semibold">{customer.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[customer.phone, customer.address].filter(Boolean).join(' · ') || 'Sin teléfono/dirección'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Si capturas un alias, se guardará con teléfono y dirección para próximos domicilios.
                  </p>
                </div>

                {/* Calle + número */}
                <div className="space-y-1 sm:col-span-4 relative">
                  <Label htmlFor="d-street">Calle *</Label>
                  <Input 
                    id="d-street" 
                    value={delivery.street} 
                    onChange={(e) => {
                      setDelivery(prev => ({ ...prev, street: e.target.value }))
                      setActiveField('street')
                      setShowSuggestions(true)
                    }} 
                    onFocus={() => {
                      setActiveField('street')
                      setShowSuggestions(true)
                    }}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false)
                      setActiveField(null)
                    }, 250)}
                    placeholder="Av. Principal" 
                    autoFocus 
                  />
                  {showSuggestions && activeField === 'street' && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md text-popover-foreground">
                      {loadingSuggestions ? (
                        <div className="p-2 text-xs text-muted-foreground">Buscando direcciones...</div>
                      ) : suggestions.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No se encontraron resultados</div>
                      ) : (
                        suggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left p-2 hover:bg-muted rounded text-xs transition-colors"
                          >
                            {item.display_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="d-number">Número *</Label>
                  <Input id="d-number" value={delivery.number} onChange={setField('number')} placeholder="123" inputMode="numeric" />
                </div>

                {/* Colonia */}
                <div className="space-y-1 sm:col-span-6 relative">
                  <Label htmlFor="d-colony">Colonia *</Label>
                  <Input 
                    id="d-colony" 
                    value={delivery.colony} 
                    onChange={(e) => {
                      setDelivery(prev => ({ ...prev, colony: e.target.value }))
                      setActiveField('colony')
                      setShowSuggestions(true)
                    }} 
                    onFocus={() => {
                      setActiveField('colony')
                      setShowSuggestions(true)
                    }}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false)
                      setActiveField(null)
                    }, 250)}
                    placeholder="Centro" 
                  />
                  {showSuggestions && activeField === 'colony' && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md text-popover-foreground">
                      {loadingSuggestions ? (
                        <div className="p-2 text-xs text-muted-foreground">Buscando direcciones...</div>
                      ) : suggestions.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No se encontraron resultados</div>
                      ) : (
                        suggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left p-2 hover:bg-muted rounded text-xs transition-colors"
                          >
                            {item.display_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Municipio + Estado */}
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor="d-city">Municipio</Label>
                  <Input id="d-city" value={delivery.city} onChange={setField('city')} placeholder="Municipio" />
                </div>
                <div className="space-y-1 sm:col-span-3 relative">
                  <Label htmlFor="d-state">Estado</Label>
                  <Input 
                    id="d-state" 
                    value={delivery.state} 
                    onChange={(e) => {
                      setDelivery(prev => ({ ...prev, state: e.target.value }))
                      setActiveField('state')
                      setShowSuggestions(true)
                    }} 
                    onFocus={() => {
                      setActiveField('state')
                      setShowSuggestions(true)
                    }}
                    onBlur={() => setTimeout(() => {
                      setShowSuggestions(false)
                      setActiveField(null)
                    }, 250)}
                    placeholder="Estado" 
                  />
                  {showSuggestions && activeField === 'state' && stateSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md text-popover-foreground">
                      {stateSuggestions.map((stateName) => (
                        <button
                          key={stateName}
                          type="button"
                          onClick={() => {
                            setDelivery(prev => ({ ...prev, state: stateName }))
                            setShowSuggestions(false)
                            setActiveField(null)
                          }}
                          className="w-full text-left p-2 hover:bg-muted rounded text-xs transition-colors"
                        >
                          {stateName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teléfono */}
                <div className="space-y-1 sm:col-span-6">
                  <Label htmlFor="d-phone">Teléfono *</Label>
                  <Input id="d-phone" value={delivery.phone} onChange={setField('phone')} placeholder="55 1234 5678" inputMode="tel" type="tel" />
                </div>

                {/* Referencias */}
                <div className="space-y-1 sm:col-span-6">
                  <Label htmlFor="d-ref">Referencias (opcional)</Label>
                  <Textarea id="d-ref" value={delivery.references} onChange={setField('references')}
                    placeholder="Entre calles, color de la casa, portón, indicaciones…" rows={2} />
                </div>
              </div>

              <Button
                className="w-full bg-[#D1400F] hover:bg-[#B03508]"
                disabled={!deliveryReady}
                onClick={() => setStep(1)}
              >
                Continuar con productos
              </Button>
              {!deliveryReady && (
                <p className="text-xs text-muted-foreground text-center">Completa calle, colonia y teléfono para continuar.</p>
              )}
            </div>
          )}

          {loadingTables ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => { setSelectedTableId(table.id); setStep(1) }}
                  className={cn(
                    'p-4 border-2 rounded-2xl transition-all text-left bg-card min-h-[92px]',
                    selectedTableId === table.id ? 'border-[#D1400F] bg-[#D1400F]/5' :
                    table.status === 'reservada' ? 'border-yellow-400 bg-yellow-50/50' :
                    'hover:border-primary/40',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{table.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{table.seats} personas</p>
                  {table.status === 'reservada' && (
                    <span className="text-xs text-yellow-600 font-medium">Reservada</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loadingTables && availableTables.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Todas las mesas están ocupadas
            </p>
          )}
        </div>
      )}

      {/* Step 1: Products */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
          <div className="min-h-[500px] flex flex-col">
            <div className="sticky top-0 z-20 mb-4 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#D1400F]/10 text-[#D1400F]">
                  {orderType === 'delivery' ? <Bike className="h-5 w-5" /> : orderType === 'takeaway' ? <Truck className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pedido actual</p>
                  <p className="text-sm font-bold truncate">{tableName}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="hidden sm:inline text-sm text-muted-foreground">
                    {items.reduce((s, i) => s + i.quantity, 0)} artículos
                  </span>
                  <span className="text-base font-extrabold text-[#D1400F]">${total.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setStep(0)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Cambiar
              </button>
            </div>
            <div className="flex-1">
              <ComboPicker onAddCombo={addItem} />
              <ProductPicker items={items} onAdd={addItem} onRemove={removeItem} onUpdateQty={updateQty} />
            </div>
          </div>

          <div className="hidden lg:block">
            <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#D1400F]" />
                  Comanda ({items.reduce((s, i) => s + i.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto max-h-[calc(100vh-7rem)]">
                <OrderSummary items={items} subtotal={subtotal} tax={tax} total={total} taxRate={branchTax.enabled ? branchTax.rate : undefined} editable compact onUpdateQty={updateQty} onRemove={removeItem} onUpdateNotes={updateItemNotes} onClearAll={() => setItems([])} />
                <Button className="w-full h-12 bg-[#D1400F] hover:bg-[#B03508]" disabled={items.length === 0} onClick={() => setStep(2)}>
                  Revisar y enviar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {items.length > 0 && (
            <BodyPortal>
              {/* Renderizado en document.body para que `fixed` se ancle al viewport
                  y no al contenedor animado (transform) de PageTransition. */}
              <div className="lg:hidden fixed bottom-20 inset-x-4 z-40">
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-[#D1400F] text-white rounded-xl p-4 flex items-center justify-between shadow-lg"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    {items.reduce((s, i) => s + i.quantity, 0)} artículos
                  </span>
                  <span className="font-bold">${total.toFixed(2)} →</span>
                </button>
              </div>
            </BodyPortal>
          )}
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="max-w-2xl space-y-4 mx-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumen del pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">
                Mesa: <span className="font-semibold text-foreground">{tableName}</span>
              </p>
              {orderType === 'delivery' && delivery.alias.trim() && (
                <p className="text-sm text-muted-foreground mb-2">
                  Cliente: <span className="font-semibold text-foreground">{delivery.alias.trim()}</span>
                  {selectedCustomerId ? <span className="text-xs"> · frecuente</span> : <span className="text-xs"> · se guardará</span>}
                </p>
              )}
              {orderType === 'delivery' && composeAddress(delivery) && (
                <p className="text-sm text-muted-foreground mb-3 flex gap-1.5">
                  <Bike className="h-4 w-4 text-[#D1400F] shrink-0 mt-0.5" />
                  <span className="text-foreground">{composeAddress(delivery)}</span>
                </p>
              )}
              <OrderSummary items={items} subtotal={subtotal} tax={tax} total={total} taxRate={branchTax.enabled ? branchTax.rate : undefined} editable onUpdateQty={updateQty} onRemove={removeItem} onUpdateNotes={updateItemNotes} onClearAll={() => setItems([])} />
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Alergias, preferencias, instrucciones…"
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={items.length === 0 || submitting}
              className="flex-1 bg-[#D1400F] hover:bg-[#B03508]"
            >
              <Check className="h-4 w-4 mr-1" />
              {submitting ? 'Creando…' : 'Confirmar Pedido'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Renderiza children en document.body (escapa de ancestros con `transform`). */
function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderInner />
    </Suspense>
  )
}
