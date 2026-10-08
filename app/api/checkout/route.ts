import { NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/app/landing/plans'

/**
 * Crea un PaymentIntent de Stripe para el primer mes del plan elegido y devuelve
 * el client_secret que consume el <PaymentElement> del checkout de la landing.
 *
 * Seguridad / producción:
 * - El monto SIEMPRE se calcula en el servidor a partir del catálogo PLANS
 *   (nunca se confía en un precio enviado por el cliente).
 * - Queda INERTE si no está configurada STRIPE_SECRET_KEY: responde 503 con un
 *   mensaje claro y no toca Stripe ni el backend del cliente.
 * - No escribe en la base del cliente; solo crea un objeto en la cuenta Stripe
 *   asociada a la secret key que tú configures.
 */
export const runtime = 'nodejs'

const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && PLANS.some(p => p.id === v)

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret || secret.includes('PLACEHOLDER')) {
    return NextResponse.json(
      { error: 'not_configured', message: 'El pago con tarjeta aún no está activo. Configura STRIPE_SECRET_KEY.' },
      { status: 503 },
    )
  }

  let body: { plan?: unknown; email?: unknown; restaurant?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Cuerpo inválido' }, { status: 400 })
  }

  if (!isPlanId(body.plan)) {
    return NextResponse.json({ error: 'invalid_plan', message: 'Plan no válido' }, { status: 400 })
  }
  const plan = PLANS.find(p => p.id === body.plan)!
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : ''
  const restaurant = typeof body.restaurant === 'string' ? body.restaurant.trim().slice(0, 200) : ''

  try {
    // Import diferido: el SDK solo se carga cuando el pago está configurado.
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(secret)

    const intent = await stripe.paymentIntents.create({
      amount: plan.price * 100, // MXN → centavos
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      description: `FoodIX ${plan.name} — primer mes`,
      receipt_email: email || undefined,
      metadata: {
        plan: plan.id,
        plan_name: plan.name,
        restaurant: restaurant || '',
        source: 'landing_checkout',
      },
    })

    return NextResponse.json({ clientSecret: intent.client_secret, plan: plan.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al iniciar el pago'
    return NextResponse.json({ error: 'stripe_error', message }, { status: 502 })
  }
}
