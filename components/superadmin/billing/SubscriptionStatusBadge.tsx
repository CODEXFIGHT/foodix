'use client'

/**
 * FoodIX — Badge de estado de suscripción (Billing CRM).
 * Punto de color + etiqueta, sobre el sistema de estados existente.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { cn } from '@/lib/utils/cn'
import { SUBSCRIPTION_STATUS_LABEL, SUBSCRIPTION_STATUS_BADGE } from '@/lib/constants/subscription'
import type { SubscriptionState } from '@/lib/types'

/** Color del punto por estado (alineado con la leyenda del calendario). */
const DOT: Record<SubscriptionState, string> = {
  active:                'bg-emerald-400',
  trial:                 'bg-blue-400',
  past_due:              'bg-amber-400',
  payment_failed:        'bg-red-400',
  pending_bank_transfer: 'bg-amber-400',
  bank_transfer_review:  'bg-purple-400',
  suspended:             'bg-amber-400',
  canceled:              'bg-slate-400',
  terminated:            'bg-red-400',
  expired:               'bg-red-400',
}

export function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: SubscriptionState | null
  className?: string
}) {
  if (!status) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-white/5 text-neutral-400', className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Sin suscripción
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', SUBSCRIPTION_STATUS_BADGE[status], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[status])} />
      {SUBSCRIPTION_STATUS_LABEL[status]}
    </span>
  )
}
