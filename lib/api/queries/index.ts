/**
 * FoodIX — Sistema de gestión para restaurantes
 * Hooks de TanStack Query para todas las entidades (CRUD y caché).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { apiRequest, apiUpload } from '@/lib/api/client'
import { getActivePosId } from '@/lib/pos/activePos'
import type {
  Product,
  Category,
  Table,
  Order,
  OrderStatus,
  SalesSummary,
  SalesDaily,
  SalesByCategory,
  SalesInsights,
  Device,
  Branch,
  SubscriptionStatus,
  SuperadminSubscriptionsResponse,
  SuperadminSubscriptionDetail,
  BillingDashboardResponse,
  SubscriptionCalendarResponse,
  SubscriptionPaymentMethodCRM,
  SuperadminBranchSalesResponse,
  SubscriptionPayment,
  MyBillingResponse,
  BankTransferIntent,
  ModifierGroup,
  PaymentInput,
  CashSession,
  CashReport,
  InventoryItem,
  RecipeItem,
  RecipeCost,
  Supplier,
  PurchaseOrder,
  InventoryWarehouse,
  InventoryTransfer,
  Customer,
  CustomerLedgerEntry,
  CustomerReview,
  ReviewsResponse,
  Driver,
  DeliveryZone,
  DeliveryEvent,
  Reservation,
  DeliveryStatus,
  User,
  ContactLead,
  ContactLeadStatus,
  ContactLeadsResponse,
  PriceType,
} from '@/lib/types'
import type { ContactLeadInput } from '@/lib/validators/schemas'

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts(
  branchId: number | null,
  options?: { categoryId?: number; barcode?: string },
) {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', String(branchId))
  if (options?.categoryId) params.set('category_id', String(options.categoryId))
  if (options?.barcode) params.set('barcode', options.barcode)

  return useQuery({
    queryKey: ['products', branchId, options?.categoryId, options?.barcode],
    queryFn: async () => {
      const list = await apiRequest<Product[]>(`/products?${params}`)
      return list.map(p => ({
        ...p,
        modifiers: Array.isArray(p.modifiers) ? p.modifiers : []
      }))
    },
    enabled: branchId !== null,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiUpload<Product>('/products', formData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products', data.branch_id] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      apiUpload<Product>(`/products/${id}`, formData, 'PATCH'),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products', data.branch_id] })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUploadProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData()
      fd.append('image', file)
      return apiUpload<{ image_url: string }>(`/products/${id}/image`, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Sube varias imágenes a la galería de un producto (hasta 5 en total)
export function useUploadProductImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files = [], urls = [] }: { id: number; files?: File[]; urls?: string[] }) => {
      const fd = new FormData()
      files.forEach(f => fd.append('images[]', f))
      urls.forEach(u => fd.append('urls[]', u))
      return apiUpload<{ images: { id: number; url: string }[] }>(`/products/${id}/images`, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// Elimina una imagen de la galería de un producto
export function useDeleteProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: number; imageId: number }) =>
      apiRequest<{ images: { id: number; url: string }[] }>(
        `/products/${productId}/images/${imageId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useCategories(branchId: number | null) {
  return useQuery({
    queryKey: ['categories', branchId],
    queryFn: () =>
      apiRequest<Category[]>(`/categories?branch_id=${branchId}`),
    enabled: branchId !== null,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['categories', data.branch_id] })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['categories', data.branch_id] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export function useTables(branchId: number | null) {
  return useQuery({
    queryKey: ['tables', branchId],
    queryFn: () => apiRequest<Table[]>(`/tables?branch_id=${branchId}`),
    enabled: branchId !== null,
    refetchInterval: 5_000,
  })
}

export function useTable(id: number | null) {
  return useQuery({
    queryKey: ['table', id],
    queryFn: () => apiRequest<Table>(`/tables/${id}`),
    enabled: id !== null,
    refetchInterval: 5_000,
  })
}

export function useUpdateTableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest<Table>(`/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['table'] })
    },
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; seats: number; branch_id?: number }) =>
      apiRequest<Table>('/tables', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<{ success: boolean }>(`/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useOrders(branchId: number | null, status?: OrderStatus) {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', String(branchId))
  if (status) params.set('status', status)

  return useQuery({
    queryKey: ['orders', branchId, status],
    queryFn: () => apiRequest<Order[]>(`/orders?${params}`),
    enabled: branchId !== null,
    refetchInterval: 5_000,
  })
}

export interface OrderHistoryFilters {
  status?: string
  order_type?: string
  from?: string
  to?: string
}

/** Historial de tickets con filtros de estado/tipo/fecha (server-side). */
export function useOrderHistory(branchId: number | null, filters: OrderHistoryFilters = {}) {
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', String(branchId))
  if (filters.status) params.set('status', filters.status)
  if (filters.order_type) params.set('order_type', filters.order_type)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  return useQuery({
    queryKey: ['order-history', branchId, filters],
    queryFn: () => apiRequest<Order[]>(`/orders?${params}`),
    enabled: branchId !== null,
  })
}

export function useOrder(orderId: number | null) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiRequest<Order>(`/orders/${orderId}`),
    enabled: orderId !== null,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['table'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      apiRequest<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

export function usePayOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      ...body
    }: {
      orderId: number
      payments: PaymentInput[]
      discount?: number
      complete?: boolean
    }) =>
      apiRequest<Order>(`/orders/${orderId}/pay`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

// ─── Cuenta dividida (Dividir Cuenta) ─────────────────────────────────────────

export interface SplitDraftInput {
  label: string
  total: number
  items?: { order_item_id: number; quantity: number }[]
}

/** Define/reemplaza el plan de divisiones de una cuenta. */
export function useCreateSplits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      ...body
    }: {
      orderId: number
      mode: 'items' | 'people' | 'amount' | 'guest'
      splits: SplitDraftInput[]
    }) =>
      apiRequest<Order>(`/orders/${orderId}/splits`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

/** Cobra una división individual. Al cobrarse todas, la mesa se libera. */
export function usePaySplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      splitId,
      payments,
    }: {
      orderId: number
      splitId: number
      payments: PaymentInput[]
    }) =>
      apiRequest<Order>(`/orders/${orderId}/splits/${splitId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ payments }),
      }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

/** Elimina el plan de divisiones (vuelve a cuenta única), si nada se cobró. */
export function useDeleteSplits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId }: { orderId: number }) =>
      apiRequest<Order>(`/orders/${orderId}/splits`, { method: 'DELETE' }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

// ─── Edición de ítems de orden abierta (Fase 2: mesas editables) ──────────────

export interface NewOrderItemInput {
  product_id?: number | null
  product_name: string
  quantity: number
  unit_price: number
  price_type?: PriceType
  weight_kg?: number | null
  price_per_kg?: number | null
  price_pending?: boolean
  modifiers?: { name: string; price_delta: number }[]
  item_notes?: string | null
}

function invalidateOrder(qc: ReturnType<typeof useQueryClient>, orderId: number) {
  qc.invalidateQueries({ queryKey: ['orders'] })
  qc.invalidateQueries({ queryKey: ['order', orderId] })
  qc.invalidateQueries({ queryKey: ['tables'] })
  qc.invalidateQueries({ queryKey: ['table'] })
  qc.invalidateQueries({ queryKey: ['station-orders'] })
}

/** Agrega productos a una orden abierta (mesa ya ocupada). */
export function useAddOrderItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: number; items: NewOrderItemInput[] }) =>
      apiRequest<{ order: Order; new_item_ids: number[] }>(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_, { orderId }) => invalidateOrder(qc, orderId),
  })
}

/** Edita cantidad / nota / modificadores / precio de un ítem (no completado). */
export function useUpdateOrderItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      ...body
    }: {
      orderId: number
      itemId: number
      quantity?: number
      unit_price?: number
      price_type?: PriceType
      weight_kg?: number
      price_per_kg?: number
      price_pending?: boolean
      item_notes?: string | null
      modifiers?: { name: string; price_delta: number }[]
    }) =>
      apiRequest<Order>(`/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { orderId }) => invalidateOrder(qc, orderId),
  })
}

/** Quita un ítem pendiente (o lo cancela con motivo si ya está en preparación). */
export function useRemoveOrderItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, reason }: { orderId: number; itemId: number; reason?: string }) =>
      apiRequest<Order>(`/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: (_, { orderId }) => invalidateOrder(qc, orderId),
  })
}

/** Cambia el estado de un ítem: pending | preparing | completed | cancelled. */
export function useUpdateOrderItemStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      status,
      reason,
    }: {
      orderId: number
      itemId: number
      status: 'pending' | 'preparing' | 'completed' | 'cancelled'
      reason?: string
    }) =>
      apiRequest<Order>(`/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(reason ? { status, reason } : { status }),
      }),
    onSuccess: (_, { orderId }) => invalidateOrder(qc, orderId),
  })
}

// ─── Caja y turnos ──────────────────────────────────────────────────────────────

export function useCurrentCashSession(branchId: number | null) {
  // El POS lo resuelve el backend por el header X-Pos-Id (api/client), por lo
  // que el turno devuelto es el de ESTA terminal, no el de toda la sucursal.
  const posId = getActivePosId()
  return useQuery({
    queryKey: ['cash-current', branchId, posId],
    queryFn: () => apiRequest<CashSession | null>(`/cash/current?branch_id=${branchId}`),
    enabled: branchId !== null,
    refetchInterval: 5_000,
  })
}

export function useCashReport(branchId: number | null, hasOpenSession: boolean) {
  return useQuery({
    queryKey: ['cash-report', branchId],
    queryFn: () => apiRequest<CashReport>(`/cash/report?branch_id=${branchId}`),
    enabled: branchId !== null && hasOpenSession,
    refetchInterval: 30_000,
  })
}

export function useCashSessions(branchId: number | null) {
  return useQuery({
    queryKey: ['cash-sessions', branchId],
    queryFn: () => apiRequest<CashSession[]>(`/cash/sessions?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

function invalidateCash(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['cash-current'] })
  qc.invalidateQueries({ queryKey: ['cash-report'] })
  qc.invalidateQueries({ queryKey: ['cash-sessions'] })
}

export function useOpenCash() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { branch_id: number | null; opening_amount: number; notes?: string }) =>
      apiRequest<CashSession>('/cash/open', {
        method: 'POST',
        body: JSON.stringify({ pos_id: getActivePosId(), ...body }),
      }),
    onSuccess: () => invalidateCash(qc),
  })
}

export function useCloseCash() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { branch_id: number | null; closing_amount: number; notes?: string }) =>
      apiRequest<{ session: CashSession; report: CashReport }>('/cash/close', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateCash(qc),
  })
}

export function useAddCashMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { branch_id: number | null; type: 'in' | 'out'; amount: number; reason?: string }) =>
      apiRequest<CashReport>('/cash/movement', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateCash(qc),
  })
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export function useCustomers(branchId: number | null, q = '') {
  return useQuery({
    queryKey: ['customers', branchId, q],
    queryFn: () => apiRequest<Customer[]>(`/customers?branch_id=${branchId}&q=${encodeURIComponent(q)}`),
    enabled: branchId !== null,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useAdjustWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; amount: number; type: 'add' | 'subtract'; reason?: string }) =>
      apiRequest<Customer>(`/customers/${id}/wallet`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer-ledger', id] })
    },
  })
}

export function useCustomerLedger(customerId: number | null) {
  return useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => apiRequest<CustomerLedgerEntry[]>(`/customers/${customerId}/ledger`),
    enabled: customerId !== null,
  })
}

// ─── Opiniones de clientes ────────────────────────────────────────────────────

export function useReviews(branchId: number | null) {
  return useQuery({
    queryKey: ['reviews', branchId],
    queryFn: () => apiRequest<ReviewsResponse>(`/reviews?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<CustomerReview>('/reviews', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  })
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export function useUsers(branchId: number | null) {
  return useQuery({
    queryKey: ['users', branchId],
    queryFn: () =>
      apiRequest<User[]>(branchId ? `/users?branch_id=${branchId}` : '/users'),
    enabled: branchId !== null,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateMyProfile() {
  return useMutation({
    mutationFn: (body: { name: string; email?: string | null }) =>
      apiRequest<{ user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  })
}

// ─── Repartidores ─────────────────────────────────────────────────────────────

export function useDrivers(branchId: number | null) {
  return useQuery({
    queryKey: ['drivers', branchId],
    queryFn: () => apiRequest<Driver[]>(`/drivers?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Driver>('/drivers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useDeleteDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/drivers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Driver>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  })
}

// ─── Zonas de entrega ─────────────────────────────────────────────────────────

export function useDeliveryZones(branchId: number | null) {
  return useQuery({
    queryKey: ['delivery-zones', branchId],
    queryFn: () => apiRequest<DeliveryZone[]>(`/delivery-zones?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<DeliveryZone>('/delivery-zones', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}

export function useDeleteDeliveryZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/delivery-zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
  })
}

// ─── Bitácora de entrega ──────────────────────────────────────────────────────

export function useDeliveryEvents(orderId: number | null) {
  return useQuery({
    queryKey: ['delivery-events', orderId],
    queryFn: () => apiRequest<DeliveryEvent[]>(`/orders/${orderId}/delivery-events`),
    enabled: orderId !== null,
  })
}

// ─── Reservaciones ────────────────────────────────────────────────────────────

export function useReservations(branchId: number | null, date?: string) {
  return useQuery({
    queryKey: ['reservations', branchId, date],
    queryFn: () =>
      apiRequest<Reservation[]>(`/reservations?branch_id=${branchId}${date ? `&date=${date}` : ''}`),
    enabled: branchId !== null,
    refetchInterval: 5_000,
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Reservation>(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useDeleteReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/reservations/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

// ─── Domicilios ───────────────────────────────────────────────────────────────

export function useDeliveryOrders(branchId: number | null) {
  return useQuery({
    queryKey: ['orders', branchId, 'delivery'],
    queryFn: () => apiRequest<Order[]>(`/orders?branch_id=${branchId}&order_type=delivery`),
    enabled: branchId !== null,
    refetchInterval: 5_000,
  })
}

export function useUpdateDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...body }: { orderId: number; delivery_status?: DeliveryStatus; driver_id?: number | null }) =>
      apiRequest<Order>(`/orders/${orderId}/delivery`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['delivery-events', orderId] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
    },
  })
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export function useInventory(branchId: number | null) {
  return useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () => apiRequest<InventoryItem[]>(`/inventory?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<InventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<InventoryItem>(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/inventory/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useAdjustInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; type: 'waste' | 'adjustment'; quantity: number; reason?: string }) =>
      apiRequest<InventoryItem>(`/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

// ─── Recetas ──────────────────────────────────────────────────────────────────

export function useRecipe(productId: number | null) {
  return useQuery({
    queryKey: ['recipe', productId],
    queryFn: () => apiRequest<RecipeItem[]>(`/recipes?product_id=${productId}`),
    enabled: productId !== null,
  })
}

export function useSaveRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, items }: { productId: number; items: RecipeItem[] }) =>
      apiRequest<RecipeItem[]>(`/recipes/${productId}`, { method: 'PUT', body: JSON.stringify({ items }) }),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['recipe', productId] })
      qc.invalidateQueries({ queryKey: ['recipe-cost', productId] })
    },
  })
}

export function useRecipeCost(productId: number | null) {
  return useQuery({
    queryKey: ['recipe-cost', productId],
    queryFn: () => apiRequest<RecipeCost>(`/recipes/${productId}/cost`),
    enabled: productId !== null,
  })
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

export function useSuppliers(branchId: number | null) {
  return useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: () => apiRequest<Supplier[]>(`/suppliers?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

// ─── Compras ──────────────────────────────────────────────────────────────────

export function usePurchases(branchId: number | null) {
  return useQuery({
    queryKey: ['purchases', branchId],
    queryFn: () => apiRequest<PurchaseOrder[]>(`/purchases?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function usePurchase(id: number | null) {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: () => apiRequest<PurchaseOrder>(`/purchases/${id}`),
    enabled: id !== null,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<PurchaseOrder>('/purchases', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  })
}

export function useReceivePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, items }: { id: number; items?: { id: number; received_quantity: number }[] }) =>
      apiRequest<PurchaseOrder>(`/purchases/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(items ? { items } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCancelPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<PurchaseOrder>(`/purchases/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  })
}

// ─── Almacenes ────────────────────────────────────────────────────────────────

export function useWarehouses(branchId: number | null) {
  return useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: () => apiRequest<InventoryWarehouse[]>(`/inventory-warehouses?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

// ─── Transferencias entre almacenes ────────────────────────────────────────────

export function useInventoryTransfers(branchId: number | null) {
  return useQuery({
    queryKey: ['inventory-transfers', branchId],
    queryFn: () => apiRequest<InventoryTransfer[]>(`/inventory-transfers?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateInventoryTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<InventoryTransfer>('/inventory-transfers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-transfers'] }),
  })
}

export function useReceiveInventoryTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<InventoryTransfer>(`/inventory-transfers/${id}/receive`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCancelInventoryTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<InventoryTransfer>(`/inventory-transfers/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-transfers'] }),
  })
}

// ─── Modifiers ─────────────────────────────────────────────────────────────────

export function useModifiers(branchId: number | null) {
  return useQuery({
    queryKey: ['modifiers', branchId],
    queryFn: () => apiRequest<ModifierGroup[]>(`/modifiers?branch_id=${branchId}`),
    enabled: branchId !== null,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<ModifierGroup>('/modifiers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['modifiers', data.branch_id] })
    },
  })
}

export function useUpdateModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<ModifierGroup>(`/modifiers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['modifiers', data.branch_id] })
    },
  })
}

export function useDeleteModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/modifiers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modifiers'] })
    },
  })
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export function useSalesSummary(
  branchId: number | null,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['sales-summary', branchId, from, to],
    queryFn: () =>
      apiRequest<SalesSummary>(
        `/sales/summary?branch_id=${branchId}&from=${from}&to=${to}`,
      ),
    enabled: branchId !== null,
    staleTime: 60_000,
  })
}

export function useSalesDaily(branchId: number | null, days = 30) {
  return useQuery({
    queryKey: ['sales-daily', branchId, days],
    queryFn: () =>
      apiRequest<SalesDaily[]>(`/sales/daily?branch_id=${branchId}&days=${days}`),
    enabled: branchId !== null,
    staleTime: 60_000,
  })
}

export function useSalesByCategory(
  branchId: number | null,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['sales-by-category', branchId, from, to],
    queryFn: () =>
      apiRequest<SalesByCategory[]>(
        `/sales/by-category?branch_id=${branchId}&from=${from}&to=${to}`,
      ),
    enabled: branchId !== null,
    staleTime: 60_000,
  })
}

export function useSalesInsights(
  branchId: number | null,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['sales-insights', branchId, from, to],
    queryFn: () =>
      apiRequest<SalesInsights>(
        `/sales/insights?branch_id=${branchId}&from=${from}&to=${to}`,
      ),
    enabled: branchId !== null,
    staleTime: 60_000,
  })
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export function useDevices(branchId?: number | null) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return useQuery({
    queryKey: ['devices', branchId],
    queryFn: () => apiRequest<Device[]>(`/devices${params}`),
    refetchInterval: 15_000,
  })
}

export function useApproveDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number
      status: 'approved' | 'rejected' | 'revoked'
    }) =>
      apiRequest<Device>(`/devices/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useDeleteDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export interface PinUser { id: number; name: string; role: string }

/** Usuarios con PIN de la sucursal (para el teclado de acceso rápido). */
export function usePinUsers(branchId: number | null) {
  return useQuery({
    queryKey: ['pin-users', branchId],
    queryFn: () => apiRequest<PinUser[]>(`/auth/pin-users?branch_id=${branchId}`, { auth: false }),
    enabled: branchId !== null,
    retry: false,
  })
}

/** Fija, cambia o quita (pin=null) el PIN de un usuario. */
export function useSetUserPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: string | null }) =>
      apiRequest<{ success: boolean; has_pin: boolean }>(`/users/${id}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

/** Renombra un dispositivo y/o asigna usuario y rol. */
export function useUpdateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      name?: string
      assigned_user_id?: number | null
      device_role?: string | null
    }) =>
      apiRequest<Device>(`/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => apiRequest<Branch[]>('/branches'),
  })
}

export function useBranch(id: number | null) {
  return useQuery({
    queryKey: ['branch', id],
    queryFn: () => apiRequest<Branch>(`/branches/${id}`),
    enabled: id !== null,
  })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Branch>('/branches', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
    },
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Branch>(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      qc.invalidateQueries({ queryKey: ['branch'] })
      qc.invalidateQueries({ queryKey: ['branch-pos-count'] })
    },
  })
}

/**
 * Lee la cantidad de POS de la sucursal desde el backend, con refetch periódico
 * para reflejar en (casi) tiempo real los cambios hechos por el Superadmin en
 * Cocina/KDS, Admin y Mesero. Accesible para cualquier usuario de la sucursal.
 */
export function useEstablishmentPosCount(branchId: number | null) {
  return useQuery({
    queryKey: ['branch-pos-count', branchId],
    queryFn: async () => {
      const b = await apiRequest<Branch>(`/branches/${branchId}`)
      return b.pos_count === 2 ? 2 : 1
    },
    enabled: branchId !== null,
    refetchInterval: 3_000,
    staleTime: 2_000,
  })
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function useSubscription(branchId: number | null) {
  return useQuery({
    queryKey: ['subscription', branchId],
    queryFn: () =>
      apiRequest<SubscriptionStatus>(`/subscription/${branchId}`),
    enabled: branchId !== null,
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      branchId,
      ...body
    }: {
      branchId: number
    } & Record<string, unknown>) =>
      apiRequest<SubscriptionStatus>(`/subscription/${branchId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['subscription', branchId] })
      qc.invalidateQueries({ queryKey: ['branches'] })
      // Refresca el modal de detalle y la lista del superadmin en tiempo real
      // (el plan activo / palomita se mueve solo tras cambiar el plan).
      qc.invalidateQueries({ queryKey: ['superadmin-subscription', branchId] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
    },
  })
}

// ─── Superadmin: Administración SaaS ────────────────────────────────────────────

export function useSuperadminSubscriptions() {
  return useQuery({
    queryKey: ['superadmin-subscriptions'],
    queryFn: () => apiRequest<SuperadminSubscriptionsResponse>('/superadmin/subscriptions'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

/** KPIs del Billing CRM (MRR/ARR, estados, ingresos, próximos cobros). */
export function useSuperadminBillingDashboard() {
  return useQuery({
    queryKey: ['superadmin-billing-dashboard'],
    queryFn: () => apiRequest<BillingDashboardResponse>('/superadmin/dashboard'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useSuperadminSubscriptionDetail(branchId: number | null) {
  return useQuery({
    queryKey: ['superadmin-subscription', branchId],
    queryFn: () => apiRequest<SuperadminSubscriptionDetail>(`/superadmin/subscriptions/${branchId}`),
    enabled: branchId !== null,
  })
}

/** Calendario mensual de pagos de un cliente (caché híbrido del backend). */
export function useSubscriptionCalendar(branchId: number | null) {
  return useQuery({
    queryKey: ['superadmin-subscription-calendar', branchId],
    queryFn: () => apiRequest<SubscriptionCalendarResponse>(`/superadmin/subscriptions/${branchId}/calendar`),
    enabled: branchId !== null,
  })
}

/** Ventas del día por sucursal (cross-branch, solo superadmin). */
export function useSuperadminBranchSales(date: string) {
  return useQuery({
    queryKey: ['superadmin-branch-sales', date],
    queryFn: () => apiRequest<SuperadminBranchSalesResponse>(`/superadmin/branch-sales?date=${date}`),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// ── Trials (prueba gratuita de 14 días) ──────────────────────────────────────

export type TrialFilter = 'all' | 'active' | 'expired' | 'converted' | 'blocked'

export interface SuperadminTrialRow {
  branch_id: number
  branch_name: string
  slug: string
  subscription_id: number | null
  plan: string
  status: string
  trial_started_at: string | null
  trial_ends_at: string | null
  days_remaining: number | null
  converted_at: string | null
  trial_source: string | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  /** Nivel ya calculado por el backend. Las reglas internas NO se exponen. */
  risk_level: 'low' | 'medium' | 'high' | 'block'
}

export interface SuperadminTrialsResponse {
  items: SuperadminTrialRow[]
  metrics: {
    started: number
    active: number
    expired: number
    converted: number
    blocked: number
    conversion_rate: number
  }
}

/** Panel de Trials: métricas del embudo + tabla filtrable (solo superadmin). */
export function useSuperadminTrials(filter: TrialFilter, search: string) {
  const q = search.trim()
  return useQuery({
    queryKey: ['superadmin-trials', filter, q],
    queryFn: () =>
      apiRequest<SuperadminTrialsResponse>(
        `/superadmin/trials?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      ),
    staleTime: 30_000,
  })
}

/**
 * Extender la prueba gratuita de una sucursal. Solo superadmin: el backend
 * valida el rol y registra la acción en `trial_admin_audit`.
 */
export function useExtendTrial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, days, until, reason }: {
      branchId: number
      days?: number
      until?: string
      reason?: string
    }) =>
      apiRequest<{ success: true; previous_trial_end: string | null; new_trial_end: string }>(
        `/superadmin/subscriptions/${branchId}/extend-trial`,
        { method: 'POST', body: JSON.stringify({ days, until, reason }) },
      ),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['superadmin-trials'] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscription', branchId] })
    },
  })
}

type BranchAction = 'suspend' | 'reactivate' | 'cancel' | 'terminate'

/** Suspender / reactivar / cancelar / dar de baja una sucursal (solo superadmin). */
export function useBranchSubscriptionAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      branchId,
      action,
      ...body
    }: {
      branchId: number
      action: BranchAction
      confirm_name?: string
      note?: string
    }) =>
      apiRequest<{ subscription: SubscriptionStatus }>(
        `/superadmin/subscriptions/${branchId}/${action}`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscription', branchId] })
      qc.invalidateQueries({ queryKey: ['subscription', branchId] })
    },
  })
}

/**
 * Registrar un pago manual (1 o varios meses · adelantado). El backend calcula
 * el nuevo vencimiento (ancla día 1) y reconstruye el calendario.
 */
export function useRegisterManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, ...body }: {
      branchId: number
      amount: number
      payment_method: SubscriptionPaymentMethodCRM
      months_count: number
      payment_date: string
      covered_from?: string
      reference?: string
      notes?: string
      receipt_url?: string
    }) =>
      apiRequest<{ success: boolean; covered_months: string[]; new_expires_at: string }>(
        `/superadmin/subscriptions/${branchId}/register-payment`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscription', branchId] })
      qc.invalidateQueries({ queryKey: ['superadmin-subscription-calendar', branchId] })
      qc.invalidateQueries({ queryKey: ['superadmin-billing-dashboard'] })
      qc.invalidateQueries({ queryKey: ['subscription', branchId] })
    },
  })
}

/** Aprobar o rechazar un pago por transferencia (solo superadmin). */
export function useReviewBankTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      paymentId,
      action,
      ...body
    }: {
      paymentId: number
      action: 'approve' | 'reject'
      branchId?: number
      rejection_reason?: string
    }) =>
      apiRequest<{ payment: SubscriptionPayment }>(
        `/superadmin/bank-transfers/${paymentId}/${action}`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['superadmin-subscriptions'] })
      if (branchId) qc.invalidateQueries({ queryKey: ['superadmin-subscription', branchId] })
    },
  })
}

// ─── Billing del admin de sucursal (Mi Suscripción) ─────────────────────────────

export function useMyBilling() {
  return useQuery({
    queryKey: ['my-billing'],
    queryFn: () => apiRequest<MyBillingResponse>('/billing/me'),
  })
}

/** Genera la referencia SPEI y deja la suscripción pendiente de pago. */
export function useBankTransferIntent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<BankTransferIntent>('/billing/bank-transfer-intent', { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-billing'] }),
  })
}

/** El admin reporta su transferencia; queda en revisión del superadmin. */
export function useBankTransferSubmit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      payment_id: number
      bank_transfer_date: string
      bank_sender_name: string
      bank_name?: string
      tracking_reference?: string
      receipt_url?: string
    }) =>
      apiRequest<{ payment: SubscriptionPayment }>('/billing/bank-transfer-submit', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-billing'] }),
  })
}

/** Sube un comprobante de pago (imagen o PDF) y devuelve su URL pública. */
export function useUploadReceipt() {
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('receipt', file)
      return apiUpload<{ receipt_url: string }>('/billing/upload-receipt', fd)
    },
  })
}

/** Crea una Checkout Session de Stripe y devuelve la URL de redirección. */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ url: string }>('/billing/create-checkout-session', { method: 'POST', body: '{}' }),
  })
}

/** Crea una sesión del Billing Portal de Stripe (actualizar método / facturas). */
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ url: string }>('/billing/create-portal-session', { method: 'POST', body: '{}' }),
  })
}

/** Crea una suscripción incompleta y devuelve el client_secret para el Payment Element. */
export function useCreateSubscription() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ subscription_id: string; client_secret: string }>(
        '/billing/create-subscription', { method: 'POST', body: '{}' },
      ),
  })
}

// ─── Logo de la sucursal (admin de su propia sucursal) ───────────────────────

/** Sube el logotipo de la sucursal. */
export function useUploadBranchLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, file }: { branchId: number; file: File }) => {
      const fd = new FormData()
      fd.append('logo', file)
      return apiUpload<{ logo_url: string }>(`/branches/${branchId}/logo`, fd)
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['branch', v.branchId] }),
  })
}

/** Quita el logotipo (vuelve al ícono por defecto). */
export function useRemoveBranchLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId }: { branchId: number }) => {
      const fd = new FormData()
      fd.append('remove', '1')
      return apiUpload<{ logo_url: null }>(`/branches/${branchId}/logo`, fd)
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['branch', v.branchId] }),
  })
}

// ─── Contacto / Cotizaciones (landing) ─────────────────────────────────────────

/** Envío público del formulario de contacto (sin sesión). */
export function useSubmitLead() {
  return useMutation({
    mutationFn: (data: ContactLeadInput) =>
      apiRequest<{ ok: true; id: number }>('/leads', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(data),
      }),
  })
}

/** Lista de solicitudes de contacto (solo superadmin). */
export function useLeads(status?: ContactLeadStatus) {
  const params = status ? `?status=${status}` : ''
  return useQuery({
    queryKey: ['leads', status ?? 'all'],
    queryFn: () => apiRequest<ContactLeadsResponse>(`/leads${params}`),
    refetchInterval: 30_000,
  })
}

/** Cambia el estado de una solicitud (new/read/archived). */
export function useUpdateLeadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactLeadStatus }) =>
      apiRequest<ContactLead>(`/leads/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}
