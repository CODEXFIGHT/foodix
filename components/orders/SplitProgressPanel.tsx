'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign, Check, X, SplitSquareHorizontal } from 'lucide-react'
import { useDeleteSplits } from '@/lib/api/queries'
import { SplitPaymentDialog } from '@/components/orders/SplitPaymentDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { splitProgress } from '@/lib/pos/splitBill'
import type { Order, OrderSplit } from '@/lib/types'

/**
 * Panel de cobro de una cuenta dividida: barra de progreso + lista de divisiones
 * con cobro independiente. La mesa no se cierra hasta cobrar todas.
 */
export function SplitProgressPanel({ order }: { order: Order }) {
  const splits = order.splits ?? []
  const deleteSplits = useDeleteSplits()
  const [paying, setPaying] = useState<OrderSplit | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  if (splits.length === 0) return null

  const progress = splitProgress(splits)
  const anyPaid = splits.some(s => s.status === 'paid')

  const handleClear = async () => {
    try {
      await deleteSplits.mutateAsync({ orderId: order.id })
      toast.success('División eliminada · cuenta única')
      setConfirmClear(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo deshacer la división')
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <SplitSquareHorizontal className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
          Cuenta dividida
        </h3>
        <span className="text-sm font-medium text-muted-foreground">
          {progress.paid}/{progress.total} cobradas
        </span>
      </div>

      {/* Barra de progreso de cobro */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', progress.allPaid ? 'bg-green-500' : 'bg-[#FACC15]')}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cobrado {formatCurrency(progress.paidAmount)}</span>
          <span>de {formatCurrency(progress.totalAmount)}</span>
        </div>
      </div>

      {/* Lista de divisiones */}
      <div className="space-y-2">
        {splits.map(split => {
          const paid = split.status === 'paid'
          return (
            <div
              key={split.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                paid ? 'border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20' : '',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{split.label}</p>
                {split.items && split.items.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    {split.items.map(i => `${i.quantity}× ${i.product_name ?? 'Producto'}`).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-semibold tabular-nums">{formatCurrency(split.total)}</span>
              {paid ? (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" /> Pagado
                </span>
              ) : (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setPaying(split)}>
                  <DollarSign className="h-4 w-4 mr-0.5" /> Cobrar
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {progress.allPaid ? (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400 p-2.5 text-sm font-medium text-center">
          ✓ Todas las divisiones cobradas
        </div>
      ) : !anyPaid ? (
        <button
          onClick={() => setConfirmClear(true)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Deshacer división
        </button>
      ) : null}

      <SplitPaymentDialog order={order} split={paying} open={!!paying} onOpenChange={(o) => !o && setPaying(null)} />

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Deshacer división"
        description="La cuenta volverá a cobrarse de forma única. ¿Continuar?"
        confirmLabel="Deshacer"
        onConfirm={handleClear}
        loading={deleteSplits.isPending}
      />
    </div>
  )
}
