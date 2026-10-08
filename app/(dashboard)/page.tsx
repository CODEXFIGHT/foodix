'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { ShoppingBag, UtensilsCrossed, Plus, TrendingUp, Wallet, Receipt, Clock, CheckCircle2, Truck, ChefHat, HandPlatter, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOrders, useTables, useSalesDaily, useSalesSummary } from '@/lib/api/queries'
import { ICONS8 } from '@/lib/constants/icons'
import { PageHeader } from '@/components/shared/PageHeader'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { KPICard } from '@/components/shared/KPICard'
import { OrderCard } from '@/components/orders/OrderCard'
import { SalesChart } from '@/components/sales/SalesChart'
import { Button, Card, CardHeader, CardBody } from '@heroui/react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/formatters'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { DashboardStatModal, type StatModalType } from '@/components/dashboard/DashboardStatModal'

// Entrada escalonada: cada tarjeta aparece un poco después de la anterior
// en vez de todas de golpe (aplica a la fila de KPIs y a los widgets).
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const [modalType, setModalType] = useState<StatModalType | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const from7 = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const { data: orders = [], isLoading: loadingOrders } = useOrders(branchId)
  const { data: tables = [] } = useTables(branchId)
  const { data: summary } = useSalesSummary(branchId, today, today)
  const { data: dailySales = [] } = useSalesDaily(branchId, 7)

  useEffect(() => {
    if (!user) return
    if (user.role === 'mesero') router.replace('/orders')
    if (user.role === 'cocina') router.replace('/kitchen')
    if (user.role === 'superadmin') router.replace('/superadmin')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  const occupiedTables = tables.filter(t => t.status === 'ocupada').length
  const activeOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status)).length

  // Cálculos para widgets operativos del día.
  const todayKey = new Date().toDateString()
  const todays = orders.filter(o => new Date(o.created_at).toDateString() === todayKey)
  const openTickets = orders.filter(o => !['completed', 'cancelled'].includes(o.status) && o.payment_status !== 'paid').length
  const paidToday = todays.filter(o => o.payment_status === 'paid').length
  const pickupToday = todays.filter(o => o.order_type === 'takeaway').length
  const deliveryToday = todays.filter(o => o.order_type === 'delivery').length
  const pendingDishes = orders.reduce((n, o) => n + o.items.filter(i => (i.status ?? 'pending') === 'pending').length, 0)
  const avgTicket = summary?.today.order_count && summary.today.order_count > 0
    ? summary.today.revenue / summary.today.order_count
    : 0

  // Configuración de widgets operativos del día.
  const widgets: {
    label: string; value: number; icon: React.ElementType
    colorCls: string; bgCls: string; iconColorCls: string; modal: StatModalType
  }[] = [
    {
      label: 'Tickets abiertos',
      value: openTickets,
      icon: Clock,
      colorCls: 'text-amber-600 dark:text-amber-400',
      bgCls: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
      iconColorCls: 'text-amber-500',
      modal: 'abiertos',
    },
    {
      label: 'Cobrados hoy',
      value: paidToday,
      icon: CheckCircle2,
      colorCls: 'text-green-600 dark:text-green-400',
      bgCls: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50',
      iconColorCls: 'text-green-500',
      modal: 'cobrados',
    },
    {
      label: 'Pickup hoy',
      value: pickupToday,
      icon: ShoppingBag,
      colorCls: 'text-blue-600 dark:text-blue-400',
      bgCls: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50',
      iconColorCls: 'text-blue-500',
      modal: 'pickup',
    },
    {
      label: 'Domicilio hoy',
      value: deliveryToday,
      icon: Truck,
      colorCls: 'text-indigo-600 dark:text-indigo-400',
      bgCls: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50',
      iconColorCls: 'text-indigo-500',
      modal: 'delivery',
    },
    {
      label: 'Platillos pendientes',
      value: pendingDishes,
      icon: ChefHat,
      colorCls: 'text-[#E85D04] dark:text-orange-400',
      bgCls: 'bg-orange-50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/30',
      iconColorCls: 'text-[#E85D04]',
      modal: 'platillos',
    },
  ]

  const greetIcon = (() => {
    const h = new Date().getHours()
    if (h >= 6  && h < 12) return ICONS8.greetMorning
    if (h >= 12 && h < 17) return ICONS8.greetNoon
    if (h >= 17 && h < 22) return ICONS8.greetEvening
    return ICONS8.greetNight
  })()

  const chartData = dailySales.map(d => ({
    date: d.date,
    revenue: d.revenue,
    orderCount: d.order_count,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {`Hola, ${user.name.split(' ')[0]}`}
            <Icons8Image src={greetIcon} alt="saludo" size={28} />
          </span>
        }
        description="Panel de administración"
        actions={
          <div className="flex gap-2 min-w-0 max-w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button as={Link} href="/tables" color="primary" size="sm" radius="lg" className="shrink-0 snap-start whitespace-nowrap font-medium" startContent={<HandPlatter className="h-4 w-4" />}>
              Tomar pedido
            </Button>
            <Button as={Link} href="/orders/new" variant="bordered" size="sm" radius="lg" className="shrink-0 snap-start whitespace-nowrap" startContent={<Plus className="h-4 w-4" />}>
              Nuevo Pedido
            </Button>
            <Button as={Link} href="/tables" variant="bordered" size="sm" radius="lg" className="shrink-0 snap-start whitespace-nowrap" startContent={<UtensilsCrossed className="h-4 w-4" />}>
              Ver Mesas
            </Button>
            <Button as={Link} href="/menu" variant="bordered" size="sm" radius="lg" className="shrink-0 snap-start whitespace-nowrap" startContent={<BookOpen className="h-4 w-4" />}>
              Ver Menú
            </Button>
          </div>
        }
      />

      {/* Resumen del día — grid completo, sin scroll horizontal: todo visible de un vistazo */}
      <section className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Resumen de hoy</h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          <motion.div variants={staggerItem}>
            <KPICard
              title="Ventas Hoy"
              value={formatCurrency(summary?.today.revenue ?? 0)}
              subtitle={`${summary?.today.order_count ?? 0} pedidos`}
              icon={<Wallet className="h-8 w-8 text-[#E85D04]" />}
              iconBg="bg-[#E85D04]/10"
              borderColor="border-l-4 border-l-[#E85D04]"
              onClick={() => setModalType('ventas')}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <KPICard
              title="Pedidos Activos"
              value={String(activeOrders)}
              subtitle="pendientes o preparando"
              iconSrc={ICONS8.ordersKpi}
              iconAlt="Pedidos"
              iconBg="bg-blue-500/10"
              borderColor="border-l-4 border-l-blue-500"
              onClick={() => setModalType('activos')}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <KPICard
              title="Mesas Ocupadas"
              value={`${occupiedTables} / ${tables.length}`}
              subtitle={`${tables.filter(t => t.status === 'libre').length} libres`}
              iconSrc={ICONS8.tablesKpi}
              iconAlt="Mesas"
              iconBg="bg-green-500/10"
              borderColor="border-l-4 border-l-green-500"
              onClick={() => setModalType('mesas')}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <KPICard
              title="Ticket Promedio"
              value={formatCurrency(avgTicket)}
              subtitle="de hoy"
              icon={<Receipt className="h-8 w-8 text-purple-600" />}
              iconBg="bg-purple-500/10"
              borderColor="border-l-4 border-l-purple-500"
              onClick={() => setModalType('ticket')}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Actividad operativa — grid completo (2 cols mobile, 5 cols desktop) */}
      <section className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actividad operativa</h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {widgets.map(w => {
            const Icon = w.icon
            return (
              <motion.div key={w.label} variants={staggerItem}>
                <Card
                  isPressable
                  onPress={() => setModalType(w.modal)}
                  shadow="sm"
                  className={cn(
                    "w-full border transition-transform duration-300 hover:-translate-y-1",
                    w.bgCls,
                  )}
                >
                  <CardBody className="p-4 flex-row items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-semibold text-muted-foreground/80 tracking-wide uppercase leading-tight">{w.label}</p>
                      <p className={cn('text-2xl sm:text-[1.7rem] font-extrabold tabular-nums tracking-tight leading-none', w.colorCls)}>{w.value}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/50 shadow-sm border border-stone-100/40 flex-shrink-0", w.iconColorCls)}>
                      <Icon className="h-5 w-5 stroke-[2]" />
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card shadow="sm" className="lg:col-span-2">
          <CardHeader className="pb-0">
            <h3 className="text-base font-semibold">Ventas — últimos 7 días</h3>
          </CardHeader>
          <CardBody>
            {chartData.length > 0 ? (
              <SalesChart data={chartData} type="line" />
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sin datos de ventas aún
              </div>
            )}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader className="pb-0">
            <h3 className="text-base font-semibold">Acciones rápidas</h3>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {/* Acceso directo para que el admin tome el rol de mesero:
                empieza desde el mapa de mesas, igual que un mesero. */}
            <Button as={Link} href="/tables" color="primary" radius="lg" className="w-full justify-start font-medium h-11 sm:col-span-2 lg:col-span-1" startContent={<HandPlatter className="h-4 w-4" />}>
              Tomar pedido (modo mesero)
            </Button>
            <Button as={Link} href="/orders/new" variant="bordered" radius="lg" className="w-full justify-start" startContent={<Plus className="h-4 w-4 text-[#E85D04]" />}>
              Nuevo pedido
            </Button>
            <Button as={Link} href="/tables" variant="bordered" radius="lg" className="w-full justify-start" startContent={<UtensilsCrossed className="h-4 w-4 text-blue-600" />}>
              Ver mesas ({occupiedTables} ocupadas)
            </Button>
            <Button as={Link} href="/orders" variant="bordered" radius="lg" className="w-full justify-start" startContent={<ShoppingBag className="h-4 w-4 text-purple-600" />}>
              Ver todos los pedidos
            </Button>
            <Button as={Link} href="/sales" variant="bordered" radius="lg" className="w-full justify-start" startContent={<TrendingUp className="h-4 w-4 text-green-600" />}>
              Reportes de ventas
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card shadow="sm">
        <CardHeader className="pb-0 flex-row items-center justify-between">
          <h3 className="text-base font-semibold">Pedidos recientes</h3>
          <Button as={Link} href="/orders" variant="light" size="sm" className="text-xs">Ver todos</Button>
        </CardHeader>
        <CardBody>
          {loadingOrders ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : orders.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          ) : (
            <EmptyState
              title="Sin pedidos recientes"
              description="Los pedidos aparecerán aquí"
              icon={<ShoppingBag className="h-8 w-8" />}
              action={{ label: 'Crear pedido', onClick: () => router.push('/orders/new') }}
            />
          )}
        </CardBody>
      </Card>

      <DashboardStatModal
        open={modalType !== null}
        type={modalType}
        onClose={() => setModalType(null)}
        orders={orders}
        tables={tables}
        summary={summary}
        today={today}
      />
    </div>
  )
}
