/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Constantes centralizadas: intervalos de heartbeat, umbrales de estado y
 * metadatos de presentación (iconos, etiquetas, colores) por tipo/estado/módulo.
 *
 * IMPORTANTE: los umbrales de segundos deben coincidir con las constantes PHP
 * en php-backend/routes/device_monitor.php (DM_IDLE_AFTER_SECONDS, etc.).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  Monitor, Tablet, ChefHat, Calculator, ScanBarcode, Printer, CreditCard,
  Cpu, Laptop, Smartphone, HelpCircle, type LucideIcon,
} from 'lucide-react'
import type { DeviceType, DeviceStatus, DeviceModule } from './types'

// ── Tiempos (ms / s) — fuente única de verdad del lado cliente ─────────────────
/** Cada cuánto el dispositivo envía heartbeat (12 s → ventana 10-15 s). */
export const HEARTBEAT_INTERVAL_MS = 12_000
/** Sin actividad por más de esto → idle. */
export const IDLE_AFTER_MS = 60_000
/** Sin heartbeat por más de esto → offline. */
export const OFFLINE_AFTER_MS = 120_000
/** Cada cuánto el panel del superadmin refresca la lista (polling "tiempo real"). */
export const MONITOR_POLL_MS = 10_000
/** Historial máximo de eventos por dispositivo (coincide con backend). */
export const EVENTS_PER_DEVICE_MAX = 50

// ── Tipos de dispositivo ───────────────────────────────────────────────────────
export interface DeviceTypeMeta {
  label: string
  Icon: LucideIcon
  /** Tinte del icono. */
  tint: string
}

export const DEVICE_TYPE_META: Record<DeviceType, DeviceTypeMeta> = {
  kiosk:          { label: 'Kiosko',                Icon: Monitor,     tint: 'text-indigo-300' },
  waiter_tablet:  { label: 'Tablet Mesero',         Icon: Tablet,      tint: 'text-purple-300' },
  kitchen_screen: { label: 'Pantalla Cocina',       Icon: ChefHat,     tint: 'text-amber-300' },
  cash_register:  { label: 'Caja registradora',     Icon: Calculator,  tint: 'text-emerald-300' },
  barcode_scanner:{ label: 'Lector de código',      Icon: ScanBarcode, tint: 'text-cyan-300' },
  thermal_printer:{ label: 'Impresora térmica',     Icon: Printer,     tint: 'text-neutral-300' },
  pos_terminal:   { label: 'Terminal POS',          Icon: CreditCard,  tint: 'text-blue-300' },
  pos_8360:       { label: 'POS-8360',              Icon: Cpu,         tint: 'text-rose-300' },
  admin_computer: { label: 'Computadora Admin',     Icon: Laptop,      tint: 'text-sky-300' },
  mobile:         { label: 'Celular',               Icon: Smartphone,  tint: 'text-teal-300' },
  unknown:        { label: 'Dispositivo desconocido', Icon: HelpCircle, tint: 'text-neutral-400' },
}

export const DEVICE_TYPE_ORDER: DeviceType[] = [
  'kiosk', 'waiter_tablet', 'kitchen_screen', 'cash_register', 'barcode_scanner',
  'thermal_printer', 'pos_terminal', 'pos_8360', 'admin_computer', 'mobile', 'unknown',
]

export function deviceTypeMeta(type: DeviceType): DeviceTypeMeta {
  return DEVICE_TYPE_META[type] ?? DEVICE_TYPE_META.unknown
}

// ── Estados ────────────────────────────────────────────────────────────────────
export interface DeviceStatusMeta {
  label: string
  /** Color del punto (bg-*). */
  dot: string
  /** Clases del pill/badge. */
  pill: string
  /** ¿Pulsar el punto? (online). */
  pulse?: boolean
}

export const DEVICE_STATUS_META: Record<DeviceStatus, DeviceStatusMeta> = {
  online:  { label: 'Online',      dot: 'bg-emerald-400', pill: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20', pulse: true },
  idle:    { label: 'Inactivo',    dot: 'bg-amber-400',   pill: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  offline: { label: 'Offline',     dot: 'bg-red-400',     pill: 'bg-red-400/10 text-red-300 border-red-400/20' },
  error:   { label: 'Error',       dot: 'bg-amber-400',  pill: 'bg-amber-400/10 text-yellow-400 border-amber-400/20', pulse: true },
  in_test: { label: 'En prueba',   dot: 'bg-blue-400',    pill: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  unknown: { label: 'Desconocido', dot: 'bg-neutral-500', pill: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
}

export function deviceStatusMeta(status: DeviceStatus): DeviceStatusMeta {
  return DEVICE_STATUS_META[status] ?? DEVICE_STATUS_META.unknown
}

// ── Módulos ────────────────────────────────────────────────────────────────────
export const DEVICE_MODULE_META: Record<DeviceModule, { label: string }> = {
  superadmin: { label: 'Superadmin' },
  admin:      { label: 'Admin' },
  kiosk:      { label: 'Kiosko' },
  waiter:     { label: 'Mesero' },
  kitchen:    { label: 'Cocina' },
  pos:        { label: 'POS / Caja' },
  unknown:    { label: 'Desconocido' },
}

export function moduleLabel(module: DeviceModule): string {
  return (DEVICE_MODULE_META[module] ?? DEVICE_MODULE_META.unknown).label
}
