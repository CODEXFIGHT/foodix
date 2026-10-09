'use client'

/**
 * Checkout de la landing — totalmente responsivo (una columna en móvil, resumen
 * + formulario en escritorio). Dos métodos de pago acoplados al estilo del
 * sistema (blanco, naranja, botones minimalistas):
 *
 *  • Tarjeta  → Stripe Payment Element (automático, provisión vía webhook).
 *  • SPEI     → transferencia manual: muestra CLABE/referencia y el visitante
 *               reporta su pago; un admin lo verifica y crea la cuenta.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { ArrowLeft, ArrowRight, Check, Copy, CreditCard, Landmark, Lock, ShieldCheck, Clock, Upload, Building2 } from 'lucide-react'
import { getStripe } from '@/lib/stripe/client'
import { cn } from '@/lib/utils/cn'
import { ReceiptUploader } from '@/components/billing/ReceiptUploader'
import { type LandingPlan, formatPlanPrice } from '../plans'

const BRAND = '#FACC15'
const stripePromise = getStripe()

type Method = 'card' | 'spei'

const SPEI_BANK = {
  clabe: '722969010227618671',
  beneficiary: 'CodexFight FoodIX',
  institution: 'Mercado Pago W',
}

/* ─── Wordmark compacto ─── */
function Wordmark() {
  return (
    <Link href="/landing" className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-[#FACC15] text-stone-950 font-bold grid place-items-center font-heading">F</span>
      <span className="inline-block font-heading font-bold text-lg text-stone-900 animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
        Food<span className="text-yellow-700 dark:text-yellow-400">IX</span><sup className="text-[0.55em] align-super">©</sup>
      </span>
    </Link>
  )
}

/* ─── Resumen del pedido ─── */
function OrderSummary({ plan }: { plan: LandingPlan }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tu plan</p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="font-heading font-bold text-xl text-stone-900">{plan.name}</p>
          <p className="text-sm text-stone-500">{plan.tagline}</p>
        </div>
        {plan.featured && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-yellow-700 border border-amber-100">Recomendado</span>
        )}
      </div>

      <div className="mt-5 flex items-end gap-1 border-t border-stone-100 pt-5">
        <span className="font-heading font-extrabold text-4xl text-stone-900">{formatPlanPrice(plan.price)}</span>
        <span className="text-stone-500 mb-1 text-sm">MXN / mes</span>
      </div>
      <p className="mt-1 text-xs text-stone-400">Incluye 1 sucursal · IVA incluido · cancela cuando quieras</p>

      <ul className="mt-5 space-y-2">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
        Pago seguro. No almacenamos los datos de tu tarjeta.
      </div>
    </div>
  )
}

/* ─── Selector de método ─── */
function MethodPicker({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const opts: { id: Method; icon: React.ReactNode; title: string; sub: string }[] = [
    { id: 'card', icon: <CreditCard className="h-5 w-5" />, title: 'Tarjeta', sub: 'Débito o crédito · activación inmediata' },
    { id: 'spei', icon: <Landmark className="h-5 w-5" />, title: 'Transferencia SPEI', sub: 'Reporta tu pago · revisión manual' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {opts.map(o => {
        const on = method === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all',
              on ? 'border-[#EAB308] bg-amber-50/50 ring-2 ring-amber-100' : 'border-stone-200 hover:border-stone-300',
            )}
          >
            <span className={cn('mt-0.5', on ? 'text-yellow-700' : 'text-stone-400')}>{o.icon}</span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">{o.title}</span>
              <span className="block text-xs text-stone-500">{o.sub}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Formulario de tarjeta (dentro de <Elements>) ─── */
function CardForm({ plan, email }: { plan: LandingPlan; email: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/landing/checkout/success?plan=${plan.id}`,
        receipt_email: email || undefined,
      },
    })
    if (error) {
      setError(error.message ?? 'No se pudo procesar el pago. Revisa los datos de tu tarjeta.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <button
        onClick={pay}
        disabled={!stripe || submitting}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold text-stone-950',
          'bg-[#FACC15] hover:bg-[#EAB308] transition-all active:scale-[0.99] shadow-sm hover:shadow-md',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        <Lock className="h-4 w-4" />
        {submitting ? 'Procesando…' : `Pagar ${formatPlanPrice(plan.price)} / mes`}
      </button>
      <p className="text-center text-xs text-stone-400">Al continuar aceptas los Términos y la Política de privacidad de FoodIX.</p>
    </div>
  )
}

/* ─── Fila copiable para datos SPEI ─── */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 hover:bg-stone-50 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-stone-900 font-mono break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        title="Copiar"
        className={cn(
          'shrink-0 h-8 w-8 rounded-lg grid place-items-center transition-all',
          copied
            ? 'bg-green-50 text-green-600'
            : 'bg-stone-100 text-stone-400 hover:bg-amber-50 hover:text-yellow-700',
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

/* ─── Sub-flujo SPEI (manual, datos fijos) ─── */
function SpeiFlow({ plan, email, restaurant }: { plan: LandingPlan; email: string; restaurant: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState({ bank_transfer_date: '', bank_sender_name: '', tracking_reference: '', receipt_url: '' })

  const uploadReceipt = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('receipt', file)
    const res = await fetch('/backend/public/spei-receipt', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message ?? 'No se pudo subir el comprobante.')
    }
    const data = await res.json()
    return data.receipt_url as string
  }

  const report = async () => {
    if (!form.bank_transfer_date || !form.bank_sender_name) {
      setNotice('Indica la fecha de tu transferencia y el nombre del emisor.')
      return
    }
    setLoading(true)
    setNotice(null)
    const ref = `SPEI-${Date.now()}`
    try {
      const res = await fetch('/api/spei-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, email, restaurant, reference: ref, transfer: form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNotice(data?.message ?? 'No se pudo registrar tu reporte. Inténtalo de nuevo.')
        return
      }
      setDone(true)
    } catch {
      setNotice('No se pudo enviar tu reporte. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 grid place-items-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="mt-4 font-heading font-bold text-xl text-stone-900">¡Pago reportado!</h3>
        <p className="mt-2 text-sm text-stone-600 max-w-xs mx-auto">
          Recibimos tu reporte. En cuanto confirmemos el depósito te enviaremos tus accesos por correo a{' '}
          <span className="font-semibold text-stone-800">{email}</span>.
        </p>
        <p className="mt-3 text-xs text-stone-400">Revisión en 24–48 h hábiles</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Monto a transferir ── */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-50 border border-amber-100 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">Monto mensual</p>
          <p className="mt-0.5 font-heading font-extrabold text-3xl text-stone-900">
            {formatPlanPrice(plan.price)}
            <span className="text-base font-medium text-stone-500 ml-1">MXN / mes</span>
          </p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-[#FACC15]/10 grid place-items-center shrink-0">
          <Landmark className="h-6 w-6 text-yellow-700 dark:text-yellow-400" />
        </div>
      </div>

      {/* ── Tarjeta con datos bancarios ── */}
      <div className="rounded-2xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 px-4 py-3 flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-stone-400" />
          <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Datos de transferencia SPEI</span>
        </div>
        <div className="divide-y divide-stone-100">
          <CopyRow label="Institución" value={SPEI_BANK.institution} />
          <CopyRow label="CLABE interbancaria" value={SPEI_BANK.clabe} />
          <CopyRow label="Beneficiario" value={SPEI_BANK.beneficiary} />
          <CopyRow label="Monto exacto" value={`${formatPlanPrice(plan.price)} MXN`} />
        </div>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed">
        <span className="font-semibold">Importante:</span> Usa exactamente el monto indicado y escribe tu correo (<span className="font-mono">{email}</span>) en el concepto para agilizar la activación.
      </p>

      {/* ── Formulario de reporte ── */}
      <div className="border-t border-stone-100 pt-5 space-y-4">
        <div>
          <h3 className="font-semibold text-stone-900">Ya realicé la transferencia</h3>
          <p className="text-xs text-stone-500 mt-0.5">Completa los datos para que podamos activar tu cuenta.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Fecha de transferencia *</label>
            <input
              type="date"
              value={form.bank_transfer_date}
              onChange={e => setForm(f => ({ ...f, bank_transfer_date: e.target.value }))}
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-[#CA8A04] focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600">Nombre del emisor *</label>
            <input
              value={form.bank_sender_name}
              onChange={e => setForm(f => ({ ...f, bank_sender_name: e.target.value }))}
              placeholder="Titular que hizo la transferencia"
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-[#CA8A04] focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-stone-600">Clave de rastreo SPEI (opcional)</label>
            <input
              value={form.tracking_reference}
              onChange={e => setForm(f => ({ ...f, tracking_reference: e.target.value }))}
              placeholder="Ej. 2024112912345678"
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-[#CA8A04] focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-stone-600 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Comprobante de pago
              <span className="text-stone-400">(recomendado)</span>
            </label>
            <ReceiptUploader
              value={form.receipt_url}
              onChange={url => setForm(f => ({ ...f, receipt_url: url }))}
              upload={uploadReceipt}
            />
          </div>
        </div>

        {notice && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">{notice}</p>
        )}

        <button
          onClick={report}
          disabled={loading}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold text-stone-950',
            'bg-[#FACC15] hover:bg-[#EAB308] transition-all active:scale-[0.99] shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {loading ? 'Enviando reporte…' : <>Reportar mi transferencia <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutClient({ plan }: { plan: LandingPlan }) {
  const [method, setMethod] = useState<Method>('card')
  const [email, setEmail] = useState('')
  const [restaurant, setRestaurant] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [speiStarted, setSpeiStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const started = clientSecret !== null || speiStarted

  const start = async () => {
    if (!email.trim() || !restaurant.trim()) {
      setNotice('Captura tu correo y el nombre de tu restaurante para continuar.')
      return
    }
    setNotice(null)
    if (method === 'spei') {
      setSpeiStarted(true)
      return
    }
    // Tarjeta → crear PaymentIntent
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, email, restaurant }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.error === 'not_configured') {
          setNotice('El pago con tarjeta estará disponible muy pronto. Mientras tanto puedes pagar por transferencia SPEI o escribirnos a restauros@atomicmail.io')
        } else {
          setNotice(data?.message ?? 'No se pudo iniciar el pago. Inténtalo de nuevo.')
        }
        return
      }
      setClientSecret(data.clientSecret)
    } catch {
      setNotice('No se pudo conectar con el servidor de pagos. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const elementsOptions: StripeElementsOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: BRAND,
            colorText: '#1c1917',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '12px',
          },
        },
      }
    : undefined

  return (
    <div className="min-h-screen bg-white text-stone-800 font-sans">
      <header className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Wordmark />
          <Link href="/landing#precios" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver a planes
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="max-w-2xl">
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900">Finaliza tu suscripción</h1>
          <p className="mt-2 text-stone-600">Estás a un paso de poner tu restaurante en orden con <span className="font-semibold text-stone-800">{plan.name}</span>.</p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
          <div className="order-2 lg:order-1">
            <OrderSummary plan={plan} />
          </div>

          <div className="order-1 lg:order-2 rounded-2xl border border-stone-200 bg-white p-6">
            {!started ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-stone-900">Tus datos</h2>
                  <p className="text-sm text-stone-500">Crearemos tu cuenta con esta información.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm outline-none focus:border-[#CA8A04] focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Nombre del restaurante</label>
                  <input
                    type="text"
                    value={restaurant}
                    onChange={e => setRestaurant(e.target.value)}
                    placeholder="Mariscos El Puerto"
                    autoComplete="organization"
                    className="w-full h-11 rounded-xl border border-stone-200 px-3.5 text-sm outline-none focus:border-[#CA8A04] focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-stone-700">Método de pago</label>
                  <MethodPicker method={method} onChange={setMethod} />
                </div>

                {notice && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">{notice}</p>
                )}

                <button
                  onClick={start}
                  disabled={loading}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold text-stone-950',
                    'bg-[#FACC15] hover:bg-[#EAB308] transition-all active:scale-[0.99] shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {loading ? 'Preparando…' : <>Continuar <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            ) : method === 'spei' ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-stone-900">Transferencia SPEI</h2>
                  <p className="text-sm text-stone-500">Paga por transferencia y repórtalo para activar tu cuenta.</p>
                </div>
                <SpeiFlow plan={plan} email={email} restaurant={restaurant} />
              </div>
            ) : stripePromise && elementsOptions ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-stone-900">Datos de pago</h2>
                  <p className="text-sm text-stone-500">Tarjeta de débito o crédito.</p>
                </div>
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <div className="space-y-4">
                    <LinkAuthenticationElement options={{ defaultValues: { email } }} />
                    <CardForm plan={plan} email={email} />
                  </div>
                </Elements>
              </div>
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                El pago con tarjeta no está disponible en este momento. Usa la transferencia SPEI o escríbenos a{' '}
                <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 hover:underline">restauros@atomicmail.io</a>.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
