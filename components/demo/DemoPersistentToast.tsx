/**
 * RestaurOS — Modo Demo
 * Banner persistente, premium y minimizable. Informa que es un demo y
 * recomienda el kiosko Android. No es invasivo y respeta móvil.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useState } from 'react'
import { Info, X, Smartphone, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const MIN_KEY = 'restauros_demo_toast_min'

export function DemoPersistentToast() {
  const [minimized, setMinimized] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = window.localStorage.getItem(MIN_KEY)
      if (saved !== null) {
        setMinimized(saved === '1')
      } else {
        setMinimized(window.innerWidth < 640)
      }
    } catch {
      /* ignore */
    }
  }, [])

  function setMin(v: boolean) {
    setMinimized(v)
    try {
      window.localStorage.setItem(MIN_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  if (!mounted) return null

  if (minimized) {
    return (
      <button
        onClick={() => setMin(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#1C1917] px-4 py-2.5 text-sm font-medium text-white shadow-xl ring-1 ring-white/10 transition-all hover:scale-105 active:scale-95 animate-fade-in-up"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E85D04] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E85D04]" />
        </span>
        Modo demo
        <ChevronUp className="h-4 w-4 opacity-70" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full animate-fade-in-up sm:bottom-4 sm:right-4 sm:left-auto sm:w-[calc(100%-2rem)] sm:max-w-md">
      <div className="relative overflow-hidden rounded-t-2xl sm:rounded-2xl bg-[#1C1917] p-4 pb-5 sm:pb-4 text-white shadow-2xl ring-1 ring-white/10">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#E85D04]/30 blur-2xl"
          aria-hidden
        />
        <button
          onClick={() => setMin(true)}
          aria-label="Minimizar"
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E85D04]/20 text-[#F5A623]">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold leading-snug">Estás usando RestaurOS en modo demo</p>
            <p className="text-xs leading-relaxed text-white/70">
              Para una experiencia completa en restaurante, recomendamos un kiosko con Android OS e
              instalar <span className="font-medium text-white">RestaurOS Android</span>.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 pl-12">
          <a
            href="/landing#descargas"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-1.5 text-xs font-semibold',
              'text-white transition-all hover:bg-[#C44D00] active:scale-95',
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Conocer RestaurOS Android
          </a>
          <a
            href="mailto:restauros@atomicmail.io?subject=Solicitar%20instalaci%C3%B3n%20RestaurOS"
            className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
          >
            Solicitar instalación
          </a>
        </div>
      </div>
    </div>
  )
}
