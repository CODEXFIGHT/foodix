import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPlan } from '../plans'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout · FoodIX',
  description: 'Contrata FoodIX y pon tu restaurante en orden. Pago seguro con Stripe.',
  robots: { index: false },
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  const selected = getPlan(plan)
  // Un plan aún no disponible no se puede contratar ni entrando por URL directa.
  if (selected.available === false) redirect('/landing#precios')
  return <CheckoutClient plan={selected} />
}
