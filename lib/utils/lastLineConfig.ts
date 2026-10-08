/**
 * FoodIX — Sistema de gestión para restaurantes
 * Memoria local de la última configuración usada por producto (modificadores,
 * extras y nota). Sirve para el atajo "Repetir última" del selector de
 * modificadores: el caso típico del salón es que el mismo platillo se pida una
 * y otra vez igual ("término medio, sin cebolla") y reconfigurarlo cuesta 4-5
 * toques cada vez.
 *
 * Vive en localStorage y es por dispositivo: es una comodidad, no un dato de
 * negocio. Si el almacenamiento falla (modo privado, cuota llena) se degrada en
 * silencio — nunca debe impedir tomar un pedido.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { ChosenModifier } from '@/lib/types'

const STORAGE_KEY = 'restauros:last-line-config'
/** Tope de productos recordados: evita que el registro crezca sin control. */
const MAX_ENTRIES = 60

export interface LastLineConfig {
  modifiers: ChosenModifier[]
  selectedModifiers: string[]
  notes: string
  /** Epoch ms del último uso: se usa para descartar los más viejos al podar. */
  savedAt: number
}

type ConfigMap = Record<string, LastLineConfig>

/** ¿La configuración tiene algo que valga la pena repetir? */
export function hasRepeatableConfig(config: LastLineConfig | null | undefined): config is LastLineConfig {
  if (!config) return false
  return config.modifiers.length > 0 || config.selectedModifiers.length > 0 || config.notes.trim().length > 0
}

function readAll(): ConfigMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as ConfigMap) : {}
  } catch {
    return {}
  }
}

export function readLastConfig(productId: number | null | undefined): LastLineConfig | null {
  if (productId == null) return null
  const entry = readAll()[String(productId)]
  return hasRepeatableConfig(entry) ? entry : null
}

export function saveLastConfig(
  productId: number,
  config: Omit<LastLineConfig, 'savedAt'>,
): void {
  if (typeof window === 'undefined') return
  const entry: LastLineConfig = { ...config, savedAt: Date.now() }
  // Una línea sin modificadores ni nota no aporta atajo; además así el chip no
  // aparece vacío después de un alta rápida.
  if (!hasRepeatableConfig(entry)) return

  try {
    const all = readAll()
    all[String(productId)] = entry

    const keys = Object.keys(all)
    if (keys.length > MAX_ENTRIES) {
      const oldestFirst = keys.sort((a, b) => (all[a]?.savedAt ?? 0) - (all[b]?.savedAt ?? 0))
      for (const key of oldestFirst.slice(0, keys.length - MAX_ENTRIES)) delete all[key]
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Sin espacio o storage bloqueado: el atajo simplemente no se guarda.
  }
}

/** Resumen corto para la etiqueta del atajo: "Término medio · sin cebolla". */
export function describeConfig(config: LastLineConfig, maxParts = 3): string {
  const parts = [
    ...config.modifiers.map(m => m.name),
    ...config.selectedModifiers,
  ]
  const notes = config.notes.trim()
  if (notes) parts.push(notes)

  if (parts.length === 0) return ''
  const shown = parts.slice(0, maxParts).join(' · ')
  return parts.length > maxParts ? `${shown} +${parts.length - maxParts}` : shown
}
