/**
 * Módulo solo-servidor (lo importan únicamente route handlers de Next).
 * Puente de provisión hacia el backend del cliente (PHP). Centraliza el contrato
 * que el backend debe exponer para crear la cuenta/activación tras un pago.
 *
 * Es INERTE y seguro: si no están configuradas las variables de entorno
 * (BACKEND_PROVISION_URL / BACKEND_PROVISION_TOKEN) no llama a nada y devuelve
 * { configured: false } para que el caller registre el evento sin fallar.
 *
 * ─── Contrato que tu backend debe implementar ───────────────────────────────
 *   POST  {BACKEND_PROVISION_URL}
 *   Header: Authorization: Bearer {BACKEND_PROVISION_TOKEN}
 *   Body (JSON):
 *     {
 *       event:       'payment.succeeded' | 'spei.reported',
 *       method:      'card' | 'spei',
 *       status:      'paid' | 'pending_review',
 *       plan:        'lite' | 'pro',
 *       email:       string,
 *       restaurant:  string,
 *       amount:      number,   // MXN (pesos)
 *       currency:    'mxn',
 *       payment_ref: string,   // PaymentIntent id (tarjeta) o referencia SPEI
 *       paid_at:     string,   // ISO 8601
 *       transfer?:   { ... }   // datos del reporte SPEI, si aplica
 *     }
 *   El backend crea el usuario (o lo deja en revisión para SPEI) y envía los
 *   accesos / código de activación por correo. Debe responder 2xx.
 */

export interface ProvisionPayload {
  event: 'payment.succeeded' | 'spei.reported'
  method: 'card' | 'spei'
  status: 'paid' | 'pending_review'
  plan: string
  email: string
  restaurant: string
  amount: number
  currency: string
  payment_ref: string
  paid_at: string
  transfer?: Record<string, unknown>
}

export type ProvisionResult =
  | { configured: false }
  | { configured: true; ok: true }
  | { configured: true; ok: false; status: number; body: string }

export async function provisionAccount(payload: ProvisionPayload): Promise<ProvisionResult> {
  const url = process.env.BACKEND_PROVISION_URL
  const token = process.env.BACKEND_PROVISION_TOKEN
  if (!url || !token || url.includes('PLACEHOLDER')) {
    return { configured: false }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!res.ok) {
    return { configured: true, ok: false, status: res.status, body: (await res.text()).slice(0, 500) }
  }
  return { configured: true, ok: true }
}
