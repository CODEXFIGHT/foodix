'use client'

import { useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe/client'
import { useCreateSubscription } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const stripePromise = getStripe()

/** Formulario interno (dentro de <Elements>) con el Payment Element. */
function InnerForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?checkout=success`,
      },
    })
    // Si hay error inmediato (validación/tarjeta), se muestra; si no, Stripe redirige.
    if (error) {
      toast.error(error.message ?? 'No se pudo procesar el pago')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2">
        <Button
          onClick={handlePay}
          disabled={!stripe || submitting}
          loading={submitting}
          className="bg-[#E85D04] hover:bg-[#C44D00] text-white"
        >
          {submitting ? 'Procesando…' : 'Pagar suscripción'}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-stone-500">
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-stone-400">Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta.</p>
    </div>
  )
}

/**
 * Inicia una suscripción (crea PaymentIntent) y muestra el Payment Element embebido.
 * Requiere NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configurada.
 */
export function StripePaymentForm({ onClose }: { onClose: () => void }) {
  const createSub = useCreateSubscription()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const start = async () => {
    setStarted(true)
    try {
      const res = await createSub.mutateAsync()
      setClientSecret(res.client_secret)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar el pago')
      setStarted(false)
    }
  }

  if (!stripePromise) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        El pago con tarjeta embebido aún no está disponible (falta configurar Stripe).
        Usa el pago por transferencia mientras tanto.
      </div>
    )
  }

  if (!started || !clientSecret) {
    return (
      <Button
        onClick={start}
        disabled={createSub.isPending}
        loading={createSub.isPending}
        className="bg-[#E85D04] hover:bg-[#C44D00] text-white"
      >
        {createSub.isPending ? 'Preparando pago…' : 'Pagar con tarjeta (formulario seguro)'}
      </Button>
    )
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <InnerForm onClose={onClose} />
      </Elements>
    </div>
  )
}
