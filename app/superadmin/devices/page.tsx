'use client'

import { useState } from 'react'
import {
  MoreVertical, Trash2, Ban, ShieldCheck, X,
} from 'lucide-react'
import { useDevices, useApproveDevice, useDeleteDevice } from '@/lib/api/queries'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { AdminHeading, Surface, EmptyState, FilterChip } from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import type { Device } from '@/lib/types'

// ── Estado visual ─────────────────────────────────────────────────────────────
const STATUS: Record<Device['status'], { label: string; dot: string; pill: string }> = {
  pending:  { label: 'Pendiente', dot: 'bg-amber-400',   pill: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  approved: { label: 'Aprobado',  dot: 'bg-emerald-400', pill: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  rejected: { label: 'Rechazado', dot: 'bg-red-400',     pill: 'bg-red-400/10 text-red-300 border-red-400/20' },
  revoked:  { label: 'Revocado',  dot: 'bg-neutral-500', pill: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
}

function StatusPill({ status }: { status: Device['status'] }) {
  const s = STATUS[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium border', s.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

// ── Icono por plataforma ──────────────────────────────────────────────────────
function resolveDeviceIcon(type: Device['device_type'], name: string): string {
  const n = name.toLowerCase()
  if (type === 'android' || n.includes('android')) return ICONS8.deviceAndroid
  if (n.includes('iphone') || n.includes('ios'))   return ICONS8.deviceIphone
  if (n.includes('ipad'))                           return ICONS8.deviceTablet
  if (n.includes('mac') || n.includes('imac'))     return ICONS8.deviceMac
  if (n.includes('windows') || n.includes('win'))  return ICONS8.deviceWindows
  if (type === 'web')                               return ICONS8.deviceWeb
  if (type === 'tablet')                            return ICONS8.deviceTablet
  if (type === 'desktop')                           return ICONS8.deviceDesktop
  return ICONS8.deviceDesktop
}

function PlatformIcon({ type, name }: { type: Device['device_type']; name: string }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 flex-shrink-0">
      <Icons8Image src={resolveDeviceIcon(type, name)} alt={type} size={26} />
    </span>
  )
}

const statusFilter = ['all', 'pending', 'approved', 'rejected', 'revoked'] as const
type StatusFilter = typeof statusFilter[number]

const filterLabel: Record<StatusFilter, string> = {
  all: 'Todos', pending: 'Pendientes', approved: 'Aprobados', rejected: 'Rechazados', revoked: 'Revocados',
}

export default function DevicesPage() {
  const { data: devices, isLoading } = useDevices()
  const approveDevice = useApproveDevice()
  const deleteDevice = useDeleteDevice()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [toDelete, setToDelete] = useState<Device | null>(null)
  const [toRevoke, setToRevoke] = useState<Device | null>(null)

  const filtered = (devices ?? []).filter(d => filter === 'all' ? true : d.status === filter)

  const handleAction = async (id: number, status: 'approved' | 'rejected' | 'revoked') => {
    try {
      await approveDevice.mutateAsync({ id, status })
      toast.success(
        status === 'approved' ? 'Dispositivo aprobado' :
        status === 'rejected' ? 'Dispositivo rechazado' : 'Dispositivo revocado'
      )
    } catch {
      toast.error('Error al actualizar dispositivo')
    }
  }

  const confirmRevoke = async () => {
    if (!toRevoke) return
    try {
      await approveDevice.mutateAsync({ id: toRevoke.id, status: 'revoked' })
      toast.success('Dispositivo revocado')
      setToRevoke(null)
    } catch {
      toast.error('Error al revocar dispositivo')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteDevice.mutateAsync(toDelete.id)
      toast.success('Dispositivo eliminado')
      setToDelete(null)
    } catch {
      toast.error('Error al eliminar dispositivo')
    }
  }

  const pendingCount = (devices ?? []).filter(d => d.status === 'pending').length
  const busy = approveDevice.isPending || deleteDevice.isPending

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Dispositivos"
        description={`${devices?.length ?? 0} dispositivos · ${pendingCount} pendientes de aprobación`}
      />

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {statusFilter.map(s => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {filterLabel[s]}
            {s === 'pending' && pendingCount > 0 && (
              <span className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold',
                filter === s ? 'bg-black/10 text-black' : 'bg-amber-400/20 text-amber-300',
              )}>
                {pendingCount}
              </span>
            )}
          </FilterChip>
        ))}
      </div>

      <Surface className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icons8Image src={ICONS8.device} alt="devices" size={56} />}
            title={`No hay dispositivos${filter !== 'all' ? ` con estado "${filterLabel[filter].toLowerCase()}"` : ''}`}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(device => (
              <div key={device.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3 sm:gap-4">
                <PlatformIcon type={device.device_type} name={device.name} />

                {/* Identidad + meta */}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{device.name}</p>
                  <p className="text-neutral-500 text-xs truncate">
                    <span className="capitalize">{device.device_type}</span> · ···{device.device_uid.slice(-8).toUpperCase()}
                  </p>
                  {/* Meta en móvil */}
                  <div className="flex items-center gap-2 mt-2 lg:hidden">
                    {device.branch_name && (
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <BranchAvatar logoUrl={device.branch_logo_url} name={device.branch_name} size={18} className="rounded-md" />
                        <span className="text-neutral-400 text-xs truncate">{device.branch_name}</span>
                      </span>
                    )}
                    <span className="text-neutral-600 text-xs ml-auto">
                      {device.last_seen_at ? format(parseISO(device.last_seen_at), 'd MMM HH:mm', { locale: es }) : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Sucursal (desktop) */}
                <div className="hidden lg:flex items-center gap-2 w-44 min-w-0">
                  {device.branch_name ? (
                    <>
                      <BranchAvatar logoUrl={device.branch_logo_url} name={device.branch_name} size={24} className="rounded-md" />
                      <span className="text-neutral-300 text-xs truncate">{device.branch_name}</span>
                    </>
                  ) : (
                    <span className="text-neutral-600 text-xs">—</span>
                  )}
                </div>

                {/* Última actividad (desktop) */}
                <p className="hidden md:block w-24 text-right text-xs text-neutral-500">
                  {device.last_seen_at ? format(parseISO(device.last_seen_at), 'd MMM HH:mm', { locale: es }) : 'Nunca'}
                </p>

                <div className="hidden sm:block"><StatusPill status={device.status} /></div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5">
                  {device.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs gap-1.5"
                        onClick={() => handleAction(device.id, 'approved')}
                        disabled={busy}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Aprobar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-transparent border border-white/15 text-neutral-300 hover:bg-white/5 hover:text-white h-8 px-3 text-xs hidden sm:inline-flex"
                        onClick={() => handleAction(device.id, 'rejected')}
                        disabled={busy}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  {device.status === 'approved' && (
                    <Button
                      size="sm"
                      className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 px-3 text-xs gap-1.5"
                      onClick={() => setToRevoke(device)}
                      disabled={busy}
                    >
                      <Ban className="h-3.5 w-3.5" /> Revocar
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
                        aria-label="Más acciones"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-neutral-200">
                      {device.status === 'pending' && (
                        <DropdownMenuItem
                          className="sm:hidden cursor-pointer focus:bg-white/5 focus:text-white"
                          onClick={() => handleAction(device.id, 'rejected')}
                        >
                          <X className="mr-2 h-4 w-4" /> Rechazar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                        onClick={() => setToDelete(device)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>

      {/* Confirmación de revocar */}
      <Dialog open={toRevoke !== null} onOpenChange={open => { if (!open) setToRevoke(null) }}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Revocar acceso
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              ¿Seguro que quieres revocar el acceso de{' '}
              <span className="font-semibold text-white">"{toRevoke?.name}"</span>
              {toRevoke?.branch_name ? <> ({toRevoke.branch_name})</> : null}?
              El dispositivo dejará de poder conectarse hasta que vuelvas a aprobarlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              className="text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => setToRevoke(null)}
              disabled={approveDevice.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmRevoke}
              disabled={approveDevice.isPending}
            >
              {approveDevice.isPending ? 'Revocando…' : 'Sí, revocar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <Dialog open={toDelete !== null} onOpenChange={open => { if (!open) setToDelete(null) }}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar dispositivo</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Se eliminará <span className="font-medium text-white">{toDelete?.name}</span>
              {toDelete?.branch_name ? <> de <span className="font-medium text-white">{toDelete.branch_name}</span></> : null}.
              Si el dispositivo sigue activo, volverá a aparecer como pendiente la próxima vez que se conecte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              className="text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => setToDelete(null)}
              disabled={deleteDevice.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleteDevice.isPending}
            >
              {deleteDevice.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
