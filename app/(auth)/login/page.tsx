'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginInput } from '@/lib/validators/schemas'
import { useAuthStore } from '@/lib/stores/authStore'
import { apiRequest } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { AuthOverlay } from '@/components/shared/LoadingSpinner'
import { CodexFightFooter } from '@/components/shared/DevHiveFooter'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { DeviceRejectedScreen } from '@/components/shared/DeviceRejectedScreen'
import { PinPad } from '@/components/shared/PinPad'
import { LoginHelpModal } from '@/components/auth/LoginHelpModal'
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal'
import { LoginBackdrop } from '@/components/auth/LoginBackdrop'
import { MarqueeText } from '@/components/shared/MarqueeText'
import { startDemoTrial } from '@/lib/demo/demo-session'
import { TRIAL_PERKS_LINE } from '@/lib/constants/trial'
import type { DemoRole } from '@/lib/demo/demo-types'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type OverlayState = 'none' | 'device_rejected' | 'subscription_inactive'

/**
 * Credenciales reservadas para el modo demo: si se escriben en el login real,
 * NO se autentican contra el backend; redirigen al entorno demo del rol.
 */
const DEMO_LOGINS: Record<string, { role: DemoRole; path: string; label: string }> = {
  admin: { role: 'admin', path: '/demo/admin', label: 'Admin' },
  mesero: { role: 'waiter', path: '/demo/waiter', label: 'Mesero' },
  cocina: { role: 'kitchen', path: '/demo/kitchen', label: 'Cocina' },
}

interface UsernameLookup {
  found: boolean
  logo_url: string | null
  name?: string
  requires_pin?: boolean
  has_pin?: boolean
  user_id?: number
  branch_id?: number
}

interface PinGate {
  userId: number
  branchId: number
  name: string
  hasPin: boolean
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'
  // El registro enlaza aquí con ?recuperar=1 cuando el correo ya tiene cuenta,
  // para que el modal de recuperación se abra solo (CTA "Recuperar contraseña").
  const wantsRecovery = searchParams.get('recuperar') === '1'
  const login = useAuthStore(s => s.login)
  const pinLogin = useAuthStore(s => s.pinLogin)
  const checkSession = useAuthStore(s => s.checkSession)
  const user = useAuthStore(s => s.user)

  const [showPassword, setShowPassword] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [overlay, setOverlay] = useState<OverlayState>('none')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(wantsRecovery)

  // Logo dinámico: muestra el del restaurante del usuario escrito (con fundido)
  const [brandSrc, setBrandSrc] = useState<string>(ICONS8.brand)
  const [brandFading, setBrandFading] = useState(false)
  const brandTargetRef = useRef<string>(ICONS8.brand)

  // Nombre del restaurante encontrado: reemplaza el wordmark "FoodIX" en
  // cuanto se identifica el usuario escrito (mismo lookup que el logo).
  const [restaurantName, setRestaurantName] = useState<string | null>(null)

  // Acceso por PIN automático: si el usuario escrito es mesero/cocina, el
  // campo de contraseña se transforma en el teclado numérico centrado.
  const [pinGate, setPinGate] = useState<PinGate | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const pinGateTargetRef = useRef<PinGate | null>(null)
  const [showPinPad, setShowPinPad] = useState(false)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const redirectByRole = useCallback((role: string) => {
    if (role === 'superadmin') router.replace('/superadmin')
    else if (role === 'cocina') router.replace('/kitchen')
    else router.replace('/')
  }, [router])

  useEffect(() => {
    checkSession().then(() => {
      const { user } = useAuthStore.getState()
      if (user) {
        redirectByRole(user.role)
      }
    })
  }, [checkSession, redirectByRole])

  const {
    register,
    handleSubmit,
    watch,
    resetField,
    setFocus,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const usernameVal = watch('username')
  const passwordVal = watch('password')

  // ¿El usuario escrito es una credencial demo reservada? (admin/mesero/cocina)
  const demoMatch = DEMO_LOGINS[(usernameVal ?? '').trim().toLowerCase()] ?? null

  // Entra al modo demo del rol sin tocar el backend real ni la auth productiva.
  const enterDemo = useCallback(() => {
    if (!demoMatch) return
    startDemoTrial(demoMatch.role)
    router.push(demoMatch.path)
  }, [demoMatch, router])

  // Resuelve el logo y el método de acceso según el usuario escrito: hace
  // fade-out/in del logo y, si tiene PIN, activa el gateTarget.
  useEffect(() => {
    const uname = (usernameVal ?? '').trim()
    // Credenciales demo: nunca consultan el backend de producción.
    if (DEMO_LOGINS[uname.toLowerCase()]) {
      if (brandTargetRef.current !== ICONS8.brand) {
        brandTargetRef.current = ICONS8.brand
        setBrandFading(true)
        setTimeout(() => { setBrandSrc(ICONS8.brand); setBrandFading(false) }, 220)
      }
      pinGateTargetRef.current = null
      setPinGate(null)
      setShowPinPad(false)
      setRestaurantName(null)
      return
    }
    const handle = setTimeout(async () => {
      let logoTarget: string = ICONS8.brand
      let gateTarget: PinGate | null = null
      let nameTarget: string | null = null

      if (uname.length >= 3) {
        try {
          const r = await apiRequest<{
            exists: boolean
            has_pin: boolean
            user_id?: number
            branch_id?: number
            name?: string
            role?: string
            logo_url?: string | null
            branch_name?: string | null
          }>(
            '/auth/check-pin',
            {
              method: 'POST',
              auth: false,
              body: JSON.stringify({ identity: uname }),
            }
          )
          if (r.exists) {
            logoTarget = r.logo_url || ICONS8.restaurantDefault
            nameTarget = r.branch_name?.trim() || null
            if (r.has_pin && r.user_id != null && r.branch_id != null) {
              gateTarget = {
                userId: r.user_id,
                branchId: r.branch_id,
                name: r.name ?? uname,
                hasPin: true
              }
            }
          }
        } catch { /* sin conexión: mantener marca y modo por defecto */ }
      }

      setRestaurantName(nameTarget)

      if (logoTarget !== brandTargetRef.current) {
        brandTargetRef.current = logoTarget
        setBrandFading(true)
        setTimeout(() => { setBrandSrc(logoTarget); setBrandFading(false) }, 220)
      }

      const sameGate = JSON.stringify(gateTarget) === JSON.stringify(pinGateTargetRef.current)
      if (!sameGate) {
        pinGateTargetRef.current = gateTarget
        // Cambio de gate instantáneo: el pad de PIN reemplaza la contraseña
        // en cuanto se resuelve la identidad, sin retraso artificial.
        setPinGate(gateTarget)
        setPinValue('')
        setPinError('')
        setPinSuccess(false)
        setShowPinPad(!!gateTarget?.hasPin)
      }
    }, 200)
    return () => clearTimeout(handle)
  }, [usernameVal])

  const submitPin = useCallback(async (fullPin: string) => {
    if (!pinGate) return
    setPinBusy(true)
    setPinError('')
    const res = await pinLogin(pinGate.userId, fullPin, pinGate.branchId)
    if (res.success) {
      setPinSuccess(true)
      setPinBusy(false)
      successTimeoutRef.current = setTimeout(() => {
        const { user } = useAuthStore.getState()
        if (user) redirectByRole(user.role)
      }, 1500)
    } else {
      setPinBusy(false)
      setPinValue('')
      setPinError(res.message ?? 'PIN incorrecto.')
      toast.error('Acceso denegado', { description: res.message ?? 'PIN incorrecto.' })
    }
  }, [pinGate, pinLogin, redirectByRole])

  // Auto-submit when PIN is complete (4 digits)
  useEffect(() => {
    if (pinValue.length === 4 && !pinBusy && !pinSuccess) {
      submitPin(pinValue)
    }
  }, [pinValue, pinBusy, pinSuccess, submitPin])

  const handlePinChange = (val: string) => {
    setPinValue(val)
    if (pinError) setPinError('')
  }

  const changeUser = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
    pinGateTargetRef.current = null
    setPinGate(null)
    setPinValue('')
    setPinError('')
    setPinSuccess(false)
    setShowPinPad(false)
    setValue('username', '')
    resetField('password')
    setTimeout(() => setFocus('username'), 0)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  const onSubmit = async (data: LoginInput) => {
    if (showPinPad) return
    // Credenciales demo: redirigir al entorno demo sin autenticar en backend.
    if (DEMO_LOGINS[(data.username ?? '').trim().toLowerCase()]) {
      enterDemo()
      return
    }
    setIsLoggingIn(true)
    const result = await login(data.username, data.password)

    if (!result.success) {
      setIsLoggingIn(false)

      if (result.error === 'device_rejected') {
        setOverlay('device_rejected')
        return
      }
      if (result.error === 'subscription_inactive') {
        setOverlay('subscription_inactive')
        return
      }

      setShakeKey(k => k + 1)
      // Credenciales incorrectas: limpia la contraseña y vuelve a enfocarla
      resetField('password')
      setFocus('password')
      toast.error('Acceso denegado', {
        description: result.message ?? 'Verifica tus credenciales.',
        duration: 4500,
      })
      return
    }

    const { user } = useAuthStore.getState()
    if (user) redirectByRole(user.role)
  }

  if (overlay === 'device_rejected') {
    return <DeviceRejectedScreen />
  }

  if (overlay === 'subscription_inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <Icons8Image src={ICONS8.subscription} alt="Suscripción" size={96} className="mx-auto" />
          <h1 className="text-2xl font-bold">Suscripción Inactiva</h1>
          <p className="text-stone-600 text-sm">
            Tu suscripción no está activa. Contacta al administrador para renovarla.
          </p>
          <Button asChild variant="outline" className="w-full">
            <a href="mailto:restauros@atomicmail.io">Contactar Soporte</a>
          </Button>
          <Button variant="ghost" onClick={() => setOverlay('none')} className="w-full text-stone-500">
            Volver al login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoggingIn && (
        <AuthOverlay message="Verificando credenciales…" />
      )}

      <div className="relative min-h-screen flex flex-col dot-grid-bg overflow-hidden">
        <LoginBackdrop />

        {/* Barra superior: wordmark + logo R y enlace de ayuda */}
        <header className="fixed top-0 inset-x-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/foodix-icon.svg"
              alt="FoodIX"
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 rounded-lg shrink-0"
            />
            <span className="relative inline-block text-lg font-bold font-heading leading-none animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
              Food<span className="text-[#E85D04]">IX</span><sup className="ml-0.5 align-super text-[0.55em] font-bold text-muted-foreground">&copy;</sup>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ¿Necesitas ayuda?
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-20 pt-24 lg:pt-24">
          <div className="w-full max-w-md mx-auto space-y-8">

            <div className="space-y-3 animate-scale-in">
              {/* Logo dinámico: por defecto la marca FoodIX, o el del restaurante escrito */}
              <div className="h-14 flex items-center">
                {brandSrc === ICONS8.brand ? (
                  <Image
                    key="default-logo"
                    src="/brand/foodix-icon.svg"
                    alt="FoodIX"
                    width={56}
                    height={56}
                    unoptimized
                    className={cn(
                      'h-14 w-14 rounded-2xl shadow-sm transition-opacity duration-200',
                      brandFading ? 'opacity-0' : 'opacity-100',
                    )}
                  />
                ) : (
                  <Icons8Image
                    key={brandSrc}
                    src={brandSrc}
                    alt="Logo"
                    size={56}
                    className={cn(
                      'rounded-2xl transition-opacity duration-200',
                      brandFading ? 'opacity-0' : 'opacity-100',
                    )}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                {restaurantName ? (
                  <h1 className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight leading-none animate-fade-in">
                    <MarqueeText
                      text={restaurantName}
                      className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight leading-none text-stone-900"
                      viewportClassName="max-w-full"
                    />
                  </h1>
                ) : (
                  <h1 className="relative inline-block text-4xl sm:text-5xl font-extrabold font-heading tracking-tight leading-none">
                    <span className="sr-only">Iniciar sesión — FoodIX</span>
                    <span
                      aria-hidden="true"
                      className="inline-block animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]"
                    >
                      Food<span className="text-[#E85D04]">IX</span>
                      <sup className="ml-0.5 align-super text-[0.5em] font-bold text-muted-foreground">&copy;</sup>
                    </span>
                  </h1>
                )}
                <p className="text-base sm:text-lg font-medium text-stone-500">Tu restaurante, en orden</p>
              </div>
            </div>

            <div
              key={shakeKey}
              className={cn('animate-fade-in-up', shakeKey > 0 && 'animate-shake')}
            >
              <Card className="border border-stone-200 bg-stone-50 shadow-none">
                <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  {isExpired && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
                      <span>⏱️</span>
                      <span>Tu sesión expiró. Por favor inicia sesión nuevamente.</span>
                    </div>
                  )}

                  {/* Usuario */}
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-sm font-semibold text-stone-700">Usuario</Label>
                    <div className="relative">
                      <Icons8Image
                        src={ICONS8.userInput}
                        alt="Usuario"
                        size={19}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(64%) saturate(2615%) hue-rotate(2deg) brightness(98%) contrast(94%)' }}
                      />
                      <Input
                        id="username"
                        type="text"
                        placeholder="nombre_usuario"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn(
                          'h-12 rounded-xl pl-11 pr-10 text-base transition-colors',
                          usernameVal && 'font-semibold',
                          errors.username && 'border-destructive focus-visible:ring-destructive',
                          !errors.username && dirtyFields.username && usernameVal && 'border-green-500 focus-visible:ring-green-500'
                        )}
                        {...register('username')}
                      />
                      {dirtyFields.username && usernameVal && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          {errors.username
                            ? <AlertCircle className="h-4 w-4 text-destructive" />
                            : <CheckCircle2 className="h-4 w-4 text-green-500" />
                          }
                        </span>
                      )}
                    </div>
                    {errors.username && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  {/* Password — desaparece al instante en cuanto se detecta un usuario con PIN */}
                  {!showPinPad && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label htmlFor="password" className="text-sm font-semibold text-stone-700">Contraseña</Label>
                      <div className="relative">
                        <Icons8Image
                          src={ICONS8.passwordInput}
                          alt="Contraseña"
                          size={19}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                          style={{ filter: 'brightness(0) saturate(100%) invert(45%) sepia(64%) saturate(2615%) hue-rotate(2deg) brightness(98%) contrast(94%)' }}
                        />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="off"
                          className={cn(
                            'h-12 rounded-xl pl-11 pr-16 text-base transition-colors',
                            passwordVal && 'font-semibold tracking-wider',
                            errors.password && 'border-destructive focus-visible:ring-destructive',
                            !errors.password && dirtyFields.password && passwordVal && 'border-green-500 focus-visible:ring-green-500',
                          )}
                          {...register('password')}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {dirtyFields.password && passwordVal && (
                            <span>
                              {errors.password
                                ? <AlertCircle className="h-4 w-4 text-destructive" />
                                : <CheckCircle2 className="h-4 w-4 text-green-500" />
                              }
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.password.message}
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowForgotPasswordModal(true)}
                          className="text-xs font-bold text-[#E85D04] hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    </div>
                  )}

                  {!showPinPad && demoMatch ? (
                    <div className="space-y-2 animate-fade-in">
                      <Button
                        type="button"
                        onClick={enterDemo}
                        className="w-full h-12 rounded-xl text-base bg-[#E85D04] hover:bg-[#C44D00] transition-all active:scale-95"
                      >
                        <Sparkles className="h-4 w-4" />
                        Entrar al demo · {demoMatch.label}
                      </Button>
                      <p className="text-center text-xs text-stone-500">
                        Modo demo: sesión temporal de 30 min, no afecta datos reales.
                      </p>
                    </div>
                  ) : !showPinPad && (
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold bg-[#E85D04] hover:bg-[#C44D00] transition-all active:scale-95"
                      disabled={isSubmitting || isLoggingIn || !usernameVal?.trim() || !passwordVal?.trim()}
                    >
                      {isSubmitting || isLoggingIn ? (
                        'Verificando…'
                      ) : (
                        <>
                          <Icons8Image
                            src={ICONS8.loginEnter}
                            alt=""
                            size={18}
                            className="brightness-0 invert"
                          />
                          Ingresar
                        </>
                      )}
                    </Button>
                  )}
                </form>
                </CardContent>
              </Card>
            </div>

            {/* Alta autoservicio: la puerta de entrada a la prueba de 14 días.
                Se oculta mientras el teclado de PIN está activo (ahí el usuario
                ya es un empleado de un restaurante existente). */}
            {!showPinPad && (
              <div className="animate-fade-in-up space-y-3 text-center delay-300">
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-stone-200" />
                  <span className="text-xs font-medium text-stone-400">¿Aún no tienes una cuenta?</span>
                  <span className="h-px flex-1 bg-stone-200" />
                </div>

                <p className="text-sm text-stone-600">
                  Prueba FoodIX gratis durante 14 días
                </p>

                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-xl border-[#E85D04]/40 text-base font-semibold text-[#E85D04] transition-colors hover:bg-orange-50 hover:text-[#C44D00]"
                >
                  <Link href="/register">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Crear cuenta gratis
                  </Link>
                </Button>

                <p className="text-xs text-stone-500">{TRIAL_PERKS_LINE}</p>
              </div>
            )}
          </div>

          {/* PIN pad — overlay centrado con fondo desenfocado, sin retraso: aparece
              en cuanto se resuelve el gate, en vez de esperar a un dialog aparte. */}
          {showPinPad && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
              onClick={changeUser}
            >
              <div
                className="w-full max-w-sm animate-keypad-in rounded-2xl bg-[#0a0a0a] px-5 py-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={changeUser}
                  className="flex items-center gap-1 text-xs text-neutral-400 mb-4 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Cambiar usuario / Cancelar
                </button>

                <div className="text-center mb-6">
                  <p className="text-xs text-neutral-400">Hola,</p>
                  <h2 className="text-xl font-bold text-[#E85D04]">{pinGate?.name}</h2>
                  <p className="text-neutral-500 text-xs mt-1">Ingresa tu PIN de 4 dígitos</p>
                </div>

                <PinPad
                  value={pinValue}
                  onChange={handlePinChange}
                  maxLength={4}
                  error={pinError}
                  loading={pinBusy}
                  success={pinSuccess}
                />

                {pinError && (
                  <p className="text-red-400 text-xs mt-3 text-center font-medium animate-shake">{pinError}</p>
                )}
              </div>
            </div>
          )}

          <LoginHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
          <ForgotPasswordModal isOpen={showForgotPasswordModal} onClose={() => setShowForgotPasswordModal(false)} />
        </div>

        <div className="animate-fade-in-up delay-500 border-t border-stone-200">
          <CodexFightFooter />
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#E85D04] border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
