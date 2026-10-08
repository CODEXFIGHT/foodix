import { loadStripe, type Stripe } from '@stripe/stripe-js'

/**
 * Carga (una sola vez) Stripe.js con la publishable key pública.
 * Devuelve null si la key no está configurada (Stripe inactivo).
 */
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key || key.includes('PLACEHOLDER')) return null
  if (!stripePromise) stripePromise = loadStripe(key)
  return stripePromise
}
