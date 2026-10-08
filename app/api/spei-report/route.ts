import { NextResponse } from 'next/server'
import { getPlan } from '@/app/landing/plans'
import { provisionAccount } from '@/lib/server/provision'

/**
 * Recibe el reporte de transferencia SPEI de un visitante (flujo MANUAL) y lo
 * encola en el backend del cliente como 'pending_review'. Un admin verifica el
 * depósito en el banco y aprueba/crea la cuenta (proceso manual existente).
 *
 * Reenvía al mismo contrato de provisión (provisionAccount) con
 * status: 'pending_review'. Si el backend no está configurado, responde 202
 * (aceptado) para que el visitante reciba confirmación de que reportó su pago.
 */
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: {
    plan?: string
    email?: string
    restaurant?: string
    reference?: string
    transfer?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const plan = getPlan(body.plan)
  const email = (body.email ?? '').trim().slice(0, 200)
  const restaurant = (body.restaurant ?? '').trim().slice(0, 200)
  const reference = (body.reference ?? '').trim().slice(0, 60)

  if (!email || !restaurant) {
    return NextResponse.json({ error: 'missing_fields', message: 'Faltan correo o restaurante' }, { status: 400 })
  }

  try {
    const result = await provisionAccount({
      event: 'spei.reported',
      method: 'spei',
      status: 'pending_review',
      plan: plan.id,
      email,
      restaurant,
      amount: plan.price,
      currency: 'mxn',
      payment_ref: reference,
      paid_at: new Date().toISOString(),
      transfer: body.transfer,
    })

    if (result.configured && !result.ok) {
      console.error('[spei.report] backend rechazó el reporte', result.status, result.body)
      return NextResponse.json({ error: 'backend_error', message: 'No se pudo registrar tu reporte. Inténtalo de nuevo.' }, { status: 502 })
    }
    if (!result.configured) {
      console.warn('[spei.report] reporte SPEI recibido pero BACKEND_PROVISION_URL no está configurado:', reference, email)
    }

    // 'review': el visitante queda en revisión manual hasta que el admin aprueba.
    return NextResponse.json({ status: 'review', reference }, { status: result.configured ? 200 : 202 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
