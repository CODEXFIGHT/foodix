'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Destino del enlace de verificación de correo.
 *
 * El token viaja en la URL, se canjea UNA sola vez contra el backend y se
 * cambia por un handle nuevo del registro; después la pantalla devuelve al
 * usuario a /register, que continúa en el paso que corresponda. Como el handle
 * se emite aquí, el correo puede abrirse en otro navegador o dispositivo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { fetchSignupState, readSignupToken, verifyEmailToken } from '@/lib/api/signup'
import { Button } from '@/components/ui/button'

function VerifyInner() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working')
  const [message, setMessage] = useState('')

  // El token es de un solo uso: hay que canjearlo EXACTAMENTE una vez. Sin esta
  // guarda, el doble montaje de React en desarrollo (StrictMode) gasta el token
  // en la primera llamada y la segunda muestra "enlace ya usado" al usuario.
  const claimed = useRef(false)

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('El enlace de verificación no es válido.')
      return
    }
    if (claimed.current) return
    claimed.current = true

    const succeed = () => {
      setState('ok')
      setTimeout(() => router.replace('/register'), 1200)
    }

    verifyEmailToken(token)
      .then(succeed)
      .catch(async (err: unknown) => {
        const data = err instanceof ApiError ? (err.data as { message?: string; error?: string } | undefined) : undefined

        // Un token ya consumido no siempre es un fallo real: puede ser una
        // recarga de esta misma pantalla. Si el registro en curso ya tiene el
        // correo confirmado, se continúa en vez de asustar al usuario.
        if (data?.error === 'token_used') {
          const handle = readSignupToken()
          if (handle) {
            const fresh = await fetchSignupState(handle).catch(() => null)
            if (fresh?.email_verified) { succeed(); return }
          }
        }

        setState('error')
        setMessage(data?.message ?? 'No pudimos confirmar tu correo. Solicita un enlace nuevo.')
      })
  }, [token, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {state === 'working' && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-700" aria-hidden="true" />
            <p role="status" className="mt-4 text-sm text-stone-600">Verificando tu correo…</p>
          </>
        )}

        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" aria-hidden="true" />
            <h1 className="mt-4 font-heading text-xl font-extrabold text-stone-900">Correo confirmado</h1>
            <p role="status" className="mt-2 text-sm text-stone-600">
              Te llevamos de vuelta para terminar tu registro…
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 font-heading text-xl font-extrabold text-stone-900">No pudimos confirmar tu correo</h1>
            <p role="alert" className="mt-2 text-sm text-stone-600">{message}</p>
            <Button asChild className="mt-6 h-11 w-full bg-[#FACC15] hover:bg-[#EAB308]">
              <Link href="/register">Volver al registro</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-700 dark:text-yellow-400" aria-hidden="true" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  )
}
