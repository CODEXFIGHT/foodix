import { NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/app/landing/plans'

/**
 * Devuelve los datos bancarios SPEI + una referencia única para que un visitante
 * pague el primer mes por transferencia (flujo MANUAL: lo verifica un admin).
 *
 * Los datos del banco se leen de variables de entorno (no se hardcodean):
 *   SPEI_BANK_NAME, SPEI_CLABE, SPEI_BENEFICIARY, SPEI_INSTRUCTIONS
 * Queda INERTE si no está configurado el banco: responde 503 para que el
 * checkout muestre "contáctanos" en lugar de una CLABE vacía.
 */
export const runtime = 'nodejs'

const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && PLANS.some(p => p.id === v)

/** Referencia corta y legible: ROS-PRO-7F3K9Q */
function makeReference(plan: PlanId) {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return `ROS-${plan.toUpperCase()}-${rand}`
}

export async function POST(req: Request) {
  const bank = {
    bank_name: process.env.SPEI_BANK_NAME,
    clabe: process.env.SPEI_CLABE,
    beneficiary_name: process.env.SPEI_BENEFICIARY,
    instructions: process.env.SPEI_INSTRUCTIONS ?? null,
  }
  if (!bank.bank_name || !bank.clabe || !bank.beneficiary_name) {
    return NextResponse.json(
      { error: 'not_configured', message: 'El pago por transferencia aún no está activo. Escríbenos para activarlo.' },
      { status: 503 },
    )
  }

  let body: { plan?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!isPlanId(body.plan)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  }
  const plan = PLANS.find(p => p.id === body.plan)!

  return NextResponse.json({
    plan: plan.id,
    amount: plan.price,
    currency: 'MXN',
    reference: makeReference(plan.id),
    bank,
  })
}
