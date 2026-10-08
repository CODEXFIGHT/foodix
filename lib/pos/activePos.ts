/**
 * FoodIX — POS activo del dispositivo.
 *
 * Identifica bajo qué POS lógico opera esta terminal. Se envía al backend en
 * cada petición crítica (header `X-Pos-Id`) para resolver el turno de caja
 * correcto. Solo es UX/identificación: la fuente de verdad del turno vive en
 * el backend (tabla cash_sessions).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

const POS_KEY = 'restauros_pos_id'

/** POS por defecto cuando no hay configuración (establecimiento de POS único). */
export const DEFAULT_POS_ID = 1

/** POS activo de esta terminal (1 si no hay nada guardado). */
export function getActivePosId(): number {
  if (typeof window === 'undefined') return DEFAULT_POS_ID
  const raw = window.localStorage.getItem(POS_KEY)
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POS_ID
}

/** Fija el POS activo de esta terminal (p. ej. al elegir "POS Caliente/Frío"). */
export function setActivePosId(posId: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(posId) || posId <= 0) return
  window.localStorage.setItem(POS_KEY, String(posId))
}
