/**
 * FoodIX — Utilidades compartidas de las rutas de push.
 *
 * Configura `web-push` con las claves VAPID y ofrece un helper para reenviar la
 * suscripción al backend PHP/MySQL (almacenamiento persistente). El reenvío es
 * "best-effort": si el backend no responde, la activación en el navegador no se
 * rompe (la suscripción ya existe localmente y la prueba sigue funcionando).
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import webpush from 'web-push'

let configured = false

/** Configura web-push con VAPID. Lanza si faltan las claves. */
export function ensureVapidConfigured(): void {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@codexfight.com'
  if (!publicKey || !privateKey) {
    throw new Error('Claves VAPID no configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

/** Base del backend PHP. Coincide con el rewrite de next.config (/backend/*). */
export const BACKEND_BASE =
  process.env.PUSH_BACKEND_URL || 'https://tallercheck.mx/restauros/api'

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Firma (VAPID) y entrega un mismo payload a varias suscripciones. Best-effort:
 * nunca lanza; devuelve el conteo de entregas y los códigos de error de las
 * fallidas (404/410 → suscripción expirada/revocada por el navegador).
 */
export async function sendPushToMany(
  targets: PushTarget[],
  payload: string,
): Promise<{ sent: number; failed: number; failedCodes: Array<number | string> }> {
  const results = await Promise.allSettled(
    targets.map(t =>
      webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        payload,
      ),
    ),
  )
  const sent = results.filter(r => r.status === 'fulfilled').length
  const failedCodes = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => (r.reason as { statusCode?: number })?.statusCode ?? 'err')
  return { sent, failed: results.length - sent, failedCodes }
}

/**
 * Reenvía una operación de push al backend PHP propagando el token del usuario.
 * Devuelve true si el backend la aceptó; nunca lanza (best-effort).
 */
export async function forwardToBackend(
  path: string,
  body: unknown,
  authorization: string | null,
): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    return res.ok
  } catch (err) {
    console.error('[push] Backend no disponible para persistir la suscripción:', err)
    return false
  }
}

export { webpush }
