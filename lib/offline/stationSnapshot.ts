/**
 * FoodIX — Sistema de gestión para restaurantes
 * Última foto conocida del tablero de cocina, persistida en `localStorage`
 * para que un reload sin conexión siga mostrando datos en vez de una
 * pantalla vacía. Cocina es solo-lectura offline (no encola escrituras).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

function snapshotKey(kind: string, branchId: number | null): string {
  return `foodix_station_snapshot_${kind}_${branchId ?? 'null'}`
}

export function writeStationSnapshot<T>(kind: string, branchId: number | null, data: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      snapshotKey(kind, branchId),
      JSON.stringify({ data, savedAt: Date.now() }),
    )
  } catch {
    // localStorage lleno/deshabilitado: la resiliencia offline es un
    // extra, no debe romper el flujo normal si falla.
  }
}

export function readStationSnapshot<T>(kind: string, branchId: number | null): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(snapshotKey(kind, branchId))
    if (!raw) return undefined
    return (JSON.parse(raw) as { data: T; savedAt: number }).data
  } catch {
    return undefined
  }
}

export function readStationSnapshotTimestamp(kind: string, branchId: number | null): number | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(snapshotKey(kind, branchId))
    if (!raw) return undefined
    return (JSON.parse(raw) as { data: unknown; savedAt: number }).savedAt
  } catch {
    return undefined
  }
}
