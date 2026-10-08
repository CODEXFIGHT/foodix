/**
 * RestaurOS — GET /api/cron/subscription-check
 *
 * Tarea diaria (Vercel Cron) que mantiene el ciclo de vida de las suscripciones:
 *   1. Pide al backend PHP que auto-expire las suscripciones vencidas (lo que
 *      bloquea el sistema en cuanto pasa la fecha de corte ~mensual).
 *   2. Recibe los recordatorios "por vencer" (0–3 días antes) con las
 *      suscripciones push de los destinatarios (admin de la sucursal +
 *      superadmins) y los entrega firmados con VAPID vía `web-push`.
 *
 * Se protege con CRON_SECRET: Vercel envía `Authorization: Bearer <CRON_SECRET>`
 * en cada invocación del cron. El backend PHP se autentica aparte con
 * PUSH_INTERNAL_SECRET.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { BACKEND_BASE, ensureVapidConfigured, sendPushToMany } from '../../push/_lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Reminder {
  branch_id: number
  days_remaining: number
  title: string
  body: string
  url: string
  tag: string
  subscriptions: Array<{ endpoint?: string; p256dh?: string; auth?: string }>
}

interface CronResult {
  ok: boolean
  expired_count?: number
  reminders?: Reminder[]
}

export async function GET(req: Request) {
  // ── Autenticación del cron ────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ message: 'CRON_SECRET no configurado.' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 })
  }

  const internalSecret = process.env.PUSH_INTERNAL_SECRET
  if (!internalSecret) {
    return NextResponse.json({ message: 'PUSH_INTERNAL_SECRET no configurado.' }, { status: 500 })
  }

  // ── 1) Disparar el barrido en el backend PHP ──────────────────────────────
  let data: CronResult
  try {
    const res = await fetch(`${BACKEND_BASE}/subscription-cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({ secret: internalSecret }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[cron] subscription-check: backend respondió', res.status, text)
      return NextResponse.json({ ok: false, message: 'Backend no disponible.' }, { status: 502 })
    }
    data = (await res.json()) as CronResult
  } catch (err) {
    console.error('[cron] subscription-check: error al contactar backend', err)
    return NextResponse.json({ ok: false, message: 'Backend no disponible.' }, { status: 502 })
  }

  const reminders = data.reminders ?? []
  if (reminders.length === 0) {
    return NextResponse.json({ ok: true, expired: data.expired_count ?? 0, notified: 0 })
  }

  // ── 2) Entregar los recordatorios push ────────────────────────────────────
  try {
    ensureVapidConfigured()
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'VAPID no configurado.' },
      { status: 500 },
    )
  }

  let totalSent = 0
  let totalFailed = 0
  for (const r of reminders) {
    const targets = (r.subscriptions ?? []).filter(
      (s): s is { endpoint: string; p256dh: string; auth: string } =>
        Boolean(s?.endpoint && s?.p256dh && s?.auth),
    )
    if (targets.length === 0) continue

    const payload = JSON.stringify({
      title: r.title,
      body: r.body,
      url: r.url || '/billing',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: r.tag || `sub-reminder-${r.branch_id}`,
    })

    const { sent, failed, failedCodes } = await sendPushToMany(targets, payload)
    totalSent += sent
    totalFailed += failed
    if (failed > 0) {
      console.error('[cron] subscription-check: entregas fallidas', r.branch_id, failed, failedCodes)
    }
  }

  return NextResponse.json({
    ok: true,
    expired: data.expired_count ?? 0,
    reminders: reminders.length,
    sent: totalSent,
    failed: totalFailed,
  })
}
