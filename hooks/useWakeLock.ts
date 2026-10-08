'use client'

import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // WakeLock not available or permission denied
      }
    }

    request()

    // Re-acquire on tab visibility restored
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
