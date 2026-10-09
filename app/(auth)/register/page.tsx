'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Alta autoservicio con prueba gratuita de 14 días.
 *
 * Cuenta → verificación de correo → verificación de teléfono → restaurante →
 * trial activo. El avance real lo decide el BACKEND: esta pantalla siempre
 * pinta el `next_step` que responde el servidor, así que recargar, cambiar de
 * dispositivo o abrir el correo en otro navegador retoma el flujo correcto.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, LifeBuoy, Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import {
  activateTrial, clearSignupToken, fetchSignupState, readSignupToken, registerAccount,
  resendVerificationEmail, sendPhoneCode, storeSignupToken, verifyPhoneCode,
  type SignupState, type TrialActivation,
} from '@/lib/api/signup'
import type { RegisterInput } from '@/lib/validators/schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoginBackdrop } from '@/components/auth/LoginBackdrop'
import { CodexFightFooter } from '@/components/shared/DevHiveFooter'
import { TrialWelcomeCard } from '@/components/shared/TrialStatus'
import { TRIAL_COPY, TRIAL_PERKS_LINE } from '@/lib/constants/trial'
import { AccountStep, BusinessStep, EmailStep, PhoneStep, StepProgress } from './RegisterSteps'

type Stage = 'loading' | 'account' | 'email' | 'phone' | 'business' | 'done' | 'review' | 'blocked'

const STAGE_INDEX: Record<Stage, number> = {
  loading: 0, account: 0, email: 1, phone: 1, business: 2, done: 3, review: 1, blocked: 1,
}

/** Traduce un error de la API a un mensaje humano (nunca técnico). */
function humanError(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiError) {
    const data = (err.data ?? {}) as { message?: string; error?: string }
    return {
      message: data.message || 'No pudimos completar la operación. Inténtalo de nuevo.',
      code: data.error,
    }
  }
  return { message: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' }
}

export default function RegisterPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [signup, setSignup] = useState<SignupState | null>(null)
  const [activation, setActivation] = useState<TrialActivation | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)
  const [checkingEmail, setCheckingEmail] = useState(false)

  /** Coloca la pantalla en el paso que dice el servidor. */
  const applyState = useCallback((s: SignupState) => {
    setSignup(s)
    storeSignupToken(s.signup_token)
    setStage(
      s.next_step === 'verify_email' ? 'email'
      : s.next_step === 'verify_phone' ? 'phone'
      : s.next_step === 'activate' ? 'business'
      : s.next_step === 'review' ? 'review'
      : s.next_step === 'rejected' ? 'blocked'
      : 'done',
    )
  }, [])

  // Reanuda un alta en curso (recarga de página o vuelta desde el correo).
  useEffect(() => {
    const token = readSignupToken()
    if (!token) { setStage('account'); return }

    fetchSignupState(token)
      .then(applyState)
      .catch(() => { clearSignupToken(); setStage('account') })
  }, [applyState])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const handleRegister = async (values: RegisterInput) => {
    setError(null); setErrorCode(undefined)
    try {
      applyState(await registerAccount(values))
    } catch (err) {
      const { message, code } = humanError(err)
      setError(message); setErrorCode(code)
      if (code === 'trial_not_eligible') setStage('blocked')
    }
  }

  const handleCheckEmail = async () => {
    const token = readSignupToken()
    if (!token) { setStage('account'); return }
    setCheckingEmail(true)
    setError(null)
    try {
      const state = await fetchSignupState(token)
      if (!state.email_verified) {
        setError('Todavía no vemos tu correo confirmado. Abre el enlace que te enviamos y vuelve a intentarlo.')
        return
      }
      applyState(state)
      // Confirmado el correo: se dispara el código del teléfono de inmediato.
      await handleSendCode()
    } catch (err) {
      setError(humanError(err).message)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleResendEmail = async () => {
    const token = readSignupToken()
    if (!token) return
    try { await resendVerificationEmail(token) } catch (err) { setError(humanError(err).message) }
  }

  const handleSendCode = useCallback(async () => {
    const token = readSignupToken()
    if (!token) return
    setError(null)
    try {
      await sendPhoneCode(token)
      setCodeSent(true)
      setStage('phone')
    } catch (err) {
      const { message, code } = humanError(err)
      setError(message); setErrorCode(code)
      if (code === 'phone_trial_used' || code === 'trial_not_eligible') setStage('blocked')
    }
  }, [])

  const handleVerifyPhone = async (code: string) => {
    const token = readSignupToken()
    if (!token) return
    setError(null)
    try {
      applyState(await verifyPhoneCode(token, code))
    } catch (err) {
      setError(humanError(err).message)
    }
  }

  const handleActivate = async (businessName: string, address: string) => {
    const token = readSignupToken()
    if (!token) return
    setError(null)
    try {
      const result = await activateTrial(token, businessName, address)
      setActivation(result)
      clearSignupToken()
      setStage('done')
    } catch (err) {
      const { message, code } = humanError(err)
      setError(message); setErrorCode(code)
      if (code === 'trial_not_eligible') setStage('blocked')
      if (code === 'trial_under_review') setStage('review')
    }
  }

  // Al entrar al paso del teléfono sin código enviado, se envía uno.
  useEffect(() => {
    if (stage === 'phone' && !codeSent && signup?.email_verified && !signup.phone_verified) {
      void handleSendCode()
    }
  }, [stage, codeSent, signup, handleSendCode])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen flex-col">
      <LoginBackdrop />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/landing" className="flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver
        </Link>
        <span className="font-heading text-lg font-extrabold text-stone-900">
          Food<span className="text-[#E85D04]">IX</span>
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-lg space-y-6">
          {stage !== 'done' && stage !== 'blocked' && (
            <div className="space-y-3 text-center">
              <h1 className="font-heading text-3xl font-extrabold leading-tight text-stone-900 sm:text-4xl">
                {TRIAL_COPY.registerTitle}
              </h1>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-600 sm:text-base">
                {TRIAL_COPY.registerSub}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#E85D04]">{TRIAL_PERKS_LINE}</p>
            </div>
          )}

          {stage !== 'done' && stage !== 'blocked' && stage !== 'review' && (
            <StepProgress current={STAGE_INDEX[stage]} />
          )}

          <Card className="border border-stone-200 bg-white/95 shadow-sm backdrop-blur">
            <CardContent className="p-5 sm:p-7">
              {stage === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-10 text-stone-500">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Preparando tu registro…
                </div>
              )}

              {stage === 'account' && (
                <AccountStep
                  onSubmit={handleRegister}
                  serverError={error}
                  serverErrorAction={
                    errorCode === 'email_taken' ? (
                      <>
                        <Link href="/login" className="text-xs font-bold text-[#E85D04] hover:underline">
                          Iniciar sesión
                        </Link>
                        <Link href="/login?recuperar=1" className="text-xs font-bold text-[#E85D04] hover:underline">
                          Recuperar contraseña
                        </Link>
                      </>
                    ) : null
                  }
                />
              )}

              {stage === 'email' && signup && (
                <div className="space-y-4">
                  <EmailStep
                    emailMasked={signup.email_masked}
                    onResend={handleResendEmail}
                    onCheck={handleCheckEmail}
                    checking={checkingEmail}
                  />
                  {error && (
                    <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
                      {error}
                    </p>
                  )}
                </div>
              )}

              {stage === 'phone' && signup && (
                <PhoneStep
                  phoneMasked={signup.phone_masked}
                  emailMasked={signup.email_masked}
                  onVerify={handleVerifyPhone}
                  onResend={handleSendCode}
                  error={error}
                />
              )}

              {stage === 'business' && signup && (
                <BusinessStep
                  defaultName={signup.business_name}
                  onActivate={handleActivate}
                  error={error}
                />
              )}

              {stage === 'done' && (
                <TrialWelcomeCard
                  startsAt={activation?.trial.trial_started_at ?? null}
                  endsAt={activation?.trial.trial_ends_at ?? null}
                  onContinue={() => router.push('/login')}
                />
              )}

              {stage === 'review' && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                    <Clock className="h-7 w-7 text-amber-600" aria-hidden="true" />
                  </div>
                  <h2 className="font-heading text-xl font-extrabold text-stone-900">Estamos validando tu solicitud</h2>
                  <p className="text-sm leading-relaxed text-stone-600">
                    Revisaremos tu registro y te avisaremos por correo en cuanto tu prueba quede lista.
                  </p>
                  <Button asChild variant="outline" className="h-11 w-full">
                    <a href="mailto:restauros@atomicmail.io">
                      <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Contactar soporte
                    </a>
                  </Button>
                </div>
              )}

              {stage === 'blocked' && (
                <div className="space-y-4 text-center">
                  <h2 className="font-heading text-xl font-extrabold text-stone-900">
                    Esta cuenta no es elegible para otra prueba gratuita
                  </h2>
                  <p className="text-sm leading-relaxed text-stone-600">{TRIAL_COPY.notEligible}</p>
                  <div className="flex flex-col gap-2">
                    <Button asChild className="h-11 bg-[#E85D04] hover:bg-[#C44D00]">
                      <Link href="/landing#precios">Ver planes</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11">
                      <Link href="/login">Iniciar sesión</Link>
                    </Button>
                    <Button asChild variant="ghost" className="h-11 text-stone-500">
                      <a href="mailto:restauros@atomicmail.io">Contactar soporte</a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {stage !== 'done' && (
            <p className="text-center text-sm text-stone-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-bold text-[#E85D04] hover:underline">
                Inicia sesión
              </Link>
            </p>
          )}
        </div>
      </main>

      <div className="relative z-10 border-t border-stone-200">
        <CodexFightFooter />
      </div>
    </div>
  )
}
