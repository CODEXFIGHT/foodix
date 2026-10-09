'use client'

import { useState, useEffect, useRef } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CountryConfig {
  code: string
  name: string
  flag: string
  currency: string
  symbol: string
  label: string
}

export const LATAM_COUNTRIES: CountryConfig[] = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', symbol: '$', label: 'Argentina' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'BRL', symbol: 'R$', label: 'Brasil' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', symbol: '$', label: 'Chile' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', symbol: '$', label: 'Colombia' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN', symbol: '$', label: 'México' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', currency: 'PEN', symbol: 'S/', label: 'Perú' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', currency: 'PYG', symbol: '₲', label: 'Paraguay' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', currency: 'UYU', symbol: '$', label: 'Uruguay' },
  { code: 'INT', name: 'Internacional (Español)', flag: '🌐', currency: 'USD', symbol: '$', label: 'Internacional (Español)' },
]

/**
 * Detecta el país del visitante usando TimeZone y Language del navegador.
 */
function detectVisitorCountry(): CountryConfig {
  if (typeof window === 'undefined') return LATAM_COUNTRIES[4] // Default México

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const lang = navigator.language || ''

    if (tz.includes('Buenos_Aires') || tz.includes('Cordoba') || tz.includes('Mendoza') || lang.includes('es-AR')) {
      return LATAM_COUNTRIES.find(c => c.code === 'AR') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Sao_Paulo') || tz.includes('Fortaleza') || tz.includes('Manaus') || lang.includes('pt')) {
      return LATAM_COUNTRIES.find(c => c.code === 'BR') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Santiago') || lang.includes('es-CL')) {
      return LATAM_COUNTRIES.find(c => c.code === 'CL') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Bogota') || lang.includes('es-CO')) {
      return LATAM_COUNTRIES.find(c => c.code === 'CO') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Lima') || lang.includes('es-PE')) {
      return LATAM_COUNTRIES.find(c => c.code === 'PE') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Asuncion') || lang.includes('es-PY')) {
      return LATAM_COUNTRIES.find(c => c.code === 'PY') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Montevideo') || lang.includes('es-UY')) {
      return LATAM_COUNTRIES.find(c => c.code === 'UY') || LATAM_COUNTRIES[4]
    }
    if (tz.includes('Mexico') || tz.includes('Cancun') || tz.includes('Monterrey') || tz.includes('Tijuana') || lang.includes('es-MX')) {
      return LATAM_COUNTRIES.find(c => c.code === 'MX') || LATAM_COUNTRIES[4]
    }
  } catch (err) {
    console.error('Error al detectar zona horaria/país:', err)
  }

  return LATAM_COUNTRIES.find(c => c.code === 'MX') || LATAM_COUNTRIES[4]
}

export function CountrySelector({ className }: { className?: string }) {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(LATAM_COUNTRIES[4])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Intentar leer preferencia guardada en localStorage
    const savedCode = localStorage.getItem('restauros_user_country')
    if (savedCode) {
      const found = LATAM_COUNTRIES.find(c => c.code === savedCode)
      if (found) {
        setSelectedCountry(found)
        return
      }
    }

    // Auto-detectar por IP/Timezone del navegador
    const detected = detectVisitorCountry()
    setSelectedCountry(detected)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (country: CountryConfig) => {
    setSelectedCountry(country)
    localStorage.setItem('restauros_user_country', country.code)
    setOpen(false)
  }

  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-between gap-2.5 px-4 py-2 rounded-full border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:border-orange-300 hover:bg-orange-50/50 transition-all shadow-sm active:scale-95 dark:border-white/15 dark:bg-stone-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          {selectedCountry.flag === '🌐' ? <Globe className="w-4 h-4 text-stone-500" /> : <span className="text-base leading-none">{selectedCountry.flag}</span>}
          <span>{selectedCountry.label}</span>
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-stone-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 sm:right-0 sm:left-auto w-60 rounded-2xl bg-white border border-stone-200 shadow-2xl p-1.5 z-[90] animate-fade-in dark:bg-stone-900 dark:border-white/10">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 py-1.5 border-b border-stone-100 dark:border-white/5">
            Selecciona tu país / región
          </div>
          <div className="max-h-64 overflow-y-auto py-1 space-y-0.5 [scrollbar-width:none]">
            {LATAM_COUNTRIES.map(c => {
              const isSelected = c.code === selectedCountry.code
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left',
                    isSelected
                      ? 'bg-orange-50 text-[#D1400F] font-bold dark:bg-orange-500/10'
                      : 'text-stone-700 hover:bg-stone-50 dark:text-zinc-300 dark:hover:bg-white/5'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#D1400F]" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
