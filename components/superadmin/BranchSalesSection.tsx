'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Sección de ventas por sucursal para el panel Superadmin.
 * Muestra un card por cada sucursal con revenue, órdenes y ticket promedio,
 * con un datepicker para filtrar por fecha y auto-refresh cada 30s.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, DollarSign, ShoppingBag, Receipt, TrendingUp } from 'lucide-react'
import { useSuperadminBranchSales } from '@/lib/api/queries'
import { formatMXN } from '@/lib/constants/subscription'
import { cn } from '@/lib/utils/cn'
import { SectionLabel, Surface, StatusDot } from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import type { SuperadminBranchSalesItem } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function formatDateLabel(dateStr: string): string {
  const today = todayStr()
  if (dateStr === today) return 'Hoy'
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return format(d, "EEEE d 'de' MMMM", { locale: es })
  } catch {
    return dateStr
  }
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────

function SalesCardSkeleton() {
  return (
    <div className={cn(
      'rounded-xl border border-white/10 bg-[#0a0a0a] p-5',
      'animate-pulse',
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-white/5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-white/5" />
          <div className="h-2.5 w-16 rounded bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-10 rounded bg-white/5" />
            <div className="h-5 w-16 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Totals Card ───────────────────────────────────────────────────────────────

function TotalsCard({
  revenue,
  orderCount,
  avgTicket,
  branchCount,
}: {
  revenue: number
  orderCount: number
  avgTicket: number
  branchCount: number
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border border-white/10 p-5',
      'bg-gradient-to-br from-[#0f0f0f] via-[#0a0a0a] to-[#111]',
    )}>
      {/* Glow decorativo */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/[0.06] blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Consolidado Global</p>
          <p className="text-neutral-500 text-[11px]">
            {branchCount} sucursal{branchCount !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
            Revenue
          </p>
          <p className="mt-1 text-base sm:text-lg font-bold tabular-nums bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
            {formatMXN(revenue)}
          </p>
        </div>
        <div>
          <p className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
            Órdenes
          </p>
          <p className="mt-1 text-base sm:text-lg font-bold tabular-nums text-white">
            {orderCount}
          </p>
        </div>
        <div>
          <p className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
            Ticket Prom.
          </p>
          <p className="mt-1 text-base sm:text-lg font-bold tabular-nums text-white">
            {formatMXN(avgTicket)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Branch Sales Card ─────────────────────────────────────────────────────────

function BranchSalesCard({ branch }: { branch: SuperadminBranchSalesItem }) {
  const hasRevenue = branch.revenue > 0

  return (
    <div className={cn(
      'group rounded-xl border border-white/10 bg-[#0a0a0a] p-5',
      'transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02]',
      'hover:shadow-[0_0_24px_rgba(255,255,255,0.02)]',
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <BranchAvatar
          logoUrl={branch.branch_logo_url}
          name={branch.branch_name}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {branch.branch_name}
          </p>
          <p className={cn(
            'text-[11px]',
            branch.branch_active ? 'text-neutral-600' : 'text-red-400/80',
          )}>
            {!branch.branch_active ? 'Suspendida' : hasRevenue ? 'Operando' : 'Sin ventas'}
          </p>
        </div>
        {hasRevenue
          ? <StatusDot color="green" pulse />
          : !branch.branch_active && <StatusDot color="red" />}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-neutral-600" />
            <span className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
              Ventas
            </span>
          </div>
          <p className={cn(
            'text-sm sm:text-base font-semibold tabular-nums truncate',
            hasRevenue
              ? 'bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent'
              : 'text-neutral-600',
          )}>
            {formatMXN(branch.revenue)}
          </p>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <ShoppingBag className="h-3 w-3 text-neutral-600" />
            <span className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
              Órdenes
            </span>
          </div>
          <p className={cn(
            'text-sm sm:text-base font-semibold tabular-nums',
            hasRevenue ? 'text-white' : 'text-neutral-600',
          )}>
            {branch.order_count}
          </p>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <Receipt className="h-3 w-3 text-neutral-600" />
            <span className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
              Ticket
            </span>
          </div>
          <p className={cn(
            'text-sm sm:text-base font-semibold tabular-nums truncate',
            hasRevenue ? 'text-white' : 'text-neutral-600',
          )}>
            {hasRevenue ? formatMXN(branch.avg_ticket) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function BranchSalesSection() {
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const { data, isLoading } = useSuperadminBranchSales(selectedDate)

  const isToday = selectedDate === todayStr()
  const dateLabel = formatDateLabel(selectedDate)

  return (
    <section className="space-y-3">
      {/* Header con datepicker */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SectionLabel className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Ventas por sucursal
            {isToday && (
              <span className="inline-flex items-center gap-1 ml-1">
                <StatusDot color="green" pulse />
                <span className="text-emerald-400 text-[10px] normal-case tracking-normal font-normal">
                  Tiempo real
                </span>
              </span>
            )}
          </SectionLabel>
        </div>

        <div className="flex items-center gap-2">
          {/* Tag de la fecha seleccionada */}
          <span className="text-neutral-400 text-xs capitalize hidden sm:inline">
            {dateLabel}
          </span>

          {/* DatePicker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                if (e.target.value) setSelectedDate(e.target.value)
              }}
              max={todayStr()}
              aria-label="Seleccionar fecha"
              className={cn(
                'h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white',
                'transition-colors hover:border-white/20 focus:border-white/30 focus:outline-none',
                'appearance-none cursor-pointer',
                // Estilizar el icono del calendario en Webkit
                '[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert',
                '[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-80',
                '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
              )}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SalesCardSkeleton key={i} />
          ))}
        </div>
      ) : !data || data.branches.length === 0 ? (
        <Surface className="px-6 py-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
          <p className="text-neutral-400 text-sm">
            No hay datos de ventas para {dateLabel}.
          </p>
        </Surface>
      ) : (
        <div className="space-y-3">
          {/* Card de totales */}
          <TotalsCard
            revenue={data.totals.revenue}
            orderCount={data.totals.order_count}
            avgTicket={data.totals.avg_ticket}
            branchCount={data.branches.length}
          />

          {/* Grid de cards por sucursal */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.branches.map(branch => (
              <BranchSalesCard key={branch.branch_id} branch={branch} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
