'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Pasos del alta autoservicio: cuenta → verificación → restaurante → listo.
 *
 * Cada paso es un componente sin estado global propio: recibe lo que necesita y
 * avisa hacia arriba. El estado real del alta vive en el BACKEND (tabla
 * `signups`); aquí solo se refleja lo que el servidor responde.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, MailCheck, RefreshCw, ShieldCheck, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { registerSchema, type RegisterInput } from '@/lib/validators/schemas'
import { TRIAL_CTA, TRIAL_PERKS } from '@/lib/constants/trial'

export const REGISTER_STEPS = ['Cuenta', 'Verificación', 'Tu restaurante', 'Listo'] as const

// ── Indicador de progreso ────────────────────────────────────────────────────

export function StepProgress({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progreso del registro">
      {REGISTER_STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                state === 'done' ? 'bg-[#D1400F]' : state === 'current' ? 'bg-[#D1400F]/60' : 'bg-stone-200',
              )}
            />
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'text-[11px] font-semibold leading-none',
                state === 'todo' ? 'text-stone-400' : 'text-stone-700',
              )}
            >
              <span className="sr-only">Paso {i + 1} de {REGISTER_STEPS.length}: </span>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ── Campo con validación accesible ───────────────────────────────────────────

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

// ── Paso 1 · Cuenta ──────────────────────────────────────────────────────────

export function AccountStep({
  onSubmit,
  serverError,
  serverErrorAction,
}: {
  onSubmit: (values: RegisterInput) => Promise<void>
  serverError: string | null
  serverErrorAction: React.ReactNode
}) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { marketing_opt_in: false },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </p>
          {serverErrorAction && <div className="mt-2 flex flex-wrap gap-3 pl-6">{serverErrorAction}</div>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-sm font-semibold text-stone-700">Nombre</Label>
          <Input
            id="first_name" autoComplete="given-name" placeholder="Carlos"
            className="h-12 rounded-xl text-base"
            aria-invalid={!!errors.first_name} aria-describedby="err-first_name"
            {...register('first_name')}
          />
          <FieldError id="err-first_name" message={errors.first_name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-sm font-semibold text-stone-700">Apellidos</Label>
          <Input
            id="last_name" autoComplete="family-name" placeholder="López Martínez"
            className="h-12 rounded-xl text-base"
            aria-invalid={!!errors.last_name} aria-describedby="err-last_name"
            {...register('last_name')}
          />
          <FieldError id="err-last_name" message={errors.last_name?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name" className="text-sm font-semibold text-stone-700">Nombre de tu restaurante</Label>
        <Input
          id="business_name" autoComplete="organization" placeholder="Taquería El Buen Sabor"
          className="h-12 rounded-xl text-base"
          aria-invalid={!!errors.business_name} aria-describedby="err-business_name"
          {...register('business_name')}
        />
        <FieldError id="err-business_name" message={errors.business_name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-semibold text-stone-700">Correo electrónico</Label>
        <Input
          id="email" type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className="h-12 rounded-xl text-base"
          aria-invalid={!!errors.email} aria-describedby="err-email"
          {...register('email')}
        />
        <FieldError id="err-email" message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-semibold text-stone-700">Teléfono</Label>
        <Input
          id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="773 409 0058"
          className="h-12 rounded-xl text-base"
          aria-invalid={!!errors.phone} aria-describedby="err-phone"
          {...register('phone')}
        />
        <p className="text-xs text-stone-500">Te enviaremos un código para confirmarlo.</p>
        <FieldError id="err-phone" message={errors.phone?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-semibold text-stone-700">Contraseña</Label>
          <div className="relative">
            <Input
              id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="h-12 rounded-xl pr-11 text-base"
              aria-invalid={!!errors.password} aria-describedby="err-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError id="err-password" message={errors.password?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password_confirm" className="text-sm font-semibold text-stone-700">Confirmar contraseña</Label>
          <Input
            id="password_confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
            placeholder="Repite tu contraseña"
            className="h-12 rounded-xl text-base"
            aria-invalid={!!errors.password_confirm} aria-describedby="err-password_confirm"
            {...register('password_confirm')}
          />
          <FieldError id="err-password_confirm" message={errors.password_confirm?.message} />
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-stone-50 p-3">
        <label htmlFor="accept_terms" className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700">
          <input
            id="accept_terms" type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#D1400F]"
            aria-describedby="err-accept_terms"
            {...register('accept_terms')}
          />
          <span>
            Acepto los{' '}
            <Link href="/terminos" target="_blank" className="font-semibold text-[#D1400F] hover:underline">
              términos y condiciones
            </Link>
          </span>
        </label>
        <FieldError id="err-accept_terms" message={errors.accept_terms?.message} />

        <label htmlFor="accept_privacy" className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700">
          <input
            id="accept_privacy" type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#D1400F]"
            aria-describedby="err-accept_privacy"
            {...register('accept_privacy')}
          />
          <span>
            Acepto el{' '}
            <Link href="/privacidad" target="_blank" className="font-semibold text-[#D1400F] hover:underline">
              aviso de privacidad
            </Link>
          </span>
        </label>
        <FieldError id="err-accept_privacy" message={errors.accept_privacy?.message} />

        {/* Consentimiento opcional: nunca preseleccionado. */}
        <label htmlFor="marketing_opt_in" className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-500">
          <input
            id="marketing_opt_in" type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#D1400F]"
            {...register('marketing_opt_in')}
          />
          <span>Quiero recibir novedades y consejos de FoodIX (opcional)</span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[#D1400F] text-base font-semibold transition-all hover:bg-[#B03508] active:scale-95"
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creando tu cuenta…</>
        ) : (
          <>{TRIAL_CTA.register} <ArrowRight className="h-4 w-4" aria-hidden="true" /></>
        )}
      </Button>

      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-stone-500">
        {TRIAL_PERKS.map(perk => (
          <li key={perk} className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> {perk}
          </li>
        ))}
      </ul>
    </form>
  )
}

// ── Paso 2a · Verificación de correo ─────────────────────────────────────────

export function EmailStep({
  emailMasked,
  onResend,
  onCheck,
  checking,
}: {
  emailMasked: string
  onResend: () => Promise<void>
  onCheck: () => Promise<void>
  checking: boolean
}) {
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const resend = async () => {
    setResending(true)
    try {
      await onResend()
      setSent(true)
      setCooldown(45)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
        <MailCheck className="h-7 w-7 text-[#D1400F]" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-xl font-extrabold text-stone-900">Confirma tu correo</h2>
        <p className="text-sm leading-relaxed text-stone-600">
          Enviamos un enlace a <strong className="text-stone-900">{emailMasked}</strong>.
          Ábrelo para continuar — el enlace caduca en 1 hora.
        </p>
      </div>

      {sent && (
        <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          Te reenviamos el correo. Revisa también la carpeta de spam.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button" onClick={onCheck} disabled={checking}
          className="h-12 rounded-xl bg-[#D1400F] text-base hover:bg-[#B03508]"
        >
          {checking
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verificando tu correo…</>
            : 'Ya confirmé mi correo'}
        </Button>

        <Button
          type="button" variant="ghost" onClick={resend} disabled={resending || cooldown > 0}
          className="h-11 text-stone-600"
        >
          {resending
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…</>
            : cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : <><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reenviar correo</>}
        </Button>
      </div>
    </div>
  )
}

// ── Paso 2b · Código de verificación ─────────────────────────────────────────

/**
 * El código de 6 dígitos llega SIEMPRE por correo (no hay SMS ni WhatsApp).
 * Confirma el teléfono que el usuario escribió y cierra la verificación de
 * identidad antes de crear el restaurante.
 */
export function PhoneStep({
  phoneMasked,
  emailMasked,
  onVerify,
  onResend,
  error,
}: {
  phoneMasked: string | null
  emailMasked: string
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  error: string | null
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || busy) return
    setBusy(true)
    try { await onVerify(code) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5 text-center" noValidate>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
        <ShieldCheck className="h-7 w-7 text-[#D1400F]" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-xl font-extrabold text-stone-900">Escribe tu código</h2>
        <p className="text-sm leading-relaxed text-stone-600">
          Enviamos un código de 6 dígitos a{' '}
          <strong className="text-stone-900">{emailMasked}</strong>
          {phoneMasked && (
            <> para confirmar el teléfono <strong className="text-stone-900">{phoneMasked}</strong></>
          )}.
        </p>
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="otp" className="text-sm font-semibold text-stone-700">Código de verificación</Label>
        <Input
          ref={inputRef}
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={!!error}
          aria-describedby="err-otp"
          className="h-14 rounded-xl text-center text-2xl font-bold tracking-[0.5em]"
        />
        <FieldError id="err-otp" message={error ?? undefined} />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="submit" disabled={code.length !== 6 || busy}
          className="h-12 rounded-xl bg-[#D1400F] text-base hover:bg-[#B03508]"
        >
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Validando código…</>
            : 'Verificar mi cuenta'}
        </Button>

        <Button
          type="button" variant="ghost" disabled={resending || cooldown > 0}
          onClick={async () => {
            setResending(true)
            try { await onResend(); setCooldown(45); setCode('') } finally { setResending(false) }
          }}
          className="h-11 text-stone-600"
        >
          {resending
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando código…</>
            : cooldown > 0 ? `Reenviar código en ${cooldown}s` : 'Reenviar código por correo'}
        </Button>
      </div>
    </form>
  )
}

// ── Paso 3 · Tu restaurante ──────────────────────────────────────────────────

export function BusinessStep({
  defaultName,
  onActivate,
  error,
}: {
  defaultName: string
  onActivate: (businessName: string, address: string) => Promise<void>
  error: string | null
}) {
  const [name, setName] = useState(defaultName)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2 || busy) return
    setBusy(true)
    try { await onActivate(name.trim(), address.trim()) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
          <Store className="h-7 w-7 text-[#D1400F]" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-xl font-extrabold text-stone-900">Configura tu restaurante</h2>
        <p className="text-sm text-stone-600">Así se verá en tu panel, tickets y carta digital.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="biz_name" className="text-sm font-semibold text-stone-700">Nombre del restaurante</Label>
        <Input
          id="biz_name" value={name} onChange={e => setName(e.target.value)}
          autoComplete="organization" maxLength={100}
          className="h-12 rounded-xl text-base"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz_address" className="text-sm font-semibold text-stone-700">
          Dirección <span className="font-normal text-stone-400">(opcional)</span>
        </Label>
        <Input
          id="biz_address" value={address} onChange={e => setAddress(e.target.value)}
          autoComplete="street-address" maxLength={255}
          placeholder="Av. Juárez 123, Centro"
          className="h-12 rounded-xl text-base"
        />
      </div>

      <Button
        type="submit" disabled={busy || name.trim().length < 2}
        className="h-12 w-full rounded-xl bg-[#D1400F] text-base font-semibold hover:bg-[#B03508]"
      >
        {busy
          ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Activando tus 14 días gratis…</>
          : <>Activar mis 14 días gratis <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
      </Button>
    </form>
  )
}
