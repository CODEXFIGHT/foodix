/**
 * FoodIX — POST /api/push/notify-kitchen
 *
 * Entrega un push a la cocina cuando entra un nuevo pedido. El backend PHP
 * recopila las suscripciones de la sucursal (cocina + admin) y delega aquí el
 * envío real, que se firma con VAPID mediante `web-push`.
 *
 * Es una ruta servidor-a-servidor: se autentica con un secreto compartido
 * (`PUSH_INTERNAL_SECRET`), no con el token del usuario.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { ensureVapidConfigured, sendPushToMany } from '../_lib'

export const runtime = 'nodejs'

interface NotifyBody {
  secret?: string
  notification?: {
    title?: string
    body?: string
    url?: string
    tag?: string
  }
  subscriptions?: Array<{
    endpoint?: string
    p256dh?: string
    auth?: string
  }>
}

export async function POST(req: Request) {
  const expected = process.env.PUSH_INTERNAL_SECRET
  if (!expected) {
    return NextResponse.json({ message: 'PUSH_INTERNAL_SECRET no configurado.' }, { status: 500 })
  }

  let body: NotifyBody
  try {
    body = (await req.json()) as NotifyBody
  } catch {
    return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 })
  }

  // El secreto puede venir por header o en el cuerpo (PHP curl).
  const provided = req.headers.get('x-internal-secret') ?? body.secret ?? ''
  if (provided !== expected) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 })
  }

  const subs = (body.subscriptions ?? []).filter(
    (s): s is { endpoint: string; p256dh: string; auth: string } =>
      Boolean(s?.endpoint && s?.p256dh && s?.auth),
  )
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0 })
  }

  try {
    ensureVapidConfigured()
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'VAPID no configurado.' },
      { status: 500 },
    )
  }

  const n = body.notification ?? {}
  const payload = JSON.stringify({
    title: n.title || 'FoodIX · Nuevo pedido',
    body: n.body || 'Tienes una nueva comanda en cocina.',
    url: n.url || '/kitchen',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: n.tag || 'kitchen-order',
  })

  const { sent, failed, failedCodes } = await sendPushToMany(subs, payload)
  if (failed > 0) {
    // 404/410 → suscripciones expiradas/revocadas por el navegador.
    console.error('[push] notify-kitchen: entregas fallidas', failed, failedCodes)
  }
  return NextResponse.json({ ok: true, sent, failed })
}
