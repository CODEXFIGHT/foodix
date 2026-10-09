import type { Metadata, Viewport } from 'next'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'Tu ticket · FoodIX',
  description: 'Consulta el detalle de tu ticket de compra.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#D1400F',
}

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
