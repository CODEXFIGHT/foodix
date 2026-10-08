/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Detección básica de SO / navegador / tipo desde el navegador. Reutiliza el
 * identificador único persistido en lib/deviceId.ts.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { DeviceType, DeviceModule } from './types'

export interface DeviceInfo {
  userAgent: string
  os?: string
  browser?: string
  deviceType?: DeviceType
}

function detectOS(ua: string): string | undefined {
  if (/windows nt/i.test(ua)) return 'Windows'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/mac os x/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return undefined
}

function detectBrowser(ua: string): string | undefined {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'
  if (/firefox\//i.test(ua)) return 'Firefox'
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari'
  return undefined
}

function detectType(ua: string): DeviceType {
  if (/ipad|tablet/i.test(ua)) return 'waiter_tablet'
  if (/mobile|iphone|android.*mobile/i.test(ua)) return 'mobile'
  if (/windows|mac os x|linux/i.test(ua)) return 'admin_computer'
  return 'unknown'
}

/** Detecta información básica del dispositivo desde el navegador. */
export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return { userAgent: '' }
  }
  const ua = navigator.userAgent
  return {
    userAgent: ua.slice(0, 400),
    os: detectOS(ua),
    browser: detectBrowser(ua),
    deviceType: detectType(ua),
  }
}

/** Mapea un rol de usuario / ruta a un módulo + tipo de dispositivo sugerido. */
export function moduleDefaults(module: DeviceModule, info: DeviceInfo): DeviceType {
  switch (module) {
    case 'kitchen': return 'kitchen_screen'
    case 'kiosk':   return 'kiosk'
    case 'waiter':  return 'waiter_tablet'
    case 'pos':     return 'pos_terminal'
    case 'admin':   return info.deviceType === 'mobile' ? 'mobile' : 'admin_computer'
    default:        return info.deviceType ?? 'unknown'
  }
}
