'use client'

import { use, useState } from 'react'
import { useBranch, useSubscription, useDevices, useApproveDevice, useUpdateSubscription, useSuperadminBranchSales } from '@/lib/api/queries'
import { formatMXN } from '@/lib/constants/subscription'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersManager } from '@/components/users/UsersManager'
import { BranchLogoUploader } from '@/components/branding/BranchLogoUploader'
import { DeviceCenter } from '@/components/superadmin/devices/DeviceCenter'
import { POSConfigSelector } from '@/components/pos/POSConfigSelector'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, TrendingUp, ShoppingBag, Receipt, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

const statusColors: Record<string, string> = {
  active:    'bg-emerald-400/15 text-emerald-300',
  expired:   'bg-red-400/15 text-red-300',
  suspended: 'bg-amber-400/15 text-amber-300',
  cancelled: 'bg-neutral-500/15 text-neutral-400',
}

const deviceStatusColors: Record<string, string> = {
  pending:  'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-400/15 text-emerald-300',
  rejected: 'bg-red-400/15 text-red-300',
  revoked:  'bg-neutral-500/15 text-neutral-400',
}

const deviceStatusLabels: Record<string, string> = {
  pending:  'Pendiente',
  approved: 'Activo',
  rejected: 'Rechazado',
  revoked:  'Inactivo',
}

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const branchId = Number(id)

  const { data: branch, isLoading: loadingBranch } = useBranch(branchId)
  const { data: subscription, isLoading: loadingSub } = useSubscription(branchId)
  const { data: devices, isLoading: loadingDevices } = useDevices(branchId)
  const approveDevice = useApproveDevice()
  const updateSubscription = useUpdateSubscription()
  const [salesDate, setSalesDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const { data: salesData, isLoading: loadingSales } = useSuperadminBranchSales(salesDate)

  const [subForm, setSubForm] = useState({
    plan: '',
    status: '',
    expires_at: '',
    max_devices: '',
  })
  const [editingSub, setEditingSub] = useState(false)

  const handleApproveDevice = async (deviceId: number, status: 'approved' | 'rejected' | 'revoked') => {
    try {
      await approveDevice.mutateAsync({ id: deviceId, status })
      toast.success(
        status === 'approved' ? 'Dispositivo aprobado' :
        status === 'rejected' ? 'Dispositivo rechazado' :
        'Dispositivo revocado'
      )
    } catch {
      toast.error('Error al actualizar dispositivo')
    }
  }

  const handleSaveSub = async () => {
    try {
      await updateSubscription.mutateAsync({
        branchId,
        ...(subForm.plan && { plan: subForm.plan }),
        ...(subForm.status && { status: subForm.status }),
        ...(subForm.expires_at && { expires_at: subForm.expires_at }),
        ...(subForm.max_devices && { max_devices: Number(subForm.max_devices) }),
      })
      toast.success('Suscripción actualizada')
      setEditingSub(false)
    } catch {
      toast.error('Error al actualizar suscripción')
    }
  }

  if (loadingBranch) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-white/5" />
        <Skeleton className="h-48 w-full bg-white/5" />
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-400">Sucursal no encontrada</p>
        <Button asChild variant="ghost" className="mt-4 text-neutral-400">
          <Link href="/superadmin/branches">Volver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/5">
          <Link href="/superadmin/branches"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          {branch.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branch.logo_url} alt={branch.name} className="h-10 w-10 rounded-lg object-cover border border-white/10 flex-shrink-0" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
              <Icons8Image src={ICONS8.branch} alt="branch" size={22} className="opacity-70" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">{branch.name}</h1>
            <p className="text-neutral-500 text-sm truncate">/{branch.slug}</p>
          </div>
        </div>
        <Badge className={cn('ml-auto text-xs', branch.active ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20' : 'bg-red-400/15 text-red-300 border-red-400/20')}>
          {branch.active ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      <Tabs defaultValue="subscription">
        <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          <TabsList className="bg-[#0a0a0a] border border-white/10 p-1 flex w-max justify-start h-10 rounded-xl">
            <TabsTrigger value="subscription" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Suscripción</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Ventas</TabsTrigger>
            <TabsTrigger value="operation" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Operación</TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Dispositivos</TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Monitoreo</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Usuarios</TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-white/10 text-neutral-400 data-[state=active]:text-white flex-shrink-0">Logotipo</TabsTrigger>
          </TabsList>
        </div>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-400" />
                <h3 className="text-white text-sm font-semibold">Ventas del Día</h3>
              </div>
              <input
                type="date"
                value={salesDate}
                onChange={e => {
                  if (e.target.value) setSalesDate(e.target.value)
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                aria-label="Seleccionar fecha"
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white transition-colors hover:border-white/20 focus:border-white/30 focus:outline-none appearance-none cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-80"
              />
            </div>

            {loadingSales ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-lg bg-white/[0.02] border border-white/5 animate-pulse animate-duration-1000" />
                ))}
              </div>
            ) : (() => {
              const branchSales = salesData?.branches.find(b => b.branch_id === branchId)

              if (!branchSales) {
                return (
                  <div className="text-center py-10">
                    <TrendingUp className="mx-auto h-8 w-8 text-neutral-600 mb-2 opacity-40" />
                    <p className="text-neutral-400 text-sm">Sin ventas registradas en esta fecha</p>
                  </div>
                )
              }

              return (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Ventas Totales</span>
                      </div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent tabular-nums">
                        {formatMXN(branchSales.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ShoppingBag className="h-4 w-4 text-neutral-400" />
                        <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Órdenes</span>
                      </div>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {branchSales.order_count}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Receipt className="h-4 w-4 text-neutral-400" />
                        <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Ticket Promedio</span>
                      </div>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {formatMXN(branchSales.avg_ticket)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="mt-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5 space-y-4">
            {loadingSub ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 bg-white/5" />)}
              </div>
            ) : subscription ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Plan', value: subscription.plan },
                    { label: 'Estado', value: <Badge className={cn('text-xs', statusColors[subscription.status])}>{subscription.status}</Badge> },
                    { label: 'Vence', value: format(parseISO(subscription.expires_at), 'd MMM yyyy', { locale: es }) },
                    { label: 'Dispositivos', value: `${subscription.active_devices_count} / ${subscription.max_devices}` },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-lg p-3">
                      <p className="text-neutral-400 text-xs mb-1">{item.label}</p>
                      <p className="text-white text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                {!editingSub ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSubForm({
                        plan: subscription.plan,
                        status: subscription.status,
                        expires_at: subscription.expires_at.slice(0, 10),
                        max_devices: String(subscription.max_devices),
                      })
                      setEditingSub(true)
                    }}
                    className="bg-white hover:bg-neutral-200 text-black"
                  >
                    Editar suscripción
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-neutral-300 text-xs">Plan</Label>
                      <select
                        value={subForm.plan}
                        onChange={e => setSubForm(f => ({ ...f, plan: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-1.5 text-sm"
                      >
                        {['trial', 'starter', 'pro', 'ai', 'multisucursal'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-neutral-300 text-xs">Estado</Label>
                      <select
                        value={subForm.status}
                        onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-1.5 text-sm"
                      >
                        {['active', 'trial', 'past_due', 'suspended', 'canceled', 'expired', 'terminated'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-neutral-300 text-xs">Fecha de vencimiento</Label>
                      <Input
                        type="date"
                        value={subForm.expires_at}
                        onChange={e => setSubForm(f => ({ ...f, expires_at: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-neutral-300 text-xs">Máx. dispositivos</Label>
                      <Input
                        type="number"
                        value={subForm.max_devices}
                        onChange={e => setSubForm(f => ({ ...f, max_devices: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveSub}
                        disabled={updateSubscription.isPending}
                        className="bg-white hover:bg-neutral-200 text-black"
                      >
                        {updateSubscription.isPending ? 'Guardando…' : 'Guardar cambios'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-neutral-400" onClick={() => setEditingSub(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-neutral-400 text-sm">Sin información de suscripción</p>
            )}
          </div>
        </TabsContent>

        {/* Operation Tab — cantidad de POS (Caliente / Frío) */}
        <TabsContent value="operation" className="mt-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5">
            <POSConfigSelector establishmentId={branchId} demo={false} variant="dark" />
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="mt-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden">
            {loadingDevices ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 bg-white/5" />)}
              </div>
            ) : (devices ?? []).length === 0 ? (
              <div className="p-10 text-center">
                <Icons8Image src={ICONS8.device} alt="devices" size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-neutral-400 text-sm">No hay dispositivos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {(devices ?? []).map(device => (
                  <div key={device.id} className="px-5 py-3 flex items-center gap-3">
                    <Icons8Image src={ICONS8.device} alt="device" size={24} className="opacity-60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{device.name}</p>
                      <p className="text-neutral-400 text-xs">{device.device_type} · ···{device.device_uid.slice(-8).toUpperCase()}</p>
                    </div>
                    <Badge className={cn('text-xs', deviceStatusColors[device.status])}>
                      {deviceStatusLabels[device.status] ?? device.status}
                    </Badge>
                    <div className="flex gap-1.5">
                      {device.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                            onClick={() => handleApproveDevice(device.id, 'approved')}
                            disabled={approveDevice.isPending}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-2 text-xs"
                            onClick={() => handleApproveDevice(device.id, 'rejected')}
                            disabled={approveDevice.isPending}
                          >
                            Rechazar
                          </Button>
                        </>
                      )}
                      {device.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-7 px-2 text-xs"
                          onClick={() => handleApproveDevice(device.id, 'revoked')}
                          disabled={approveDevice.isPending}
                        >
                          Desactivar
                        </Button>
                      )}
                      {(device.status === 'revoked' || device.status === 'rejected') && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                          onClick={() => handleApproveDevice(device.id, 'approved')}
                          disabled={approveDevice.isPending}
                        >
                          Activar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Monitoring Tab — dispositivos conectados en tiempo real */}
        <TabsContent value="monitoring" className="mt-4">
          <DeviceCenter branchId={branchId} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <UsersManager
            branchId={branchId}
            allowedRoles={['admin', 'mesero', 'cocina']}
            canDelete
            theme="dark"
          />
        </TabsContent>

        {/* Logo Tab */}
        <TabsContent value="branding" className="mt-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5 space-y-4">
            <div>
              <h2 className="text-white text-base font-semibold">Logotipo del establecimiento</h2>
              <p className="text-neutral-400 text-sm mt-0.5">
                Arrastra una imagen (desktop) o usa la cámara/galería (móvil) para actualizar el logo de esta sucursal.
              </p>
            </div>
            <BranchLogoUploader
              branchId={branchId}
              variant="dark"
              helperText="El logo aparecerá en la pantalla de inicio de sesión del equipo de esta sucursal."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
