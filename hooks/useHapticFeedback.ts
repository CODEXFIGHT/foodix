'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Vibración corta al confirmar acciones táctiles (agregar, swipe). No-op en
 * dispositivos/navegadores sin soporte de Vibration API (ej. iOS Safari).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback } from 'react'

export function useHapticFeedback() {
  return useCallback((pattern: number | number[] = 15) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  }, [])
}
