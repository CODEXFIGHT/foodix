'use client'

/**
 * FoodIX — Tarjeta de cliente (Billing CRM).
 * Vista premium por sucursal: identidad, contacto, plan, precio y fechas clave,
 * con acceso directo a "Administrar" (abre el detalle).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { Mail, Phone, User, CalendarPlus, CalendarClock, CheckCircle2, Settings2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { APP_DOMAIN } from '@/lib/utils/slugify'
import {
  PLAN_BADGE, daysRemainingClass, formatDaysRemaining, formatMXN,
} from '@/lib/constants/subscription'
import type { SuperadminSubscriptionRow } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: es }) } catch { return '—' }
}

export function SubscriptionCard({
  row,
  onManage,
}: {
  row: SuperadminSubscriptionRow
  onManage: (branchId: number) => void
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/10 bg-[#0a0a0a] p-4 transition-colors hover:border-white/20">
      {/* Identidad + estado */}
      <div className="flex items-start gap-3">
        <BranchAvatar logoUrl={row.branch_logo_url} name={row.branch_name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{row.branch_name}</p>
          <p className="truncate text-xs text-neutral-500">{APP_DOMAIN}/{row.branch_slug} · #{row.branch_id}</p>
        </div>
        <SubscriptionStatusBadge status={row.status} />
      </div>

      {/* Contacto / propietario */}
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{row.admin_name ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Mail className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{row.admin_email ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Phone className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{row.branch_phone ?? '—'}</span>
        </div>
      </div>

      {/* Plan + precio */}
      <div className="mt-3 flex items-center justify-between">
        {row.plan
          ? <Badge className={cn('text-xs capitalize', PLAN_BADGE[row.plan])}>{row.plan}</Badge>
          : <span className="text-xs text-neutral-600">Sin plan</span>}
        <span className="text-sm font-semibold text-white tabular-nums">
          {formatMXN(row.price_monthly, row.currency)}
          <span className="text-xs font-normal text-neutral-500">/mes</span>
        </span>
      </div>

      {/* Fechas clave */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
        <Field icon={<CalendarPlus className="h-3.5 w-3.5" />} label="Alta" value={fmtDate(row.starts_at)} />
        <Field
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Vence"
          value={fmtDate(row.expires_at)}
          sub={<span className={daysRemainingClass(row.days_remaining)}>{formatDaysRemaining(row.days_remaining)}</span>}
        />
        <Field icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Últ. pago" value={fmtDate(row.last_payment_at)} />
      </div>

      {/* Administrar */}
      <button
        onClick={() => onManage(row.branch_id)}
        className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 group-hover:bg-white/10"
      >
        <Settings2 className="h-4 w-4" /> Administrar
      </button>
    </div>
  )
}

function Field({
  icon, label, value, sub,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
        {icon}{label}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium text-neutral-200">{value}</p>
      {sub && <p className="text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}
