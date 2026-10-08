'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { ChevronRight, Plus, Search, X } from 'lucide-react'
import { useBranches } from '@/lib/api/queries'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { AdminHeading, Surface, EmptyState, PRIMARY_BTN } from '@/components/superadmin/ui'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'

export default function BranchesPage() {
  const { data: branches, isLoading } = useBranches()
  const [query, setQuery] = useState('')

  const all = branches ?? []
  // El buscador aparece a partir de 4 sucursales para no estorbar con pocas.
  const showSearch = all.length > 3
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(b =>
      `${b.name} ${b.slug} ${b.address ?? ''}`.toLowerCase().includes(q))
  }, [all, query])

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Sucursales"
        description={`${all.length} sucursales registradas`}
        action={
          <Button asChild className={cn('h-9', PRIMARY_BTN)}>
            <Link href="/superadmin/branches/new"><Plus className="h-4 w-4 mr-1" /> Nueva sucursal</Link>
          </Button>
        }
      />

      {showSearch && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, slug o dirección…"
            aria-label="Buscar sucursal"
            className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Limpiar"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <Surface className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : (branches ?? []).length === 0 ? (
          <EmptyState
            icon={<Icons8Image src={ICONS8.branch} alt="Sucursales" size={56} />}
            title="No hay sucursales registradas"
          >
            <Button asChild size="sm" className={PRIMARY_BTN}>
              <Link href="/superadmin/branches/new">+ Crear la primera</Link>
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Encabezado (desktop) */}
            <div className="hidden md:grid grid-cols-[2.2fr_1.3fr_0.8fr_1fr_auto] gap-3 px-5 py-2.5 border-b border-white/10 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              <span>Nombre</span><span>Slug</span><span>Estado</span><span>Creada</span><span className="text-right">Acción</span>
            </div>

            <div className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-neutral-500">No se encontraron sucursales para “{query}”.</p>
              ) : filtered.map(branch => (
                <Link
                  key={branch.id}
                  href={`/superadmin/branches/${branch.id}`}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[2.2fr_1.3fr_0.8fr_1fr_auto] gap-x-3 gap-y-2 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.03] group"
                >
                  {/* Nombre */}
                  <div className="flex items-center gap-3 min-w-0">
                    <BranchAvatar logoUrl={branch.logo_url} name={branch.name} size={36} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{branch.name}</p>
                      {branch.address && (
                        <p className="text-neutral-500 text-xs truncate max-w-[220px]">{branch.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Estado (móvil: a la derecha del nombre) */}
                  <div className="md:hidden justify-self-end">
                    <Badge className={cn(
                      'text-xs',
                      branch.active ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20' : 'bg-red-400/15 text-red-300 border-red-400/20',
                    )}>
                      {branch.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>

                  {/* Slug */}
                  <div className="hidden md:block min-w-0">
                    <code className="text-neutral-400 text-xs bg-white/5 px-2 py-0.5 rounded">/{branch.slug}</code>
                  </div>

                  {/* Estado (desktop) */}
                  <div className="hidden md:block">
                    <Badge className={cn(
                      'text-xs',
                      branch.active ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20' : 'bg-red-400/15 text-red-300 border-red-400/20',
                    )}>
                      {branch.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>

                  {/* Creada */}
                  <div className="hidden md:block text-neutral-500 text-xs">
                    {branch.created_at ? format(parseISO(branch.created_at), 'd MMM yyyy', { locale: es }) : '—'}
                  </div>

                  {/* Móvil: slug + fecha en una fila secundaria */}
                  <div className="md:hidden col-span-2 flex items-center gap-3 text-xs text-neutral-500">
                    <code className="bg-white/5 px-1.5 py-0.5 rounded text-neutral-400">/{branch.slug}</code>
                    <span>{branch.created_at ? format(parseISO(branch.created_at), 'd MMM yyyy', { locale: es }) : '—'}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-neutral-600 group-hover:text-neutral-300" />
                  </div>

                  {/* Acción (desktop) */}
                  <div className="hidden md:flex justify-end">
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-400 group-hover:text-white transition-colors">
                      Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Surface>
    </div>
  )
}
