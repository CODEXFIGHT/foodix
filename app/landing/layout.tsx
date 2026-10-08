import type { Metadata } from 'next'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'FoodIX | Software para restaurantes',
  description:
    'Administra tu restaurante con FoodIX: pedidos, cocina KDS, mesas, caja, inventario, clientes y carta QR. Empieza con 14 días de prueba gratuita y descubre todas sus herramientas.',
  openGraph: {
    title: 'FoodIX | Software para restaurantes — 14 días gratis',
    description:
      'Administra tu restaurante con FoodIX. Empieza con 14 días de prueba gratuita y descubre todas sus herramientas. Sin tarjeta.',
    type: 'website',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
