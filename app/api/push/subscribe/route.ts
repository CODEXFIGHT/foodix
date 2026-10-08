/**
 * FoodIX — POST /api/push/subscribe
 *
 * Recibe la suscripción push del navegador y la persiste en el backend
 * PHP/MySQL. Responde 200 aunque el backend falle (la suscripción ya existe en
 * el dispositivo y la prueba sigue funcionando), pero indica `persisted`.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { forwardToBackend } from '../_lib'

export const runtime = 'nodejs'

interface SubscribeBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  user_id?: number | null
  role?: string | null
  branch_id?: number | null
}

export async function POST(req: Request) {
  let body: SubscribeBody
  try {
    body = (await req.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 })
  }

  const sub = body.subscription
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ message: 'Suscripción inválida.' }, { status: 400 })
  }

  const persisted = await forwardToBackend(
    '/push/subscribe',
    {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: req.headers.get('user-agent') ?? '',
      user_id: body.user_id ?? null,
      role: body.role ?? null,
      branch_id: body.branch_id ?? null,
    },
    req.headers.get('authorization'),
  )

  return NextResponse.json({ ok: true, persisted })
}
