'use client'

/**
 * FoodIX — Puente con la app nativa Android (FoodIX APP).
 *
 * Cuando el SaaS corre DENTRO de la app Flutter (WebView), ésta inyecta
 * `window.FoodIXNative`, que permite imprimir y abrir el cajón usando el
 * SDK Sunmi del dispositivo (sin WebUSB/Web Bluetooth, que en Android son
 * frágiles). En navegador normal el objeto no existe y se usa el flujo web.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software.
 */

interface NativeResult {
  ok: boolean
  error?: string
}

interface FoodIXNative {
  isNative: true
  /** Imprime un ticket estructurado (la app arma el formato Sunmi). */
  printTicket: (data: Record<string, unknown>) => Promise<NativeResult>
  /** Imprime bytes ESC/POS crudos (reutiliza el formato del SaaS). */
  printRaw: (bytes: number[]) => Promise<NativeResult>
  /** Abre el cajón de dinero conectado a la impresora. */
  openDrawer: () => Promise<NativeResult>
  /** Info del dispositivo: rol e impresora disponible. */
  getDeviceInfo: () => Promise<{ native: boolean; role: string; hasPrinter: boolean }>
}

declare global {
  interface Window {
    FoodIXNative?: FoodIXNative
  }
}

/** ¿El SaaS corre dentro de la app nativa FoodIX APP? */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && window.FoodIXNative?.isNative === true
}

/** Acceso tipado al puente nativo (o null si corre en navegador). */
export function getNativeBridge(): FoodIXNative | null {
  if (typeof window === 'undefined') return null
  return window.FoodIXNative ?? null
}

/**
 * Imprime bytes ESC/POS a través de la app nativa.
 * Devuelve true si se imprimió por el puente; false si no hay app nativa.
 */
export async function nativePrintRaw(bytes: Uint8Array): Promise<boolean> {
  const bridge = getNativeBridge()
  if (!bridge) return false
  const res = await bridge.printRaw(Array.from(bytes))
  if (!res.ok) throw new Error(res.error ?? 'Error de impresión nativa')
  return true
}

/** Abre el cajón vía app nativa. Devuelve false si no hay app nativa. */
export async function nativeOpenDrawer(): Promise<boolean> {
  const bridge = getNativeBridge()
  if (!bridge) return false
  const res = await bridge.openDrawer()
  if (!res.ok) throw new Error(res.error ?? 'No se pudo abrir el cajón')
  return true
}
