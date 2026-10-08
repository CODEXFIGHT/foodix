/**
 * FoodIX — Capa cliente de Web Push Notifications.
 *
 * Funciones puras y aisladas para:
 *  - Detectar soporte real del navegador (Notification / SW / PushManager).
 *  - Detectar entorno iOS / standalone (instalada en pantalla de inicio).
 *  - Registrar el Service Worker.
 *  - Suscribir / desuscribir el dispositivo a push.
 *  - Persistir/eliminar la suscripción en el backend (vía /api/push/*).
 *  - Consultar el estado actual de notificaciones.
 *
 * Todas las funciones son seguras de llamar en el cliente; las que dependen de
 * APIs del navegador validan disponibilidad antes de usarlas.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

const SW_URL = '/sw.js'
const SW_SCOPE = '/'
const TOKEN_KEY = 'restauros_token'
const PREFERENCE_PREFIX = 'restauros_push_enabled'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushStatus {
  /** El navegador soporta Notification + ServiceWorker + PushManager. */
  supported: boolean
  /** Estado del permiso de notificaciones. */
  permission: PushPermission
  /** Hay una suscripción push activa para este dispositivo. */
  subscribed: boolean
  /** El navegador es Safari/WebKit en iOS o iPadOS. */
  isIOS: boolean
  /** La app corre en modo standalone (instalada en pantalla de inicio). */
  isStandalone: boolean
  /** iOS detectado pero la app NO está instalada → push aún no disponible. */
  needsInstall: boolean
}

export interface PushNotificationContext {
  userId?: number | null
  role?: string | null
  branchId?: number | null
}

// ─── Detección de soporte y entorno ─────────────────────────────────────────

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // iPad moderno se anuncia como Mac; se detecta por touch points.
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
  return /iPad|iPhone|iPod/.test(ua) || iPadOS
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS expone navigator.standalone; el resto usa el media query del manifest.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches === true
  return iosStandalone || displayMode
}

// ─── Conversión de la clave VAPID ───────────────────────────────────────────

/**
 * Convierte la clave pública VAPID (base64 URL-safe) a Uint8Array, formato
 * exigido por PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ─── Service Worker ─────────────────────────────────────────────────────────

/**
 * Registra el Service Worker (idempotente: si ya está registrado, reutiliza el
 * registro existente). Maneja actualizaciones activando la nueva versión.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    const registration = existing ?? (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }))

    // Si hay una versión esperando, actívala de inmediato.
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          installing.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })

    return registration
  } catch (err) {
    console.error('[push] No se pudo registrar el Service Worker:', err)
    return null
  }
}

// ─── Estado ─────────────────────────────────────────────────────────────────

export async function getPushNotificationStatus(): Promise<PushStatus> {
  const supported = isPushSupported()
  const ios = isIOS()
  const standalone = isStandalone()

  if (!supported) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      isIOS: ios,
      isStandalone: standalone,
      // En iOS, Web Push solo existe si la app está instalada. Si no soporta y
      // es iOS sin instalar, el camino es instalar primero.
      needsInstall: ios && !standalone,
    }
  }

  let subscribed = false
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    if (registration) {
      const sub = await registration.pushManager.getSubscription()
      subscribed = sub !== null
    }
  } catch {
    subscribed = false
  }

  return {
    supported: true,
    permission: Notification.permission as PushPermission,
    subscribed,
    isIOS: ios,
    isStandalone: standalone,
    needsInstall: ios && !standalone,
  }
}

// ─── Persistencia en backend ────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function preferenceKey(context?: PushNotificationContext): string {
  const role = context?.role ?? 'unknown'
  const user = context?.userId ?? 'anonymous'
  const branch = context?.branchId ?? 'global'
  return `${PREFERENCE_PREFIX}:${branch}:${role}:${user}`
}

export function getLocalPushPreference(context?: PushNotificationContext): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(preferenceKey(context)) === 'true'
}

export function setLocalPushPreference(context: PushNotificationContext | undefined, enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(preferenceKey(context), String(enabled))
}

/** Envía la suscripción al backend para persistirla (idempotente por endpoint). */
export async function savePushSubscription(
  subscription: PushSubscription,
  context?: PushNotificationContext,
): Promise<boolean> {
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        user_id: context?.userId ?? null,
        role: context?.role ?? null,
        branch_id: context?.branchId ?? null,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[push] Error al guardar la suscripción:', err)
    return false
  }
}

/** Notifica al backend que el dispositivo se desuscribió. */
async function deletePushSubscription(endpoint: string, context?: PushNotificationContext): Promise<boolean> {
  try {
    const res = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        endpoint,
        user_id: context?.userId ?? null,
        role: context?.role ?? null,
        branch_id: context?.branchId ?? null,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[push] Error al eliminar la suscripción:', err)
    return false
  }
}

// ─── Suscripción / Desuscripción ────────────────────────────────────────────

/**
 * Solicita permiso (si hace falta), crea la suscripción push y la persiste.
 * Devuelve la suscripción o lanza un Error con un mensaje legible.
 */
export async function subscribeToPushNotifications(context?: PushNotificationContext): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push.')
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    throw new Error('Falta configurar la clave VAPID pública (NEXT_PUBLIC_VAPID_PUBLIC_KEY).')
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('No se pudo registrar el Service Worker.')
  }
  // Espera a que el SW esté listo antes de suscribir.
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Permiso de notificaciones denegado. Actívalo en los ajustes del navegador.'
        : 'No se concedió el permiso de notificaciones.',
    )
  }

  // Reutiliza la suscripción existente si la hay; si no, crea una nueva.
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  await savePushSubscription(subscription, context)
  setLocalPushPreference(context, true)
  return subscription
}

/** Cancela la suscripción push del dispositivo y la elimina del backend. */
export async function unsubscribeFromPushNotifications(context?: PushNotificationContext): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE)
    if (!registration) {
      setLocalPushPreference(context, false)
      return true
    }
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      setLocalPushPreference(context, false)
      return true
    }

    const endpoint = subscription.endpoint
    const ok = await subscription.unsubscribe()
    if (ok) {
      await deletePushSubscription(endpoint, context)
      setLocalPushPreference(context, false)
    }
    return ok
  } catch (err) {
    console.error('[push] Error al desuscribir:', err)
    return false
  }
}

/**
 * Envía una notificación de prueba al dispositivo suscrito (usa la suscripción
 * actual del navegador). El servidor firma y entrega el push real vía VAPID.
 */
export async function sendTestPushNotification(context?: PushNotificationContext): Promise<void> {
  if (!isPushSupported()) throw new Error('Notificaciones no soportadas.')
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE)
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) {
    throw new Error('El dispositivo no está suscrito. Activa las notificaciones primero.')
  }

  const res = await fetch('/api/push/send-test', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      role: context?.role ?? null,
    }),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message || 'No se pudo enviar la notificación de prueba.')
  }
}
