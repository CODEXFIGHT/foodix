'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Layout de la operación de piso del mesero: sin sidebar, sin navegación
 * anidada — cada ruta bajo /mesero resuelve una sola tarea en pantalla completa.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PageTransition } from '@/components/shared/PageTransition'

const ALLOWED_ROLES = ['mesero', 'admin']

export default function MeseroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, hasHydrated } = useSessionGuard()
  const checkSession = useAuthStore(s => s.checkSession)

  useEffect(() => { checkSession() }, [checkSession])

  useEffect(() => {
    if (!hasHydrated || !user) return
    if (!ALLOWED_ROLES.includes(user.role)) {
      const fallback = user.role === 'cocina' ? '/kitchen' : user.role === 'superadmin' ? '/superadmin' : '/orders'
      router.replace(fallback)
    }
  }, [hasHydrated, user, router])

  if (!hasHydrated || !user || !ALLOWED_ROLES.includes(user.role)) return <PageLoader />

  return (
    <div className="h-screen-dvh overflow-hidden bg-stone-50 dark:bg-stone-950">
      <PageTransition className="h-full">{children}</PageTransition>
    </div>
  )
}
