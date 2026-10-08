/**
 * FoodIX — Configuración de POS por establecimiento.
 *
 * Permite que el Superadmin defina cuántos POS tiene cada establecimiento
 * (1 o 2) y deriva de ahí cómo se organiza la operación Caliente/Frío en
 * Cocina/KDS, Admin y Mesero.
 *
 * - 1 POS  → flujo unificado: un solo POS lógico con secciones Caliente/Frío.
 * - 2 POS  → dos estaciones operativas separadas: POS Caliente y POS Frío.
 *
 * Persistencia:
 * - Modo real  → key `restauros_pos_config` (mapa establecimiento → POS).
 * - Modo demo  → key `restauros_demo_pos_config` (namespace demo aislado).
 *
 * Tiempo real:
 * - Entre pestañas usa BroadcastChannel + evento `storage`.
 * - Emite el evento DOM `restauros-pos-config-updated` (modo demo / local).
 * - En backend real el evento de socket equivalente es
 *   `establishment_pos_config_updated`.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useSyncExternalStore } from 'react'
import type { PosCount, PreparationArea, StationType } from '@/lib/types'

export type KitchenViewMode = 'unified' | 'split'

/** POS por defecto cuando un establecimiento no tiene configuración guardada. */
export const DEFAULT_POS_COUNT: PosCount = 1

/** Id de establecimiento usado por el entorno demo (sesión única). */
export const DEMO_ESTABLISHMENT_ID = 'demo'

const REAL_KEY = 'restauros_pos_config'
const DEMO_KEY = 'restauros_demo_pos_config'
const DEMO_SESSION_KEY = 'restauros_demo_session'
const CHANNEL_NAME = 'restauros_pos_config_rt'

/** Evento DOM que se emite en cada cambio (modo demo / estado local). */
export const POS_CONFIG_EVENT = 'restauros-pos-config-updated'
/** Evento de socket equivalente para el backend real. */
export const POS_CONFIG_SOCKET_EVENT = 'establishment_pos_config_updated'

/**
 * Evento DOM/socket que señala que un ítem cambió de área de preparación
 * (Caliente ↔ Frío) y la Cocina/KDS debe reubicarlo sin recargar la pantalla.
 * Lo escucha el panel de Cocina para refrescar al instante; las vistas que ya
 * son reactivas (polling/stores) se reubican solas.
 */
export const KITCHEN_AREA_EVENT = 'restauros-kitchen-area-updated'

/** Notifica a la Cocina que un ítem cambió de área de preparación. */
export function emitKitchenAreaUpdated(detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(KITCHEN_AREA_EVENT, { detail }))
}

type ConfigMap = Record<string, PosCount>

interface PosConfigOptions {
  /** Fuerza el espacio de almacenamiento (demo vs real). Si se omite, se
   *  autodetecta según haya o no una sesión demo en la pestaña. */
  demo?: boolean
}

// ───────────────────────── Detección de modo demo ─────────────────────────

/** ¿Hay una sesión demo activa en esta pestaña? (sin efectos secundarios). */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false
  try {
    return window.sessionStorage.getItem(DEMO_SESSION_KEY) != null
  } catch {
    return false
  }
}

function keyFor(demo: boolean): string {
  return demo ? DEMO_KEY : REAL_KEY
}

// ───────────────────────── Almacenamiento + caché ─────────────────────────

const cache: { real: ConfigMap | null; demo: ConfigMap | null } = { real: null, demo: null }

function readMap(key: string): ConfigMap {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ConfigMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function getMap(demo: boolean): ConfigMap {
  const slot = demo ? 'demo' : 'real'
  if (cache[slot] == null) cache[slot] = readMap(keyFor(demo))
  return cache[slot] as ConfigMap
}

function writeMap(demo: boolean, map: ConfigMap): void {
  cache[demo ? 'demo' : 'real'] = map
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(keyFor(demo), JSON.stringify(map))
  } catch {
    /* cuota llena / modo privado: la config vive en memoria */
  }
}

function invalidate(demo: boolean): void {
  cache[demo ? 'demo' : 'real'] = null
}

// ───────────────────────── Realtime (cross-tab) ────────────────────────────

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

const listeners = new Set<() => void>()
function emit(): void {
  listeners.forEach(l => l())
}

function broadcast(detail: { establishmentId: string; posCount: PosCount; demo: boolean }): void {
  // 1) Otras pestañas vía BroadcastChannel.
  try { getChannel()?.postMessage(detail) } catch { /* canal cerrado */ }
  // 2) Esta pestaña vía evento DOM (consumible fuera de React).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(POS_CONFIG_EVENT, { detail }))
  }
}

// ───────────────────────── API pública (CRUD) ──────────────────────────────

/** Lee la cantidad de POS de un establecimiento (1 por defecto). */
export function getEstablishmentPOSConfig(
  establishmentId: number | string | null,
  options: PosConfigOptions = {},
): PosCount {
  if (establishmentId == null) return DEFAULT_POS_COUNT
  const demo = options.demo ?? isDemoMode()
  const map = getMap(demo)
  return map[String(establishmentId)] ?? DEFAULT_POS_COUNT
}

/** Actualiza la cantidad de POS de un establecimiento y notifica en tiempo real. */
export function updateEstablishmentPOSConfig(
  establishmentId: number | string,
  posCount: PosCount,
  options: PosConfigOptions = {},
): void {
  const demo = options.demo ?? isDemoMode()
  const id = String(establishmentId)
  const current = getMap(demo)
  if (current[id] === posCount) return
  const next: ConfigMap = { ...current, [id]: posCount }
  writeMap(demo, next)
  broadcast({ establishmentId: id, posCount, demo })
  emit()
}

// ───────────────────────── Derivaciones de dominio ─────────────────────────

/** Modo de vista de Cocina/KDS según la cantidad de POS. */
export function getKitchenViewMode(posCount: PosCount): KitchenViewMode {
  return posCount === 2 ? 'split' : 'unified'
}

/** Resuelve el área de preparación de un producto/ítem. `both`/null → Caliente. */
export function resolvePreparationArea(station?: StationType | PreparationArea | null): PreparationArea {
  return station === 'cold' ? 'cold' : 'hot'
}

/** Divide una lista de ítems en sus áreas Caliente / Frío respetando el orden. */
export function splitOrderItemsByPreparationArea<
  T extends { station?: StationType | PreparationArea | null },
>(orderItems: T[]): { hot: T[]; cold: T[] } {
  const hot: T[] = []
  const cold: T[] = []
  for (const item of orderItems) {
    if (resolvePreparationArea(item.station ?? null) === 'cold') cold.push(item)
    else hot.push(item)
  }
  return { hot, cold }
}

// ───────────────────────── Store reactivo (React) ──────────────────────────

let subscribersAttached = false
function ensureSubscriptions(): void {
  if (subscribersAttached || typeof window === 'undefined') return
  subscribersAttached = true

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === REAL_KEY) { invalidate(false); emit() }
    else if (e.key === DEMO_KEY) { invalidate(true); emit() }
  })

  const ch = getChannel()
  ch?.addEventListener('message', (e: MessageEvent<{ demo: boolean }>) => {
    invalidate(!!e.data?.demo)
    emit()
  })
}

function subscribe(listener: () => void): () => void {
  ensureSubscriptions()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export interface UsePOSConfigResult {
  posCount: PosCount
  viewMode: KitchenViewMode
  isDemo: boolean
  setPosCount: (posCount: PosCount) => void
}

/**
 * Hook reactivo de configuración de POS para un establecimiento.
 * Se re-renderiza al instante cuando cambia la config (incluso desde otra
 * pestaña/rol), sin recargar la página.
 */
export function usePOSConfig(
  establishmentId: number | string | null,
  options: PosConfigOptions = {},
): UsePOSConfigResult {
  const demo = options.demo ?? isDemoMode()

  const posCount = useSyncExternalStore(
    subscribe,
    () => getEstablishmentPOSConfig(establishmentId, { demo }),
    () => DEFAULT_POS_COUNT,
  )

  return {
    posCount,
    viewMode: getKitchenViewMode(posCount),
    isDemo: demo,
    setPosCount: (next: PosCount) => {
      if (establishmentId == null) return
      updateEstablishmentPOSConfig(establishmentId, next, { demo })
    },
  }
}
