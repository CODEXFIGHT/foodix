'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useSessionWatch } from '@/hooks/useSessionWatch'
import { useDeviceHeartbeat } from '@/hooks/useDeviceHeartbeat'
import { SubscriptionGuard } from '@/components/shared/SubscriptionGuard'
import { PageTransition } from '@/components/shared/PageTransition'

function StationGuard({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const user        = useAuthStore(s => s.user)
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const checkSession = useAuthStore(s => s.checkSession)

  useEffect(() => { checkSession() }, [checkSession])

  // Cierre de sesión en tiempo real si el superadmin bloquea la suscripción.
  useSessionWatch()

  // Heartbeat de monitoreo: registra esta pantalla como dispositivo de Cocina.
  useDeviceHeartbeat({ module: 'kitchen', enabled: !!user && hasHydrated })

  useEffect(() => {
    if (!hasHydrated) return
    if (!user) { router.replace('/login'); return }
    // Solo cocina y admin pueden ver las estaciones
    if (!['admin', 'superadmin', 'cocina'].includes(user.role)) {
      router.replace('/')
    }
  }, [user, hasHydrated, router])

  if (!hasHydrated || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

function FullscreenManager() {
  useWakeLock()

  useEffect(() => {
    // Request fullscreen on tablets
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  return null
}

export default function KitchenStationLayout({ children }: { children: React.ReactNode }) {
  return (
    <StationGuard>
      <FullscreenManager />
      <div
        className="min-h-screen overflow-hidden"
        style={{
          // Ocultar scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {/* Bloquea cocina/mesero cuando la suscripción de la sucursal venció. */}
        <SubscriptionGuard>
          <PageTransition className="h-full">{children}</PageTransition>
        </SubscriptionGuard>
      </div>
    </StationGuard>
  )
}
