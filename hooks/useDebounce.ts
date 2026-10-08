'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Devuelve un valor "retrasado": solo se actualiza cuando el valor de entrada
 * deja de cambiar durante `delay` ms. Útil para no filtrar en cada tecla.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
