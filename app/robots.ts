import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foodix.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/carta', '/landing', '/register', '/login'],
        disallow: [
          '/',
          // El destino del enlace de verificación lleva un token de un solo uso.
          '/register/verificar',
          '/orders',
          '/orders/',
          '/products',
          '/categories',
          '/tables',
          '/sales',
          '/kitchen',
          '/settings',
          '/carta-digital',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
