'use client'

/**
 * FoodIX — Línea de tiempo del historial de pagos (Billing CRM).
 * Cada pago: monto, método, meses cubiertos, fecha, referencia, notas, id,
 * comprobante y estado. Acepta un slot de acciones (aprobar/rechazar SPEI).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { PAYMENT_METHOD_LABEL, formatMXN } from '@/lib/constants/subscription'
import type { SubscriptionPayment } from '@/lib/types'

const STATUS_BADGE: Record<string, string> = {
  paid:                 'bg-emerald-400/15 text-emerald-300',
  rejected:             'bg-red-400/15 text-red-300',
  failed:               'bg-red-400/15 text-red-300',
  bank_transfer_review: 'bg-amber-400/15 text-amber-300',
  pending_bank_transfer:'bg-amber-400/15 text-yellow-400',
  pending:              'bg-amber-400/15 text-amber-300',
}

function fmt(value: string | null | undefined, withTime = false): string {
  if (!value) return '—'
  try { return format(parseISO(value), withTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy', { locale: es }) } catch { return '—' }
}

/** "Jul 2026" o "Jul – Oct 2026" según los meses cubiertos. */
function coveredLabel(p: SubscriptionPayment): string | null {
  if (!p.covered_from) return null
  const months = p.months_count ?? 1
  try {
    const start = parseISO(p.covered_from)
    if (months <= 1) return format(start, 'MMM yyyy', { locale: es })
    const end = new Date(start.getFullYear(), start.getMonth() + months - 1, 1)
    return `${format(start, 'MMM', { locale: es })} – ${format(end, 'MMM yyyy', { locale: es })}`
  } catch { return null }
}

export function PaymentHistoryTimeline({
  payments,
  renderActions,
}: {
  payments: SubscriptionPayment[]
  renderActions?: (p: SubscriptionPayment) => ReactNode
}) {
  if (payments.length === 0) {
    return <p className="text-neutral-500 text-sm">Sin pagos registrados</p>
  }

  return (
    <ol className="relative space-y-3 pl-5 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-white/10">
      {payments.map(p => {
        const covered = coveredLabel(p)
        return (
          <li key={p.id} className="relative">
            <span className={cn(
              'absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a0a0a]',
              p.status === 'paid' ? 'bg-emerald-400' : p.status === 'rejected' || p.status === 'failed' ? 'bg-red-400' : 'bg-amber-400',
            )} />
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    {formatMXN(p.amount, p.currency)}
                    <span className="text-neutral-500"> · {PAYMENT_METHOD_LABEL[p.payment_method] ?? p.payment_method}</span>
                  </p>
                  <p className="text-xs text-neutral-500">{fmt(p.created_at, true)} · #{p.id}</p>
                  {covered && (
                    <p className="text-xs text-amber-300/90 mt-0.5">
                      Cubre {covered}{(p.months_count ?? 1) > 1 ? ` (${p.months_count} meses)` : ''}
                    </p>
                  )}
                  {p.bank_reference && <p className="text-xs text-neutral-400 mt-0.5">Ref: {p.bank_reference}</p>}
                  {p.notes && <p className="text-xs text-neutral-400 mt-0.5">{p.notes}</p>}
                  {p.rejection_reason && <p className="text-xs text-red-400 mt-0.5">Rechazo: {p.rejection_reason}</p>}
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                       className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                      <FileText className="h-3 w-3" /> Ver comprobante
                    </a>
                  )}
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_BADGE[p.status] ?? 'bg-white/10 text-neutral-300')}>
                  {p.status === 'paid' ? 'Pagado' : p.status === 'bank_transfer_review' ? 'En revisión' : p.status}
                </span>
              </div>
              {renderActions && <div className="mt-2">{renderActions(p)}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
