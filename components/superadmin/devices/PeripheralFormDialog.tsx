'use client'

/**
 * FoodIX — Device Center
 * Alta manual de periféricos y edición de nombre/tipo de un dispositivo.
 * Los periféricos (lectores, impresoras, cajas…) no siempre se autodetectan en
 * navegador, así que se registran/gestionan a mano y se asocian a un kiosko.
 */

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRegisterPeripheral, useUpdateConnectedDevice } from '@/lib/api/queries/deviceMonitor'
import { DEVICE_TYPE_META, DEVICE_TYPE_ORDER } from '@/lib/devices/constants'
import { PERIPHERAL_STATUSES } from '@/lib/devices/status'
import { deviceStatusMeta } from '@/lib/devices/constants'
import type { ConnectedDevice, DeviceStatus, DeviceType } from '@/lib/devices/types'

const fieldCls = 'w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/25'

// ── Alta manual de periférico ─────────────────────────────────────────────────
export function PeripheralFormDialog({
  open,
  onOpenChange,
  branchId,
  kiosks,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se fija, el periférico se crea en esa sucursal (vista por establecimiento). */
  branchId?: number | null
  /** Kioskos disponibles para asociar. */
  kiosks: ConnectedDevice[]
}) {
  const register = useRegisterPeripheral()
  const [form, setForm] = useState({
    name: '', type: 'barcode_scanner' as DeviceType, model: '', serial_number: '',
    parent_device_id: '', status: 'online' as DeviceStatus, notes: '',
  })

  const reset = () => setForm({
    name: '', type: 'barcode_scanner', model: '', serial_number: '',
    parent_device_id: '', status: 'online', notes: '',
  })

  const submit = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    try {
      await register.mutateAsync({
        name: form.name.trim(),
        type: form.type,
        model: form.model.trim() || undefined,
        serial_number: form.serial_number.trim() || undefined,
        parent_device_id: form.parent_device_id ? Number(form.parent_device_id) : null,
        status: form.status,
        notes: form.notes.trim() || undefined,
        ...(branchId ? { branch_id: branchId } : {}),
      })
      toast.success('Periférico registrado')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('No se pudo registrar el periférico')
    }
  }

  // Periféricos típicos (sin kioskos/pantallas).
  const peripheralTypes = DEVICE_TYPE_ORDER.filter(t =>
    ['barcode_scanner', 'thermal_printer', 'cash_register', 'pos_terminal', 'pos_8360', 'unknown'].includes(t))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar periférico</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Para hardware que no se detecta desde el navegador (lectores, impresoras, cajas, POS-8360).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-neutral-300 text-xs">Nombre del periférico</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Lector barra principal" className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-neutral-300 text-xs">Tipo</Label>
              <select className={fieldCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DeviceType }))}>
                {peripheralTypes.map(t => <option key={t} value={t}>{DEVICE_TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-neutral-300 text-xs">Estado inicial</Label>
              <select className={fieldCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DeviceStatus }))}>
                {PERIPHERAL_STATUSES.map(s => <option key={s} value={s}>{deviceStatusMeta(s).label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-neutral-300 text-xs">Modelo</Label>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="Honeywell / POS-8360" className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-neutral-300 text-xs">N.º de serie (opcional)</Label>
              <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-neutral-300 text-xs">Kiosko asociado (opcional)</Label>
            <select className={fieldCls} value={form.parent_device_id}
              onChange={e => setForm(f => ({ ...f, parent_device_id: e.target.value }))}>
              <option value="">Sin asociar</option>
              {kiosks.map(k => <option key={k.id} value={k.id}>{k.name}{k.branch_name ? ` · ${k.branch_name}` : ''}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-neutral-300 text-xs">Notas</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="bg-white/5 border-white/10 text-white resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/5"
            onClick={() => onOpenChange(false)} disabled={register.isPending}>Cancelar</Button>
          <Button className="bg-white hover:bg-neutral-200 text-black" onClick={submit} disabled={register.isPending}>
            {register.isPending ? 'Registrando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edición de nombre / tipo ──────────────────────────────────────────────────
export function EditDeviceDialog({
  device,
  onClose,
}: {
  device: ConnectedDevice | null
  onClose: () => void
}) {
  const update = useUpdateConnectedDevice()
  // El parent remonta con key={device.id}, por lo que el estado inicial siempre
  // refleja el dispositivo actual.
  const [name, setName] = useState(device?.name ?? '')
  const [type, setType] = useState<DeviceType>(device?.type ?? 'unknown')

  const submit = async () => {
    if (!device) return
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    try {
      await update.mutateAsync({ id: device.id, name: name.trim(), type })
      toast.success('Dispositivo actualizado')
      onClose()
    } catch {
      toast.error('No se pudo actualizar')
    }
  }

  return (
    <Dialog open={device !== null} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar dispositivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-neutral-300 text-xs">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-neutral-300 text-xs">Tipo</Label>
            <select className={fieldCls} value={type} onChange={e => setType(e.target.value as DeviceType)}>
              {DEVICE_TYPE_ORDER.map(t => <option key={t} value={t}>{DEVICE_TYPE_META[t].label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-white/5" onClick={onClose} disabled={update.isPending}>Cancelar</Button>
          <Button className="bg-white hover:bg-neutral-200 text-black" onClick={submit} disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
