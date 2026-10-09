'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MessageCircle, Mail, Check, Archive, RotateCcw } from 'lucide-react'
import { useLeads, useUpdateLeadStatus } from '@/lib/api/queries'
import type { ContactLeadStatus } from '@/lib/types'
import {
  AdminHeading, SectionLabel, Surface, StatCard, FilterChip, EmptyState,
} from '@/components/superadmin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'

type Filter = 'all' | ContactLeadStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'read', label: 'Leídas' },
  { value: 'archived', label: 'Archivadas' },
]

const STATUS_BADGE: Record<ContactLeadStatus, string> = {
  new: 'bg-orange-400/15 text-orange-300 border-orange-400/20',
  read: 'bg-sky-400/15 text-sky-300 border-sky-400/20',
  archived: 'bg-white/10 text-neutral-400 border-white/10',
}
const STATUS_LABEL: Record<ContactLeadStatus, string> = {
  new: 'Nueva', read: 'Leída', archived: 'Archivada',
}

function formatDate(iso: string) {
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SuperAdminLeadsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, isLoading } = useLeads(filter === 'all' ? undefined : filter)
  const updateStatus = useUpdateLeadStatus()

  const items = data?.items ?? []
  const metrics = data?.metrics

  const setStatus = async (id: number, status: ContactLeadStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status })
    } catch {
      toast.error('No se pudo actualizar la solicitud')
    }
  }

  const kpis = [
    { label: 'Total', value: metrics?.total ?? 0 },
    { label: 'Nuevas', value: metrics?.new ?? 0, accent: (metrics?.new ?? 0) > 0 ? 'text-orange-400' : undefined },
    { label: 'Leídas', value: metrics?.read ?? 0 },
    { label: 'Archivadas', value: metrics?.archived ?? 0 },
  ]

  return (
    <div className="space-y-8">
      <AdminHeading
        title="Solicitudes de contacto"
        description="Cotizaciones y mensajes enviados desde la landing de FoodIX"
      />

      {/* KPIs */}
      <section className="space-y-3">
        <SectionLabel>Indicadores</SectionLabel>
        <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
          {kpis.map(k => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              accent={k.accent}
              loading={isLoading}
              className="snap-start shrink-0 min-w-[44%] sm:min-w-0"
            />
          ))}
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Surface>
          <EmptyState
            icon={<Icons8Image src={ICONS8.leads} alt="leads" size={40} />}
            title="No hay solicitudes en esta vista."
          />
        </Surface>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map(lead => {
            const waDigits = lead.whatsapp.replace(/\D+/g, '')
            return (
              <Surface key={lead.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D1400F]/15 text-sm font-semibold text-orange-300">
                    {lead.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{lead.name}</p>
                      <Badge className={cn('text-[10px] capitalize', STATUS_BADGE[lead.status])}>
                        {STATUS_LABEL[lead.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">{formatDate(lead.created_at)}</p>
                  </div>
                  {lead.emailed && (
                    <span title="Notificado por correo" className="flex-shrink-0 text-neutral-600">
                      <Mail className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white/[0.03] p-3 text-sm text-neutral-300">
                  {lead.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/${waDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {lead.whatsapp}
                  </a>

                  <div className="ml-auto flex gap-2">
                    {lead.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/15 bg-transparent px-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white"
                        onClick={() => setStatus(lead.id, 'read')}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Marcar leída
                      </Button>
                    )}
                    {lead.status !== 'archived' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/15 bg-transparent px-3 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
                        onClick={() => setStatus(lead.id, 'archived')}
                        disabled={updateStatus.isPending}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" /> Archivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-white/15 bg-transparent px-3 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
                        onClick={() => setStatus(lead.id, 'read')}
                        disabled={updateStatus.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
                      </Button>
                    )}
                  </div>
                </div>
              </Surface>
            )
          })}
        </div>
      )}
    </div>
  )
}
