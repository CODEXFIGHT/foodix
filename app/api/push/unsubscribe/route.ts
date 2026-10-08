/**
 * FoodIX — POST /api/push/unsubscribe
 *
 * Elimina la suscripción del backend PHP/MySQL a partir de su endpoint.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { forwardToBackend } from '../_lib'

export const runtime = 'nodejs'

interface UnsubscribeBody {
  endpoint?: string
  user_id?: number | null
  role?: string | null
  branch_id?: number | null
}

export async function POST(req: Request) {
  let body: UnsubscribeBody
  try {
    body = (await req.json()) as UnsubscribeBody
  } catch {
    return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 })
  }

  if (!body.endpoint) {
    return NextResponse.json({ message: 'Falta el endpoint.' }, { status: 400 })
  }

  const removed = await forwardToBackend(
    '/push/unsubscribe',
    {
      endpoint: body.endpoint,
      user_id: body.user_id ?? null,
      role: body.role ?? null,
      branch_id: body.branch_id ?? null,
    },
    req.headers.get('authorization'),
  )

  return NextResponse.json({ ok: true, removed })
}
