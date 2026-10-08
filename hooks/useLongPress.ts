'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Gesto de long-press táctil/mouse: dispara `onLongPress` tras `delay` ms de
 * presión sostenida y cancela si hay movimiento (evita disparar durante scroll).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback, useRef } from 'react'

const MOVE_CANCEL_THRESHOLD_PX = 10

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerLeave: () => void
}

export function useLongPress(onLongPress: () => void, delay = 450): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const originRef = useRef<{ x: number; y: number } | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    originRef.current = null
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    originRef.current = { x: e.clientX, y: e.clientY }
    timerRef.current = setTimeout(() => {
      onLongPress()
      clear()
    }, delay)
  }, [onLongPress, delay, clear])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const origin = originRef.current
    if (!origin) return
    const dx = e.clientX - origin.x
    const dy = e.clientY - origin.y
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_THRESHOLD_PX) clear()
  }, [clear])

  return { onPointerDown, onPointerMove, onPointerUp: clear, onPointerLeave: clear }
}
