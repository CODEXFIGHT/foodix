/**
 * @fileoverview Hook SSR-safe para media queries (matchMedia) con
 * `useSyncExternalStore`. Útil para alternar layouts touch (columnas en
 * desktop/tablet horizontal, tabs en mobile/tablet vertical) sin parpadeos.
 * @author JIMMY LOPEZ
 * @date 2026-06-18
 */
'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Devuelve `true` cuando la media query coincide. En SSR devuelve `false`
 * (mobile-first) y se sincroniza en el primer render del cliente.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(
    () => (typeof window === 'undefined' || !window.matchMedia ? false : window.matchMedia(query).matches),
    [query],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
