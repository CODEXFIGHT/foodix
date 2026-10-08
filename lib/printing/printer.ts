'use client'

import { apiRequest } from '@/lib/api/client'
import {
  buildReceipt,
  buildDrawerKick,
  buildTestReceipt,
  buildKitchenTicket,
  type ReceiptData,
  type KitchenTicketData,
} from './escpos'
import { buildReceiptHtml } from './receiptHtml'
import { rasterizeLogoToEscPos } from './logoRaster'
import { isNativeApp, nativePrintRaw, nativeOpenDrawer } from './nativeBridge'
import type { PrinterConfig } from '@/lib/stores/printerStore'

// ─── Detección de capacidades por navegador/SO ──────────────────────────────
// Importante: iOS/iPadOS bloquea WebUSB y Web Bluetooth en TODOS los navegadores
// (Chrome/Brave en iOS usan WebKit obligatoriamente). Ahí solo queda el diálogo
// de impresión del sistema (AirPrint). Esto es un límite de Apple, no del código.

export interface PrinterCapabilities {
  webusb: boolean
  webbluetooth: boolean
  isIOS: boolean
  isAndroid: boolean
}

export function getPrinterCapabilities(): PrinterCapabilities {
  if (typeof navigator === 'undefined') {
    return { webusb: false, webbluetooth: false, isIOS: false, isAndroid: false }
  }
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS se reporta como Mac con pantalla táctil
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)
  const isAndroid = /Android/.test(ua)
  return {
    webusb: 'usb' in navigator && !isIOS,
    webbluetooth: 'bluetooth' in navigator && !isIOS,
    isIOS,
    isAndroid,
  }
}

// ─── WebUSB (impresora por USB-A o USB-C; el conector da igual) ──────────────
// Funciona en Chrome/Brave/Edge sobre Windows, macOS, Linux y Android (con OTG).

interface USBEndpoint { direction: string; endpointNumber: number; type: string; packetSize?: number }
interface USBAlternate { endpoints: USBEndpoint[]; interfaceClass?: number }
interface USBInterface { interfaceNumber: number; alternate: USBAlternate }
interface USBOutTransferResult { status?: string; bytesWritten?: number }
interface USBLikeDevice {
  vendorId: number
  productId: number
  opened?: boolean
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(n: number): Promise<void>
  claimInterface(n: number): Promise<void>
  selectAlternateInterface?(iface: number, alternate: number): Promise<void>
  clearHalt?(direction: 'in' | 'out', endpoint: number): Promise<void>
  transferOut(endpoint: number, data: BufferSource): Promise<USBOutTransferResult>
  configuration: { configurationValue?: number; interfaces: USBInterface[] } | null
  configurations?: { configurationValue: number }[]
}
interface USBLike {
  requestDevice(opts: { filters: { vendorId?: number }[] }): Promise<USBLikeDevice>
  getDevices(): Promise<USBLikeDevice[]>
}

function usb(): USBLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as unknown as { usb?: USBLike }).usb ?? null
}

export function isWebUsbSupported(): boolean {
  return getPrinterCapabilities().webusb
}

export async function requestUsbPrinter(): Promise<{ vendorId: number; productId: number }> {
  const u = usb()
  if (!u) throw new Error('Este navegador/dispositivo no soporta WebUSB (en iPhone/iPad no es posible).')
  const device = await u.requestDevice({ filters: [] })
  return { vendorId: device.vendorId, productId: device.productId }
}

async function findRememberedUsb(cfg: PrinterConfig): Promise<USBLikeDevice | null> {
  const u = usb()
  if (!u || cfg.usbVendorId === null) return null
  const devices = await u.getDevices()
  return devices.find(d => d.vendorId === cfg.usbVendorId && d.productId === cfg.usbProductId) ?? null
}

async function sendViaUsb(data: Uint8Array, cfg: PrinterConfig): Promise<void> {
  const device = await findRememberedUsb(cfg)
  if (!device) throw new Error('Impresora USB no encontrada. Vuelve a vincularla en Ajustes.')

  if (!device.opened) await device.open()

  // No asumir configurationValue === 1: algunas POS-8360 enumeran con otro valor.
  if (!device.configuration) {
    const value = device.configurations?.[0]?.configurationValue ?? 1
    await device.selectConfiguration(value)
  }

  // Prefiere la interfaz de clase "Printer" (7); si no, cualquiera con bulk OUT.
  const interfaces = device.configuration?.interfaces ?? []
  const printerIface =
    interfaces.find(i => i.alternate.interfaceClass === 7 &&
      i.alternate.endpoints.some(e => e.direction === 'out' && e.type === 'bulk')) ??
    interfaces.find(i => i.alternate.endpoints.some(e => e.direction === 'out' && e.type === 'bulk'))

  if (!printerIface) throw new Error('La impresora USB no expone un endpoint de salida.')
  const endpoint = printerIface.alternate.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')!

  await device.claimInterface(printerIface.interfaceNumber)
  // Activa el alternate setting 0 de la interfaz: algunas POS-8360 no aceptan
  // datos hasta que el endpoint queda explícitamente seleccionado.
  try { await device.selectAlternateInterface?.(printerIface.interfaceNumber, 0) } catch { /* opcional */ }

  // CLAVE para "detecta pero no imprime": tras el claim, la POS-8360 suele dejar
  // el endpoint bulk en estado HALT (stall) si una sesión previa quedó a medias.
  // En ese estado el navegador "envía" pero la impresora DESCARTA todo. Limpiar
  // el halt antes de escribir evita que el ticket se pierda en silencio.
  try { await device.clearHalt?.('out', endpoint.endpointNumber) } catch { /* no soportado: seguimos */ }

  // WebUSB ya segmenta en paquetes del tamaño del endpoint, así que enviamos en
  // bloques grandes (más rápido y fiable que trocear a 64 bytes en full-speed).
  const chunk = 4096
  for (let i = 0; i < data.length; i += chunk) {
    const slice = new Uint8Array(data.subarray(i, i + chunk)) as unknown as BufferSource
    let result = await device.transferOut(endpoint.endpointNumber, slice)
    // Si el endpoint hace stall a mitad del envío, lo limpiamos y reintentamos
    // una vez ese bloque; si no, el resto del ticket no se imprimiría.
    if (result?.status === 'stall') {
      await device.clearHalt?.('out', endpoint.endpointNumber)
      result = await device.transferOut(endpoint.endpointNumber, slice)
    }
    if (result?.status && result.status !== 'ok') {
      throw new Error(`La impresora rechazó los datos (estado USB: ${result.status}).`)
    }
  }
  // No cerramos: mantener abierto acelera impresiones siguientes.
}

// ─── Web Bluetooth (impresora térmica BLE; ideal para tablets Android) ───────
// Chrome/Brave en Windows, macOS, Linux y Android. NO disponible en iOS.

interface BTCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValue(data: BufferSource): Promise<void>
  writeValueWithoutResponse?(data: BufferSource): Promise<void>
}
interface BTService { getCharacteristics(): Promise<BTCharacteristic[]> }
interface BTServer { connected: boolean; connect(): Promise<BTServer>; getPrimaryServices(): Promise<BTService[]> }
interface BTDevice { id: string; name?: string; gatt?: BTServer }
interface BTLike {
  requestDevice(opts: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<BTDevice>
  getDevices?(): Promise<BTDevice[]>
}

// Servicios GATT de escritura usados por la mayoría de impresoras ESC/POS BLE.
const BT_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC/Microchip transparent UART
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
]

function bt(): BTLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as unknown as { bluetooth?: BTLike }).bluetooth ?? null
}

export function isWebBluetoothSupported(): boolean {
  return getPrinterCapabilities().webbluetooth
}

export async function requestBluetoothPrinter(): Promise<{ id: string; name: string }> {
  const b = bt()
  if (!b) throw new Error('Este navegador/dispositivo no soporta Web Bluetooth (en iPhone/iPad no es posible).')
  const device = await b.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES })
  return { id: device.id, name: device.name ?? 'Impresora Bluetooth' }
}

// Cache de la conexión BLE para no re-emparejar en cada impresión.
let btCache: { id: string; device: BTDevice; characteristic: BTCharacteristic } | null = null

async function resolveBtDevice(cfg: PrinterConfig): Promise<BTDevice> {
  const b = bt()
  if (!b) throw new Error('Bluetooth no disponible en este dispositivo.')
  if (btCache && btCache.id === cfg.btDeviceId) return btCache.device

  // Intenta reusar un dispositivo ya concedido.
  if (cfg.btDeviceId && b.getDevices) {
    const known = await b.getDevices()
    const match = known.find(d => d.id === cfg.btDeviceId)
    if (match) return match
  }
  // Si no, pide emparejar de nuevo.
  const device = await b.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES })
  return device
}

async function getBtCharacteristic(device: BTDevice): Promise<BTCharacteristic> {
  if (btCache && btCache.device === device && device.gatt?.connected) return btCache.characteristic
  if (!device.gatt) throw new Error('La impresora Bluetooth no expone GATT.')

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect()
  const services = await server.getPrimaryServices()
  for (const svc of services) {
    const chars = await svc.getCharacteristics()
    const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse)
    if (writable) {
      btCache = { id: device.id, device, characteristic: writable }
      return writable
    }
  }
  throw new Error('No se encontró una característica de escritura en la impresora Bluetooth.')
}

async function sendViaBluetooth(data: Uint8Array, cfg: PrinterConfig): Promise<void> {
  const device = await resolveBtDevice(cfg)
  const ch = await getBtCharacteristic(device)
  // BLE limita el tamaño por escritura; mandamos en bloques pequeños con pausa.
  const chunk = 180
  for (let i = 0; i < data.length; i += chunk) {
    const slice = new Uint8Array(data.subarray(i, i + chunk)) as unknown as BufferSource
    if (ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse) {
      await ch.writeValueWithoutResponse(slice)
    } else {
      await ch.writeValue(slice)
    }
    await new Promise(r => setTimeout(r, 18))
  }
}

// ─── Puente nativo (app FoodIX para Android — WebView Flutter) ───────────
// Dentro de la app Android, WebUSB/Web Bluetooth NO están disponibles en el
// System WebView. La app Flutter expone `window.FoodIXNative`, que imprime
// por USB ESC/POS (POS-8360 y genéricas) o por la impresora Sunmi de caja.
// Aquí solo le pasamos los bytes ya armados (escpos.ts) por `printRaw`.

interface FoodIXNativeBridge {
  isNative?: boolean
  printRaw: (bytes: number[]) => Promise<unknown>
  getDeviceInfo: () => Promise<unknown>
  usbStatus?: () => Promise<unknown>
  openUsbPrinterSettings?: () => Promise<unknown>
}

function nativeBridge(): FoodIXNativeBridge | null {
  if (typeof window === 'undefined') return null
  const b = (window as unknown as { FoodIXNative?: FoodIXNativeBridge }).FoodIXNative
  return b?.isNative ? b : null
}

/** ¿Corremos dentro de la app nativa FoodIX (Android)? */
export function isNativeBridge(): boolean {
  return nativeBridge() !== null
}

// Estado cacheado de la impresora nativa (USB/Sunmi) para decisiones síncronas.
let nativeHasPrinter = false

/** Refresca, desde el nativo, si hay una impresora física lista. */
export async function refreshNativePrinterStatus(): Promise<boolean> {
  const b = nativeBridge()
  if (!b) { nativeHasPrinter = false; return false }
  try {
    const info = (await b.getDeviceInfo()) as { hasPrinter?: boolean }
    nativeHasPrinter = info?.hasPrinter === true
  } catch {
    nativeHasPrinter = false
  }
  return nativeHasPrinter
}

/** Abre el selector nativo de impresora USB (solo dentro de la app Android). */
export async function openNativeUsbSettings(): Promise<void> {
  const b = nativeBridge()
  if (!b?.openUsbPrinterSettings) {
    throw new Error('Disponible solo en la app FoodIX para Android.')
  }
  await b.openUsbPrinterSettings()
  await refreshNativePrinterStatus()
}

async function sendViaNative(data: Uint8Array): Promise<void> {
  const b = nativeBridge()
  if (!b) throw new Error('Puente nativo no disponible.')
  const res = (await b.printRaw(Array.from(data))) as { ok?: boolean; error?: string }
  if (res && res.ok === false) {
    throw new Error(res.error || 'Error de impresión nativa.')
  }
}

// Mantiene fresco el estado al inyectarse el puente (evento de la app Flutter).
if (typeof window !== 'undefined') {
  window.addEventListener('restauros-native-ready', () => { void refreshNativePrinterStatus() })
  void refreshNativePrinterStatus()
}

// ─── Red (socket crudo 9100 vía agente local o API PHP) ─────────────────────

function toBase64(data: Uint8Array): string {
  let bin = ''
  for (const byte of data) bin += String.fromCharCode(byte)
  return btoa(bin)
}

async function sendViaNetwork(data: Uint8Array, cfg: PrinterConfig): Promise<void> {
  if (!cfg.networkIp) throw new Error('Falta la IP de la impresora de red.')
  const payload = { ip: cfg.networkIp, port: cfg.networkPort, data: toBase64(data) }

  if (cfg.useLocalAgent) {
    const res = await fetch(`http://127.0.0.1:${cfg.agentPort}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(err.message ?? 'El agente local no pudo imprimir.')
    }
    return
  }

  await apiRequest<{ ok: boolean }>('/print', { method: 'POST', body: JSON.stringify(payload) })
}

export async function pingAgent(agentPort: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${agentPort}/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

// ─── Browser (diálogo de impresión / AirPrint — funciona en TODO, incl. iOS) ─

function printHtmlReceipt(html: string): void {
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); throw new Error('No se pudo abrir el diálogo de impresión.') }
  doc.open(); doc.write(html); doc.close()
  setTimeout(() => iframe.remove(), 2000)
}

// ─── Resolución de transporte y envío de bytes ──────────────────────────────

type RawMode = 'native' | 'usb' | 'bluetooth' | 'network'

// Decide qué transporte de bytes usar según el modo y lo que esté configurado.
function resolveRawMode(cfg: PrinterConfig): RawMode | null {
  const caps = getPrinterCapabilities()
  // Dentro de la app Android: la impresora física se maneja por el puente
  // nativo (USB ESC/POS o Sunmi). Tiene prioridad salvo que el usuario haya
  // elegido explícitamente el diálogo del navegador.
  if (nativeHasPrinter && isNativeBridge() && cfg.mode !== 'browser') return 'native'
  if (cfg.mode === 'usb') return 'usb'
  if (cfg.mode === 'bluetooth') return 'bluetooth'
  if (cfg.mode === 'network') return 'network'
  if (cfg.mode === 'auto') {
    if (caps.webusb && cfg.usbVendorId !== null) return 'usb'
    if (caps.webbluetooth && cfg.btDeviceId) return 'bluetooth'
    if (cfg.networkIp) return 'network'
    return null // → browser
  }
  return null // off / browser
}

/** ¿Hay una impresora física (USB/Bluetooth/red) lista para imprimir sin diálogo? */
export function hasRawPrinter(cfg: PrinterConfig): boolean {
  return resolveRawMode(cfg) !== null
}

async function sendRaw(mode: RawMode, data: Uint8Array, cfg: PrinterConfig): Promise<void> {
  if (mode === 'native') return sendViaNative(data)
  if (mode === 'usb') return sendViaUsb(data, cfg)
  if (mode === 'bluetooth') return sendViaBluetooth(data, cfg)
  return sendViaNetwork(data, cfg)
}

export type PrintMethod = 'usb' | 'bluetooth' | 'network' | 'browser' | 'native'

/**
 * Imprime el ticket. Usa el transporte configurado y, si falla, cae al diálogo
 * del navegador para que SIEMPRE salga un ticket (incluido iOS vía AirPrint).
 */
export async function printReceipt(
  data: ReceiptData,
  cfg: PrinterConfig,
): Promise<{ method: PrintMethod }> {
  if (isNativeBridge()) await refreshNativePrinterStatus()

  // Rasteriza el logotipo a ESC/POS una sola vez para los caminos térmicos
  // (nativo y crudo). El modo navegador usa la imagen en el HTML.
  if (data.logo && !data.logoBytes) {
    const bytes = await rasterizeLogoToEscPos(data.logo, cfg.paperWidth)
    if (bytes) data.logoBytes = bytes
  }

  // App nativa (Sunmi/Android): imprime con el SDK del dispositivo reutilizando
  // el mismo formato ESC/POS del SaaS. Es el camino más confiable en tablets.
  if (isNativeApp()) {
    try {
      const bytes = buildReceipt(data, cfg.paperWidth)
      const copies = Math.max(1, cfg.copies)
      for (let i = 0; i < copies; i++) await nativePrintRaw(bytes)
      return { method: 'native' }
    } catch (err) {
      console.warn('[printer] fallo puente nativo → fallback:', err)
      // cae al flujo normal de abajo
    }
  }
  const raw = resolveRawMode(cfg)
  if (raw) {
    try {
      const bytes = buildReceipt(data, cfg.paperWidth)
      const copies = Math.max(1, cfg.copies)
      for (let i = 0; i < copies; i++) await sendRaw(raw, bytes, cfg)
      return { method: raw }
    } catch (err) {
      // En modo 'auto' caemos al diálogo del navegador (impresión universal).
      // Pero si el usuario eligió EXPLÍCITAMENTE un transporte físico (usb/
      // bluetooth/red), propagamos el error: en un kiosko el diálogo suele estar
      // bloqueado, así que un fallback silencioso haría creer que "sí imprimió"
      // y ocultaría la causa real (p.ej. endpoint USB en halt).
      if (cfg.mode === 'auto') {
        console.warn('[printer] fallo', raw, '→ fallback navegador:', err)
        printHtmlReceipt(buildReceiptHtml(data, cfg.paperWidth))
        return { method: 'browser' }
      }
      throw err
    }
  }
  printHtmlReceipt(buildReceiptHtml(data, cfg.paperWidth))
  return { method: 'browser' }
}

/**
 * Imprime una comanda de cocina (AGREGADO/CANCELAR) en la impresora física de la
 * estación. NO cae al diálogo del navegador: si no hay impresora cruda, lanza.
 */
export async function printKitchenTicket(
  data: KitchenTicketData,
  cfg: PrinterConfig,
): Promise<{ method: PrintMethod }> {
  if (isNativeBridge()) await refreshNativePrinterStatus()
  const raw = resolveRawMode(cfg)
  if (!raw) {
    throw new Error('La estación no tiene impresora configurada (USB/Bluetooth/red).')
  }
  const bytes = buildKitchenTicket(data, cfg.paperWidth)
  await sendRaw(raw, bytes, cfg)
  return { method: raw }
}

/** Abre el cajón (pulso a la impresora). Requiere USB, Bluetooth o red. */
export async function openCashDrawer(cfg: PrinterConfig): Promise<void> {
  if (isNativeBridge()) await refreshNativePrinterStatus()
  // App nativa (Sunmi): abre el cajón con el SDK del dispositivo.
  if (isNativeApp()) {
    const opened = await nativeOpenDrawer()
    if (opened) return
  }
  const raw = resolveRawMode(cfg)
  if (!raw) {
    throw new Error('El cajón requiere impresora por USB, Bluetooth o red. Configúrala en Ajustes.')
  }
  await sendRaw(raw, buildDrawerKick(), cfg)
}

/** Imprime un ticket de prueba con la configuración actual. */
export async function printTest(
  businessName: string,
  cfg: PrinterConfig,
): Promise<{ method: PrintMethod }> {
  if (isNativeBridge()) await refreshNativePrinterStatus()
  const raw = resolveRawMode(cfg)
  if (raw) {
    const bytes = buildTestReceipt(businessName, cfg.paperWidth)
    await sendRaw(raw, bytes, cfg)
    return { method: raw }
  }
  printHtmlReceipt(
    buildReceiptHtml(
      {
        businessName,
        slogan: 'Ticket de prueba',
        orderId: '0000',
        createdAt: new Date().toLocaleString('es-MX'),
        lines: [{ name: 'Producto de prueba', qty: 1, total: 0 }],
        subtotal: 0, tax: 0, taxRate: 16, total: 0,
      },
      cfg.paperWidth,
    ),
  )
  return { method: 'browser' }
}
