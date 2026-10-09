/** @type {import('next').NextConfig} */
import { readFileSync } from 'node:fs'

// Versión y build se derivan de package.json en tiempo de compilación y se
// exponen al cliente (tickets, dashboard, login, about) vía NEXT_PUBLIC_*.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const APP_BUILD = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

// ─── Content-Security-Policy ────────────────────────────────────────────────
// Allowlist explícita de orígenes que la app realmente usa. Endurece el sitio
// contra XSS/clickjacking sin romper: Stripe Elements, Google Fonts, imágenes
// remotas (icons8 / ibb), el backend (/backend, mismo origen) ni el agente de
// impresión local (127.0.0.1). Nota: 'unsafe-inline' en scripts/estilos es
// necesario porque Next.js inyecta estilos y bootstrap de hidratación inline;
// migrar a nonces es una mejora futura.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Imágenes: propio origen, data/blob y CUALQUIER origen https. Se permite
  // https genérico porque el admin puede agregar imágenes de su carta por URL
  // (de cualquier dominio). Las subidas propias viven en tallercheck.mx.
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://tallercheck.mx https://api.stripe.com https://*.stripe.com http://127.0.0.1:* http://localhost:*",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://www.youtube.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // WebUSB (impresión) y Stripe (payment) se permiten solo al propio origen.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=(self), payment=(self "https://js.stripe.com")' },
]

const nextConfig = {
  // No revelar que el servidor corre Next.js.
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_BUILD: APP_BUILD,
  },

  // No publicar source maps del cliente en producción: el bundle queda
  // minificado y no se puede revertir a las fuentes originales.
  productionBrowserSourceMaps: false,

  // Eliminar console.* en producción (deja error/warn) para no filtrar
  // información interna por la consola del navegador.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Tree-shaking agresivo de paquetes de iconos/UI: solo entra al bundle lo que
  // se usa, reduciendo el JS del cliente y acelerando la carga inicial.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    // Sirve AVIF/WebP cuando el navegador los soporta: imágenes mucho más
    // ligeras (mejor LCP en la carta digital, que es rica en fotos).
    formats: ['image/avif', 'image/webp'],
    // Cachea las imágenes optimizadas ~31 días en el CDN.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: 'https', hostname: 'img.icons8.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'tallercheck.mx' },
      // Fotografía real de ambiente (landing: testimonios, cómo funciona).
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  async rewrites() {
    // Origen del backend PHP. Por defecto el de producción; con BACKEND_ORIGIN
    // se puede apuntar a un backend local (`npm run dev:local-backend`) para
    // probar el alta y el trial de punta a punta sin tocar datos reales.
    const backendOrigin = process.env.BACKEND_ORIGIN
      ? `${process.env.BACKEND_ORIGIN.replace(/\/$/, '')}/index.php`
      : 'https://tallercheck.mx/foodix/api/index.php'

    return [
      {
        source: '/backend/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ]
  },
};

export default nextConfig;
