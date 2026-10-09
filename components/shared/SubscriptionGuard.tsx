'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Button } from '@/components/ui/button'
import {
  SUBSCRIPTION_MESSAGE, SUBSCRIPTION_ALLOWED, formatDaysRemaining,
} from '@/lib/constants/subscription'
import { cn } from '@/lib/utils/cn'
import { TrialBanner, TrialExpiredScreen, isTrialExpired, isTrialing } from '@/components/shared/TrialStatus'
import type { SubscriptionState } from '@/lib/types'

/** Días calendario hasta el vencimiento (0 = vence hoy), igual que el DATEDIFF
 *  del backend. Ignora la hora para alinear con el corte por día. */
function daysUntil(expiresAt: string): number | null {
  const exp = new Date(expiresAt)
  if (isNaN(exp.getTime())) return null
  const now = new Date()
  const e = Date.UTC(exp.getFullYear(), exp.getMonth(), exp.getDate())
  const n = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((e - n) / 86_400_000)
}

function SubscriptionBlockedScreen({ status }: { status: SubscriptionState }) {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const message = SUBSCRIPTION_MESSAGE[status] ?? 'Tu suscripción no está activa.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
        <Icons8Image src={ICONS8.subscription} alt="Suscripción" size={96} className="mx-auto" />
        <h1 className="text-2xl font-bold text-stone-900">Suscripción Inactiva</h1>
        <p className="text-stone-600 text-sm leading-relaxed">{message}</p>

        <div className="flex flex-col gap-3 pt-2">
          {(user?.role === 'admin') && status !== 'terminated' && (
            <Button asChild className="bg-[#FACC15] hover:bg-[#EAB308]">
              <a href="/billing">Ir a Mi Suscripción</a>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href="mailto:restauros@atomicmail.io">Contactar Soporte</a>
          </Button>
          <Button variant="ghost" onClick={() => logout()} className="text-stone-500">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

function PastDueBanner() {
  return (
    <div className="bg-yellow-500/15 border-b border-yellow-500/30 text-yellow-800 dark:text-yellow-400 px-4 py-2 text-sm flex items-center gap-2">
      <Icons8Image src={ICONS8.warning} alt="Aviso" size={18} className="flex-shrink-0" />
      <span className="flex-1">{SUBSCRIPTION_MESSAGE.past_due}</span>
      <a href="/billing" className="font-semibold underline whitespace-nowrap">Renovar</a>
    </div>
  )
}

/**
 * Aviso de "por vencer" dentro de la app (no solo push). Solo para admin (quien
 * puede renovar) y entre 1 y 7 días antes; el día de vencimiento no muestra nada.
 * Descartable una vez al día. Colores sólidos para que se lea bien tanto en el
 * dashboard claro como en la pantalla oscura de cocina.
 */
function RenewalBanner({ days }: { days: number }) {
  const [hidden, setHidden] = useState(true)
  const dayKey = `renewal-banner-dismissed-${new Date().toISOString().slice(0, 10)}`

  useEffect(() => {
    setHidden(sessionStorage.getItem(dayKey) === '1')
  }, [dayKey])

  if (hidden) return null

  const urgent = days <= 3
  const when = days === 1 ? 'mañana' : `en ${days} días`

  return (
    <div
      role="status"
      className={cn(
        'flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm sm:px-4',
        urgent ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950',
      )}
    >
      <Icons8Image src={ICONS8.warning} alt="Aviso" size={18} className="flex-shrink-0" />
      <span className="min-w-[55%] flex-1 font-medium leading-tight">
        Tu suscripción vence {when}.{' '}
        <span className="font-bold whitespace-nowrap rounded-full bg-black/10 px-2 py-0.5">
          {formatDaysRemaining(days)}
        </span>
      </span>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <a
          href="/billing"
          className="whitespace-nowrap rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-stone-900 transition-colors hover:bg-white"
        >
          Renovar ahora
        </a>
        <button
          type="button"
          onClick={() => { sessionStorage.setItem(dayKey, '1'); setHidden(true) }}
          aria-label="Descartar aviso"
          className="rounded-md p-1 opacity-80 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const subscription = useAuthStore(s => s.subscription)
  const user = useAuthStore(s => s.user)
  const pathname = usePathname()

  if (!user) return <>{children}</>
  if (user.role === 'superadmin') return <>{children}</>

  const status = (subscription?.status ?? 'expired') as SubscriptionState

  // ── Prueba gratuita terminada ─────────────────────────────────────────────
  // Mensaje propio ("Tu prueba gratuita ha terminado") en lugar del genérico de
  // suscripción vencida. Igual que en el resto de estados bloqueados, /billing
  // sigue accesible para que el admin pueda elegir un plan; los datos del
  // restaurante NUNCA se borran.
  if (isTrialExpired(subscription)) {
    if (pathname === '/billing' && user.role === 'admin') return <>{children}</>
    return <TrialExpiredScreen />
  }

  if (!subscription || !SUBSCRIPTION_ALLOWED.includes(status)) {
    // La página de pago SIEMPRE debe ser accesible para que el admin pueda
    // reactivar (pagar por SPEI o tarjeta). Sin esta excepción quedaba atrapado:
    // el botón "Ir a Mi Suscripción" apuntaba a /billing, que también se bloqueaba.
    // Excepción: 'terminated' (baja definitiva) sí es bloqueo duro.
    if (pathname === '/billing' && status !== 'terminated' && user.role === 'admin') {
      return <>{children}</>
    }
    return <SubscriptionBlockedScreen status={status} />
  }

  // Estados permitidos. past_due muestra banner de advertencia encima del contenido.
  if (status === 'past_due') {
    return (
      <>
        <PastDueBanner />
        {children}
      </>
    )
  }

  // Prueba gratuita vigente: banner propio (cuenta regresiva, no "renovar").
  if (isTrialing(subscription)) {
    return (
      <>
        <TrialBanner />
        {children}
      </>
    )
  }

  // Aviso "por vencer" (solo admin, 1–7 días antes; el día de vencer no muestra nada).
  const days = subscription?.expires_at ? daysUntil(subscription.expires_at) : null
  const showRenewal = user.role === 'admin' && status === 'active'

  if (showRenewal && days !== null && days >= 1 && days <= 7) {
    return (
      <>
        <RenewalBanner days={days} />
        {children}
      </>
    )
  }

  return <>{children}</>
}
