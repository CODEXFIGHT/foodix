/**
 * FoodIX — Modo Demo
 * Sección "Prueba FoodIX gratis" para el módulo de login. Muestra tarjetas
 * premium por rol (Admin, Mesero, Cocina). Al elegir una, abre el modal
 * informativo y, al confirmar, inicia una prueba demo de 30 minutos.
 *
 * No pide contraseña ni consulta el backend real: la auth demo está
 * completamente separada de la auth real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ConciergeBell, ChefHat, ArrowRight, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { startDemoTrial } from '@/lib/demo/demo-session'
import type { DemoRole } from '@/lib/demo/demo-types'
import { DemoStartModal } from './DemoStartModal'

interface RoleCard {
  role: DemoRole
  label: string
  desc: string
  path: string
  Icon: LucideIcon
  accent: string
  glow: string
}

const ROLES: RoleCard[] = [
  {
    role: 'admin',
    label: 'Admin Demo',
    desc: 'Dashboard, menú y reportes',
    path: '/demo/admin',
    Icon: ShieldCheck,
    accent: 'bg-[#D1400F]',
    glow: 'hover:shadow-[#D1400F]/20',
  },
  {
    role: 'waiter',
    label: 'Mesero Demo',
    desc: 'Toma órdenes en sala',
    path: '/demo/waiter',
    Icon: ConciergeBell,
    accent: 'bg-blue-600',
    glow: 'hover:shadow-blue-500/20',
  },
  {
    role: 'kitchen',
    label: 'Cocina Demo',
    desc: 'Prepara y despacha platillos',
    path: '/demo/kitchen',
    Icon: ChefHat,
    accent: 'bg-green-600',
    glow: 'hover:shadow-green-500/20',
  },
]

export function DemoLoginCards() {
  const router = useRouter()
  const [selected, setSelected] = useState<RoleCard | null>(null)
  const [busy, setBusy] = useState(false)

  function confirm() {
    if (!selected) return
    setBusy(true)
    startDemoTrial(selected.role)
    router.push(selected.path)
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-5 text-white shadow-xl ring-1 ring-white/10 animate-fade-in-up sm:p-6">
      {/* Glow de marca */}
      <div
        className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-[#D1400F]/25 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1400F]/15 px-2.5 py-1 text-xs font-semibold text-[#F5A623]">
          <Sparkles className="h-3.5 w-3.5" />
          Prueba FoodIX gratis
        </span>
        <h2 className="text-lg font-bold leading-tight">Explóralo sin registrarte</h2>
        <p className="text-sm leading-relaxed text-white/60">
          Descubre cómo FoodIX conecta <span className="text-white/90">Meseros</span>,{' '}
          <span className="text-white/90">Cocina</span> y{' '}
          <span className="text-white/90">Administración</span> en tiempo real. Sin tarjeta, sin
          compromisos.
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-2.5">
        {ROLES.map((r, i) => (
          <button
            key={r.role}
            onClick={() => setSelected(r)}
            style={{ animationDelay: `${120 + i * 70}ms` }}
            className={cn(
              'group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left',
              'shadow-sm ring-1 ring-transparent transition-all duration-200 animate-fade-in-up',
              'hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-lg active:scale-[0.98]',
              r.glow,
            )}
          >
            <span
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white shadow-md transition-transform group-hover:scale-110',
                r.accent,
              )}
            >
              <r.Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{r.label}</span>
              <span className="block truncate text-xs text-white/55">{r.desc}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-[#F5A623]" />
          </button>
        ))}
      </div>

      <p className="relative mt-3 text-center text-xs leading-relaxed text-white/40">
        💡 Abre <span className="font-medium text-white/70">Mesero</span> y{' '}
        <span className="font-medium text-white/70">Cocina</span> en pestañas distintas para ver la
        sincronización en vivo.
      </p>

      <DemoStartModal
        open={selected !== null}
        role={selected?.role ?? null}
        busy={busy}
        onConfirm={confirm}
        onCancel={() => { if (!busy) setSelected(null) }}
      />
    </section>
  )
}
