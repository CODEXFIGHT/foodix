/**
 * FoodIX — Modo Demo
 * Modal informativo premium (dark) que se muestra antes de iniciar la prueba.
 * Explica que la sesión es temporal, dura 30 minutos y no guarda datos reales.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import {
  ShieldCheck,
  ConciergeBell,
  ChefHat,
  Clock,
  Database,
  Trash2,
  Sparkles,
  ShieldAlert,
  Rocket,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { DEMO_RESTAURANT_NAME } from '@/lib/demo/demo-seed'
import type { DemoRole } from '@/lib/demo/demo-types'

interface RoleMeta {
  label: string
  Icon: LucideIcon
  accent: string
}

const ROLE_META: Partial<Record<DemoRole, RoleMeta>> = {
  admin: { label: 'Admin Demo', Icon: ShieldCheck, accent: 'bg-[#E85D04]' },
  waiter: { label: 'Mesero Demo', Icon: ConciergeBell, accent: 'bg-blue-600' },
  kitchen: { label: 'Cocina Demo', Icon: ChefHat, accent: 'bg-green-600' },
}

const POINTS: { Icon: LucideIcon; text: string }[] = [
  { Icon: Sparkles, text: 'Esta es una prueba temporal de FoodIX.' },
  { Icon: Clock, text: 'La sesión demo dura 30 minutos.' },
  { Icon: Database, text: 'Lo que agregues, edites o elimines no se guardará permanentemente.' },
  { Icon: Trash2, text: 'Al cerrar el navegador, cerrar sesión o terminar el tiempo, la información se borrará.' },
  { Icon: Sparkles, text: 'El demo incluye datos de ejemplo para que explores el sistema.' },
  { Icon: ShieldAlert, text: 'No uses información real de clientes, ventas o negocios.' },
]

interface Props {
  open: boolean
  role: DemoRole | null
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DemoStartModal({ open, role, busy, onConfirm, onCancel }: Props) {
  const meta = (role && ROLE_META[role]) || ROLE_META.admin!

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel() }}>
      <DialogContent
        className={cn(
          'flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0',
          'border-white/10 bg-[#0a0a0a] text-white sm:max-w-md',
        )}
      >
        {/* Glow naranja de marca */}
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#E85D04]/30 blur-3xl"
          aria-hidden
        />

        <DialogHeader className="shrink-0 space-y-3 px-5 pt-5 pr-12 sm:px-6 sm:pt-6 sm:pr-12">
          <div className="flex items-center gap-3">
            <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-lg', meta.accent)}>
              <meta.Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-[#F5A623]">
                {meta.label}
              </p>
              <DialogTitle className="text-left text-base font-bold text-white sm:text-lg">
                Prueba FoodIX gratis
              </DialogTitle>
            </div>
          </div>
          <p className="text-left text-sm leading-relaxed text-white/60">
            Estás por entrar a <span className="font-semibold text-white">{DEMO_RESTAURANT_NAME}</span>,
            un entorno de demostración seguro. Antes de comenzar, ten en cuenta:
          </p>
        </DialogHeader>

        <ul className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4 sm:px-6">
          {POINTS.map(({ Icon, text }, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/5"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#E85D04]/15 text-[#F5A623]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm leading-snug text-white/85">{text}</span>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="w-full text-white/70 hover:bg-white/10 hover:text-white sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className="w-full bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20 transition-all hover:bg-[#C44D00] active:scale-95 sm:w-auto"
          >
            <Rocket className="h-4 w-4" />
            {busy ? 'Iniciando…' : 'Comenzar prueba'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
