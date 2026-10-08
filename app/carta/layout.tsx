/**
 * @fileoverview Layout público de la carta digital — sin autenticación requerida
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import type { Metadata } from 'next';
import { PageTransition } from '@/components/shared/PageTransition';

export const metadata: Metadata = {
  title: 'Carta Digital',
  description:
    'Consulta nuestra carta digital interactiva. Descubre entradas, tacos, carnes, hamburguesas, postres, bebidas y más. Diseñado para mobile.',
  openGraph: {
    title: 'Carta Digital · FoodIX',
    description: 'Explora nuestro menú completo con categorías, imágenes y precios.',
    type: 'website',
    locale: 'es_MX',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Carta Digital FoodIX' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carta Digital · FoodIX',
    description: 'Explora nuestro menú completo con categorías, imágenes y precios.',
    images: ['/og-image.png'],
  },
};

export default function CartaLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
