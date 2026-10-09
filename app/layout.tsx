/**
 * FoodIX — Sistema de gestión para restaurantes
 * Layout raíz: fuentes, metadata global y providers de la app.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import 'animate.css'
import './globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/app/providers'
import { UsbDeviceWatcher } from '@/components/shared/UsbDeviceWatcher'
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister'
import { CodexFightBanner } from '@/components/shared/DevHiveBanner'
import { PageLoadBlur } from '@/components/shared/PageLoadBlur'
import { BackendWarmup } from '@/components/shared/BackendWarmup'

const BUILD_YEAR = new Date().getFullYear()

// Comentario de propiedad inyectado en el HTML servido (visible en "ver código
// fuente"). El resto del bundle va minificado y sin source maps en producción.
const SOURCE_NOTICE = `
  ============================================================
   FoodIX — Sistema de Gestión para Restaurantes
   © CodexFight ${BUILD_YEAR} · https://codexfight.com
   Todos los derechos reservados. Código propietario.
  ============================================================
`

// Fuente principal (cuerpo): Inter, máxima legibilidad en pantalla. Se
// precarga para no bloquear el primer render.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

// Fuente de encabezados: Plus Jakarta Sans, vigor y legibilidad en UI.
// NO se precarga para no competir con Inter en la carga inicial.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
  preload: false,
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foodix.app'

// Aplica a TODAS las páginas: evita el zoom en móvil (comportamiento tipo app POS).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Permite usar env(safe-area-inset-*) bajo el notch/barra de gestos en iOS.
  viewportFit: 'cover',
  themeColor: '#D1400F',
  colorScheme: 'light',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'FoodIX — Sistema de Gestión para Restaurantes',
    template: '%s · FoodIX',
  },
  description:
    'FoodIX es un sistema moderno para administrar cafeterías, restaurantes, taquerías y negocios de alimentos. Control de pedidos, mesas, ventas y operación diaria.',
  keywords: [
    'restaurante', 'POS', 'sistema restaurantes', 'control pedidos',
    'gestión mesas', 'cafetería', 'taquería', 'punto de venta',
  ],
  authors: [{ name: 'CodexFight', url: 'https://codexfight.com' }],
  creator: 'CodexFight',
  publisher: 'CodexFight',
  applicationName: 'FoodIX',
  category: 'business',
  manifest: '/manifest.json',
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: 'FoodIX', statusBarStyle: 'default' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  other: {
    copyright: `CodexFight © ${BUILD_YEAR}`,
    author: 'CodexFight — https://codexfight.com',
  },
  openGraph: {
    title: 'FoodIX — Sistema de Gestión para Restaurantes',
    description: 'Control total de tu restaurante: pedidos, mesas, cocina y ventas en un solo lugar.',
    url: APP_URL,
    type: 'website',
    locale: 'es_MX',
    siteName: 'CodexFight',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'FoodIX' }],
  },
  twitter: {
    card: 'summary',
    title: 'FoodIX — Sistema de Gestión para Restaurantes',
    description: 'Control total de tu restaurante: pedidos, mesas, cocina y ventas en un solo lugar.',
    images: ['/icons/icon-512.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Acelera la conexión a los hosts de imágenes usados en toda la app. */}
        <link rel="preconnect" href="https://img.icons8.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tallercheck.mx" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased`}>
        <div hidden aria-hidden="true" suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `<!--${SOURCE_NOTICE}-->` }} />
        <CodexFightBanner />
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <PageLoadBlur />
            {children}
            <BackendWarmup />
            <ServiceWorkerRegister />
            <UsbDeviceWatcher />
            <Toaster position="top-right" />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
