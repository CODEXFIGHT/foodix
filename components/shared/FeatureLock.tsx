'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Envuelve una función restringida por plan: si el usuario ya la tiene,
 * renderiza los children normalmente. Si no, muestra un overlay de candado
 * que al tocarlo abre el mismo ErrorDialog que usa el backend
 * (FUNCION_NO_DISPONIBLE_PLAN) — un solo lenguaje visual para "esto requiere
 * otro plan", ya sea que lo detecte el frontend o lo rechace la API.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { usePlanFeature } from '@/hooks/usePlanFeature'
import { useAuthStore } from '@/lib/stores/authStore'
import { ErrorDialog } from '@/components/errors/ErrorDialog'
import { cn } from '@/lib/utils/cn'

interface FeatureLockProps {
  /** Key de la feature (ver LICENSE_BY_PLAN en lib/constants/subscription.ts), ej. 'whatsapp_ai_waiter'. */
  feature: string
  /** Nombre humano de la función, para el mensaje del diálogo (ej. "WhatsApp AI Waiter"). */
  featureLabel: string
  /** Plan sugerido para desbloquear (ej. 'ai'). Si se omite, el diálogo no sugiere un plan específico. */
  planSugerido?: string
  children: React.ReactNode
  className?: string
}

export function FeatureLock({ feature, featureLabel, planSugerido, children, className }: FeatureLockProps) {
  const allowed = usePlanFeature(feature)
  const viewerRole = useAuthStore(s => s.user?.role)
  const [open, setOpen] = useState(false)

  if (allowed) return <>{children}</>

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('group relative block w-full text-left', className)}>
        <div className="pointer-events-none opacity-50 grayscale-[30%]">{children}</div>
        <div className="absolute inset-0 grid place-items-center rounded-[inherit] bg-white/40 backdrop-blur-[1px] dark:bg-black/40">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-md dark:bg-stone-900 dark:text-stone-200">
            <Lock className="h-3.5 w-3.5" /> Requiere otro plan
          </span>
        </div>
      </button>

      <ErrorDialog
        open={open}
        onOpenChange={setOpen}
        code="FUNCION_NO_DISPONIBLE_PLAN"
        context={{ funcion: featureLabel, planSugerido, viewerRole }}
        onAction={(actionId) => {
          setOpen(false)
          if (actionId === 'UPGRADE_PLAN') window.location.href = '/billing'
        }}
      />
    </>
  )
}
