'use client'

import { useEffect, useState } from 'react'
import {
  useMyBilling, useBankTransferIntent, useBankTransferSubmit,
  useCreateCheckoutSession, useCreatePortalSession, useUploadReceipt,
} from '@/lib/api/queries'
import { ReceiptUploader } from '@/components/billing/ReceiptUploader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import {
  Copy, CheckCircle2, CreditCard, Building2,
  Check, Zap, ChevronRight, Clock,
} from 'lucide-react'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import {
  SUBSCRIPTION_STATUS_LABEL, SUBSCRIPTION_STATUS_BADGE, SUBSCRIPTION_MESSAGE,
  daysRemainingClass, formatDaysRemaining, formatMXN,
} from '@/lib/constants/subscription'
import { StripePaymentForm } from '@/components/billing/StripePaymentForm'
import type { SubscriptionState, BankTransferIntent } from '@/lib/types'

// Datos fijos de transferencia SPEI
const SPEI_BANK = {
  clabe: '722969010227618671',
  beneficiary: 'CodexFight FoodIX',
  institution: 'Mercado Pago W',
}

// Features por plan (debe coincidir con SUPERADMIN_PLANS en lib/constants/subscription.ts)
const PLAN_FEATURES: Record<string, { icon: string; label: string; pro?: boolean }[]> = {
  starter: [
    { icon: '🧾', label: 'POS básico' },
    { icon: '📦', label: 'Productos y categorías' },
    { icon: '📊', label: 'Ventas del día' },
    { icon: '💵', label: 'Corte de caja básico' },
    { icon: '📱', label: 'Carta QR simple' },
  ],
  pro: [
    { icon: '🧾', label: 'Todo Starter' },
    { icon: '🪑', label: 'Mesas' },
    { icon: '🔥', label: 'Cocina / KDS' },
    { icon: '📱', label: 'Carta QR premium' },
    { icon: '📊', label: 'Reportes avanzados' },
    { icon: '🎛️', label: 'Modificadores de productos' },
    { icon: '🔔', label: 'Notificaciones internas' },
  ],
  ai: [
    { icon: '🧾', label: 'Todo Pro' },
    { icon: '💬', label: 'WhatsApp AI Waiter', pro: true },
    { icon: '🤖', label: 'Pedidos automáticos por WhatsApp', pro: true },
    { icon: '✨', label: 'Recomendaciones inteligentes', pro: true },
    { icon: '📈', label: 'Analítica de clientes', pro: true },
  ],
  multisucursal: [
    { icon: '🧾', label: 'Todo AI' },
    { icon: '🏪', label: 'Dashboard centralizado' },
    { icon: '📊', label: 'Reportes consolidados' },
    { icon: '⚙️', label: 'Configuración remota' },
    { icon: '🛟', label: 'Soporte prioritario' },
  ],
}

function fmtDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  try {
    return format(parseISO(value), withTime ? "d MMM yyyy, HH:mm" : 'd MMM yyyy', { locale: es })
  } catch { return '—' }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100 font-mono break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        title="Copiar"
        className={cn(
          'shrink-0 h-8 w-8 rounded-lg grid place-items-center transition-all',
          copied
            ? 'bg-green-50 text-green-600 dark:bg-green-900/30'
            : 'bg-stone-100 text-stone-400 hover:bg-orange-50 hover:text-[#D1400F] dark:bg-stone-800 dark:hover:bg-orange-900/20',
        )}
      >
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const premium = plan === 'ai' || plan === 'multisucursal'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border capitalize',
      premium
        ? 'bg-purple-500/10 text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-500/30'
        : 'bg-orange-500/10 text-[#D1400F] border-orange-200 dark:border-orange-500/30',
    )}>
      {premium && <Zap className="h-3 w-3" />}
      {plan}
    </span>
  )
}

export default function BillingPage() {
  const { data, isLoading } = useMyBilling()
  const intentMut    = useBankTransferIntent()
  const submitMut    = useBankTransferSubmit()
  const checkoutMut  = useCreateCheckoutSession()
  const portalMut    = useCreatePortalSession()
  const uploadReceiptMut = useUploadReceipt()
  const [showCardForm, setShowCardForm] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [intent, setIntent] = useState<BankTransferIntent | null>(null)
  const [form, setForm] = useState({
    bank_transfer_date: '',
    bank_sender_name: '',
    bank_name: '',
    tracking_reference: '',
    receipt_url: '',
  })

  const sub    = data?.subscription
  const status = (sub?.status ?? null) as SubscriptionState | null
  const plan   = sub?.plan ?? ''
  const planStr = plan as string
  const isPro  = plan === 'ai' || plan === 'multisucursal'
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter

  // Respaldo solo si el backend aún no trae price_monthly (sucursal recién
  // creada / no sincronizada) — debe coincidir con SUPERADMIN_PLANS
  // (lib/constants/subscription.ts) y PLANS (app/landing/plans.ts).
  // La prueba gratuita no tiene precio: mostrar el de Starter ahí sería
  // engañoso ("Plan activo: Trial — $350/mes"). Se muestra "Gratis" y el
  // importe real aparece al elegir plan.
  const isTrialPlan = planStr === 'trial'
  const monthlyPrice = (sub?.price_monthly && Number(sub.price_monthly) > 0)
    ? Number(sub.price_monthly)
    : isTrialPlan ? 0
    : planStr === 'multisucursal' ? 1900 : planStr === 'ai' ? 1100 : planStr === 'pro' ? 700 : 350

  const lastPaidPayment = data?.payments?.find(p => p.status === 'paid')
  const lastPaymentValue = lastPaidPayment ? (
    <div className="flex flex-col text-left">
      <span className="text-stone-900 dark:text-stone-100 text-sm font-semibold">
        {formatMXN(lastPaidPayment.amount, lastPaidPayment.currency)}
      </span>
      <span className="text-stone-400 dark:text-stone-500 text-[10px] font-normal">
        {fmtDate(lastPaidPayment.created_at)}
      </span>
    </div>
  ) : sub?.last_payment_at ? (
    <span className="text-stone-900 dark:text-stone-100 text-sm font-semibold">
      {fmtDate(sub.last_payment_at)}
    </span>
  ) : (
    <span className="text-stone-400 dark:text-stone-500 text-sm font-semibold">—</span>
  )

  const isInternal = sub?.expires_at
    ? new Date(sub.expires_at).getFullYear() >= 2099
    : false

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout === 'success') toast.success('Pago procesado. Tu suscripción se actualizará en unos segundos.')
    else if (checkout === 'cancel') toast.info('Pago cancelado. Puedes intentarlo de nuevo cuando quieras.')
    if (checkout) window.history.replaceState({}, '', '/billing')
  }, [])

  const payWithCard = async () => {
    try {
      const { url } = await checkoutMut.mutateAsync()
      window.location.href = url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'El pago con tarjeta no está disponible')
    }
  }

  const openPortal = async () => {
    try {
      const { url } = await portalMut.mutateAsync()
      window.location.href = url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el portal')
    }
  }

  const startTransfer = async () => {
    setShowTransfer(true)
    if (!intent) {
      try {
        const res = await intentMut.mutateAsync()
        setIntent(res)
      } catch {
        // Usa datos fijos si el backend no devuelve intent
      }
    }
  }

  const submitTransfer = async () => {
    if (!form.bank_transfer_date || !form.bank_sender_name) {
      toast.error('Indica la fecha y el nombre del emisor')
      return
    }
    try {
      if (intent) {
        await submitMut.mutateAsync({ payment_id: intent.payment_id, ...form })
      }
      toast.success('Comprobante enviado. Tu pago está en revisión.')
      setShowTransfer(false)
      setIntent(null)
      setForm({ bank_transfer_date: '', bank_sender_name: '', bank_name: '', tracking_reference: '', receipt_url: '' })
    } catch {
      toast.error('No se pudo enviar el comprobante')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl pb-10">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Mi Suscripción</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">Estado de tu plan y opciones de pago</p>
      </div>

      {/* ── Tarjeta principal del plan ── */}
      <div className={cn(
        'rounded-2xl border p-5 sm:p-6 space-y-5',
        isPro
          ? 'bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-stone-900 border-purple-200/60 dark:border-purple-500/20'
          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800',
      )}>
        {/* Plan + estado */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-500 dark:text-stone-400 text-sm font-medium">Plan activo:</span>
              <PlanBadge plan={plan || 'starter'} />
              {status && (
                <Badge className={cn('text-xs', SUBSCRIPTION_STATUS_BADGE[status])}>
                  {SUBSCRIPTION_STATUS_LABEL[status]}
                </Badge>
              )}
              {isInternal && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30">
                  <Zap className="h-2.5 w-2.5" /> Cuenta interna
                </span>
              )}
            </div>
            {status && <p className="text-stone-600 dark:text-stone-400 text-sm">{SUBSCRIPTION_MESSAGE[status]}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {isTrialPlan && monthlyPrice === 0 ? 'Gratis' : formatMXN(monthlyPrice, sub?.currency ?? 'MXN')}
            </p>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              {isTrialPlan && monthlyPrice === 0 ? 'Prueba de 14 días' : '/ mes · IVA incluido'}
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
          {[
            { label: 'Inicio', value: fmtDate(sub?.starts_at) },
            {
              label: isInternal ? 'Sin vencimiento' : 'Renovación',
              value: isInternal ? '∞ Nunca' : fmtDate(sub?.expires_at),
            },
            {
              label: 'Días restantes',
              value: isInternal
                ? <span className="text-[#25D366] font-semibold">Ilimitado</span>
                : <span className={daysRemainingClass(data?.days_remaining ?? null)}>{formatDaysRemaining(data?.days_remaining ?? null)}</span>,
            },
            { label: 'Último pago', value: lastPaymentValue },
          ].map(item => (
            <div key={item.label} className="bg-white/60 dark:bg-stone-800/40 rounded-xl px-3 py-2.5 flex flex-col justify-between">
              <p className="text-stone-400 dark:text-stone-500 text-[10px] font-medium uppercase tracking-wider mb-1">{item.label}</p>
              <div className="text-stone-900 dark:text-stone-100 text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Features del plan */}
        <div className="pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
            Incluido en tu plan
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {features.map(f => (
              <li key={f.label} className={cn(
                'flex items-center gap-2 text-sm rounded-lg px-3 py-1.5',
                f.pro
                  ? 'bg-[#25D366]/8 dark:bg-[#25D366]/10 text-[#25D366] font-medium'
                  : 'text-stone-700 dark:text-stone-300',
              )}>
                {f.pro ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366] shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                ) : (
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}
                <span>{f.label}</span>
                {f.pro && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase shrink-0">
                    Beta
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Opciones de pago ── */}
      {!showTransfer ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Renovar suscripción</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tarjeta */}
            <button
              onClick={() => setShowCardForm(v => !v)}
              className={cn(
                'flex items-center gap-3 sm:flex-col sm:items-start rounded-2xl border p-4 sm:p-5 text-left transition-all',
                showCardForm
                  ? 'border-[#D1400F] bg-orange-50/50 dark:bg-orange-950/20'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-[#D1400F] hover:shadow-sm',
              )}
            >
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 grid place-items-center shrink-0">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-900 dark:text-stone-100">Pagar con tarjeta</p>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">Débito o crédito · activación inmediata</p>
              </div>
              <ChevronRight className={cn(
                'h-4 w-4 text-stone-400 transition-transform sm:hidden',
                showCardForm && 'rotate-90',
              )} />
            </button>

            {/* Transferencia SPEI */}
            <button
              onClick={startTransfer}
              disabled={intentMut.isPending}
              className="flex items-center gap-3 sm:flex-col sm:items-start rounded-2xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 p-4 sm:p-5 text-left hover:border-[#D1400F] hover:shadow-sm transition-all disabled:opacity-60"
            >
              <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/20 grid place-items-center shrink-0">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {intentMut.isPending ? 'Cargando…' : 'Pago por SPEI'}
                </p>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">Transferencia bancaria · revisión en 24 h</p>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400 sm:hidden" />
            </button>
          </div>

          {showCardForm && (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-3">
              <StripePaymentForm onClose={() => setShowCardForm(false)} />
              <button
                onClick={payWithCard}
                disabled={checkoutMut.isPending}
                className="text-xs text-stone-400 hover:text-[#D1400F] underline disabled:opacity-60"
              >
                {checkoutMut.isPending ? 'Redirigiendo…' : 'O usar el checkout alojado de Stripe'}
              </button>
            </div>
          )}

          {sub?.stripe_customer_id && (
            <Button variant="outline" onClick={openPortal} disabled={portalMut.isPending}
              className="w-full sm:w-auto text-stone-600 dark:text-stone-300">
              {portalMut.isPending ? 'Abriendo…' : 'Actualizar método de pago (Stripe)'}
            </Button>
          )}
        </div>
      ) : (
        /* ── Vista de transferencia SPEI ── */
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden space-y-0">
          {/* Header SPEI */}
          <div className="bg-stone-900 dark:bg-black px-4 py-3 flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-stone-400" />
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Datos de transferencia SPEI</span>
          </div>

          {/* Monto destacado */}
          <div className="px-4 py-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Monto a transferir</p>
              <p className="mt-0.5 font-extrabold text-2xl sm:text-3xl text-stone-900 dark:text-stone-100">
                {formatMXN(sub?.price_monthly ?? 0, sub?.currency ?? 'MXN')}
                <span className="text-sm font-medium text-stone-500 ml-1">MXN / mes</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#D1400F]/10 grid place-items-center shrink-0">
              <Building2 className="h-5 w-5 text-[#D1400F]" />
            </div>
          </div>

          {/* Filas copiables */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            <CopyRow label="Institución" value={SPEI_BANK.institution} />
            <CopyRow label="CLABE interbancaria" value={SPEI_BANK.clabe} />
            <CopyRow label="Beneficiario" value={SPEI_BANK.beneficiary} />
            {intent?.reference && <CopyRow label="Concepto / Referencia" value={intent.reference} />}
          </div>

          {/* Aviso */}
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <span className="font-semibold">Importante:</span> Usa exactamente el monto indicado y escribe tu correo en el concepto de la transferencia para agilizar la activación.
            </p>
          </div>

          {/* Formulario de reporte */}
          <div className="px-4 pb-5 pt-4 space-y-4 border-t border-stone-100 dark:border-stone-800">
            <div>
              <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Ya realicé la transferencia</p>
              <p className="text-xs text-stone-500 mt-0.5">Completa los datos para que activemos tu plan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-stone-600 dark:text-stone-400">Fecha de transferencia *</Label>
                <Input
                  type="date"
                  value={form.bank_transfer_date}
                  onChange={e => setForm(f => ({ ...f, bank_transfer_date: e.target.value }))}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-stone-600 dark:text-stone-400">Nombre del emisor *</Label>
                <Input
                  value={form.bank_sender_name}
                  onChange={e => setForm(f => ({ ...f, bank_sender_name: e.target.value }))}
                  placeholder="Titular que hizo la transferencia"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-stone-600 dark:text-stone-400">Banco emisor</Label>
                <Input
                  value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="BBVA, HSBC, Banorte…"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-stone-600 dark:text-stone-400">Clave de rastreo SPEI</Label>
                <Input
                  value={form.tracking_reference}
                  onChange={e => setForm(f => ({ ...f, tracking_reference: e.target.value }))}
                  placeholder="Folio / referencia"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Comprobante de pago <span className="text-stone-400">(recomendado)</span>
                </Label>
                <ReceiptUploader
                  value={form.receipt_url}
                  onChange={url => setForm(f => ({ ...f, receipt_url: url }))}
                  upload={async file => (await uploadReceiptMut.mutateAsync(file)).receipt_url}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={submitTransfer}
                disabled={submitMut.isPending}
                className="bg-[#D1400F] hover:bg-[#B03508] text-white h-11 w-full sm:w-auto"
              >
                {submitMut.isPending ? 'Enviando…' : 'Reportar mi transferencia'}
              </Button>
              <Button
                variant="ghost"
                className="text-stone-500 h-11 w-full sm:w-auto"
                onClick={() => { setShowTransfer(false); setIntent(null) }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial de pagos ── */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2">
          <Clock className="h-4 w-4 text-stone-400" />
          <h2 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Historial de pagos</h2>
        </div>
        {(data?.payments ?? []).length === 0 ? (
          <p className="text-stone-400 dark:text-stone-500 text-sm p-5">Aún no tienes pagos registrados</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {(data?.payments ?? []).map(p => (
              <div key={p.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-stone-900 dark:text-stone-100 text-sm font-medium">
                    {formatMXN(p.amount, p.currency)}
                    <span className="text-stone-400 dark:text-stone-500 font-normal ml-1.5">
                      · {p.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                    </span>
                  </p>
                  <p className="text-stone-400 dark:text-stone-500 text-xs">
                    {fmtDate(p.created_at, true)}{p.bank_reference ? ` · ${p.bank_reference}` : ''}
                  </p>
                  {p.rejection_reason && (
                    <p className="text-red-500 text-xs mt-0.5">Rechazado: {p.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#D1400F] text-xs underline">
                      Comprobante
                    </a>
                  )}
                  <Badge className={cn(
                    'text-xs',
                    p.status === 'paid' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                    p.status === 'rejected' || p.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                  )}>
                    {p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-600 text-center">
        ¿Dudas sobre tu plan? Escríbenos a{' '}
        <a href="mailto:foodix@atomicmail.io" className="text-[#D1400F] hover:underline">foodix@atomicmail.io</a>
      </p>
    </div>
  )
}
