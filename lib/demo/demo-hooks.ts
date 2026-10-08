/**
 * FoodIX — Modo Demo
 * Hooks de cliente para la sesión demo y su cronómetro de 30 minutos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DemoSession } from './demo-types'
import {
  endDemoTrial,
  getDemoSession,
  getDemoRemainingMs,
} from './demo-session'

/** Lee la sesión demo de esta pestaña de forma reactiva (cliente). */
export function useDemoSession(): { session: DemoSession | null; active: boolean } {
  const [session, setSession] = useState<DemoSession | null>(null)

  useEffect(() => {
    setSession(getDemoSession())
    // Re-sincroniza al volver a enfocar la pestaña (p. ej. tras vencer en otra).
    const onFocus = () => setSession(getDemoSession())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return { session, active: session !== null }
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export interface DemoTimer {
  /** Milisegundos restantes (0 cuando vence). */
  remainingMs: number
  /** Etiqueta mm:ss, p. ej. "29:45". */
  label: string
  /** true cuando la prueba ya venció. */
  expired: boolean
  /** Hay sesión demo activa en esta pestaña. */
  hasSession: boolean
}

/**
 * Cronómetro de la prueba demo. Refresca cada segundo y, al llegar a 00:00,
 * limpia todos los datos demo y dispara `onExpire` UNA sola vez.
 */
export function useDemoTimer(onExpire?: () => void): DemoTimer {
  const [remainingMs, setRemainingMs] = useState<number>(() => getDemoRemainingMs())
  const [hasSession, setHasSession] = useState(false)
  // Expiración capturada al montar: getDemoSession() purga al vencer, por lo
  // que necesitamos un valor estable para detectar el cruce a 00:00.
  const expiresAtRef = useRef<number | null>(null)
  const firedRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  const tick = useCallback(() => {
    if (firedRef.current) return
    // Adquisición diferida: el panel puede crear la sesión justo después de
    // montar este hook, así que reintentamos hasta capturar la expiración.
    if (expiresAtRef.current == null) {
      const session = getDemoSession()
      if (!session) {
        setHasSession(false)
        setRemainingMs(0)
        return
      }
      expiresAtRef.current = session.demoExpiresAt
      setHasSession(true)
    }
    const ms = Math.max(0, expiresAtRef.current - Date.now())
    setRemainingMs(ms)
    if (ms <= 0) {
      firedRef.current = true
      setHasSession(false)
      endDemoTrial('expired')
      onExpireRef.current?.()
    }
  }, [])

  useEffect(() => {
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  return {
    remainingMs,
    label: formatRemaining(remainingMs),
    expired: firedRef.current || (hasSession && remainingMs <= 0),
    hasSession,
  }
}
