'use client'

/**
 * FoodIX — Panel de Administración Global
 * Trials: embudo de la prueba gratuita de 14 días y gestión por cliente.
 *
 * Solo muestra lo que el superadmin puede ver legítimamente (negocio, dueño,
 * fechas y nivel de riesgo ya calculado). Las señales internas del antiabuso
 * (hashes de correo, teléfono, dispositivo o IP) NO salen del backend.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Search, Sparkles } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useSuperadminTrials, useExtendTrial,
  type SuperadminTrialRow, type TrialFilter,
} from '@/lib/api/queries'
import { AdminHeading, EmptyState, FilterChip, StatCard, Surface, PRIMARY_BTN } from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { daysRemainingClass, formatDaysRemaining } from '@/lib/constants/subscription'

const FILTERS: { value: TrialFilter; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'active',    label: 'Activos' },
  { value: 'expired',   label: 'Expirados' },
  { value: 'converted', label: 'Convertidos' },
  { value: 'blocked',   label: 'Bloqueados' },
]

const RISK_STYLE: Record<string, string> = {
  low:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  high:   'bg-amber-500/10 text-yellow-500 border-amber-500/25',
  block:  'bg-red-500/10 text-red-400 border-red-500/25',
}

const RISK_LABEL: Record<string, string> = {
  low: 'Bajo', medium: 'Medio', high: 'Alto', block: 'Bloqueado',
}

function fmt(date: string | null): string {
  if (!date) return '—'
  try { return format(parseISO(date.replace(' ', 'T')), "d MMM yyyy", { locale: es }) } catch { return '—' }
}

function trialState(row: SuperadminTrialRow): { label: string; className: string } {
  if (row.converted_at) return { label: 'Convertido', className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' }
  if (row.status === 'trial') return { label: 'Activo', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' }
  return { label: 'Expirado', className: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25' }
}

// ── Modal de extensión ───────────────────────────────────────────────────────

function ExtendTrialDialog({ row, onClose }: { row: SuperadminTrialRow | null; onClose: () => void }) {
  const extend = useExtendTrial()
  const [days, setDays] = useState<number | null>(7)
  const [until, setUntil] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!row) return null

  const submit = async () => {
    setError(null)
    try {
      await extend.mutateAsync({
        branchId: row.branch_id,
        ...(until ? { until } : { days: days ?? 7 }),
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch {
      setError('No se pudo extender la prueba. Verifica que la sucursal siga en periodo de prueba.')
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extender prueba · {row.branch_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Termina actualmente el <strong className="text-white">{fmt(row.trial_ends_at)}</strong>.
            La acción queda registrada en la bitácora con tu usuario y el motivo.
          </p>

          <div className="space-y-2">
            <Label className="text-sm">Días adicionales</Label>
            <div className="flex flex-wrap gap-2">
              {[3, 7, 14].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDays(d); setUntil('') }}
                  className={cn(
                    'h-9 rounded-md border px-3 text-sm font-medium transition-colors',
                    !until && days === d
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 text-neutral-400 hover:border-white/25 hover:text-white',
                  )}
                >
                  +{d} días
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="until" className="text-sm">O fecha exacta</Label>
            <Input id="until" type="date" value={until} onChange={e => setUntil(e.target.value)} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-sm">Motivo</Label>
            <Input
              id="reason" value={reason} onChange={e => setReason(e.target.value)}
              maxLength={255} placeholder="El cliente pidió más tiempo para capacitar a su equipo"
              className="h-10"
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={extend.isPending} className={PRIMARY_BTN}>
            {extend.isPending ? 'Aplicando…' : 'Extender prueba'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function TrialsPage() {
  const [filter, setFilter] = useState<TrialFilter>('all')
  const [search, setSearch] = useState('')
  const [extendRow, setExtendRow] = useState<SuperadminTrialRow | null>(null)

  const { data, isLoading } = useSuperadminTrials(filter, search)
  const items = data?.items ?? []
  const m = data?.metrics

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Trials"
        description="Embudo de la prueba gratuita de 14 días: activos, expirados, convertidos y bloqueados."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Iniciados"  value={m?.started ?? 0}   loading={isLoading} />
        <StatCard label="Activos"    value={m?.active ?? 0}    loading={isLoading} accent="text-emerald-400" />
        <StatCard label="Expirados"  value={m?.expired ?? 0}   loading={isLoading} accent="text-neutral-300" />
        <StatCard label="Convertidos" value={m?.converted ?? 0} loading={isLoading} accent="text-blue-400" />
        <StatCard label="Bloqueados" value={m?.blocked ?? 0}   loading={isLoading} accent="text-red-400"
                  hint="Intentos rechazados por el antiabuso" />
        <StatCard label="Conversión" value={`${m?.conversion_rate ?? 0}%`} loading={isLoading}
                  hint="Trial → plan de pago" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </FilterChip>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Restaurante, dueño, correo o teléfono"
            aria-label="Buscar pruebas"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <Surface className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-8 w-8" />} title="No hay pruebas que coincidan con el filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th scope="col" className="px-4 py-3 font-medium">Restaurante</th>
                  <th scope="col" className="px-4 py-3 font-medium">Propietario</th>
                  <th scope="col" className="px-4 py-3 font-medium">Inicio</th>
                  <th scope="col" className="px-4 py-3 font-medium">Fin</th>
                  <th scope="col" className="px-4 py-3 font-medium">Restantes</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 font-medium">Riesgo</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => {
                  const state = trialState(row)
                  return (
                    <tr key={row.branch_id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/superadmin/subscriptions?branch=${row.branch_id}`}
                          className="flex items-center gap-2.5 font-medium text-white hover:underline"
                        >
                          <BranchAvatar name={row.branch_name} logoUrl={null} size={28} />
                          <span className="truncate">{row.branch_name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        <span className="block truncate">{row.owner_name ?? '—'}</span>
                        <span className="block truncate text-xs text-neutral-600">{row.owner_email ?? row.owner_phone ?? ''}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{fmt(row.trial_started_at)}</td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{fmt(row.trial_ends_at)}</td>
                      <td className={cn('px-4 py-3 tabular-nums', daysRemainingClass(row.days_remaining))}>
                        {row.converted_at ? '—' : formatDaysRemaining(row.days_remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', state.className)}>
                          {state.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', RISK_STYLE[row.risk_level] ?? RISK_STYLE.low)}>
                          {RISK_LABEL[row.risk_level] ?? 'Bajo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.plan === 'trial' && !row.converted_at && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setExtendRow(row)}
                            className="text-neutral-300 hover:text-white"
                          >
                            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Extender
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <ExtendTrialDialog row={extendRow} onClose={() => setExtendRow(null)} />
    </div>
  )
}
