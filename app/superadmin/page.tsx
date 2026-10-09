'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDevices, useApproveDevice, useSuperadminSubscriptions,
} from '@/lib/api/queries'
import { useConnectedDevices } from '@/lib/api/queries/deviceMonitor'
import { summarize } from '@/lib/devices/status'
import { DeviceSummaryCards, DeviceTypeBreakdown } from '@/components/superadmin/devices/DeviceSummaryCards'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SUBSCRIPTION_STATUS_LABEL, SUBSCRIPTION_STATUS_BADGE,
  formatMXN, formatDaysRemaining, daysRemainingClass,
} from '@/lib/constants/subscription'
import { cn } from '@/lib/utils/cn'
import {
  AdminHeading, SectionLabel, StatCard, Surface, EmptyState, StatusDot, PRIMARY_BTN,
} from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import { BranchSalesSection } from '@/components/superadmin/BranchSalesSection'
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle'
import { AccessibilitySettingsPanel } from '@/components/settings/AccessibilitySettingsPanel'
import { useAuthStore } from '@/lib/stores/authStore'

// ── Accesos rápidos ───────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { href: '/superadmin/branches',      label: 'Sucursales',     desc: 'Gestionar y crear', icon: ICONS8.branch },
  { href: '/superadmin/subscriptions', label: 'Suscripciones',  desc: 'Planes y pagos',    icon: ICONS8.subscription },
  { href: '/superadmin/devices',       label: 'Dispositivos',   desc: 'Aprobar accesos',   icon: ICONS8.device },
  { href: '/superadmin/device-center', label: 'Device Center',  desc: 'Monitoreo en vivo', icon: ICONS8.multiDevice },
]

export default function SuperAdminPage() {
  const user = useAuthStore(s => s.user)
  const { data: subs, isLoading: loadingSubs } = useSuperadminSubscriptions()
  const { data: devices } = useDevices()
  const { data: connectedDevices, isLoading: loadingConnected } = useConnectedDevices()
  const approveDevice = useApproveDevice()

  const deviceSummary = summarize(connectedDevices ?? [])

  const metrics = subs?.metrics
  const items = subs?.items ?? []
  const pendingDevices = devices?.filter(d => d.status === 'pending') ?? []

  // Sucursales que vencen pronto (en operación y con ≤ 7 días restantes).
  const expiring = items
    .filter(i => i.days_remaining !== null && i.days_remaining <= 7 &&
      ['active', 'trial', 'past_due'].includes(i.status ?? ''))
    .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))

  const hasAttention = pendingDevices.length > 0 ||
    (metrics?.pending_transfer ?? 0) > 0 || expiring.length > 0

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await approveDevice.mutateAsync({ id, status })
      toast.success(status === 'approved' ? 'Dispositivo aprobado' : 'Dispositivo rechazado')
    } catch {
      toast.error('Error al actualizar dispositivo')
    }
  }

  const kpis = [
    { label: 'Sucursales',        value: metrics?.total ?? 0 },
    { label: 'Activas',           value: metrics?.active ?? 0,                     accent: 'text-emerald-400' },
    { label: 'Ingreso mensual',   value: formatMXN(metrics?.monthly_revenue ?? 0) },
    { label: 'Por vencer / pago', value: (metrics?.past_due ?? 0) + (metrics?.pending_transfer ?? 0), accent: 'text-amber-400' },
    { label: 'Disp. pendientes',  value: pendingDevices.length,                    accent: pendingDevices.length > 0 ? 'text-yellow-500' : undefined },
  ]

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <AdminHeading
          title="Resumen Global"
          description="Vista general del sistema FoodIX"
          action={
            <Button asChild className={cn('h-9', PRIMARY_BTN)}>
              <Link href="/superadmin/branches/new"><Plus className="h-4 w-4 mr-1" /> Nueva sucursal</Link>
            </Button>
          }
        />
      </div>

      <div className="animate-fade-in-up delay-75">
      <PushNotificationToggle
        label="Superadmin"
        context={{ userId: user?.id, role: user?.role, branchId: user?.branch_id }}
        className="border-white/10 bg-[#0a0a0a] text-white shadow-none [&_p]:text-white [&_p.text-muted-foreground]:text-neutral-400"
      />

      <AccessibilitySettingsPanel
        target={{ userId: user?.id, role: user?.role, branchId: user?.branch_id }}
        title="Accesibilidad de consola"
        description="Ajusta el tamaño visual de tu consola y valida los modos operativos que usarán admins y meseros en tablets o kioskos."
        dark
      />
      </div>

      {/* KPIs */}
      <section className="space-y-3 animate-fade-in-up delay-100">
        <SectionLabel>Indicadores</SectionLabel>
        {/* Carrusel horizontal en móvil; grid en escritorio */}
        <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 xl:grid-cols-5 sm:overflow-visible sm:pb-0">
          {kpis.map(kpi => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              accent={kpi.accent}
              loading={loadingSubs}
              className="snap-start shrink-0 min-w-[44%] sm:min-w-0 transition-transform duration-300 hover:scale-[1.02]"
            />
          ))}
        </div>
      </section>

      {/* Dispositivos conectados (monitoreo en vivo) */}
      <section className="space-y-3 animate-fade-in-up delay-150">
        <div className="flex items-center justify-between">
          <SectionLabel>Dispositivos conectados</SectionLabel>
          <Link
            href="/superadmin/device-center"
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Ver Device Center <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <DeviceSummaryCards summary={deviceSummary} loading={loadingConnected} now={Date.now()} />
        <DeviceTypeBreakdown summary={deviceSummary} />
      </section>

      {/* Ventas por sucursal */}
      <section className="space-y-3 animate-fade-in-up delay-200">
        <BranchSalesSection />
      </section>

      {/* Atención requerida */}
      {hasAttention && (
        <section className="space-y-3 animate-fade-in-up delay-200">
          <SectionLabel className="flex items-center gap-2">
            <StatusDot color="amber" pulse /> Atención requerida
          </SectionLabel>

          <div className="space-y-3">
            {/* Transferencias por revisar */}
            {(metrics?.pending_transfer ?? 0) > 0 && (
              <Link
                href="/superadmin/subscriptions?filter=pending_transfer"
                className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 transition-colors hover:bg-amber-500/[0.12]"
              >
                <Icons8Image src={ICONS8.bankTransfer} alt="Transferencias" size={22} className="flex-shrink-0" />
                <span className="flex-1 text-sm text-yellow-300">
                  <strong className="text-yellow-400">{metrics?.pending_transfer}</strong> transferencia(s) bancaria(s) por revisar
                </span>
                <ChevronRight className="h-4 w-4 text-yellow-400/70 flex-shrink-0" />
              </Link>
            )}

            {/* Sucursales por vencer */}
            {expiring.length > 0 && (
              <Surface>
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <h3 className="text-white text-sm font-medium">Suscripciones por vencer</h3>
                  <Badge className="ml-auto bg-amber-400/15 text-amber-300 border-amber-400/20">{expiring.length}</Badge>
                </div>
                <div className="divide-y divide-white/5">
                  {expiring.slice(0, 5).map(b => (
                    <Link
                      key={b.branch_id}
                      href={`/superadmin/subscriptions?branch=${b.branch_id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                    >
                      <BranchAvatar logoUrl={b.branch_logo_url} name={b.branch_name} size={32} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-sm font-medium truncate">{b.branch_name}</span>
                        <span className="block text-neutral-500 text-xs truncate">{b.admin_email ?? `/${b.branch_slug}`}</span>
                      </span>
                      <span className={cn('text-xs font-medium whitespace-nowrap', daysRemainingClass(b.days_remaining))}>
                        {formatDaysRemaining(b.days_remaining)}
                      </span>
                    </Link>
                  ))}
                </div>
              </Surface>
            )}

            {/* Dispositivos pendientes (aprobar/rechazar en línea) */}
            {pendingDevices.length > 0 && (
              <Surface>
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <h3 className="text-white text-sm font-medium">Dispositivos pendientes</h3>
                  <Badge className="ml-auto bg-amber-400/15 text-amber-300 border-amber-400/20">{pendingDevices.length}</Badge>
                </div>
                <div className="divide-y divide-white/5">
                  {pendingDevices.map(device => (
                    <div key={device.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                      <Icons8Image src={ICONS8.device} alt="device" size={22} className="opacity-50 flex-shrink-0" />
                      <div className="flex-1 min-w-0 basis-40">
                        <p className="text-white text-sm font-medium truncate">{device.name}</p>
                        <p className="text-neutral-500 text-xs truncate">
                          {device.device_type} · {device.device_uid.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs"
                          onClick={() => handleApprove(device.id, 'approved')}
                          disabled={approveDevice.isPending}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-transparent text-neutral-300 hover:bg-white/5 hover:text-white h-8 px-3 text-xs"
                          onClick={() => handleApprove(device.id, 'rejected')}
                          disabled={approveDevice.isPending}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            )}
          </div>
        </section>
      )}

      {/* Accesos rápidos + Sucursales en dos columnas (desktop) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] animate-fade-in-up delay-300">
        {/* Accesos rápidos */}
        <section className="space-y-3">
          <SectionLabel>Accesos rápidos</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'group flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0a0a0a] p-4 transition-colors',
                  'hover:border-white/20 hover:bg-white/[0.02] active:scale-[0.99]',
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                  <Icons8Image src={link.icon} alt={link.label} size={20} className="brightness-0 invert opacity-90" />
                </span>
                <span>
                  <span className="block text-white text-sm font-medium">{link.label}</span>
                  <span className="block text-neutral-500 text-xs">{link.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Sucursales */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Sucursales recientes</SectionLabel>
            <Link
              href="/superadmin/subscriptions"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingSubs ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-[68px] rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <Surface>
              <EmptyState
                icon={<Icons8Image src={ICONS8.branch} alt="branch" size={40} />}
                title="Aún no hay sucursales registradas."
              >
                <Button asChild size="sm" className={PRIMARY_BTN}>
                  <Link href="/superadmin/branches/new">+ Crear la primera</Link>
                </Button>
              </EmptyState>
            </Surface>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.slice(0, 6).map(b => {
                const status = b.status ?? 'expired'
                return (
                  <Link
                    key={b.branch_id}
                    href={`/superadmin/subscriptions?branch=${b.branch_id}`}
                    className="group rounded-xl border border-white/10 bg-[#0a0a0a] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.02] active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <BranchAvatar logoUrl={b.branch_logo_url} name={b.branch_name} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{b.branch_name}</p>
                        <p className="text-neutral-500 text-xs truncate">{b.admin_email ?? `/${b.branch_slug}`}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-300 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge className={cn('text-xs capitalize', SUBSCRIPTION_STATUS_BADGE[status])}>
                        {SUBSCRIPTION_STATUS_LABEL[status]}
                      </Badge>
                      {b.plan && <span className="text-neutral-500 text-xs capitalize">{b.plan}</span>}
                      <span className={cn('text-xs font-medium ml-auto', daysRemainingClass(b.days_remaining))}>
                        {formatDaysRemaining(b.days_remaining)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
