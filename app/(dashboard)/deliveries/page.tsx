'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Bike, Plus, Trash2, Users, MapPinned, History } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useDeliveryOrders, useDrivers, useUpdateDelivery,
  useCreateDriver, useDeleteDriver, useUpdateDriver,
  useDeliveryZones, useCreateDeliveryZone, useDeleteDeliveryZone,
  useDeliveryEvents,
} from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { DeliveryStatus } from '@/lib/types'

const DSTATUS: Record<DeliveryStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending:   { label: 'Por asignar', variant: 'secondary' },
  assigned:  { label: 'Asignado',    variant: 'default' },
  on_route:  { label: 'En ruta',     variant: 'default' },
  delivered: { label: 'Entregado',   variant: 'default' },
  cancelled: { label: 'Cancelado',   variant: 'destructive' },
}
const NEXT: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending:   ['on_route', 'cancelled'],
  assigned:  ['on_route', 'cancelled'],
  on_route:  ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const DRIVER_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  disponible: { label: 'Disponible', variant: 'default' },
  en_ruta: { label: 'En ruta', variant: 'secondary' },
  fuera_de_servicio: { label: 'Fuera de servicio', variant: 'destructive' },
}

const EVENT_LABEL: Record<string, string> = {
  pending: 'Por asignar',
  assigned: 'Asignado',
  driver_assigned: 'Repartidor asignado',
  on_route: 'En ruta',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default function DeliveriesPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const { data: orders = [], isLoading } = useDeliveryOrders(branchId)
  const { data: drivers = [] } = useDrivers(branchId)
  const { data: zones = [] } = useDeliveryZones(branchId)
  const updateDelivery = useUpdateDelivery()
  const createDriver = useCreateDriver()
  const deleteDriver = useDeleteDriver()
  const updateDriver = useUpdateDriver()
  const createZone = useCreateDeliveryZone()
  const deleteZone = useDeleteDeliveryZone()

  const [driversOpen, setDriversOpen] = useState(false)
  const [zonesOpen, setZonesOpen] = useState(false)
  const [newDriver, setNewDriver] = useState({ name: '', phone: '', vehicle: '' })
  const [newZone, setNewZone] = useState({ name: '', cost: '', min_order: '', estimated_minutes: '' })
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  const active = orders.filter(o => o.delivery_status && !['delivered', 'cancelled'].includes(o.delivery_status))
  const done = orders.filter(o => o.delivery_status && ['delivered', 'cancelled'].includes(o.delivery_status))

  const driverName = (id: number | null) => drivers.find(d => d.id === id)?.name ?? null

  const assignDriver = async (orderId: number, driverId: number) => {
    try {
      await updateDelivery.mutateAsync({ orderId, driver_id: driverId, delivery_status: 'assigned' })
      toast.success('Repartidor asignado')
    } catch { toast.error('Error al asignar') }
  }
  const setStatus = async (orderId: number, status: DeliveryStatus) => {
    try { await updateDelivery.mutateAsync({ orderId, delivery_status: status }); toast.success('Estado actualizado') }
    catch { toast.error('Error al actualizar') }
  }

  const handleAddDriver = async () => {
    if (!newDriver.name.trim()) return
    try {
      await createDriver.mutateAsync({ branch_id: branchId, ...newDriver })
      toast.success('Repartidor agregado'); setNewDriver({ name: '', phone: '', vehicle: '' })
    } catch { toast.error('Error al agregar') }
  }

  const handleDriverStatus = async (id: number, status: string) => {
    try { await updateDriver.mutateAsync({ id, status }) }
    catch { toast.error('Error al actualizar repartidor') }
  }

  const handleAddZone = async () => {
    if (!newZone.name.trim()) return
    try {
      await createZone.mutateAsync({
        branch_id: branchId, name: newZone.name,
        cost: parseFloat(newZone.cost) || 0,
        min_order: parseFloat(newZone.min_order) || 0,
        estimated_minutes: newZone.estimated_minutes ? parseInt(newZone.estimated_minutes) : null,
      })
      toast.success('Zona agregada'); setNewZone({ name: '', cost: '', min_order: '', estimated_minutes: '' })
    } catch { toast.error('Error al agregar zona') }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Domicilios"
        description="Pedidos a domicilio y repartidores"
        actions={isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setZonesOpen(true)}>
              <MapPinned className="h-4 w-4 mr-1" /> Zonas
            </Button>
            <Button variant="outline" onClick={() => setDriversOpen(true)}>
              <Users className="h-4 w-4 mr-1" /> Repartidores
            </Button>
          </div>
        )}
      />

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          Sin pedidos a domicilio. Crea uno desde “Nuevo Pedido” eligiendo tipo Domicilio.
        </CardContent></Card>
      ) : (
        <>
          {active.map(o => (
            <Card key={o.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">Pedido #{o.id} · {formatCurrency(o.total)}</p>
                    {o.delivery_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />{o.delivery_address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                    {driverName(o.driver_id) && (
                      <p className="text-xs flex items-center gap-1 mt-0.5"><Bike className="h-3 w-3" />{driverName(o.driver_id)}</p>
                    )}
                  </div>
                  <Badge variant={DSTATUS[o.delivery_status!].variant}>{DSTATUS[o.delivery_status!].label}</Badge>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  {drivers.length > 0 && (
                    <Select value={o.driver_id ? String(o.driver_id) : ''} onValueChange={(v) => assignDriver(o.id, Number(v))}>
                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Asignar repartidor" /></SelectTrigger>
                      <SelectContent>
                        {drivers.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {NEXT[o.delivery_status!].map(s => (
                    <Button key={s} size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => setStatus(o.id, s)}>
                      {DSTATUS[s].label}
                    </Button>
                  ))}
                  <button
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => setExpandedOrder(prev => prev === o.id ? null : o.id)}
                  >
                    <History className="h-3.5 w-3.5" /> Bitácora
                  </button>
                </div>

                {expandedOrder === o.id && <DeliveryTimeline orderId={o.id} />}
              </CardContent>
            </Card>
          ))}

          {done.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Finalizados</p>
              {done.slice(0, 15).map(o => (
                <Card key={o.id} className="opacity-70">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Pedido #{o.id} · {formatCurrency(o.total)}</p>
                      <p className="text-xs text-muted-foreground">{driverName(o.driver_id) ?? '—'}</p>
                    </div>
                    <Badge variant={DSTATUS[o.delivery_status!].variant}>{DSTATUS[o.delivery_status!].label}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Gestión de repartidores */}
      <Dialog open={driversOpen} onOpenChange={setDriversOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Repartidores</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {drivers.map(d => (
                <div key={d.id} className="flex items-center justify-between border rounded-lg p-2 text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[d.phone, d.vehicle].filter(Boolean).join(' · ') || '—'}
                      {d.active_orders > 0 && ` · ${d.active_orders} pedido${d.active_orders !== 1 ? 's' : ''} activo${d.active_orders !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={d.status} onValueChange={(v) => handleDriverStatus(d.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <Badge variant={DRIVER_STATUS[d.status].variant} className="pointer-events-none">{DRIVER_STATUS[d.status].label}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DRIVER_STATUS).map(([v, s]) => <SelectItem key={v} value={v}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button onClick={() => deleteDriver.mutate(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {drivers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin repartidores</p>}
            </div>
            <div className="flex gap-2 items-end border-t pt-3 flex-wrap">
              <div className="flex-1 space-y-1.5 min-w-[100px]"><Label className="text-xs">Nombre</Label>
                <Input value={newDriver.name} onChange={e => setNewDriver(d => ({ ...d, name: e.target.value }))} /></div>
              <div className="w-28 space-y-1.5"><Label className="text-xs">Teléfono</Label>
                <Input value={newDriver.phone} onChange={e => setNewDriver(d => ({ ...d, phone: e.target.value }))} /></div>
              <div className="w-28 space-y-1.5"><Label className="text-xs">Vehículo</Label>
                <Input value={newDriver.vehicle} onChange={e => setNewDriver(d => ({ ...d, vehicle: e.target.value }))} placeholder="Moto…" /></div>
              <Button onClick={handleAddDriver} disabled={createDriver.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriversOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gestión de zonas de entrega */}
      <Dialog open={zonesOpen} onOpenChange={setZonesOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Zonas de entrega</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                  <div>
                    <p className="font-medium">{z.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(z.cost)} envío · pedido mín. {formatCurrency(z.min_order)}
                      {z.estimated_minutes ? ` · ~${z.estimated_minutes} min` : ''}
                    </p>
                  </div>
                  <button onClick={() => deleteZone.mutate(z.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {zones.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin zonas configuradas</p>}
            </div>
            <div className="flex gap-2 items-end border-t pt-3 flex-wrap">
              <div className="flex-1 space-y-1.5 min-w-[100px]"><Label className="text-xs">Nombre</Label>
                <Input value={newZone.name} onChange={e => setNewZone(z => ({ ...z, name: e.target.value }))} placeholder="Centro…" /></div>
              <div className="w-24 space-y-1.5"><Label className="text-xs">Costo</Label>
                <Input type="number" inputMode="decimal" value={newZone.cost} onChange={e => setNewZone(z => ({ ...z, cost: e.target.value }))} /></div>
              <div className="w-24 space-y-1.5"><Label className="text-xs">Pedido mín.</Label>
                <Input type="number" inputMode="decimal" value={newZone.min_order} onChange={e => setNewZone(z => ({ ...z, min_order: e.target.value }))} /></div>
              <div className="w-24 space-y-1.5"><Label className="text-xs">Min. estimados</Label>
                <Input type="number" inputMode="numeric" value={newZone.estimated_minutes} onChange={e => setNewZone(z => ({ ...z, estimated_minutes: e.target.value }))} /></div>
              <Button onClick={handleAddZone} disabled={createZone.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZonesOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DeliveryTimeline({ orderId }: { orderId: number }) {
  const { data: events = [], isLoading } = useDeliveryEvents(orderId)
  if (isLoading) return <Skeleton className="h-12 rounded-lg" />
  if (events.length === 0) return <p className="text-xs text-muted-foreground pl-1">Sin eventos registrados aún.</p>
  return (
    <div className="border-t pt-2 space-y-1.5">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E85D04] shrink-0" />
          <span className="font-medium text-foreground">{EVENT_LABEL[e.status] ?? e.status}</span>
          {e.driver_name && <span>· {e.driver_name}</span>}
          <span className="ml-auto shrink-0">{formatDate(e.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
