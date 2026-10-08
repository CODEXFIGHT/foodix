/**
 * FoodIX — Modo Demo
 * Layout del segmento público /demo. Aísla el entorno demo del resto de la app.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'Demo · FoodIX',
  description:
    'Prueba FoodIX en modo demo: Admin, Mesero, Cocina y Carta digital, sin afectar datos reales.',
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
