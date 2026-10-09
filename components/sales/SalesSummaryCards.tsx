import type { SalesSummaryPeriod } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, ShoppingBag, Calendar } from 'lucide-react'

interface SalesSummaryCardsProps {
  today: SalesSummaryPeriod
  week: SalesSummaryPeriod
  month: SalesSummaryPeriod
}

export function SalesSummaryCards({ today, week, month }: SalesSummaryCardsProps) {
  const cards = [
    { label: 'Hoy',         summary: today, icon: Calendar,    bg: 'bg-[#FACC15]/10', iconColor: 'text-yellow-700 dark:text-yellow-400' },
    { label: 'Esta semana', summary: week,  icon: TrendingUp,  bg: 'bg-blue-500/10',  iconColor: 'text-blue-600' },
    { label: 'Este mes',    summary: month, icon: ShoppingBag, bg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, summary, icon: Icon, bg, iconColor }) => (
        <Card key={label}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary.revenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.order_count} {summary.order_count === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
