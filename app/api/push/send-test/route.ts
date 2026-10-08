/**
 * FoodIX — POST /api/push/send-test
 *
 * Envía una notificación push real al dispositivo suscrito. Recibe la
 * suscripción en el cuerpo (la del propio navegador) y la firma+entrega con
 * VAPID mediante `web-push`. Es la pieza demostrable de extremo a extremo.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { ensureVapidConfigured, webpush } from '../_lib'

export const runtime = 'nodejs'

interface SendTestBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  title?: string
  body?: string
  url?: string
  role?: string | null
}

export async function POST(req: Request) {
  let body: SendTestBody
  try {
    body = (await req.json()) as SendTestBody
  } catch {
    return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 })
  }

  const sub = body.subscription
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ message: 'Suscripción inválida.' }, { status: 400 })
  }

  try {
    ensureVapidConfigured()
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'VAPID no configurado.' },
      { status: 500 },
    )
  }

  const payload = JSON.stringify({
    title: body.title || 'FoodIX · Notificación de prueba',
    body: body.body || `Listo. Las notificaciones push están activas${body.role ? ` para ${body.role}` : ''} en este dispositivo.`,
    url: body.url || '/',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'restauros-test',
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      },
      payload,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    // 404/410 → la suscripción expiró o fue revocada por el navegador.
    const statusCode = (err as { statusCode?: number }).statusCode
    console.error('[push] Error al enviar notificación de prueba:', statusCode, err)
    const expired = statusCode === 404 || statusCode === 410
    return NextResponse.json(
      {
        message: expired
          ? 'La suscripción expiró. Vuelve a activar las notificaciones.'
          : 'No se pudo entregar la notificación.',
        expired,
      },
      { status: 502 },
    )
  }
}
