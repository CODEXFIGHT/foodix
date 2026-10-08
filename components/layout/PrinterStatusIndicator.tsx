'use client'

/**
 * Indicador permanente del estado de la impresora/cajón en el Topbar.
 *
 * Para USB refleja el estado EN VIVO del dispositivo vinculado usando WebUSB
 * (navigator.usb.getDevices + eventos connect/disconnect). Para Bluetooth, Red
 * y Navegador muestra el estado configurado (esos transportes no se pueden
 * sondear de forma barata sin abrir conexión). El lector de códigos de barras
 * NO aparece aquí: es un teclado HID invisible para el navegador.
 *
 * Solo el administrador puede tocar la configuración → el chip lo lleva a
 * Ajustes; para el mesero es un indicador informativo (su rol no entra a /settings).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Usb, Wifi, Bluetooth, Monitor } from 'lucide-react'
import { usePrinterStore } from '@/lib/stores/printerStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils/cn'

interface USBDeviceLike { vendorId: number; productId: number }
interface USBLike {
  getDevices(): Promise<USBDeviceLike[]>
  addEventListener(t: 'connect' | 'disconnect', l: () => void): void
  removeEventListener(t: 'connect' | 'disconnect', l: () => void): void
}
function getUsb(): USBLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as unknown as { usb?: USBLike }).usb ?? null
}

type Status = 'connected' | 'ready' | 'idle' | 'off'

export function PrinterStatusIndicator() {
  const cfg = usePrinterStore(s => s.config)
  const role = useAuthStore(s => s.user?.role)
  const router = useRouter()
  const [usbPresent, setUsbPresent] = useState(false)

  const usbMode = cfg.mode === 'usb' || (cfg.mode === 'auto' && cfg.usbVendorId !== null)

  // Presencia EN VIVO de la impresora USB vinculada.
  useEffect(() => {
    if (!usbMode || cfg.usbVendorId === null) { setUsbPresent(false); return }
    const usb = getUsb()
    if (!usb) { setUsbPresent(false); return }

    let active = true
    const check = () => {
      usb.getDevices()
        .then(devices => {
          const found = devices.some(d => d.vendorId === cfg.usbVendorId && d.productId === cfg.usbProductId)
          if (active) setUsbPresent(found)
        })
        .catch(() => { if (active) setUsbPresent(false) })
    }

    check()
    usb.addEventListener('connect', check)
    usb.addEventListener('disconnect', check)
    return () => {
      active = false
      usb.removeEventListener('connect', check)
      usb.removeEventListener('disconnect', check)
    }
  }, [usbMode, cfg.usbVendorId, cfg.usbProductId])

  let status: Status = 'off'
  let label = 'Sin impresora'
  let Icon = Printer

  if (cfg.mode === 'off') {
    status = 'off'; label = 'Impresora off'; Icon = Printer
  } else if (usbMode) {
    Icon = Usb
    if (cfg.usbVendorId === null) { status = 'idle'; label = 'USB sin vincular' }
    else if (usbPresent)          { status = 'connected'; label = 'Impresora USB' }
    else                          { status = 'idle'; label = 'USB desconectada' }
  } else if (cfg.mode === 'bluetooth' || (cfg.mode === 'auto' && cfg.btDeviceId)) {
    Icon = Bluetooth
    status = cfg.btDeviceId ? 'ready' : 'idle'
    label = cfg.btDeviceId ? (cfg.btDeviceName ?? 'Bluetooth') : 'BT sin vincular'
  } else if (cfg.mode === 'network' || (cfg.mode === 'auto' && cfg.networkIp)) {
    Icon = Wifi
    status = cfg.networkIp ? 'ready' : 'idle'
    label = cfg.networkIp ? `Red ${cfg.networkIp}` : 'Red sin IP'
  } else if (cfg.mode === 'browser') {
    Icon = Monitor; status = 'ready'; label = 'Navegador'
  } else {
    Icon = Printer; status = 'idle'; label = 'Auto'
  }

  const dot =
    status === 'connected' ? 'bg-green-500' :
    status === 'ready'     ? 'bg-emerald-400' :
    status === 'idle'      ? 'bg-amber-400' :
    'bg-stone-300'

  const isAdmin = role === 'admin'

  const content = (
    <span
      className={cn(
        'flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-medium text-muted-foreground',
        isAdmin && 'hover:bg-muted transition-colors',
      )}
      title={`Impresora y cajón: ${label}${isAdmin ? ' · clic para configurar' : ''}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline max-w-[130px] truncate">{label}</span>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />
    </span>
  )

  if (isAdmin) {
    return (
      <button type="button" onClick={() => router.push('/settings')} className="cursor-pointer">
        {content}
      </button>
    )
  }
  return content
}
