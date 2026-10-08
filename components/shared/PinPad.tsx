'use client'

import React, { useEffect, useState } from 'react'
import { Delete, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icons8Image } from '@/components/shared/Icons8Image'

interface PinPadProps {
  value: string
  onChange: (val: string) => void
  maxLength?: number
  error?: string
  loading?: boolean
  success?: boolean
}

export function PinPad({
  value,
  onChange,
  maxLength = 4,
  error,
  loading = false,
  success = false,
}: PinPadProps) {
  const [shake, setShake] = useState(false)
  // Cambia en cada reintento tras un error: remonta la grilla de números para
  // que el "pop" de entrada se repita y se sienta como una invitación clara
  // a intentar de nuevo, en vez de simplemente reaparecer sin más.
  const [gridReplayKey, setGridReplayKey] = useState(0)

  // Trigger shake animation when error is present
  useEffect(() => {
    if (error) {
      setShake(true)
      setGridReplayKey(k => k + 1)
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  // Teclado físico (web desktop): escribir el PIN al instante con números y
  // Backspace, sin tener que hacer clic. Se ignora si el foco está en un campo
  // de texto para no interferir con otros inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading || success) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (/^[0-9]$/.test(e.key)) {
        if (value.length < maxLength) onChange(value + e.key)
      } else if (e.key === 'Backspace') {
        if (value.length > 0) onChange(value.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, loading, success, maxLength, onChange])

  const handleKeyPress = (num: string) => {
    if (loading || success) return
    if (value.length < maxLength) {
      onChange(value + num)
    }
  }

  const handleBackspace = () => {
    if (loading || success) return
    if (value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleClear = () => {
    if (loading || success) return
    onChange('')
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-6 w-full max-w-[280px] mx-auto select-none transition-transform duration-300",
        shake && "animate-shake"
      )}
    >
      {/* Indicator Dots */}
      <div className="flex items-center justify-center gap-4 py-2">
        {Array.from({ length: maxLength }).map((_, idx) => {
          const filled = idx < value.length
          return (
            <div
              // El key cambia al rellenarse → React remonta el punto y reproduce el "pop".
              key={`${idx}-${filled ? 'on' : 'off'}`}
              className={cn(
                "w-3.5 h-3.5 rounded-full transition-colors duration-200 border",
                filled
                  ? success
                    ? "bg-green-500 border-green-500 shadow-[0_0_10px_#22C55E] animate-pin-dot"
                    : "bg-[#E85D04] border-[#E85D04] shadow-[0_0_10px_#E85D04] animate-pin-dot"
                  : "bg-transparent border-neutral-700"
              )}
            />
          )
        })}
      </div>

      {/* Grid container with relative overlay for loader/success */}
      <div className="relative w-full max-w-[240px] min-h-[300px] mx-auto">
        {/* Numerical Pad Grid — key cambia en cada reintento para repetir el "pop" de entrada */}
        <div
          key={gridReplayKey}
          className={cn(
            "grid grid-cols-3 gap-3.5 w-full transition-all duration-300 ease-in-out transform",
            success || loading
              ? "opacity-0 scale-95 pointer-events-none absolute top-0 left-0"
              : "opacity-100 scale-100 relative"
          )}
        >
          {keys.map((k, i) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKeyPress(k)}
              disabled={loading}
              style={{ animationDelay: `${i * 28}ms` }}
              className="animate-pin-key flex items-center justify-center aspect-square rounded-full bg-neutral-900 border border-white/5 text-white text-xl font-semibold hover:bg-neutral-800 active:bg-[#E85D04]/10 active:text-[#E85D04] active:border-[#E85D04]/30 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm focus:outline-none"
            >
              {k}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={loading || value.length === 0}
            style={{ animationDelay: '252ms' }}
            className="animate-pin-key flex items-center justify-center aspect-square rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/50 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:pointer-events-none focus:outline-none text-xs font-medium uppercase tracking-wider"
            title="Limpiar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* 0 Key */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            style={{ animationDelay: '280ms' }}
            className="animate-pin-key flex items-center justify-center aspect-square rounded-full bg-neutral-900 border border-white/5 text-white text-xl font-semibold hover:bg-neutral-800 active:bg-[#E85D04]/10 active:text-[#E85D04] active:border-[#E85D04]/30 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm focus:outline-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading || value.length === 0}
            style={{ animationDelay: '308ms' }}
            className="animate-pin-key flex items-center justify-center aspect-square rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/50 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:pointer-events-none focus:outline-none"
            title="Borrar"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Loader — los números se transforman en un spinner mientras se valida */}
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-4 transition-all duration-300 ease-in-out transform absolute top-0 left-0",
            loading && !success
              ? "opacity-100 scale-100 delay-150"
              : "opacity-0 scale-90 pointer-events-none"
          )}
        >
          <Loader2 className="h-12 w-12 animate-spin text-[#E85D04]" strokeWidth={2.5} />
          <p className="text-neutral-400 text-xs font-bold tracking-wider uppercase animate-pulse">
            Verificando PIN…
          </p>
        </div>

        {/* Success Icon Container */}
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center transition-all duration-500 ease-in-out transform absolute top-0 left-0",
            success
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 pointer-events-none"
          )}
        >
          <Icons8Image
            src="https://img.icons8.com/color/96/ok.png"
            alt="Success Checkmark"
            size={96}
            className="w-24 h-24 animate-scale-in"
          />
          <p className="text-green-500 text-xs font-bold mt-4 tracking-wider uppercase animate-pulse">
            PIN Aprobado
          </p>
        </div>
      </div>
    </div>
  )
}
