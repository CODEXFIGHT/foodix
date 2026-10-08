'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRouter } from 'next/navigation'
import { UnifiedStationPanel } from '@/components/kitchen/UnifiedStationPanel'

export default function KitchenPage() {
  const user   = useAuthStore(s => s.user)
  const router = useRouter()

  // Redirigir según la estación del usuario
  useEffect(() => {
    if (!user) return
    if (user.role === 'cocina') {
      if (user.station === 'hot')  { router.replace('/kitchen/hot');  return }
      if (user.station === 'cold') { router.replace('/kitchen/cold'); return }
    }
  }, [user, router])

  // Vista unificada (admin / cocina-both) — estilo demo KDS con filtro
  // Todas / Caliente / Fría y órdenes combinadas por mesa.
  return (
    <div className="h-[calc(100vh-4rem)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 overflow-hidden">
      <UnifiedStationPanel />
    </div>
  )
}
