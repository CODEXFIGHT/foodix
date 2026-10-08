'use client'

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { CalendarDays, FileText, TrendingUp, TrendingDown, Ban, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfigStore } from '@/lib/stores/configStore'
import { useOrders, useSalesSummary, useSalesDaily, useSalesByCategory, useSalesInsights } from '@/lib/api/queries'
import { generateSalesReportPdf } from '@/lib/reports/salesReportPdf'
import { PageHeader } from '@/components/shared/PageHeader'
import { SalesChart } from '@/components/sales/SalesChart'
import { CHANNEL_LABEL } from '@/components/orders/OrderCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/formatters'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'

export default function SalesPage() {
  const user = useAuthStore(s => s.user)
  const business = useConfigStore(s => s.config)
  const branchId = user?.branch_id ?? null

  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const { data: summary, isLoading: loadingSummary } = useSalesSummary(branchId, fromDate, toDate)
  const { data: dailySales = [], isLoading: loadingDaily } = useSalesDaily(branchId, 30)
  const { data: byCategory = [], isLoading: loadingByCategory } = useSalesByCategory(branchId, fromDate, toDate)
  const { data: insights, isLoading: loadingInsights } = useSalesInsights(branchId, fromDate, toDate)
  const { data: orders = [] } = useOrders(branchId)

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todaySummary } = useSalesSummary(branchId, today, today)

  const filteredOrders = orders.filter(o => {
    const d = o.created_at.slice(0, 10)
    return d >= fromDate && d <= toDate
  })

  const reportDaily = Array.from(
    filteredOrders.reduce((acc, order) => {
      const date = order.created_at.slice(0, 10)
      const current = acc.get(date) ?? { date, revenue: 0, order_count: 0 }
      current.revenue += order.total
      current.order_count += 1
      acc.set(date, current)
      return acc
    }, new Map<string, { date: string; revenue: number; order_count: number }>()),
  ).map(([, value]) => value).sort((a, b) => a.date.localeCompare(b.date))

  const chartData = dailySales.map(d => ({
    date: d.date,
    revenue: d.revenue,
    orderCount: d.order_count,
  }))

  const setTodayRange = () => {
    const value = format(new Date(), 'yyyy-MM-dd')
    setFromDate(value)
    setToDate(value)
  }

  const exportPDF = async () => {
    if (fromDate > toDate) {
      toast.error('La fecha inicio no puede ser mayor que la fecha fin.')
      return
    }
    if (filteredOrders.length === 0) {
      toast.error('No hay pedidos en el rango seleccionado para generar el reporte.')
      return
    }
    setGeneratingPdf(true)
    try {
      generateSalesReportPdf({
        businessName: business.businessName,
        slogan: business.slogan,
        from: fromDate,
        to: toDate,
        summary,
        byCategory,
        daily: reportDaily,
        orders: filteredOrders,
      })
      toast.success('Reporte PDF generado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ventas"
        description="Análisis y reportes de ingresos"
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Hoy', value: todaySummary?.today.revenue ?? 0, orders: todaySummary?.today.order_count ?? 0, icon: ICONS8.revenue, color: 'border-l-[#E85D04]' },
          { label: 'Esta semana', value: summary?.week.revenue ?? 0, orders: summary?.week.order_count ?? 0, icon: ICONS8.sales, color: 'border-l-blue-500' },
          { label: 'Este mes', value: summary?.month.revenue ?? 0, orders: summary?.month.order_count ?? 0, icon: ICONS8.ordersKpi, color: 'border-l-green-500' },
        ].map(kpi => (
          <Card key={kpi.label} className={`border-l-4 ${kpi.color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icons8Image src={kpi.icon} alt={kpi.label} size={36} className="flex-shrink-0 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                {loadingSummary
                  ? <Skeleton className="h-6 w-20 mt-1" />
                  : <p className="text-xl font-bold">{formatCurrency(kpi.value)}</p>
                }
                <p className="text-xs text-muted-foreground">{kpi.orders} pedidos</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales reports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[#E85D04]" />
            Reportes de ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_auto] lg:items-end">
            <Button type="button" variant="outline" onClick={setTodayRange} className="h-10 justify-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Ventas de hoy
            </Button>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha inicio</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha fin</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-10 w-full" />
            </div>
            <Button
              type="button"
              onClick={exportPDF}
              disabled={generatingPdf || loadingSummary || loadingByCategory || fromDate > toDate}
              className="h-10 gap-2 bg-[#E85D04] hover:bg-[#C44D00]"
            >
              <FileText className="h-4 w-4" />
              {generatingPdf ? 'Generando…' : 'Generar PDF'}
            </Button>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{filteredOrders.length} pedido(s) en el rango seleccionado.</span>
            {fromDate > toDate && <span className="font-medium text-destructive">Fecha inicio no puede ser mayor que fecha fin.</span>}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos diarios — últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDaily ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.length > 0 ? (
            <SalesChart data={chartData} type="bar" />
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos de ventas en el período
            </div>
          )}
        </CardContent>
      </Card>

      {/* By category */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byCategory.map(cat => (
                <div key={cat.category_name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium">{cat.category_name}</span>
                      <span className="text-sm font-bold">{formatCurrency(cat.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{cat.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights: ticket, cancelación, canal, horas pico, top/bottom productos */}
      {loadingInsights ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : insights && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ticket promedio</p>
                <p className="text-xl font-bold">{formatCurrency(insights.avg_ticket)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Ban className="h-3 w-3" />Cancelados</p>
                <p className="text-xl font-bold">
                  {insights.cancelled_orders}
                  {insights.completed_orders + insights.cancelled_orders > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({((insights.cancelled_orders / (insights.completed_orders + insights.cancelled_orders)) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" />Tiempo de preparación</p>
                <p className="text-xl font-bold">{insights.avg_prep_minutes !== null ? `${insights.avg_prep_minutes} min` : '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pedidos completados</p>
                <p className="text-xl font-bold">{insights.completed_orders}</p>
              </CardContent>
            </Card>
          </div>

          {insights.by_channel.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por canal</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.by_channel.map(ch => {
                    const maxRevenue = Math.max(...insights.by_channel.map(c => c.revenue), 1)
                    return (
                      <div key={ch.channel} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24 shrink-0">{CHANNEL_LABEL[ch.channel] ?? ch.channel}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#E85D04]" style={{ width: `${(ch.revenue / maxRevenue) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold w-24 text-right">{formatCurrency(ch.revenue)}</span>
                        <span className="text-xs text-muted-foreground w-16 text-right">{ch.order_count} pedidos</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {insights.top_products.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-green-600" />Más vendidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {insights.top_products.map(p => (
                    <div key={p.product_id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{p.qty}× · {formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {insights.bottom_products.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-muted-foreground" />Menos vendidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {insights.bottom_products.map(p => (
                    <div key={p.product_id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{p.qty}× · {formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Recent orders table */}
      {filteredOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pedidos del período</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {['#', 'Mesa', 'Artículos', 'Total', 'Estado', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.slice(0, 20).map(o => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs">#{o.id}</td>
                      <td className="px-4 py-2.5">{o.table_name}</td>
                      <td className="px-4 py-2.5">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="px-4 py-2.5 font-semibold">{formatCurrency(o.total)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{o.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{o.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
