/**
 * RestaurOS — GET /api/whatsapp/cron/inactivity
 *
 * Recordatorio proactivo de inactividad del bot de WhatsApp: si un cliente
 * dejó un pedido a medias y no ha respondido en N minutos, le manda un
 * "¿sigues ahí?" — el pedido sigue guardado, solo se le avisa.
 *
 * El bot en sí es 100% reactivo a webhooks (no hay proceso en segundo plano
 * que "espere" la inactividad), así que este aviso necesita un disparador
 * externo. El proyecto está en Vercel Hobby (crons nativos limitados a 1 vez
 * al día — insuficiente para un ping cada 5-10 min), así que este endpoint
 * se protege con CRON_SECRET (mismo patrón que /api/cron/subscription-check)
 * para que lo llame un cron externo (ej. cron-job.org) — ver
 * docs/integrations/whatsapp-twilio.md.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'
import { fetchInactiveSessions, markSessionNotified } from '@/lib/server/whatsappSession'
import { sendText } from '@/lib/server/wati'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NUDGE_TEXT =
  '⏳ *¿Sigues ahí?*\n\n' +
  'Tu pedido sigue guardado, no se ha perdido.\n\n' +
  'Responde:\n' +
  '1️⃣ Continuar mi pedido\n' +
  '2️⃣ Cancelarlo\n\n' +
  'Si no respondes, lo dejamos guardado por si quieres volver más tarde.'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ message: 'CRON_SECRET no configurado.' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 })
  }

  const minutes = Number(process.env.WHATSAPP_INACTIVITY_NUDGE_MINUTES) || 15
  const sessions = await fetchInactiveSessions(minutes)

  let notified = 0
  for (const { branchSlug, phone } of sessions) {
    try {
      await sendText(phone, NUDGE_TEXT)
      await markSessionNotified(branchSlug, phone)
      notified += 1
    } catch (err) {
      // Best-effort: un fallo individual (número inválido, proveedor caído)
      // no debe abortar el resto del batch.
      console.error('[WA Cron Inactivity] error al notificar', branchSlug, phone, err)
    }
  }

  return NextResponse.json({ ok: true, checked: sessions.length, notified })
}
