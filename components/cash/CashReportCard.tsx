'use client'

import { formatCurrency } from '@/lib/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CashReport } from '@/lib/types'

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  monedero: 'Monedero',
  otro: 'Otro',
}

export function CashReportCard({ report, title }: { report: CashReport; title?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title ?? (report.status === 'open' ? 'Corte X (en vivo)' : 'Corte Z (cierre)')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ventas por método */}
        <div className="space-y-1.5 text-sm">
          {Object.entries(report.by_method).map(([m, v]) => (
            <div key={m} className="flex justify-between">
              <span className="text-muted-foreground">{METHOD_LABELS[m] ?? m}</span>
              <span className="font-medium">{formatCurrency(v)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-1.5 font-semibold">
            <span>Ventas totales</span>
            <span className="text-[#D1400F]">{formatCurrency(report.total_sales)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Propinas</span>
            <span>{formatCurrency(report.tips)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Transacciones</span>
            <span>{report.tx_count}</span>
          </div>
          {report.discounts > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Descuentos aplicados</span>
              <span>−{formatCurrency(report.discounts)}</span>
            </div>
          )}
          {report.cancellations > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Pedidos cancelados</span>
              <span>{report.cancellations}</span>
            </div>
          )}
        </div>

        {/* Efectivo */}
        <div className="space-y-1.5 text-sm rounded-lg bg-muted/50 p-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo inicial</span>
            <span>{formatCurrency(report.opening_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">+ Ventas efectivo</span>
            <span>{formatCurrency(report.by_method.efectivo)}</span>
          </div>
          {report.cash_in > 0 && (
            <div className="flex justify-between text-green-600">
              <span>+ Entradas</span>
              <span>{formatCurrency(report.cash_in)}</span>
            </div>
          )}
          {report.cash_out > 0 && (
            <div className="flex justify-between text-red-600">
              <span>− Salidas</span>
              <span>{formatCurrency(report.cash_out)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 font-bold">
            <span>Efectivo esperado</span>
            <span>{formatCurrency(report.expected_cash)}</span>
          </div>
          {report.closing_amount !== null && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo contado</span>
                <span>{formatCurrency(report.closing_amount)}</span>
              </div>
              <div className={`flex justify-between font-bold ${(report.difference ?? 0) === 0 ? '' : (report.difference ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Diferencia</span>
                <span>{formatCurrency(report.difference ?? 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Movimientos */}
        {report.movements.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Movimientos</p>
            {report.movements.map(m => (
              <div key={m.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">
                  {m.type === 'in' ? '↑' : '↓'} {m.reason ?? (m.type === 'in' ? 'Entrada' : 'Salida')}
                </span>
                <span className={m.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                  {m.type === 'in' ? '+' : '−'}{formatCurrency(m.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
