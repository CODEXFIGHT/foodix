'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Store de configuración e impresión de tickets.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PaperWidth } from '@/lib/printing/escpos'

// La config de impresora es POR DISPOSITIVO (cada caja tiene su propia
// impresora/cajón), por eso vive en localStorage y no se sincroniza al server.

// 'auto' elige la mejor conexión disponible y cae a otras si falla.
export type PrinterMode = 'off' | 'auto' | 'usb' | 'bluetooth' | 'network' | 'browser'

export interface PrinterConfig {
  mode: PrinterMode
  paperWidth: PaperWidth
  // Red (socket crudo 9100 vía API PHP)
  networkIp: string
  networkPort: number
  // Agente local: puente en la PC de caja para alcanzar la impresora de red
  // cuando el backend está hospedado fuera de la LAN. El navegador habla a
  // http://127.0.0.1:<agentPort> y el agente abre el socket a la impresora.
  useLocalAgent: boolean
  agentPort: number
  // USB (WebUSB) — se recuerda el dispositivo concedido
  usbVendorId: number | null
  usbProductId: number | null
  // Bluetooth (Web Bluetooth) — se recuerda por id/nombre del dispositivo
  btDeviceId: string | null
  btDeviceName: string | null
  // Comportamiento
  openDrawerOnSale: boolean // abrir cajón al cobrar
  printOnSale: boolean // imprimir ticket al crear pedido
  copies: number
}

const DEFAULT: PrinterConfig = {
  mode: 'off',
  paperWidth: 80,
  networkIp: '',
  networkPort: 9100,
  useLocalAgent: false,
  agentPort: 9110,
  usbVendorId: null,
  usbProductId: null,
  btDeviceId: null,
  btDeviceName: null,
  openDrawerOnSale: true,
  printOnSale: true,
  copies: 1,
}

interface PrinterStore {
  config: PrinterConfig
  setConfig: (updates: Partial<PrinterConfig>) => void
  reset: () => void
}

export const usePrinterStore = create<PrinterStore>()(
  persist(
    (set) => ({
      config: DEFAULT,
      setConfig: (updates) =>
        set((s) => ({ config: { ...s.config, ...updates } })),
      reset: () => set({ config: DEFAULT }),
    }),
    { name: 'restauros_printer' },
  ),
)
