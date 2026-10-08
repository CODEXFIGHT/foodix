/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Tipos del dominio. Las claves usan snake_case para coincidir 1:1 con la
 * respuesta del backend (igual que `Device`, `Branch`, etc.).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

export type DeviceType =
  | 'kiosk'
  | 'waiter_tablet'
  | 'kitchen_screen'
  | 'cash_register'
  | 'barcode_scanner'
  | 'thermal_printer'
  | 'pos_terminal'
  | 'pos_8360'
  | 'admin_computer'
  | 'mobile'
  | 'unknown'

/** `in_test` aplica a periféricos en prueba; se monitorea aparte de los 5 base. */
export type DeviceStatus =
  | 'online'
  | 'offline'
  | 'idle'
  | 'error'
  | 'unknown'
  | 'in_test'

export type DeviceModule =
  | 'superadmin'
  | 'admin'
  | 'kiosk'
  | 'waiter'
  | 'kitchen'
  | 'pos'
  | 'unknown'

export interface ConnectedDevice {
  id: number
  branch_id: number
  unique_device_id: string
  name: string
  type: DeviceType
  /** Estado EFECTIVO ya derivado por el backend (timestamps + estado persistido). */
  status: DeviceStatus
  module: DeviceModule
  is_peripheral: boolean
  parent_device_id: number | null
  model: string | null
  serial_number: string | null
  notes: string | null
  ip_address: string | null
  user_agent: string | null
  os: string | null
  browser: string | null
  app_version: string | null
  kiosk_version: string | null
  user_id: number | null
  user_name: string | null
  role: string | null
  metadata: Record<string, unknown> | null
  last_heartbeat_at: string | null
  last_activity_at: string | null
  connected_at: string | null
  disconnected_at: string | null
  created_at: string
  /** Solo en listados del superadmin. */
  branch_name?: string | null
  branch_logo_url?: string | null
}

export type DeviceEventType =
  | 'device_connected'
  | 'device_disconnected'
  | 'device_heartbeat'
  | 'device_idle'
  | 'device_error'
  | 'peripheral_registered'
  | 'peripheral_status_changed'
  | 'device_removed'
  | 'device_renamed'

export interface DeviceEvent {
  id: number
  device_id: number
  branch_id: number
  type: DeviceEventType
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Cuerpo del heartbeat que envían los módulos (kiosk/kitchen/admin/pos/…). */
export interface HeartbeatPayload {
  unique_device_id: string
  branch_id?: number
  name?: string
  type?: DeviceType
  module?: DeviceModule
  status?: 'error'
  activity?: boolean
  user_agent?: string
  os?: string
  browser?: string
  app_version?: string
  kiosk_version?: string
  user_id?: number | null
  user_name?: string | null
  role?: string | null
}
