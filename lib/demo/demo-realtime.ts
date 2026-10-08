/**
 * FoodIX — Modo Demo
 * Sincronización local en "tiempo real" entre pestañas (Admin / Mesero / Cocina).
 * Usa BroadcastChannel cuando está disponible y cae a eventos `storage`.
 * No usa WebSocket real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { DemoSlice } from './demo-types'

const CHANNEL_NAME = 'restauros_demo_rt'

export interface DemoBroadcast {
  /** Slice que cambió. */
  slice: DemoSlice
  /** Id de origen para ignorar el propio eco. */
  origin: string
  ts: number
}

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Notifica a otras pestañas que una slice cambió. */
export function broadcastChange(slice: DemoSlice, origin: string): void {
  const ch = getChannel()
  if (!ch) return
  const msg: DemoBroadcast = { slice, origin, ts: Date.now() }
  try {
    ch.postMessage(msg)
  } catch {
    /* canal cerrado */
  }
}

/** Suscribe a cambios de otras pestañas. Devuelve función de limpieza. */
export function subscribeBroadcast(handler: (msg: DemoBroadcast) => void): () => void {
  const ch = getChannel()
  if (!ch) return () => {}
  const listener = (e: MessageEvent<DemoBroadcast>) => handler(e.data)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}
