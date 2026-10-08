'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { Usb, Unplug } from 'lucide-react'
import { createElement } from 'react'

// Vigila conexión/desconexión de dispositivos USB (USB-A o USB-C; el conector
// es indistinto para WebUSB) y muestra un toast desde cualquier página.
//
// Nota: por privacidad, el navegador solo emite estos eventos para dispositivos
// a los que este sitio ya tiene permiso (p. ej. la impresora vinculada). Los
// eventos llegan igual en Chrome/Brave/Edge sobre Windows, macOS, Linux y
// Android. iOS no expone WebUSB, así que ahí no aplica.

interface USBDeviceLike {
  productName?: string
  manufacturerName?: string
  vendorId: number
  productId: number
}
interface USBConnectionEvent extends Event {
  device: USBDeviceLike
}
interface USBLike {
  addEventListener(type: 'connect' | 'disconnect', listener: (e: USBConnectionEvent) => void): void
  removeEventListener(type: 'connect' | 'disconnect', listener: (e: USBConnectionEvent) => void): void
}

function deviceLabel(d: USBDeviceLike): string {
  if (d.productName) return d.productName
  const vid = d.vendorId.toString(16).padStart(4, '0')
  const pid = d.productId.toString(16).padStart(4, '0')
  return `Dispositivo USB (${vid}:${pid})`
}

export function UsbDeviceWatcher() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const usb = (navigator as unknown as { usb?: USBLike }).usb
    if (!usb) return

    const onConnect = (e: USBConnectionEvent) => {
      toast.success(`USB conectado: ${deviceLabel(e.device)}`, {
        icon: createElement(Usb, { className: 'h-4 w-4' }),
      })
    }
    const onDisconnect = (e: USBConnectionEvent) => {
      toast(`USB desconectado: ${deviceLabel(e.device)}`, {
        icon: createElement(Unplug, { className: 'h-4 w-4' }),
      })
    }

    usb.addEventListener('connect', onConnect)
    usb.addEventListener('disconnect', onDisconnect)
    return () => {
      usb.removeEventListener('connect', onConnect)
      usb.removeEventListener('disconnect', onDisconnect)
    }
  }, [])

  return null
}
