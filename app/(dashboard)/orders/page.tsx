'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Plus, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOrders } from '@/lib/api/queries'
import type { OrderStatus } from '@/lib/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { OrderCard, CHANNEL_LABEL } from '@/components/orders/OrderCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { Skeleton } from '@/components/ui/skeleton'
import { ICONS8 } from '@/lib/constants/icons'
import { ACTIVE_ORDER_STATUSES, isActiveOrderStatus } from '@/lib/constants/orderStatus'
import { cn } from '@/lib/utils/cn'

// El orden de las pestañas refleja el flujo: activos primero, luego finalizados.
// "Todos" muestra SOLO pedidos activos (no cancelados ni completados).
// "Ticket Abierto" agrupa los pedidos completados (cuenta abierta hasta cobrar).
const TABS: { value: string; label: string; statuses: OrderStatus[] | null; icon: string | null; dot?: string }[] = [
  { value: 'all',       label: 'Todos',          statuses: [...ACTIVE_ORDER_STATUSES], icon: null },
  { value: 'pending',   label: 'Nuevos',         statuses: ['pending'],      icon: ICONS8.pending,   dot: 'bg-amber-400' },
  { value: 'preparing', label: 'En preparación', statuses: ['preparing'],    icon: ICONS8.preparing, dot: 'bg-[#FACC15]' },
  { value: 'ready',     label: 'Listos',         statuses: ['ready'],        icon: ICONS8.ready,     dot: 'bg-blue-400' },
  { value: 'cancelled', label: 'Cancelados',     statuses: ['cancelled'],    icon: ICONS8.cancelled },
  { value: 'completed', label: 'Ticket Abierto', statuses: ['completed'],    icon: ICONS8.completed },
]

function StatChip({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border bg-card shadow-sm', value > 0 ? 'border-border' : 'border-border/50 opacity-60')}>
      <Icons8Image src={icon} alt={label} size={22} />
      <div className="leading-none">
        <p className={cn('text-base font-heading font-bold tabular-nums', accent)}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const user = useAuthStore(s => s.user)
  const role = user?.role
  const branchId = user?.branch_id ?? null
  const { data: allOrders = [], isLoading } = useOrders(branchId)
  const [tab, setTab] = useState('all')
  const [dayOnly, setDayOnly] = useState(true)
  const [channel, setChannel] = useState<'all' | string>('all')

  const today = new Date().toDateString()
  const isToday = (o: { created_at: string; updated_at?: string }) =>
    new Date(o.updated_at ?? o.created_at).toDateString() === today

  // 1) Visibilidad por rol: el mesero solo ve los pedidos que él creó.
  //    Admin/superadmin/cocina ven todos. (Filtro de vista; el backend debería
  //    reforzarlo para que sea barrera real, no solo visual.)
  const scoped = role === 'mesero'
    ? allOrders.filter(o => o.created_by === user?.id)
    : allOrders

  // 2) Canal de origen (Centro de Pedidos): filtra por el mismo `source` que
  //    ya se usa en reportes ("Ventas por canal").
  const channels = Array.from(new Set(allOrders.map(o => o.source).filter(Boolean)))
  const byChannel = channel === 'all' ? scoped : scoped.filter(o => o.source === channel)

  // 3) "Hoy" (por defecto): oculta lo acumulado de días previos sin perder lo
  //    que sigue activo (un pedido viejo aún pendiente/preparando/listo se ve).
  const visible = dayOnly
    ? byChannel.filter(o => isToday(o) || isActiveOrderStatus(o.status))
    : byChannel

  const pendingCount   = visible.filter(o => o.status === 'pending').length
  const preparingCount = visible.filter(o => o.status === 'preparing').length
  const readyCount     = visible.filter(o => o.status === 'ready').length
  const activeCount    = pendingCount + preparingCount + readyCount
  const completedToday = byChannel.filter(o => o.status === 'completed' && isToday(o)).length

  const currentTab = TABS.find(t => t.value === tab)!
  const displayed = currentTab.statuses
    ? visible.filter(o => currentTab.statuses!.includes(o.status))
    : visible

  const groupedOrders = useMemo(() => {
    const map: Record<string, typeof displayed> = {}
    displayed.forEach(o => {
      const dateKey = new Date(o.created_at).toDateString()
      if (!map[dateKey]) {
        map[dateKey] = []
      }
      map[dateKey].push(o)
    })

    const sortedKeys = Object.keys(map).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return sortedKeys.map(key => {
      const date = new Date(key)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      let title = date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      title = title.charAt(0).toUpperCase() + title.slice(1)

      if (date.toDateString() === today.toDateString()) {
        title = `Hoy · ${title}`
      } else if (date.toDateString() === yesterday.toDateString()) {
        title = `Ayer · ${title}`
      }

      return {
        title,
        items: map[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    })
  }, [displayed])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos"
        description={`${activeCount} pedido${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}${role === 'mesero' ? ' · solo tuyos' : ''}${dayOnly ? ' · hoy' : ''}`}
        actions={
          <div className="flex gap-2">
            <Link href="/orders/history">
              <Button variant="outline">Historial</Button>
            </Link>
            <Link href="/orders/new">
              <Button className="bg-[#FACC15] hover:bg-[#EAB308]">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Pedido
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <StatChip icon={ICONS8.pending}   label="Pendientes"  value={pendingCount}   accent="text-amber-500" />
          <StatChip icon={ICONS8.preparing} label="Preparando"  value={preparingCount} accent="text-yellow-700 dark:text-yellow-400" />
          <StatChip icon={ICONS8.ready}     label="Listos"      value={readyCount}     accent="text-blue-500" />
          <StatChip icon={ICONS8.completed} label="Hoy"         value={completedToday} accent="text-green-600" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {channels.length > 1 && (
            <div className="inline-flex rounded-lg border bg-card p-0.5 shrink-0" role="group" aria-label="Filtro de canal">
              <button
                onClick={() => setChannel('all')}
                className={cn(
                  'px-3 h-8 rounded-md text-xs font-medium transition-colors',
                  channel === 'all' ? 'bg-[#FACC15] text-stone-950' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Todos los canales
              </button>
              {channels.map(c => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={cn(
                    'px-3 h-8 rounded-md text-xs font-medium transition-colors',
                    channel === c ? 'bg-[#FACC15] text-stone-950' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {CHANNEL_LABEL[c] ?? c}
                </button>
              ))}
            </div>
          )}
          <div className="inline-flex rounded-lg border bg-card p-0.5 shrink-0" role="group" aria-label="Filtro de día">
            {([['today', 'Hoy'], ['all', 'Todo']] as const).map(([key, label]) => {
              const on = (key === 'today') === dayOnly
              return (
                <button
                  key={key}
                  onClick={() => setDayOnly(key === 'today')}
                  className={cn(
                    'px-3 h-8 rounded-md text-xs font-medium transition-colors',
                    on ? 'bg-[#FACC15] text-stone-950' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            {TABS.map(t => {
              const count = t.statuses ? visible.filter(o => t.statuses!.includes(o.status)).length : visible.length
              return (
                <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs">
                  {t.dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', t.dot)} />}
                  {t.icon && !t.dot && <Icons8Image src={t.icon} alt={t.label} size={13} />}
                  {t.label}
                  <span className={cn(
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    tab === t.value ? 'bg-primary/20 text-primary font-bold' : 'bg-muted-foreground/15 text-muted-foreground',
                  )}>
                    {count}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {TABS.map(t => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              {groupedOrders.length > 0 ? (
                <div className="space-y-6">
                  {groupedOrders.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                        {group.title}
                      </h3>
                      <div className="space-y-2.5">
                        {group.items.map(order => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ShoppingBag className="h-8 w-8" />}
                  title="Sin pedidos"
                  description={t.statuses ? `No hay pedidos con estado "${t.label}"` : 'Aún no hay pedidos registrados'}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <BodyPortal>
        {/* Portal a document.body: ancla el FAB al viewport (no al contenedor
            animado de PageTransition) para que quede fijo junto al bottom nav. */}
        <Link href="/orders/new" className="lg:hidden">
          <button className="fixed bottom-20 right-4 w-14 h-14 bg-[#FACC15] text-stone-950 rounded-full shadow-xl flex items-center justify-center z-40 hover:bg-[#EAB308] active:scale-95 transition-all">
            <Plus className="h-6 w-6" />
          </button>
        </Link>
      </BodyPortal>
    </div>
  )
}

/** Renderiza children en document.body (escapa de ancestros con `transform`). */
function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
