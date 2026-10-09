'use client'

import { useState } from 'react'
import {
  MoreVertical, Trash2, Ban, ShieldCheck, Pencil,
} from 'lucide-react'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { useAuthStore } from '@/lib/stores/authStore'
import { useDevices, useApproveDevice, useDeleteDevice, useUpdateDevice, useUsers, useSubscription } from '@/lib/api/queries'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ApiError } from '@/lib/api/client'
import type { Device } from '@/lib/types'

const STATUS: Record<Device['status'], { label: string; cls: string }> = {
  pending:  { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Aprobado',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rechazado', cls: 'bg-red-100 text-red-700 border-red-200' },
  revoked:  { label: 'Revocado',  cls: 'bg-muted text-muted-foreground border-border' },
}

function resolveDeviceIcon(type: Device['device_type'], name: string): string {
  const n = name.toLowerCase()
  if (type === 'android' || n.includes('android')) return ICONS8.deviceAndroid
  if (n.includes('iphone') || n.includes('ios'))  return ICONS8.deviceIphone
  if (n.includes('ipad'))                          return ICONS8.deviceTablet
  if (n.includes('mac') || n.includes('imac'))    return ICONS8.deviceMac
  if (n.includes('windows') || n.includes('win')) return ICONS8.deviceWindows
  if (type === 'web')                              return ICONS8.deviceWeb
  if (type === 'tablet')                           return ICONS8.deviceTablet
  if (type === 'desktop')                          return ICONS8.deviceDesktop
  return ICONS8.deviceDesktop
}

function PlatformIcon({ type, name }: { type: Device['device_type']; name: string }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted flex-shrink-0">
      <Icons8Image src={resolveDeviceIcon(type, name)} alt={type} size={26} />
    </span>
  )
}

export default function DevicesPage() {
  const branch = useAuthStore(s => s.branch)
  const branchId = branch?.id ?? null

  const { data: devices, isLoading } = useDevices()
  const { data: sub } = useSubscription(branchId)
  const approveDevice = useApproveDevice()
  const deleteDevice = useDeleteDevice()
  const updateDevice = useUpdateDevice()
  const { data: users = [] } = useUsers(branchId)
  const [toDelete, setToDelete] = useState<Device | null>(null)
  const [toRevoke, setToRevoke] = useState<Device | null>(null)
  const [editing, setEditing] = useState<Device | null>(null)
  const [editName, setEditName] = useState('')
  const [editUser, setEditUser] = useState('')
  const [editRole, setEditRole] = useState('')

  const openEdit = (d: Device) => {
    setEditing(d)
    setEditName(d.name)
    setEditUser(d.assigned_user_id ? String(d.assigned_user_id) : '')
    setEditRole(d.device_role ?? '')
  }

  const saveEdit = async () => {
    if (!editing) return
    if (editName.trim() === '') { toast.error('El nombre no puede estar vacío'); return }
    try {
      await updateDevice.mutateAsync({
        id: editing.id,
        name: editName.trim(),
        assigned_user_id: editUser ? Number(editUser) : null,
        device_role: editRole.trim() || null,
      })
      toast.success('Dispositivo actualizado')
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar')
    }
  }

  const list = devices ?? []
  const pending = list.filter(d => d.status === 'pending')
  const approvedCount = list.filter(d => d.status === 'approved').length
  const maxDevices = sub?.max_devices ?? null
  const atLimit = maxDevices !== null && approvedCount >= maxDevices

  const handleAction = async (id: number, status: 'approved' | 'rejected' | 'revoked') => {
    try {
      await approveDevice.mutateAsync({ id, status })
      toast.success(
        status === 'approved' ? 'Dispositivo aprobado' :
        status === 'rejected' ? 'Dispositivo rechazado' : 'Dispositivo revocado'
      )
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al actualizar dispositivo')
    }
  }

  const confirmRevoke = async () => {
    if (!toRevoke) return
    await handleAction(toRevoke.id, 'revoked')
    setToRevoke(null)
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

  const busy = approveDevice.isPending || deleteDevice.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispositivos"
        description="Aprueba o bloquea los equipos que pueden acceder a tu sucursal"
      />

      {/* Uso del plan */}
      {maxDevices !== null && (
        <Card>
          <CardContent className="py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium">Dispositivos activos</span>
                <span className={cn('text-sm font-semibold tabular-nums', atLimit ? 'text-amber-600' : 'text-foreground')}>
                  {approvedCount} / {maxDevices}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', atLimit ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(100, maxDevices ? (approvedCount / maxDevices) * 100 : 0)}%` }}
                />
              </div>
            </div>
            {atLimit && (
              <p className="text-xs text-amber-600 basis-full sm:basis-auto">
                Alcanzaste el límite de tu plan. Revoca un dispositivo para aprobar otro,
                o amplía tu plan desde <span className="font-medium">Mi Suscripción</span>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pendientes destacados */}
      {pending.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Tienes <span className="font-semibold text-foreground">{pending.length}</span> dispositivo(s) esperando aprobación.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Icons8Image src={ICONS8.saDevice} alt="Dispositivos" size={40} className="mx-auto opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground">Aún no hay dispositivos registrados en tu sucursal.</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map(device => {
                const blockApprove = device.status !== 'approved' && atLimit
                return (
                  <div key={device.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3 sm:gap-4">
                    <PlatformIcon type={device.device_type} name={device.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{device.name}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        <span className="capitalize">{device.device_type}</span> · ···{device.device_uid.slice(-8).toUpperCase()}
                        {device.assigned_user_name ? ` · 👤 ${device.assigned_user_name}` : ''}
                        {device.device_role ? ` · ${device.device_role}` : ''}
                      </p>
                      <p className="text-muted-foreground/80 text-xs mt-1 md:hidden">
                        {device.last_seen_at ? `Visto ${format(parseISO(device.last_seen_at), 'd MMM HH:mm', { locale: es })}` : 'Nunca conectado'}
                      </p>
                    </div>

                    <p className="hidden md:block w-24 text-right text-xs text-muted-foreground">
                      {device.last_seen_at ? format(parseISO(device.last_seen_at), 'd MMM HH:mm', { locale: es }) : 'Nunca'}
                    </p>

                    <Badge variant="outline" className={cn('hidden sm:inline-flex text-xs', STATUS[device.status].cls)}>
                      {STATUS[device.status].label}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {device.status === 'pending' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs gap-1.5"
                          onClick={() => handleAction(device.id, 'approved')}
                          disabled={busy || blockApprove}
                          title={blockApprove ? 'Límite del plan alcanzado' : undefined}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Aprobar
                        </Button>
                      )}
                      {device.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => setToRevoke(device)}
                          disabled={busy}
                        >
                          <Ban className="h-3.5 w-3.5" /> Revocar
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Más acciones">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(device)}>
                            <Pencil className="mr-2 h-4 w-4" /> Renombrar / asignar
                          </DropdownMenuItem>
                          {device.status === 'pending' && (
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction(device.id, 'rejected')}>
                              Rechazar
                            </DropdownMenuItem>
                          )}
                          {device.status === 'rejected' && !blockApprove && (
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleAction(device.id, 'approved')}>
                              <ShieldCheck className="mr-2 h-4 w-4" /> Aprobar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setToDelete(device)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renombrar dispositivo</DialogTitle>
            <DialogDescription>Asigna un nombre amigable, un usuario y un rol.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Tablet Mesa 1 / Cocina Caliente / Caja Principal" autoFocus />
            </div>
            <div>
              <Label>Usuario asignado</Label>
              <select value={editUser} onChange={e => setEditUser(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </select>
            </div>
            <div>
              <Label>Rol del dispositivo (opcional)</Label>
              <Input value={editRole} onChange={e => setEditRole(e.target.value)}
                placeholder="Caja, Cocina Caliente, Mesero…" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={updateDevice.isPending}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={updateDevice.isPending} className="bg-[#D1400F] hover:bg-[#B03508]">
              {updateDevice.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar revocar ── */}
      <Dialog open={toRevoke !== null} onOpenChange={open => { if (!open) setToRevoke(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Revocar acceso
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres revocar el acceso de{' '}
              <span className="font-semibold text-foreground">"{toRevoke?.name}"</span>?
              El dispositivo dejará de poder conectarse hasta que vuelvas a aprobarlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setToRevoke(null)} disabled={approveDevice.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={approveDevice.isPending}
            >
              {approveDevice.isPending ? 'Revocando…' : 'Sí, revocar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar ── */}
      <Dialog open={toDelete !== null} onOpenChange={open => { if (!open) setToDelete(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar dispositivo</DialogTitle>
            <DialogDescription>
              Se eliminará <span className="font-medium text-foreground">{toDelete?.name}</span>.
              Si el equipo sigue activo, volverá a aparecer como pendiente la próxima vez que se conecte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleteDevice.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteDevice.isPending}>
              {deleteDevice.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
