'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useSessionWatch } from '@/hooks/useSessionWatch'
import { PageLoader } from '@/components/shared/LoadingSpinner'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const checkSession = useAuthStore(s => s.checkSession)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Cierre de sesión en tiempo real si el superadmin bloquea la suscripción.
  useSessionWatch()

  useEffect(() => {
    if (!hasHydrated) return

    if (!user) {
      router.replace('/login')
      return
    }

    const role = user.role

    // Superadmin always goes to /superadmin
    if (role === 'superadmin' && !pathname.startsWith('/superadmin')) {
      router.replace('/superadmin')
      return
    }

    // Cocina only sees /kitchen
    if (role === 'cocina' && !pathname.startsWith('/kitchen')) {
      router.replace('/kitchen')
      return
    }

    // Mesero solo accede a operación de piso. Allowlist (default-deny): cualquier
    // ruta fuera de esta lista lo manda a /orders, así nuevas secciones admin
    // quedan bloqueadas automáticamente sin tener que mantener una denylist.
    const meseroAllowed = ['/orders', '/tables', '/deliveries', '/reservations', '/customers', '/cash', '/carta-digital']
    if (
      role === 'mesero' &&
      !meseroAllowed.some(p => pathname === p || pathname.startsWith(p + '/'))
    ) {
      router.replace('/orders')
      return
    }
  }, [user, pathname, router, hasHydrated])

  if (!hasHydrated) return <PageLoader />
  if (!user) return <PageLoader />

  return <>{children}</>
}
