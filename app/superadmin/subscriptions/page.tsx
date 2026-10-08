'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, ChevronRight, Search, LayoutGrid, List as ListIcon } from 'lucide-react'
import { useSuperadminSubscriptions, useSuperadminBillingDashboard } from '@/lib/api/queries'
import { SubscriptionDetailModal } from '@/components/superadmin/SubscriptionDetailModal'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { APP_DOMAIN } from '@/lib/utils/slugify'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  PLAN_BADGE, daysRemainingClass, formatDaysRemaining, formatMXN,
} from '@/lib/constants/subscription'
import type { SuperadminSubscriptionRow } from '@/lib/types'
import {
  AdminHeading, Surface, EmptyState, FilterChip, PRIMARY_BTN,
} from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import { BillingKpiGrid } from '@/components/superadmin/billing/BillingKpiGrid'
import { SubscriptionCard } from '@/components/superadmin/billing/SubscriptionCard'
import { SubscriptionStatusBadge } from '@/components/superadmin/billing/SubscriptionStatusBadge'

type Filter =
  | 'all' | 'active' | 'past_due' | 'grace' | 'due_week' | 'due_month'
  | 'suspended' | 'canceled' | 'expired' | 'pending_transfer'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',              label: 'Todas' },
  { value: 'active',           label: 'Activas' },
  { value: 'past_due',         label: 'Por vencer' },
  { value: 'grace',            label: 'En gracia' },
  { value: 'due_week',         label: 'Vencen esta semana' },
  { value: 'due_month',        label: 'Vencen este mes' },
  { value: 'suspended',        label: 'Suspendidas' },
  { value: 'expired',          label: 'Vencidas' },
  { value: 'canceled',         label: 'Canceladas' },
  { value: 'pending_transfer', label: 'Pend. transferencia' },
]

const ALLOWED = new Set(['active', 'trial', 'past_due'])

function matchesFilter(row: SuperadminSubscriptionRow, filter: Filter): boolean {
  const d = row.days_remaining
  const allowed = !!row.status && ALLOWED.has(row.status)
  switch (filter) {
    case 'all':              return true
    case 'active':           return row.status === 'active'
    case 'past_due':         return row.status === 'past_due'
    case 'grace':            return row.status === 'past_due' || (allowed && d !== null && d < 0)
    case 'due_week':         return allowed && d !== null && d >= 0 && d <= 7
    case 'due_month':        return allowed && d !== null && d >= 0 && d <= 31
    case 'suspended':        return row.status === 'suspended'
    case 'canceled':         return row.status === 'canceled' || row.status === 'terminated'
    case 'expired':          return row.status === 'expired'
    case 'pending_transfer': return row.status === 'pending_bank_transfer' || row.status === 'bank_transfer_review'
  }
}

function SubscriptionsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, isLoading } = useSuperadminSubscriptions()
  const { data: dashboard, isLoading: dashLoading } = useSuperadminBillingDashboard()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [detailBranch, setDetailBranch] = useState<number | null>(null)

  // Abre el modal de detalle si llega ?branch=ID (enlaces desde el dashboard).
  useEffect(() => {
    const b = searchParams.get('branch')
    if (b && /^\d+$/.test(b)) setDetailBranch(Number(b))
    const f = searchParams.get('filter')
    if (f && FILTERS.some(x => x.value === f)) setFilter(f as Filter)
  }, [searchParams])

  const rows = useMemo(() => {
    const items = data?.items ?? []
    const q = search.trim().toLowerCase()
    return items.filter(r => {
      if (!matchesFilter(r, filter)) return false
      if (!q) return true
      return (
        r.branch_name.toLowerCase().includes(q) ||
        (r.admin_name ?? '').toLowerCase().includes(q) ||
        (r.admin_email ?? '').toLowerCase().includes(q) ||
        (r.branch_phone ?? '').toLowerCase().includes(q) ||
        (r.plan ?? '').toLowerCase().includes(q) ||
        String(r.branch_id).includes(q)
      )
    })
  }, [data, filter, search])

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Billing CRM"
        description="Administración de clientes, suscripciones, pagos y estado financiero"
        action={
          <Button asChild className={cn('h-9', PRIMARY_BTN)}>
            <Link href="/superadmin/branches/new"><Plus className="h-4 w-4 mr-1" /> Registrar cliente</Link>
          </Button>
        }
      />

      {/* KPIs del Billing CRM */}
      <BillingKpiGrid data={dashboard} loading={dashLoading} onSelectBranch={setDetailBranch} />

      {/* Filtros + búsqueda + vista */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
            <input
              placeholder="Buscar nombre, propietario, email, teléfono, plan o ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-[#0a0a0a] pl-9 pr-3 text-sm text-white placeholder:text-neutral-500 transition-colors focus:border-white/25 focus:outline-none"
            />
          </div>
          <div className="flex rounded-md border border-white/10 p-0.5">
            <ViewBtn active={view === 'cards'} onClick={() => setView('cards')}><LayoutGrid className="h-4 w-4" /></ViewBtn>
            <ViewBtn active={view === 'list'} onClick={() => setView('list')}><ListIcon className="h-4 w-4" /></ViewBtn>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : (
          <Surface className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-white/[0.02] animate-pulse" />)}</Surface>
        )
      ) : rows.length === 0 ? (
        <Surface>
          <EmptyState icon={<Icons8Image src={ICONS8.subscription} alt="subs" size={56} />} title="No hay clientes que coincidan" />
        </Surface>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map(row => <SubscriptionCard key={row.branch_id} row={row} onManage={setDetailBranch} />)}
        </div>
      ) : (
        <Surface className="overflow-hidden">
          <div className="hidden lg:grid grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr_1fr_auto] gap-3 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500 border-b border-white/10">
            <span>Sucursal</span><span>Propietario</span><span>Plan</span><span>Estado</span><span>Renovación</span><span>Precio</span><span></span>
          </div>
          <div className="divide-y divide-white/5">
            {rows.map(row => (
              <button
                key={row.branch_id}
                onClick={() => setDetailBranch(row.branch_id)}
                className="w-full text-left grid grid-cols-[1fr_auto] lg:grid-cols-[2fr_1.5fr_0.8fr_1fr_1fr_1fr_auto] gap-x-3 gap-y-2 px-5 py-3.5 items-center transition-colors hover:bg-white/[0.03] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BranchAvatar logoUrl={row.branch_logo_url} name={row.branch_name} size={36} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{row.branch_name}</p>
                    <p className="text-neutral-500 text-xs truncate">{APP_DOMAIN}/{row.branch_slug} · #{row.branch_id}</p>
                  </div>
                </div>
                <div className="min-w-0 hidden lg:block">
                  <p className="text-neutral-300 text-xs truncate">{row.admin_name ?? '—'}</p>
                  <p className="text-neutral-500 text-xs truncate">{row.admin_email ?? ''}</p>
                </div>
                <div className="hidden lg:block">
                  {row.plan ? <Badge className={cn('text-xs capitalize', PLAN_BADGE[row.plan])}>{row.plan}</Badge> : <span className="text-neutral-600 text-xs">—</span>}
                </div>
                <div className="justify-self-end lg:justify-self-start">
                  <SubscriptionStatusBadge status={row.status} />
                </div>
                <div className="hidden lg:block">
                  <p className="text-neutral-300 text-xs">{row.expires_at ? format(parseISO(row.expires_at), 'd MMM yyyy', { locale: es }) : '—'}</p>
                  <p className={cn('text-xs', daysRemainingClass(row.days_remaining))}>{formatDaysRemaining(row.days_remaining)}</p>
                </div>
                <div className="hidden lg:block text-neutral-300 text-xs">{formatMXN(row.price_monthly, row.currency)}</div>

                <div className="lg:hidden col-span-2 flex items-center gap-2 flex-wrap text-xs text-neutral-500">
                  {row.plan && <Badge className={cn('text-xs capitalize', PLAN_BADGE[row.plan])}>{row.plan}</Badge>}
                  <span className={cn(daysRemainingClass(row.days_remaining))}>{formatDaysRemaining(row.days_remaining)}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-neutral-400 group-hover:text-white transition-colors">
                    Detalle <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="hidden lg:flex justify-end">
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-400 group-hover:text-white transition-colors">
                    Ver <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Surface>
      )}

      <SubscriptionDetailModal
        branchId={detailBranch}
        open={detailBranch !== null}
        onOpenChange={open => {
          if (!open) {
            setDetailBranch(null)
            if (searchParams.get('branch')) router.replace('/superadmin/subscriptions')
          }
        }}
      />
    </div>
  )
}

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded transition-colors',
        active ? 'bg-white text-black' : 'text-neutral-400 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionsInner />
    </Suspense>
  )
}
