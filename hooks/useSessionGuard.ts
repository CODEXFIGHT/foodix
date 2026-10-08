'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'

export function useSessionGuard() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const hasHydrated = useAuthStore(s => s.hasHydrated)

  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace('/login')
    }
  }, [user, hasHydrated, router])

  return { user, hasHydrated }
}
