/**
 * @fileoverview Gráfica de línea de ventas acumuladas en el tiempo
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line,
} from 'recharts';
import { SalesDaily } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesChartData {
  date: string
  revenue: number
  orderCount?: number
}

interface SalesChartProps {
  data: SalesChartData[];
  type?: 'bar' | 'line';
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && Array.isArray(payload) && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-yellow-700 dark:text-yellow-400">
          ${(payload[0].value as number).toFixed(2)} MXN
        </p>
      </div>
    );
  }
  return null;
};

export function SalesChart({ data, type = 'bar' }: SalesChartProps) {
  const chartData = data.map(d => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'dd MMM', { locale: es }),
  }));

  const ChartComp = type === 'line' ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ChartComp data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
        <Tooltip content={<CustomTooltip />} />
        {type === 'bar' ? (
          <Bar dataKey="revenue" fill="#FACC15" radius={[4, 4, 0, 0]} />
        ) : (
          <Line type="monotone" dataKey="revenue" stroke="#FACC15" strokeWidth={2} dot={false} />
        )}
      </ChartComp>
    </ResponsiveContainer>
  );
}
