import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { getPlan } from '../../plans'

export const metadata: Metadata = {
  title: 'Pago recibido · FoodIX',
  robots: { index: false },
}

/**
 * Página de retorno de Stripe tras confirmar el pago. Stripe redirige aquí con
 * ?payment_intent=…&redirect_status=…; mostramos confirmación y siguiente paso.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; redirect_status?: string }>
}) {
  const { plan: planId, redirect_status } = await searchParams
  const plan = getPlan(planId)
  const ok = redirect_status !== 'failed'

  return (
    <div className="min-h-screen bg-white text-stone-800 font-sans grid place-items-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-green-50 grid place-items-center">
          <CheckCircle2 className="h-9 w-9 text-green-500" />
        </div>
        <h1 className="mt-6 font-heading font-extrabold text-3xl text-stone-900">
          {ok ? '¡Pago recibido!' : 'Pago en revisión'}
        </h1>
        <p className="mt-3 text-stone-600">
          {ok ? (
            <>Tu suscripción a <span className="font-semibold text-stone-800">{plan.name}</span> está en proceso de activación.
            Te enviaremos por correo tus accesos en unos minutos.</>
          ) : (
            <>Estamos confirmando tu pago. Si se completó, recibirás tus accesos por correo en breve.</>
          )}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-stone-950 bg-[#FACC15] hover:bg-[#EAB308] transition-all active:scale-95 shadow-sm"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all"
          >
            Volver al inicio
          </Link>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          ¿Dudas? Escríbenos a <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400 hover:underline">restauros@atomicmail.io</a>
        </p>
      </div>
    </div>
  )
}
