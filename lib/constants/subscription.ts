import type { SubscriptionState, CalendarCellStatus, SubscriptionPaymentMethodCRM } from '@/lib/types'

/** Etiqueta legible (es-MX) por estado de suscripción. */
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionState, string> = {
  active:                'Activa',
  trial:                 'Prueba',
  past_due:              'Por vencer',
  payment_failed:        'Pago fallido',
  pending_bank_transfer: 'Transferencia pendiente',
  bank_transfer_review:  'En revisión',
  suspended:             'Suspendida',
  canceled:              'Cancelada',
  terminated:            'Dada de baja',
  expired:               'Vencida',
}

/** Clases Tailwind (tema oscuro) para badges por estado. */
export const SUBSCRIPTION_STATUS_BADGE: Record<SubscriptionState, string> = {
  active:                'bg-green-500/10 text-green-400',
  trial:                 'bg-blue-500/10 text-blue-400',
  past_due:              'bg-yellow-500/10 text-yellow-400',
  payment_failed:        'bg-red-500/10 text-red-400',
  pending_bank_transfer: 'bg-orange-500/10 text-orange-400',
  bank_transfer_review:  'bg-purple-500/10 text-purple-400',
  suspended:             'bg-yellow-500/10 text-yellow-400',
  canceled:              'bg-slate-500/10 text-slate-400',
  terminated:            'bg-red-500/10 text-red-400',
  expired:               'bg-red-500/10 text-red-400',
}

/** Estados que permiten acceso operativo (con o sin advertencia). */
export const SUBSCRIPTION_ALLOWED: SubscriptionState[] = ['active', 'trial', 'past_due']

/** Mensaje al admin de sucursal según el estado. */
export const SUBSCRIPTION_MESSAGE: Record<SubscriptionState, string> = {
  active:                'Tu suscripción está activa.',
  trial:                 'Estás en periodo de prueba.',
  past_due:              'Tu suscripción vence pronto. Te recomendamos renovar tu método de pago.',
  payment_failed:        'No pudimos procesar tu pago. Actualiza tu tarjeta para evitar la suspensión.',
  pending_bank_transfer: 'Tienes una transferencia pendiente. Sigue las instrucciones para completar tu pago.',
  bank_transfer_review:  'Tu pago por transferencia está pendiente de revisión.',
  suspended:             'Tu sucursal fue suspendida temporalmente. Contacta al soporte de FoodIX.',
  canceled:              'Tu suscripción fue cancelada. Tendrás acceso hasta el final del periodo.',
  terminated:            'Tu sucursal fue dada de baja definitivamente. Contacta al equipo de FoodIX si crees que fue un error.',
  expired:               'Tu suscripción venció. Renueva para continuar.',
}

export const PLAN_BADGE: Record<string, string> = {
  trial:         'bg-slate-500/10 text-slate-400',
  starter:       'bg-blue-500/10 text-blue-400',
  pro:           'bg-orange-500/10 text-orange-400',
  ai:            'bg-purple-500/10 text-purple-400',
  multisucursal: 'bg-yellow-500/10 text-yellow-400',
}

/** Planes visibles en el selector del superadmin y en la landing. */
export const SUPERADMIN_PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    price: 350,
    desc: 'POS básico, productos, ventas del día, corte de caja y carta QR simple.',
    features: ['POS básico', 'Productos y categorías', 'Ventas del día', 'Corte de caja básico', 'Carta QR simple'],
    whatsapp: false,
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 700,
    desc: 'Todo Starter + mesas, cocina/KDS, carta QR premium y reportes avanzados.',
    features: ['Todo Starter', 'Mesas', 'Cocina / KDS', 'Carta QR premium', 'Reportes avanzados', 'Modificadores de productos', 'Roles: Admin, Mesero, Cocina', 'Notificaciones internas'],
    whatsapp: false,
  },
  {
    id: 'ai',
    label: 'AI',
    price: 1100,
    desc: 'Todo Pro + WhatsApp AI Waiter: pedidos automáticos y recomendaciones inteligentes.',
    features: ['Todo Pro', 'WhatsApp AI Waiter', 'Pedidos automáticos por WhatsApp', 'Recomendaciones inteligentes', 'Confirmación de pedido y número de orden', 'Alias y teléfono del cliente', 'Envío directo a cocina', 'Notificación al admin', 'Analítica de clientes'],
    whatsapp: true,
  },
  {
    id: 'multisucursal',
    label: 'MultiSucursal',
    price: 1900,
    desc: 'Todo AI + dashboard centralizado y control de múltiples sucursales.',
    features: ['Todo AI', 'Dashboard centralizado', 'Comparativo por sucursales', 'Usuarios y roles por sucursal', 'Reportes consolidados', 'Configuración remota', 'Soporte prioritario'],
    whatsapp: true,
  },
] as const

export type SuperadminPlanId = typeof SUPERADMIN_PLANS[number]['id']

/** Color de texto para los días restantes según urgencia. */
export function daysRemainingClass(days: number | null): string {
  if (days === null) return 'text-slate-400'
  if (days < 0) return 'text-red-400'
  if (days <= 7) return 'text-yellow-400'
  return 'text-green-400'
}

export function formatDaysRemaining(days: number | null): string {
  if (days === null) return '—'
  if (days < 0) return `Vencida hace ${Math.abs(days)}d`
  if (days === 0) return 'Vence hoy'
  return `${days}d restantes`
}

export function formatMXN(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount || 0)
}

// ─── Billing CRM ────────────────────────────────────────────────────────────────

/** Etiqueta legible por método de pago. */
export const PAYMENT_METHOD_LABEL: Record<SubscriptionPaymentMethodCRM, string> = {
  transfer:     'Transferencia',
  bank_transfer:'Transferencia',
  spei:         'SPEI',
  cash:         'Efectivo',
  card:         'Tarjeta',
  mercado_pago: 'Mercado Pago',
  stripe:       'Stripe',
  other:        'Otro',
}

/** Métodos seleccionables al registrar un pago manual. */
export const PAYMENT_METHODS: { value: SubscriptionPaymentMethodCRM; label: string }[] = [
  { value: 'transfer',     label: 'Transferencia' },
  { value: 'spei',         label: 'SPEI' },
  { value: 'cash',         label: 'Efectivo' },
  { value: 'card',         label: 'Tarjeta' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'stripe',       label: 'Stripe' },
  { value: 'other',        label: 'Otro' },
]

/** Apariencia + leyenda de cada estado de celda del calendario mensual. */
export const CALENDAR_CELL: Record<CalendarCellStatus, { label: string; dot: string; cell: string }> = {
  paid:      { label: 'Pagado',        dot: 'bg-emerald-400', cell: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  prepaid:   { label: 'Adelantado',    dot: 'bg-amber-400',   cell: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  pending:   { label: 'Pendiente',     dot: 'bg-red-400',     cell: 'bg-red-500/15 text-red-300 border-red-500/30' },
  suspended: { label: 'Suspendido',    dot: 'bg-neutral-300', cell: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30' },
  canceled:  { label: 'Cancelado',     dot: 'bg-slate-400',   cell: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  trial:     { label: 'Prueba',        dot: 'bg-blue-400',    cell: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  none:      { label: 'Sin actividad', dot: 'bg-neutral-700', cell: 'bg-white/[0.02] text-neutral-600 border-white/5' },
}

const STARTER_FEATURES  = ['pos', 'products', 'sales_today', 'cash_basic', 'carta_qr_simple']
const PRO_FEATURES      = [...STARTER_FEATURES, 'tables', 'kds', 'carta_qr_premium', 'reports_advanced', 'modifiers', 'internal_notifications', 'inventory', 'customers', 'promotions']
const AI_FEATURES       = [...PRO_FEATURES, 'whatsapp_ai_waiter', 'whatsapp_orders', 'ai_recommendations', 'customer_analytics']
const MULTISUCURSAL_FEATURES = [...AI_FEATURES, 'multi_branch', 'centralized_dashboard', 'consolidated_reports', 'remote_config', 'priority_support']

/**
 * Licencia derivada del plan (espejo de licenseForPlan() en
 * php-backend/config/subscription_helpers.php — mantener ambas en sync).
 * -1 = ilimitado.
 */
export const LICENSE_BY_PLAN: Record<string, { max_users: number; max_pos: number; max_branches: number; features: string[] }> = {
  trial:         { max_users: 3,  max_pos: 1, max_branches: 1,  features: ['pos', 'kds', 'reports'] },
  starter:       { max_users: 5,  max_pos: 1, max_branches: 1,  features: STARTER_FEATURES },
  pro:           { max_users: 10, max_pos: 2, max_branches: 1,  features: PRO_FEATURES },
  ai:            { max_users: 15, max_pos: 3, max_branches: 2,  features: AI_FEATURES },
  multisucursal: { max_users: -1, max_pos: 5, max_branches: 10, features: MULTISUCURSAL_FEATURES },
}

export function formatLimit(n: number): string {
  return n === -1 ? 'Ilimitado' : String(n)
}

// ─── Gating de features por plan ─────────────────────────────────────────────────

/** ¿El plan incluye la feature dada? (lee LICENSE_BY_PLAN). */
export function planHasFeature(plan: string | null | undefined, feature: string): boolean {
  if (!plan) return false
  return LICENSE_BY_PLAN[plan]?.features.includes(feature) ?? false
}

/** ¿El plan tiene acceso al WhatsApp AI Waiter? (plan AI / MultiSucursal). */
export function hasWhatsApp(plan: string | null | undefined): boolean {
  return planHasFeature(plan, 'whatsapp_ai_waiter')
}

/** ¿Es un plan Pro o superior (Pro / AI / MultiSucursal)? */
export function isProOrHigher(plan: string | null | undefined): boolean {
  return plan === 'pro' || plan === 'ai' || plan === 'multisucursal'
}
