'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { SalesByCategory } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/formatters'

interface CategoryPieChartProps {
  data: SalesByCategory[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map(d => ({
    name: d.category_name,
    value: d.revenue,
    color: d.color,
    percentage: d.percentage,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos disponibles
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(v as number)} />
        <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="text-xs">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}
