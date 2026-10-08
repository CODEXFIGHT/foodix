import { NextResponse } from 'next/server'
import { getPlan } from '@/app/landing/plans'
import { provisionAccount } from '@/lib/server/provision'

/**
 * Webhook de Stripe. Recibe los eventos de pago y, al confirmarse, dispara la
 * provisión de la cuenta en el backend del cliente.
 *
 * Configurar en el Dashboard de Stripe el endpoint:  /api/stripe/webhook
 * Eventos: payment_intent.succeeded, payment_intent.payment_failed
 *
 * Seguridad / producción:
 * - Verifica la firma con STRIPE_WEBHOOK_SECRET (rechaza eventos no firmados).
 * - INERTE si faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET (responde 503).
 * - Si la provisión del backend no está configurada, acusa recibo (200) y deja
 *   el evento registrado en logs, sin reintentos infinitos de Stripe.
 */
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !webhookSecret || secret.includes('PLACEHOLDER')) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 })

  const raw = await req.text()

  let event
  try {
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(secret)
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'invalid signature'
    return NextResponse.json({ error: 'invalid_signature', message }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as {
      id: string
      amount: number
      currency: string
      receipt_email: string | null
      metadata?: Record<string, string>
    }
    // Solo provisionamos pagos originados en el checkout de la landing.
    if (pi.metadata?.source === 'landing_checkout') {
      const plan = getPlan(pi.metadata?.plan)
      const result = await provisionAccount({
        event: 'payment.succeeded',
        method: 'card',
        status: 'paid',
        plan: plan.id,
        email: pi.receipt_email ?? pi.metadata?.email ?? '',
        restaurant: pi.metadata?.restaurant ?? '',
        amount: Math.round(pi.amount / 100),
        currency: pi.currency,
        payment_ref: pi.id,
        paid_at: new Date().toISOString(),
      })

      if (result.configured && !result.ok) {
        // El backend falló: devolvemos 500 para que Stripe reintente la entrega.
        console.error('[stripe.webhook] provisión falló', result.status, result.body)
        return NextResponse.json({ received: true, provisioned: false }, { status: 500 })
      }
      if (!result.configured) {
        console.warn('[stripe.webhook] pago confirmado pero BACKEND_PROVISION_URL no está configurado:', pi.id)
      }
    }
  }

  return NextResponse.json({ received: true })
}
