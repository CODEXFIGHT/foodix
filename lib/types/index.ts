/**
 * FoodIX — Sistema de gestión para restaurantes
 * Definiciones de tipos TypeScript compartidos en toda la app.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

export type UserRole = 'superadmin' | 'admin' | 'mesero' | 'cocina'
export type StationType = 'hot' | 'cold' | 'both'

/** Área de preparación resuelta de un producto/ítem. A diferencia de
 *  `StationType`, nunca es 'both': todo ítem cae en Caliente o Frío. */
export type PreparationArea = 'hot' | 'cold'

/** Cantidad de POS configurada por establecimiento.
 *  1 = flujo unificado (Caliente/Frío dentro de un mismo POS lógico).
 *  2 = dos estaciones operativas separadas (POS Caliente / POS Frío). */
export type PosCount = 1 | 2

export interface User {
  id: number
  name: string
  email: string
  username?: string
  role: UserRole
  branch_id: number | null
  station?: StationType | null
  active?: number | boolean
  has_pin?: boolean
  created_at?: string
}

export type SubscriptionState =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'payment_failed'
  | 'pending_bank_transfer'
  | 'bank_transfer_review'
  | 'suspended'
  | 'canceled'
  | 'terminated'
  | 'expired'

export type SubscriptionPlan = 'trial' | 'starter' | 'pro' | 'ai' | 'multisucursal'
export type SubscriptionPaymentMethod = 'card' | 'bank_transfer' | 'none'

export interface SubscriptionStatus {
  plan: SubscriptionPlan
  status: SubscriptionState
  starts_at: string
  expires_at: string
  max_devices: number
  active_devices_count: number
  price_monthly?: number
  currency?: string
  payment_method?: SubscriptionPaymentMethod
  last_payment_at?: string | null
  cancel_at_period_end?: boolean
  // Solo presentes en la respuesta de /subscription/{id}
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  canceled_at?: string | null
  suspended_at?: string | null
  terminated_at?: string | null
  trial_ends_at?: string | null

  // ── Prueba gratuita ────────────────────────────────────────────────────────
  // Estos campos los calcula SIEMPRE el backend (php-backend/routes/auth.php →
  // buildSubscriptionData) y viajan con la sesión: el cliente no recalcula ni
  // consulta un endpoint aparte. `days_remaining` es informativo para la UI —
  // la autorización real la decide el backend sobre `expires_at`.
  is_trial?: boolean
  trial_status?: TrialStatus
  trial_started_at?: string | null
  trial_days?: number
  days_remaining?: number | null
}

/** Estado de la prueba gratuita, tal como lo reporta el backend. */
export type TrialStatus = 'trialing' | 'trial_expired' | 'converted' | 'not_trial'

/** Fila de la lista global de suscripciones (panel superadmin). */
export interface SuperadminSubscriptionRow {
  branch_id: number
  branch_name: string
  branch_slug: string
  branch_phone: string | null
  branch_logo_url: string | null
  branch_active: boolean
  subscription_id: number | null
  plan: SubscriptionPlan | null
  status: SubscriptionState | null
  starts_at: string | null
  expires_at: string | null
  max_devices: number | null
  price_monthly: number
  currency: string
  payment_method: SubscriptionPaymentMethod | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  cancel_at_period_end: boolean
  last_payment_at: string | null
  admin_name: string | null
  admin_email: string | null
  days_remaining: number | null
}

export interface SubscriptionMetrics {
  total: number
  active: number
  trial: number
  past_due: number
  suspended: number
  expired: number
  canceled: number
  terminated: number
  pending_transfer: number
  monthly_revenue: number
}

export interface SuperadminSubscriptionsResponse {
  items: SuperadminSubscriptionRow[]
  metrics: SubscriptionMetrics
}

// ─── Billing CRM · Dashboard de KPIs (GET /superadmin/dashboard) ─────────────────
export interface BillingDashboardKpis {
  active: number
  trial: number
  suspended: number
  canceled: number
  grace: number
  past_due: number
  expired: number
  pending_transfer: number
  due_this_week: number
  prepaid_clients: number
  mrr: number
  arr: number
}

export interface BillingUpcomingCharge {
  branch_id: number
  branch_name: string
  expires_at: string
  price_monthly: number
  currency: string
}

export interface BillingDashboardResponse {
  kpis: BillingDashboardKpis
  revenue: { month: number; year: number }
  upcoming: BillingUpcomingCharge[]
}

export interface SubscriptionPayment {
  id: number
  branch_id: number
  subscription_id: number | null
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'rejected' | 'pending_bank_transfer' | 'bank_transfer_review'
  payment_method: SubscriptionPaymentMethodCRM
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  bank_reference: string | null
  bank_transfer_date: string | null
  bank_sender_name: string | null
  bank_name: string | null
  receipt_url: string | null
  // Billing CRM · meses cubiertos (pagos adelantados multi-mes).
  covered_from: string | null
  covered_to: string | null
  months_count: number | null
  notes: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

/** Métodos de pago del Billing CRM (incluye los heredados card/bank_transfer). */
export type SubscriptionPaymentMethodCRM =
  | 'card' | 'bank_transfer' | 'spei' | 'cash' | 'transfer'
  | 'mercado_pago' | 'stripe' | 'other'

/** Estado de una celda del calendario mensual. */
export type CalendarCellStatus =
  | 'paid' | 'prepaid' | 'pending' | 'suspended' | 'canceled' | 'trial' | 'none'

export interface SubscriptionCalendarCell {
  period: string            // 'YYYY-MM'
  status: CalendarCellStatus
  payment_id: number | null
  amount: number | null
  paid_at: string | null
}

export interface SubscriptionCalendarResponse {
  branch_id: number
  cells: SubscriptionCalendarCell[]
}

export interface SubscriptionAuditLog {
  id: number
  branch_id: number
  subscription_id: number | null
  action: string
  previous_status: string | null
  new_status: string | null
  performed_by: number | null
  performed_by_name: string | null
  note: string | null
  created_at: string
}

export interface SuperadminSubscriptionDetail {
  branch: {
    id: number
    name: string
    slug: string
    phone: string | null
    address: string | null
    active: boolean
  }
  admin: { id: number; name: string; email: string } | null
  subscription: (SubscriptionStatus & { id: number; branch_id: number }) | null
  days_remaining: number | null
  payments: SubscriptionPayment[]
  audit_log: SubscriptionAuditLog[]
}

export interface BankTransferConfig {
  id: number
  bank_name: string
  clabe: string
  beneficiary_name: string
  instructions: string | null
  amount_default: number
  is_active: boolean
}

/** Respuesta de GET /billing/me (admin de sucursal). */
export interface MyBillingResponse {
  subscription: (SubscriptionStatus & { id: number; branch_id: number }) | null
  days_remaining: number | null
  payments: SubscriptionPayment[]
  bank_config: BankTransferConfig | null
}

/** Respuesta de POST /billing/bank-transfer-intent. */
export interface BankTransferIntent {
  payment_id: number
  reference: string
  amount: number
  currency: string
  due_date: string
  bank: {
    bank_name: string
    clabe: string
    beneficiary_name: string
    instructions: string | null
  }
}

export interface Branch {
  id: number
  name: string
  slug: string
  address: string | null
  phone: string | null
  logo_url: string | null
  active: boolean
  created_at: string
  /** Cantidad de POS del establecimiento (1 o 2). Por defecto 1. */
  pos_count?: PosCount
  /** 1 = mostrar desglose de IVA; 0 = ocultarlo (el total no cambia). */
  tax_enabled?: number
  /** Porcentaje de IVA de la sucursal (ej. 16.00). Incluido en el precio. */
  tax_rate?: number | string
  /** Tipo de entrega por defecto para el bot de WhatsApp — reemplaza la pregunta "¿mesa/llevar/domicilio?". */
  wa_default_order_type?: 'pickup' | 'delivery'
}

export interface Device {
  id: number
  branch_id: number
  name: string
  assigned_user_id?: number | null
  assigned_user_name?: string | null
  device_role?: string | null
  device_type: 'android' | 'web' | 'tablet' | 'desktop'
  device_uid: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  last_seen_at: string | null
  approved_by: number | null
  approved_at: string | null
  created_at: string
  /** Nombre de la sucursal (solo en listados del superadmin). */
  branch_name?: string | null
  /** Logotipo de la sucursal (solo en listados del superadmin). */
  branch_logo_url?: string | null
}

export type MenuGroup = 'alimento' | 'bebida'

export interface Category {
  id: number
  branch_id: number
  name: string
  emoji: string
  color: string
  sort_order: number
  active: boolean
  station: StationType
  /** Agrupación de alto nivel en la carta pública. */
  menu_group?: MenuGroup
}

export type ProductBadge = 'Nuevo' | 'Popular' | 'Recomendado' | 'Especialidad' | 'Promo'

export interface ProductImage {
  id: number
  url: string
}

export interface Product {
  id: number
  branch_id: number
  category_id: number
  name: string
  description: string | null
  ingredients: string | null
  allergens: string | null
  badge: ProductBadge | null
  price: number
  price_type?: PriceType
  price_per_kg?: number | null
  image_url: string | null
  images?: ProductImage[]
  emoji: string | null
  barcode: string | null
  station_override: StationType | null
  available: boolean
  sort_order: number
  created_at: string
  updated_at: string
  modifiers?: string[]
  category_station?: 'hot' | 'cold' | 'both' | null
  /** Disponibilidad de inventario para badges visuales (no bloquea la venta). */
  inventory_status?: 'ok' | 'low' | 'out'
}

// ─── Modificadores ─────────────────────────────────────────────────────────────

export interface ModifierOption {
  id?: number
  name: string
  price_delta: number
}

export interface ModifierGroup {
  id: number
  branch_id: number
  name: string
  min_select: number
  max_select: number
  required: boolean
  sort_order: number
  options: ModifierOption[]
  product_ids: number[]
}

// Modificador ya elegido en una línea de pedido
export interface ChosenModifier {
  name: string
  price_delta: number
}

// ─── Pagos ──────────────────────────────────────────────────────────────────────

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'monedero'
  | 'otro'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface PaymentInput {
  method: PaymentMethod
  amount: number
  tip?: number
  received?: number
  reference?: string
}

// ─── Cuenta dividida (Dividir Cuenta) ────────────────────────────────────────

/** Cómo se construyó el plan de divisiones (para trazabilidad/auditoría). */
export type SplitMode = 'items' | 'people' | 'amount' | 'guest'

export type SplitStatus = 'pending' | 'paid' | 'cancelled'

/** Asignación de un ítem (o fracción de cantidad) a una división. */
export interface OrderSplitItem {
  order_item_id: number
  quantity: number
  product_name?: string
}

/** Una división cobrable de la cuenta. No altera la orden ni la comanda. */
export interface OrderSplit {
  id: number
  order_id: number
  label: string
  mode: SplitMode
  subtotal: number
  discount: number
  tax: number
  total: number
  paid: number
  status: SplitStatus
  sort_order: number
  items?: OrderSplitItem[]
  created_at?: string | null
  paid_at?: string | null
}

// ─── Clientes y operación ─────────────────────────────────────────────────────

export type CustomerSegment = 'vip' | 'nuevo' | 'inactivo' | 'frecuente' | 'regular'

export interface Customer {
  id: number
  branch_id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  points: number
  wallet_balance: number
  total_spent: number
  visits: number
  last_order_at: string | null
  segment: CustomerSegment
}

export interface CustomerLedgerEntry {
  kind: 'points_earned' | 'points_adjustment' | 'wallet_credit' | 'wallet_debit'
  amount: number
  balance_after: number
  reason: string | null
  ref_type: string | null
  ref_id: number | null
  created_at: string
}

export interface CustomerReview {
  id: number
  branch_id: number
  order_id: number | null
  customer_id: number | null
  customer_name: string | null
  rating: number
  food_rating: number | null
  service_rating: number | null
  delivery_rating: number | null
  comment: string | null
  created_at: string
}

export interface ReviewsResponse {
  avg_rating: number | null
  total: number
  reviews: CustomerReview[]
}

// ─── Promociones, combos, cupones y lealtad (Módulo 5 — crecimiento) ─────────

export type DiscountType = 'discount_percent' | 'discount_amount'
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface Promotion {
  id: number
  branch_id: number
  name: string
  type: DiscountType
  value: number
  applies_to: 'order' | 'category' | 'product'
  target_id: number | null
  days_of_week: DayOfWeek[] | null
  start_time: string | null
  end_time: string | null
  active: boolean
  created_at: string
}

export interface ComboItem {
  id: number
  product_id: number
  quantity: number
  name?: string | null
}

export interface Combo {
  id: number
  branch_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  active: boolean
  sort_order: number
  items: ComboItem[]
  created_at: string
}

export interface Coupon {
  id: number
  branch_id: number
  code: string
  type: DiscountType
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
  created_at: string
}

export type LoyaltyRewardType = 'free_product' | 'discount_percent' | 'discount_amount'

export interface LoyaltyRule {
  id: number
  branch_id: number
  name: string
  purchases_required: number
  reward_type: LoyaltyRewardType
  reward_value: number | null
  reward_product_id: number | null
  active: boolean
  created_at: string
}

export interface Driver {
  id: number
  branch_id: number
  name: string
  phone: string | null
  vehicle: string | null
  status: 'disponible' | 'en_ruta' | 'fuera_de_servicio'
  active_orders: number
}

export interface DeliveryZone {
  id: number
  branch_id: number
  name: string
  cost: number
  min_order: number
  estimated_minutes: number | null
}

export interface DeliveryEvent {
  status: string
  driver_id: number | null
  driver_name: string | null
  note: string | null
  created_at: string
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show'

export interface Reservation {
  id: number
  branch_id: number
  customer_id: number | null
  customer_name: string
  phone: string | null
  party_size: number
  table_id: number | null
  reserved_at: string
  status: ReservationStatus
  notes: string | null
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type DeliveryStatus = 'pending' | 'assigned' | 'on_route' | 'delivered' | 'cancelled'

// ─── Inventario y compras ─────────────────────────────────────────────────────

export interface InventoryItem {
  id: number
  branch_id: number
  name: string
  sku?: string | null
  unit: string
  purchase_unit?: string | null
  purchase_to_base_factor?: number
  stock: number
  min_stock: number
  cost: number
  default_warehouse_id?: number | null
  low_stock: boolean
}

export interface InventoryWarehouse {
  id: number
  branch_id: number
  name: string
  type: 'principal' | 'cocina' | 'barra' | 'refrigerador' | 'congelador' | 'seco' | 'personalizado'
  active: boolean
}

export interface RecipeItem {
  id?: number
  inventory_item_id: number
  name?: string
  unit?: string
  quantity: number
  waste_percent?: number
  unit_cost?: number
  line_cost?: number
}

export interface RecipeCost {
  product_id: number
  total_cost: number
  price: number
  margin: number
  food_cost_percent: number | null
  margin_percent: number | null
  items: RecipeItem[]
}

export interface Supplier {
  id: number
  branch_id: number
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export interface PurchaseOrderItem {
  id?: number
  inventory_item_id: number
  name?: string
  unit?: string
  quantity: number
  received_quantity?: number
  pending_quantity?: number
  unit_cost: number
  subtotal: number
}

export interface PurchaseOrder {
  id: number
  branch_id: number
  supplier_id: number | null
  supplier_name: string | null
  status: 'pending' | 'partially_received' | 'received' | 'cancelled'
  total: number
  notes: string | null
  created_at: string
  received_at: string | null
  items?: PurchaseOrderItem[]
}

export interface InventoryTransferItem {
  id?: number
  inventory_item_id: number
  name?: string
  unit?: string
  quantity: number
}

export interface InventoryTransfer {
  id: number
  branch_id: number
  from_warehouse_id: number
  from_warehouse_name: string
  to_warehouse_id: number
  to_warehouse_name: string
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  received_at: string | null
  items?: InventoryTransferItem[]
}

// ─── Caja y turnos ────────────────────────────────────────────────────────────

export interface CashSession {
  id: number
  branch_id: number
  pos_id: number | null
  opened_by: number | null
  opened_role: string | null
  closed_by: number | null
  closed_role: string | null
  opening_amount: number
  closing_amount: number | null
  expected_amount: number | null
  difference: number | null
  status: 'open' | 'closed'
  notes: string | null
  opened_at: string
  closed_at: string | null
}

export interface CashMovementRow {
  id: number
  type: 'in' | 'out'
  amount: number
  reason: string | null
  created_at: string
}

export interface CashReport {
  session_id: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
  opening_amount: number
  by_method: Record<PaymentMethod, number>
  total_sales: number
  tips: number
  tx_count: number
  discounts: number
  cancellations: number
  cash_in: number
  cash_out: number
  expected_cash: number
  closing_amount: number | null
  difference: number | null
  movements: CashMovementRow[]
}

// ─── KDS Station types ────────────────────────────────────────────────────────

export type ItemStationStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface StationItem {
  order_item_id: number
  product_name: string
  quantity: number
  station_status: ItemStationStatus
  price_type?: PriceType
  unit_price?: number
  weight_kg?: number | null
  price_per_kg?: number | null
  price_pending?: boolean
  modifiers?: ChosenModifier[]
  item_notes?: string | null
  created_at?: string
  is_new?: boolean
  /** Estación a la que pertenece el ítem. Solo se rellena en la vista unificada
   *  (Todas/Caliente/Fría) donde se mezclan ítems de ambas estaciones. */
  station?: 'hot' | 'cold'
}

export interface StationOrder {
  id: number
  table_name: string
  status: OrderStatus
  order_type?: OrderType
  waiter_name?: string | null
  notes: string | null
  created_at: string
  elapsed_seconds: number
  station_complete: boolean
  /** Origen del pedido: 'pos' | 'whatsapp' | 'landing' | … */
  source?: string
  customer_name?: string | null
  customer_phone?: string | null
  items: StationItem[]
}

export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: number
  branch_id: number
  name: string
  seats: number
  status: TableStatus
  current_order_id: number | null
  qr_code: string | null
}

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type OrderItemStatus = 'pending' | 'preparing' | 'completed' | 'cancelled'

export type PriceType = 'fixed' | 'open' | 'kg' | 'variable'

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  /** Set cuando esta línea viene de un combo expandido — agrupa las líneas de esa instancia en el recibo. */
  combo_id?: number | null
  product_name: string
  quantity: number
  unit_price: number
  price_type?: PriceType
  weight_kg?: number | null
  price_per_kg?: number | null
  price_pending?: boolean
  subtotal: number
  modifiers?: ChosenModifier[]
  selectedModifiers?: string[]
  item_notes?: string | null
  status?: OrderItemStatus
  created_at?: string | null
  completed_at?: string | null
  cancel_reason?: string | null
}

export interface Order {
  id: number
  branch_id: number
  table_id: number | null
  table_name: string
  status: OrderStatus
  order_type: OrderType
  customer_id: number | null
  delivery_address: string | null
  delivery_status: DeliveryStatus | null
  driver_id: number | null
  /** Canal de origen: 'pos' (mostrador/admin), 'mesero', 'whatsapp'. */
  source: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  discount: number
  tip: number
  paid: number
  payment_status: PaymentStatus
  notes: string | null
  created_by: number
  waiter_name?: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  /** Plan de cuenta dividida. Vacío/ausente = cuenta única. */
  splits?: OrderSplit[]
  /** Desglose de descuentos automáticos (promoción/cupón/lealtad) aplicados a este pedido. */
  discounts_applied?: DiscountApplied[]
}

export interface DiscountApplied {
  kind: 'promotion' | 'coupon' | 'loyalty'
  reference_id: number | null
  label: string
  amount: number
}

export interface SalesSummaryPeriod {
  revenue: number
  order_count: number
}

export interface SalesSummary {
  today: SalesSummaryPeriod
  week: SalesSummaryPeriod
  month: SalesSummaryPeriod
}

export interface SalesDaily {
  date: string
  revenue: number
  order_count: number
}

export interface SalesByCategory {
  category_name: string
  color: string
  revenue: number
  percentage: number
}

// ─── Dashboard de rentabilidad (Módulo 3) ─────────────────────────────────────

export interface SalesProductStat {
  product_id: number
  name: string
  qty: number
  revenue: number
}

export interface SalesChannelStat {
  channel: string
  order_count: number
  revenue: number
}

export interface SalesHourStat {
  hour: number
  order_count: number
  revenue: number
}

export interface SalesInsights {
  avg_ticket: number
  completed_orders: number
  cancelled_orders: number
  avg_prep_minutes: number | null
  top_products: SalesProductStat[]
  bottom_products: SalesProductStat[]
  by_channel: SalesChannelStat[]
  by_hour: SalesHourStat[]
}

/** Ventas de una sucursal para una fecha (panel superadmin). */
export interface SuperadminBranchSalesItem {
  branch_id: number
  branch_name: string
  branch_logo_url: string | null
  branch_active: boolean
  revenue: number
  order_count: number
  avg_ticket: number
}

/** Respuesta de GET /superadmin/branch-sales?date= */
export interface SuperadminBranchSalesResponse {
  date: string
  branches: SuperadminBranchSalesItem[]
  totals: { revenue: number; order_count: number; avg_ticket: number }
}

// ─── Comanda por voz (mesero) ─────────────────────────────────────────────────

export interface VoiceParsedItem {
  productoId: number
  cantidad: number
  modificadores: string[]
}

/** Respuesta de POST /ordenes/parse-voz. */
export interface VoiceParseResult {
  items: VoiceParsedItem[]
  confianza: number
  ambiguedades: string[]
}

export type LoginResult =
  | { success: true }
  | {
      success: false
      error:
        | 'invalid_credentials'
        | 'subscription_inactive'
        | 'device_rejected'
        | 'invalid_pin'
        | 'pin_locked'
        | 'unknown'
      message: string
      data?: unknown
    }

export type ContactLeadStatus = 'new' | 'read' | 'archived'

export interface ContactLead {
  id: number
  name: string
  whatsapp: string
  message: string
  status: ContactLeadStatus
  source: string
  emailed: boolean
  created_at: string
}

export interface ContactLeadsResponse {
  items: ContactLead[]
  metrics: { total: number; new: number; read: number; archived: number }
}

export interface BusinessConfig {
  businessName: string
  slogan: string
  currency: string
  taxRate: number
  /** Encabezado del ticket de venta */
  address?: string
  phone?: string
  /** Mensaje al pie del ticket (ej. "¡Gracias por su compra!") */
  footer?: string
  /** Logotipo del ticket como data URL (PNG/JPG). Se imprime en navegador y
   *  se rasteriza a ESC/POS para la impresora térmica. */
  ticketLogo?: string | null
}
