'use client'

/**
 * FoodIX — Dashboard de KPIs del Billing CRM.
 * Tarjetas de métrica (MRR/ARR, ingresos, estados, próximos cobros) con
 * iconografía consistente, sobre GET /superadmin/dashboard.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { ReactNode } from 'react'
import {
  TrendingUp, BarChart3, Wallet, Banknote, CheckCircle2, Clock,
  AlertTriangle, PauseCircle, XCircle, CalendarClock, CalendarCheck2, ChevronRight,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { formatMXN } from '@/lib/constants/subscription'
import type { BillingDashboardResponse } from '@/lib/types'

interface Props {
  data?: BillingDashboardResponse
  loading?: boolean
  onSelectBranch?: (branchId: number) => void
}

export function BillingKpiGrid({ data, loading, onSelectBranch }: Props) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  const { kpis, revenue, upcoming } = data

  return (
    <div className="space-y-4">
      {/* Fila financiera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<TrendingUp />} label="MRR (recurrente/mes)" value={formatMXN(kpis.mrr)} accent="text-emerald-400" big />
        <Kpi icon={<BarChart3 />} label="ARR (anual estimado)" value={formatMXN(kpis.arr)} accent="text-emerald-400" big />
        <Kpi icon={<Wallet />} label="Ingresos del mes" value={formatMXN(revenue.month)} accent="text-emerald-400" big />
        <Kpi icon={<Banknote />} label="Ingresos del año" value={formatMXN(revenue.year)} accent="text-emerald-400" big />
      </div>

      {/* Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={<CheckCircle2 />} label="Activos" value={kpis.active} accent="text-emerald-400" />
        <Kpi icon={<Clock />} label="Periodo de gracia" value={kpis.grace} accent="text-amber-400" />
        <Kpi icon={<AlertTriangle />} label="Por vencer" value={kpis.past_due} accent="text-yellow-400" />
        <Kpi icon={<CalendarClock />} label="Vencen esta semana" value={kpis.due_this_week} accent="text-orange-400" />
        <Kpi icon={<PauseCircle />} label="Suspendidos" value={kpis.suspended} accent="text-amber-400" />
        <Kpi icon={<CalendarCheck2 />} label="Pago adelantado" value={kpis.prepaid_clients} accent="text-blue-400" />
        <Kpi icon={<XCircle />} label="Cancelados" value={kpis.canceled} accent="text-neutral-400" />
        <Kpi icon={<AlertTriangle />} label="Expirados" value={kpis.expired} accent="text-red-400" />
        <Kpi icon={<Banknote />} label="Pend. transferencia" value={kpis.pending_transfer} accent="text-orange-400" />
        <Kpi icon={<Clock />} label="En prueba" value={kpis.trial} accent="text-blue-400" />
      </div>

      {/* Próximos cobros */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-medium text-white">Próximos cobros</h3>
          </div>
          <div className="divide-y divide-white/5">
            {upcoming.map(u => (
              <button
                key={u.branch_id}
                onClick={() => onSelectBranch?.(u.branch_id)}
                className="w-full flex items-center justify-between py-2 text-left transition-colors hover:bg-white/[0.03] -mx-2 px-2 rounded-md group"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{u.branch_name}</p>
                  <p className="text-xs text-neutral-500">
                    {(() => { try { return format(parseISO(u.expires_at), "d 'de' MMMM", { locale: es }) } catch { return u.expires_at } })()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-neutral-200 tabular-nums">{formatMXN(u.price_monthly, u.currency)}</span>
                  <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({
  icon, label, value, accent, big,
}: {
  icon: ReactNode; label: string; value: ReactNode; accent?: string; big?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 transition-colors hover:border-white/20">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <p className="text-xs font-medium truncate">{label}</p>
      </div>
      <p className={cn('mt-2 font-semibold tracking-tight tabular-nums truncate', big ? 'text-2xl' : 'text-xl', accent ?? 'text-white')}>
        {value}
      </p>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
      <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
      <div className="mt-3 h-7 w-20 rounded bg-white/5 animate-pulse" />
    </div>
  )
}
