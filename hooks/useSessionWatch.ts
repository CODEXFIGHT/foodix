'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Revalida la sesión periódicamente (y al volver a la pestaña) para detectar
 * en tiempo real cuando el superadmin bloquea la suscripción. El backend
 * invalida el token y `checkSession` cierra la sesión en ese dispositivo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'

const POLL_MS = 30_000

export function useSessionWatch(): void {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const checkSession = useAuthStore(s => s.checkSession)

  useEffect(() => {
    if (!isAuthenticated) return

    const id = setInterval(() => { checkSession() }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthenticated, checkSession])
}
