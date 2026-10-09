'use client'

/**
 * FoodIX — Device Center
 * Vista de monitoreo de dispositivos conectados en tiempo real. Reutilizable:
 *  - Global (superadmin): todas las sucursales, con filtro por establecimiento.
 *  - Embebida: una sola sucursal (pestaña del detalle de establecimiento).
 *
 * El "tiempo real" es por polling (useConnectedDevices) + reloj local para los
 * textos relativos. Las acciones respetan los permisos del backend.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  MoreVertical, Trash2, Power, RotateCcw, Pencil, Eye, Plus, Search, FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Surface, EmptyState, FilterChip } from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import {
  useConnectedDevices, useSetDeviceStatus, useDeleteConnectedDevice,
} from '@/lib/api/queries/deviceMonitor'
import {
  DEVICE_TYPE_META, DEVICE_TYPE_ORDER, DEVICE_STATUS_META, deviceTypeMeta, moduleLabel,
} from '@/lib/devices/constants'
import { summarize, presenceLabel } from '@/lib/devices/status'
import type { ConnectedDevice, DeviceStatus, DeviceType } from '@/lib/devices/types'
import { DeviceStatusBadge, DeviceTypeIcon } from './parts'
import { DeviceSummaryCards, DeviceTypeBreakdown } from './DeviceSummaryCards'
import { DeviceAlerts } from './DeviceAlerts'
import { DeviceDetailDialog } from './DeviceDetailDialog'
import { PeripheralFormDialog, EditDeviceDialog } from './PeripheralFormDialog'

const fieldCls = 'h-8 bg-white/5 border border-white/10 text-neutral-200 rounded-md px-2.5 text-xs focus:outline-none focus:border-white/25'

type StatusChip = 'all' | 'online' | 'idle' | 'offline' | 'error'
const STATUS_CHIPS: { key: StatusChip; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'online', label: 'Online' },
  { key: 'idle', label: 'Inactivos' },
  { key: 'offline', label: 'Offline' },
  { key: 'error', label: 'Con error' },
]

export function DeviceCenter({ branchId = null }: { branchId?: number | null }) {
  const embedded = branchId !== null
  const { data: devices, isLoading } = useConnectedDevices(branchId)
  const setStatus = useSetDeviceStatus()
  const deleteDevice = useDeleteConnectedDevice()

  // Reloj local para textos relativos en vivo.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000)
    return () => clearInterval(t)
  }, [])

  // Vista activa
  const [activeTab, setActiveTab] = useState<'monitor' | 'report'>('monitor')

  // Filtros
  const [statusChip, setStatusChip] = useState<StatusChip>('all')
  const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Diálogos
  const [detail, setDetail] = useState<ConnectedDevice | null>(null)
  const [editing, setEditing] = useState<ConnectedDevice | null>(null)
  const [toDelete, setToDelete] = useState<ConnectedDevice | null>(null)
  const [peripheralOpen, setPeripheralOpen] = useState(false)

  const all = useMemo(() => devices ?? [], [devices])
  const summary = useMemo(() => summarize(all), [all])

  const branches = useMemo(() => {
    const map = new Map<number, string>()
    for (const d of all) map.set(d.branch_id, d.branch_name ?? `Sucursal ${d.branch_id}`)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [all])

  const kiosks = useMemo(() => all.filter(d => d.type === 'kiosk'), [all])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter(d => {
      if (statusChip !== 'all' && d.status !== statusChip) return false
      if (typeFilter !== 'all' && d.type !== typeFilter) return false
      if (moduleFilter !== 'all' && d.module !== moduleFilter) return false
      if (branchFilter !== 'all' && String(d.branch_id) !== branchFilter) return false
      if (q && !(`${d.name} ${d.branch_name ?? ''} ${d.unique_device_id}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [all, statusChip, typeFilter, moduleFilter, branchFilter, search])

  const groupedByBranch = useMemo(() => {
    const map = new Map<number, { name: string; logoUrl: string | null; devices: ConnectedDevice[] }>()
    for (const d of filtered) {
      const bId = d.branch_id
      if (!map.has(bId)) {
        map.set(bId, {
          name: d.branch_name ?? `Sucursal #${bId}`,
          logoUrl: d.branch_logo_url ?? null,
          devices: []
        })
      }
      map.get(bId)!.devices.push(d)
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [filtered])

  const handleStatus = async (id: number, status: DeviceStatus, msg: string) => {
    try {
      await setStatus.mutateAsync({ id, status })
      toast.success(msg)
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteDevice.mutateAsync(toDelete.id)
      toast.success('Dispositivo eliminado')
      setToDelete(null)
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }
    const headers = [
      'Sucursal',
      'Dispositivo',
      'Tipo',
      'Módulo',
      'Estado',
      'Dirección IP',
      'Sistema Operativo',
      'Navegador',
      'Versión App',
      'Última Conexión',
      'Último Heartbeat'
    ]
    const rows = filtered.map(d => [
      d.branch_name ?? `Sucursal #${d.branch_id}`,
      d.name,
      deviceTypeMeta(d.type).label,
      moduleLabel(d.module),
      d.status,
      d.ip_address ?? '—',
      d.os ?? '—',
      d.browser ?? '—',
      d.app_version ?? '—',
      d.connected_at ? format(parseISO(d.connected_at), 'yyyy-MM-dd HH:mm:ss') : '—',
      d.last_heartbeat_at ? format(parseISO(d.last_heartbeat_at), 'yyyy-MM-dd HH:mm:ss') : '—'
    ])

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte_dispositivos_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Reporte CSV descargado')
  }

  const busy = setStatus.isPending || deleteDevice.isPending

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <DeviceSummaryCards summary={summary} loading={isLoading} now={now} />
      <DeviceTypeBreakdown summary={summary} />

      {/* Alertas */}
      <DeviceAlerts devices={all} />

      {/* Pestañas de Vista */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('monitor')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative",
            activeTab === 'monitor' ? "text-yellow-400" : "text-neutral-400 hover:text-white"
          )}
        >
          Monitoreo en vivo
          {activeTab === 'monitor' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FACC15]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative",
            activeTab === 'report' ? "text-yellow-400" : "text-neutral-400 hover:text-white"
          )}
        >
          Reporte por Sucursal
          {activeTab === 'report' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FACC15]" />
          )}
        </button>
      </div>

      {/* Controles */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map(c => (
            <FilterChip key={c.key} active={statusChip === c.key} onClick={() => setStatusChip(c.key)}>
              {c.label}
              {c.key !== 'all' && (
                <span className="text-[10px] opacity-70 tabular-nums">
                  {c.key === 'online' ? summary.online : c.key === 'idle' ? summary.idle : c.key === 'offline' ? summary.offline : summary.error}
                </span>
              )}
            </FilterChip>
          ))}
          
          <div className="ml-auto flex items-center gap-2">
            {activeTab === 'report' && (
              <Button size="sm" variant="outline" className="h-8 bg-transparent border-white/15 text-neutral-300 hover:bg-white/5 hover:text-white text-xs gap-1.5"
                onClick={handleExportCSV}>
                <FileDown className="h-3.5 w-3.5" /> Exportar CSV
              </Button>
            )}
            <Button size="sm" className="h-8 bg-white hover:bg-neutral-200 text-black text-xs gap-1.5"
              onClick={() => setPeripheralOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Periférico
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar dispositivo…"
              className="h-8 pl-8 bg-white/5 border-white/10 text-white text-xs" />
          </div>
          {!embedded && branches.length > 1 && (
            <select className={fieldCls} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">Todos los establecimientos</option>
              {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
          <select className={fieldCls} value={typeFilter} onChange={e => setTypeFilter(e.target.value as DeviceType | 'all')}>
            <option value="all">Todos los tipos</option>
            {DEVICE_TYPE_ORDER.map(t => <option key={t} value={t}>{DEVICE_TYPE_META[t].label}</option>)}
          </select>
          <select className={fieldCls} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
            <option value="all">Todos los módulos</option>
            {['superadmin', 'admin', 'kiosk', 'waiter', 'kitchen', 'pos', 'unknown'].map(m => (
              <option key={m} value={m}>{moduleLabel(m as ConnectedDevice['module'])}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla / Reporte */}
      {activeTab === 'monitor' ? (
        <Surface className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<DeviceTypeIcon type="unknown" size={48} />}
              title={all.length === 0 ? 'Aún no hay dispositivos reportando actividad.' : 'Ningún dispositivo coincide con los filtros.'}
            />
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(device => (
                <div key={device.id} className="px-3 sm:px-4 py-3 flex items-center gap-3">
                  <DeviceTypeIcon type={device.type} size={40} />

                  <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(device)}>
                    <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                      {device.name}
                      {device.is_peripheral && <span className="text-[10px] text-neutral-500 border border-white/10 rounded px-1">manual</span>}
                    </p>
                    <p className="text-neutral-500 text-xs truncate">
                      {deviceTypeMeta(device.type).label} · {moduleLabel(device.module)}
                      {!embedded && device.branch_name ? ` · ${device.branch_name}` : ''}
                    </p>
                    <p className="text-neutral-600 text-xs truncate mt-0.5 sm:hidden">{presenceLabel(device, now)}</p>
                  </button>

                  <p className="hidden sm:block w-40 text-right text-xs text-neutral-500 truncate">
                    {presenceLabel(device, now)}
                  </p>

                  <DeviceStatusBadge status={device.status} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Acciones">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-neutral-200">
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => setDetail(device)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => setEditing(device)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar nombre/tipo
                      </DropdownMenuItem>
                      {device.status !== 'offline' && (
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white"
                          disabled={busy} onClick={() => handleStatus(device.id, 'offline', 'Marcado como desconectado')}>
                          <Power className="mr-2 h-4 w-4" /> Marcar desconectado
                        </DropdownMenuItem>
                      )}
                      {(device.status === 'error' || device.status === 'offline') && (
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white"
                          disabled={busy} onClick={() => handleStatus(device.id, 'unknown', 'Estado lógico reiniciado')}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar estado
                        </DropdownMenuItem>
                      )}
                      {device.is_peripheral && (
                        <DropdownMenuItem className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                          onClick={() => setToDelete(device)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </Surface>
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-6 w-48 bg-white/[0.05] rounded animate-pulse" />
                  <div className="h-24 bg-white/[0.02] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : groupedByBranch.length === 0 ? (
            <Surface className="overflow-hidden">
              <EmptyState
                icon={<DeviceTypeIcon type="unknown" size={48} />}
                title={all.length === 0 ? 'Aún no hay dispositivos reportando actividad.' : 'Ningún dispositivo coincide con los filtros.'}
              />
            </Surface>
          ) : (
            groupedByBranch.map(([bId, branch]) => (
              <div key={bId} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <BranchAvatar logoUrl={branch.logoUrl} name={branch.name} size={22} className="rounded" />
                  <h3 className="text-white text-sm font-semibold">{branch.name}</h3>
                  <span className="text-neutral-500 text-xs">({branch.devices.length} dispositivos)</span>
                </div>

                <Surface className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-neutral-500 font-medium">
                        <th className="py-2.5 px-4">Dispositivo</th>
                        <th className="py-2.5 px-4">Tipo / Módulo</th>
                        <th className="py-2.5 px-4">Dirección IP</th>
                        <th className="py-2.5 px-4">SO / Navegador</th>
                        <th className="py-2.5 px-4">Conexión / Heartbeat</th>
                        <th className="py-2.5 px-4">Estado</th>
                        <th className="py-2.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-neutral-300">
                      {branch.devices.map(device => (
                        <tr key={device.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2.5 px-4 font-medium text-white">
                            <button onClick={() => setDetail(device)} className="hover:underline text-left">
                              {device.name}
                            </button>
                            {device.is_peripheral && (
                              <span className="ml-1.5 text-[9px] text-neutral-500 border border-white/10 rounded px-1">manual</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <DeviceTypeIcon type={device.type} size={16} />
                              <span>{deviceTypeMeta(device.type).label} ({moduleLabel(device.module)})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                            {device.ip_address ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 text-neutral-400 truncate max-w-[150px]" title={[device.os, device.browser].filter(Boolean).join(' · ')}>
                            {[device.os, device.browser].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-neutral-400 whitespace-nowrap">
                            <div className="flex flex-col leading-tight">
                              <span>Conectado: {device.connected_at ? format(parseISO(device.connected_at), 'd MMM, HH:mm', { locale: es }) : '—'}</span>
                              <span className="text-[10px] text-neutral-500">Último HB: {device.last_heartbeat_at ? format(parseISO(device.last_heartbeat_at), 'd MMM, HH:mm', { locale: es }) : '—'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <DeviceStatusBadge status={device.status} />
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Acciones">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-neutral-200">
                                <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => setDetail(device)}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => setEditing(device)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar nombre/tipo
                                </DropdownMenuItem>
                                {device.status !== 'offline' && (
                                  <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white"
                                    disabled={busy} onClick={() => handleStatus(device.id, 'offline', 'Marcado como desconectado')}>
                                    <Power className="mr-2 h-4 w-4" /> Marcar desconectado
                                  </DropdownMenuItem>
                                )}
                                {(device.status === 'error' || device.status === 'offline') && (
                                  <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white"
                                    disabled={busy} onClick={() => handleStatus(device.id, 'unknown', 'Estado lógico reiniciado')}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar estado
                                  </DropdownMenuItem>
                                )}
                                {device.is_peripheral && (
                                  <DropdownMenuItem className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                    onClick={() => setToDelete(device)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Surface>
              </div>
            ))
          )}
        </div>
      )}

      {/* Diálogos */}
      <DeviceDetailDialog device={detail} branchId={branchId} now={now} onClose={() => setDetail(null)} />
      {editing && <EditDeviceDialog key={editing.id} device={editing} onClose={() => setEditing(null)} />}
      <PeripheralFormDialog open={peripheralOpen} onOpenChange={setPeripheralOpen} branchId={branchId} kiosks={kiosks} />

      <Dialog open={toDelete !== null} onOpenChange={open => { if (!open) setToDelete(null) }}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar periférico</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Se eliminará <span className="font-medium text-white">{toDelete?.name}</span> y su historial de eventos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => setToDelete(null)} disabled={deleteDevice.isPending}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete} disabled={deleteDevice.isPending}>
              {deleteDevice.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
