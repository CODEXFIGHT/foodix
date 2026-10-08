'use client'

/**
 * FoodIX — Device Center
 * Detalle de un dispositivo: información general, estado en vivo, periféricos
 * asociados, historial de eventos y metadata técnica.
 */

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useConnectedDevices, useDeviceEvents } from '@/lib/api/queries/deviceMonitor'
import { deviceTypeMeta, moduleLabel } from '@/lib/devices/constants'
import { presenceLabel } from '@/lib/devices/status'
import { DeviceStatusBadge, DeviceTypeIcon } from './parts'
import type { ConnectedDevice } from '@/lib/devices/types'

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), "d MMM yyyy · HH:mm:ss", { locale: es }) } catch { return '—' }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-neutral-500 text-xs">{label}</span>
      <span className="text-neutral-200 text-xs text-right min-w-0 break-words">{value ?? '—'}</span>
    </div>
  )
}

export function DeviceDetailDialog({
  device,
  branchId,
  now,
  onClose,
}: {
  device: ConnectedDevice | null
  branchId?: number | null
  now: number
  onClose: () => void
}) {
  const { data: events } = useDeviceEvents(device?.id ?? null)
  // Para mostrar periféricos asociados a este kiosko.
  const { data: allDevices } = useConnectedDevices(branchId)
  const peripherals = (allDevices ?? []).filter(d => d.parent_device_id === device?.id)

  if (!device) return null
  const meta = deviceTypeMeta(device.type)

  return (
    <Dialog open={device !== null} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DeviceTypeIcon type={device.type} size={44} />
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{device.name}</DialogTitle>
              <p className="text-neutral-500 text-xs">{meta.label} · {moduleLabel(device.module)}</p>
            </div>
            <div className="ml-auto"><DeviceStatusBadge status={device.status} /></div>
          </div>
        </DialogHeader>

        <p className="text-neutral-400 text-xs -mt-2">{presenceLabel(device, now)}</p>

        {/* Información general */}
        <section className="rounded-lg border border-white/10 divide-y divide-white/5 px-3">
          <Row label="Establecimiento" value={device.branch_name ?? `#${device.branch_id}`} />
          <Row label="ID único" value={<span className="font-mono">{device.unique_device_id.slice(-16)}</span>} />
          <Row label="Usuario / rol" value={device.user_name ? `${device.user_name}${device.role ? ` · ${device.role}` : ''}` : '—'} />
          <Row label="IP local" value={device.ip_address} />
          <Row label="SO / navegador" value={[device.os, device.browser].filter(Boolean).join(' · ') || '—'} />
          <Row label="Versión app" value={device.app_version} />
          <Row label="Versión kiosko" value={device.kiosk_version} />
          <Row label="Última conexión" value={fmt(device.connected_at)} />
          <Row label="Último heartbeat" value={fmt(device.last_heartbeat_at)} />
          <Row label="Última actividad" value={fmt(device.last_activity_at)} />
          {device.serial_number && <Row label="N.º de serie" value={device.serial_number} />}
          {device.model && <Row label="Modelo" value={device.model} />}
          {device.notes && <Row label="Notas" value={device.notes} />}
        </section>

        {/* Periféricos asociados */}
        {peripherals.length > 0 && (
          <section>
            <h4 className="text-neutral-400 text-xs font-medium mb-2">Periféricos asociados</h4>
            <div className="space-y-1.5">
              {peripherals.map(p => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <DeviceTypeIcon type={p.type} size={28} />
                  <span className="text-sm text-neutral-200 flex-1 min-w-0 truncate">{p.name}</span>
                  <DeviceStatusBadge status={p.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Historial de eventos */}
        <section>
          <h4 className="text-neutral-400 text-xs font-medium mb-2">Historial reciente</h4>
          {!events || events.length === 0 ? (
            <p className="text-neutral-600 text-xs">Sin eventos registrados.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {events.map(e => (
                <div key={e.id} className="flex items-start gap-2 text-xs">
                  <span className="text-neutral-600 tabular-nums whitespace-nowrap">{fmt(e.created_at).split('·')[1]?.trim() ?? ''}</span>
                  <span className="text-neutral-300 min-w-0">{e.message || e.type}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}
