'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Indicadores de la prueba gratuita dentro de la app.
 *
 *   · TrialBadge          — píldora discreta del Topbar ("Prueba · 12 días")
 *   · TrialBanner         — aviso creciente en los últimos 7 días
 *   · TrialExpiredScreen  — pantalla de fin de prueba con CTA a planes
 *   · TrialWelcomeDialog  — confirmación de activación (fechas del servidor)
 *
 * TODOS leen el mismo estado que el backend envió con la sesión
 * (`subscription.trial_*`). No hay un segundo cálculo ni una segunda petición:
 * `days_remaining` viene del servidor y solo se recalcula en el cliente si el
 * backend no lo mandó (respaldo puramente visual).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles, CalendarClock, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  TRIAL_COPY, TRIAL_CTA, daysUntil, trialDateShort, trialDaysLabel, trialEndLabel, trialUrgency,
} from '@/lib/constants/trial'
import type { SubscriptionStatus } from '@/lib/types'

/** Días restantes según el servidor; el cálculo local es solo respaldo. */
export function trialDaysRemaining(sub: SubscriptionStatus | null): number | null {
  if (!sub) return null
  if (typeof sub.days_remaining === 'number') return sub.days_remaining
  return daysUntil(sub.trial_ends_at ?? sub.expires_at)
}

/** ¿La sucursal está en prueba vigente? */
export function isTrialing(sub: SubscriptionStatus | null): boolean {
  if (!sub) return false
  return sub.plan === 'trial' && (sub.trial_status === 'trialing' || sub.status === 'trial')
}

/** ¿La prueba terminó (y no se convirtió a un plan de pago)? */
export function isTrialExpired(sub: SubscriptionStatus | null): boolean {
  if (!sub) return false
  return sub.plan === 'trial' && (sub.trial_status === 'trial_expired' || sub.status === 'expired')
}

// ── Badge del Topbar ─────────────────────────────────────────────────────────

export function TrialBadge({ className }: { className?: string }) {
  const subscription = useAuthStore(s => s.subscription)
  if (!isTrialing(subscription)) return null

  const days = trialDaysRemaining(subscription)
  const urgency = trialUrgency(days)

  return (
    <Link
      href="/billing"
      title={
        subscription?.trial_ends_at
          ? `Tu prueba termina el ${trialEndLabel(subscription.trial_ends_at)}`
          : 'Prueba gratuita'
      }
      className={cn(
        'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
        urgency === 'critical'
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
          : urgency === 'warning'
            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
            : 'border-orange-200 bg-orange-50 text-[#D1400F] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Estado de la prueba gratuita: </span>
      Prueba · {trialDaysLabel(days)}
    </Link>
  )
}

// ── Banner de la app ─────────────────────────────────────────────────────────

/**
 * Aviso dentro del dashboard. Solo aparece en los últimos 7 días y solo para
 * quien puede contratar (admin). Descartable una vez al día.
 */
export function TrialBanner() {
  const subscription = useAuthStore(s => s.subscription)
  const role = useAuthStore(s => s.user?.role)

  const days = trialDaysRemaining(subscription)
  const urgency = trialUrgency(days)
  const dayKey = `trial-banner-dismissed-${new Date().toISOString().slice(0, 10)}`

  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    setHidden(sessionStorage.getItem(dayKey) === '1')
  }, [dayKey])

  if (!isTrialing(subscription) || role !== 'admin') return null
  if (urgency === 'none' || days === null) return null
  // El aviso más urgente (último día) no se puede ocultar.
  if (hidden && urgency !== 'critical') return null

  const remaining =
    days <= 0 ? 'Hoy es el último día de tu prueba gratuita.'
    : days === 1 ? 'Tu prueba gratuita termina mañana.'
    : `Te quedan ${days} días de prueba gratuita.`

  const message = `${remaining} Elige un plan para continuar usando FoodIX sin interrupciones.`

  return (
    <div
      role="status"
      className={cn(
        'flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm sm:px-4',
        urgency === 'critical'
          ? 'bg-red-500 text-white'
          : urgency === 'warning'
            ? 'bg-amber-400 text-amber-950'
            : 'bg-orange-50 text-orange-900 border-b border-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/25',
      )}
    >
      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-[55%] flex-1 font-medium leading-tight">{message}</span>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <Link
          href="/billing"
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
            urgency === 'info'
              ? 'bg-[#D1400F] text-white hover:bg-[#B03508]'
              : 'bg-white/95 text-stone-900 hover:bg-white',
          )}
        >
          {TRIAL_CTA.plans}
        </Link>
        {urgency !== 'critical' && (
          <button
            type="button"
            onClick={() => { sessionStorage.setItem(dayKey, '1'); setHidden(true) }}
            aria-label="Descartar aviso de prueba gratuita"
            className="rounded-md p-1 opacity-80 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Pantalla de fin de prueba ────────────────────────────────────────────────

/**
 * Reemplaza los módulos operativos cuando la prueba terminó. Los datos del
 * cliente NO se borran: solo se restringe la operación hasta contratar.
 */
export function TrialExpiredScreen() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 dark:bg-[#0a0a0a]">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#111]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10">
          <CalendarClock className="h-7 w-7 text-[#D1400F]" aria-hidden="true" />
        </div>

        <h1 className="mt-5 font-heading text-2xl font-extrabold text-stone-900 dark:text-white">
          {TRIAL_COPY.expiredTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
          {TRIAL_COPY.expiredBody}
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Tus productos, pedidos, clientes y configuración siguen guardados.</span>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {isAdmin && (
            <Button asChild className="h-11 bg-[#D1400F] hover:bg-[#B03508]">
              <Link href="/billing">{TRIAL_CTA.plans}</Link>
            </Button>
          )}
          {!isAdmin && (
            <p className="text-sm text-stone-500 dark:text-zinc-400">
              Pídele al administrador de tu restaurante que elija un plan para reactivar el acceso.
            </p>
          )}
          <Button asChild variant="outline" className="h-11">
            <a href="mailto:restauros@atomicmail.io">Contactar soporte</a>
          </Button>
          <Button variant="ghost" onClick={() => logout()} className="text-stone-500">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Confirmación de activación ───────────────────────────────────────────────

export function TrialWelcomeCard({
  startsAt,
  endsAt,
  onContinue,
  ctaLabel = 'Entrar a FoodIX',
}: {
  startsAt: string | null
  endsAt: string | null
  onContinue: () => void
  ctaLabel?: string
}) {
  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-[#111]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-500/10">
        <Sparkles className="h-7 w-7 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>

      <h2 className="mt-5 font-heading text-2xl font-extrabold text-stone-900 dark:text-white">
        {TRIAL_COPY.activeTitle}
      </h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">{TRIAL_COPY.activeBody}</p>

      <dl className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-3 text-left">
        <div className="rounded-xl border border-stone-200 p-3 dark:border-white/10">
          <dt className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-zinc-500">Inicio</dt>
          <dd className="mt-0.5 font-bold text-stone-900 dark:text-white">{trialDateShort(startsAt)}</dd>
        </div>
        <div className="rounded-xl border border-stone-200 p-3 dark:border-white/10">
          <dt className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-zinc-500">Finaliza</dt>
          <dd className="mt-0.5 font-bold text-stone-900 dark:text-white">{trialDateShort(endsAt)}</dd>
        </div>
      </dl>

      <Button onClick={onContinue} className="mt-6 h-12 w-full bg-[#D1400F] text-base hover:bg-[#B03508]">
        {ctaLabel}
      </Button>
    </div>
  )
}
