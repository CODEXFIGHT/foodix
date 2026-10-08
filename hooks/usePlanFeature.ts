'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * ¿El plan de la sucursal actual incluye esta función? (ver
 * lib/constants/subscription.ts LICENSE_BY_PLAN).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useAuthStore } from '@/lib/stores/authStore'
import { planHasFeature } from '@/lib/constants/subscription'

export function usePlanFeature(feature: string): boolean {
  const plan = useAuthStore(s => s.subscription?.plan)
  return planHasFeature(plan, feature)
}
