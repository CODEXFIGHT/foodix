'use client'

/**
 * FoodIX — Configuración de IVA de la sucursal (activado/desactivado + tasa).
 *
 * El IVA va INCLUIDO en el precio del menú: es solo un desglose informativo.
 * Desactivarlo NO cambia el total, únicamente oculta la línea "IVA incluido"
 * en resúmenes de pedido y tickets.
 *
 * Fuente única de verdad para todas las pantallas/tickets. Si la sucursal aún
 * no tiene las columnas migradas, asume IVA activo al 16% (comportamiento previo).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useAuthStore } from '@/lib/stores/authStore'
import { useBranch } from '@/lib/api/queries'

export interface BranchTaxConfig {
  /** ¿Se muestra el desglose de IVA en pantallas y tickets? */
  enabled: boolean
  /** Porcentaje de IVA (ej. 16). */
  rate: number
}

const DEFAULT_RATE = 16

/** Lee la configuración de IVA de una sucursal específica. */
export function useBranchTaxFor(branchId: number | null): BranchTaxConfig {
  const { data: branch } = useBranch(branchId)
  // Mientras carga o si el backend aún no migró las columnas, conserva el
  // comportamiento histórico (IVA visible al 16%).
  const enabled = branch?.tax_enabled === undefined ? true : Number(branch.tax_enabled) === 1
  const rate = branch?.tax_rate === undefined || branch.tax_rate === null
    ? DEFAULT_RATE
    : Number(branch.tax_rate)
  return { enabled, rate: Number.isFinite(rate) ? rate : DEFAULT_RATE }
}

/** Configuración de IVA de la sucursal del usuario autenticado. */
export function useBranchTax(): BranchTaxConfig {
  const branchId = useAuthStore(s => s.user?.branch_id ?? null)
  return useBranchTaxFor(branchId)
}
