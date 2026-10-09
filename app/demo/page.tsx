/**
 * FoodIX — Modo Demo
 * "Login" demo: accesos rápidos por rol con prueba gratis de 30 min.
 * No autentica contra backend; inicia una sesión demo local.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CodexFightFooter } from '@/components/shared/DevHiveFooter'
import { DemoLoginCards } from '@/components/demo/DemoLoginCards'

/** Aviso de fin de prueba (al volver con ?demo_expired=1). */
function DemoEndedNotice() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(searchParams.get('demo_expired') === '1')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border-white/10 bg-[#0a0a0a] text-white sm:max-w-sm">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FACC15]/30 blur-3xl"
          aria-hidden
        />
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-[#FACC15]/15 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-white">
            Tu prueba demo ha finalizado
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-center text-sm leading-relaxed text-white/70">
          Esperamos que te haya gustado FoodIX. Puedes iniciar una nueva prueba cuando
          quieras desde aquí.
        </p>
        <Button
          onClick={() => setOpen(false)}
          className="mt-2 w-full bg-[#FACC15] text-stone-950 transition-all hover:bg-[#EAB308] active:scale-95"
        >
          Iniciar una nueva prueba
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default function DemoLoginPage() {
  return (
    <div className="min-h-screen bg-stone-100 p-4">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-6 py-8">
        {/* Marca */}
        <div className="space-y-2 text-center animate-scale-in">
          <div className="mx-auto flex h-16 items-center justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-stone-100/10 bg-[#FACC15] font-heading text-4xl font-bold text-stone-950 shadow-sm">
              R
            </div>
          </div>
          <h1 className="font-heading text-3xl font-bold">
            Food<span className="text-yellow-700 dark:text-yellow-400">IX</span><sup className="align-super text-[0.55em]">©</sup>
          </h1>
          <p className="text-sm text-muted-foreground">Tu restaurante, en orden</p>
        </div>

        <DemoLoginCards />

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-stone-500 transition-colors hover:text-yellow-700 dark:hover:text-yellow-400"
          >
            ¿Ya tienes cuenta? Inicia sesión real →
          </Link>
        </div>

        <div className="animate-fade-in-up delay-500">
          <CodexFightFooter />
        </div>
      </div>

      <Suspense fallback={null}>
        <DemoEndedNotice />
      </Suspense>
    </div>
  )
}
