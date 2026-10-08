import type { Metadata } from 'next'

/**
 * El layout de /(auth) marca noindex porque el login es privado; el registro
 * sí es una página pública de captación, así que recupera la indexación.
 */
export const metadata: Metadata = {
  title: 'Crea tu cuenta gratis · FoodIX',
  description:
    'Crea tu cuenta de FoodIX y prueba todas sus herramientas durante 14 días. Sin tarjeta y sin compromiso.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'Prueba FoodIX gratis durante 14 días',
    description:
      'Crea tu cuenta y administra pedidos, cocina, caja, inventario y carta QR de tu restaurante. 14 días gratis, sin tarjeta.',
    type: 'website',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
