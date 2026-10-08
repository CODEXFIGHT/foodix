/**
 * FoodIX — Versión de la aplicación.
 * La versión se inyecta desde package.json en next.config.mjs
 * (NEXT_PUBLIC_APP_VERSION / NEXT_PUBLIC_APP_BUILD). Hay fallback por si se
 * importa fuera del bundle de Next (tests, scripts).
 */

/** Versión cruda de package.json, p.ej. "1.0.0-beta.5". */
export const APP_VERSION_RAW = process.env.NEXT_PUBLIC_APP_VERSION ?? '2.0.0'

/** Build (fecha de compilación), p.ej. "20260612". */
export const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD ?? ''

/** Versión "semver" corta para QR/tickets, p.ej. "1.0.0-beta.5". */
export const APP_VERSION_SEMVER = APP_VERSION_RAW

/** Etiqueta legible para UI, p.ej. "v1.0.0 beta 5". */
export const APP_VERSION = `v${APP_VERSION_RAW.replace(/-/g, ' ').replace('beta.', 'beta ')}`

/** Línea para tickets/about, p.ej. "v1.0.0-beta.5 · Build 20260612". */
export const APP_VERSION_FULL = APP_BUILD
  ? `v${APP_VERSION_RAW} · Build ${APP_BUILD}`
  : `v${APP_VERSION_RAW}`

export const PRODUCT_NAME = 'FoodIX'
export const VENDOR_NAME = 'DevHive Software'
export const SUPPORT_EMAIL = 'restauros@atomicmail.io'
export const PRODUCT_URL = 'https://restauros.app/landing'
/** Dominio base del producto (fallback para construir enlaces como el QR del ticket). */
export const PRODUCT_BASE = 'https://restauros.app'
