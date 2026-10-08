/**
 * POST /api/whatsapp/send — envío manual de un mensaje de WhatsApp desde el Admin.
 *
 * Las credenciales de Twilio/Meta/Wati son server-only, por eso el envío vive aquí
 * y nunca en el cliente. La autorización se delega al backend PHP: se reenvía el
 * JWT del admin a `/whatsapp/status` y solo se permite si la sucursal es Plan Pro.
 *
 * Body JSON: { to: string; body: string; branch_slug: string }
 */

import { NextResponse } from 'next/server'
import { sendText } from '@/lib/server/wati'

export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_BASE_URL
  ?? 'https://tallercheck.mx/restauros/api/index.php'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { to?: string; body?: string; branch_slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const to    = (body.to ?? '').trim()
  const text  = (body.body ?? '').trim()
  const slug  = (body.branch_slug ?? '').trim()
  if (!to || !text || !slug) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 422 })
  }

  // Verifica admin + Plan Pro consultando el backend con el JWT del solicitante.
  try {
    const res = await fetch(
      `${BACKEND}/whatsapp/status?branch_slug=${encodeURIComponent(slug)}`,
      { headers: { Authorization: auth }, cache: 'no-store' },
    )
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'backend_error' }, { status: 502 })
    }
    const status = await res.json()
    if (!status.plan_pro) {
      return NextResponse.json(
        { error: 'plan_not_pro', message: 'WhatsApp IA está disponible únicamente en RestaurOS Pro' },
        { status: 403 },
      )
    }
  } catch {
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 502 })
  }

  try {
    await sendText(to, text)
  } catch (err) {
    console.error('[WA Send] error al enviar:', err)
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
