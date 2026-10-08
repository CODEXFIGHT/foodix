'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/authStore'

interface StationHeaderProps {
  station: 'hot' | 'cold' | 'all'
  activeCount: number
  lastUpdated: Date | null
}

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

export function StationHeader({ station, activeCount, lastUpdated }: StationHeaderProps) {
  const router   = useRouter()
  const logout   = useAuthStore(s => s.logout)
  const time     = useClock()
  const isAll    = station === 'all'
  const isHot    = station === 'hot'

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="h-14 flex items-center justify-between px-3 sm:px-5 sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand Logo "R" */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#E85D04] font-heading text-lg font-bold text-white select-none">
            R
          </div>
          <span className="hidden text-sm font-semibold sm:inline-block text-stone-800 animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
            Restaur<span className="text-[#E85D04]">OS</span><sup className="text-[0.55em] align-super">©</sup>
          </span>
        </div>

        {/* Station Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-stone-100 text-stone-700">
          <span className={cn('h-2 w-2 rounded-full', isAll ? 'bg-green-500' : isHot ? 'bg-orange-500' : 'bg-blue-600')} />
          {isAll ? 'Cocina' : isHot ? 'Cocina Caliente' : 'Bar / Fría'}
        </span>

        {/* Title */}
        <h1 className="hidden sm:block truncate text-sm font-semibold text-stone-700 sm:text-base">
          Estación de cocina
        </h1>
      </div>

      {/* Clock */}
      <span className="hidden md:flex items-center gap-1.5 font-mono text-base font-bold text-stone-600 tabular-nums">
        <Clock className="h-4 w-4" />
        {time}
      </span>

      {/* Logout / Exit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors active:scale-95"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

