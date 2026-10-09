/**
 * @fileoverview Línea de tiempo del ciclo de vida de una orden
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

const FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'completed'];

const labels: Record<OrderStatus, string> = {
  pending: 'Recibido',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Pedido cancelado
      </div>
    );
  }

  const currentIdx = FLOW.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {FLOW.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                done ? 'bg-green-500 text-stone-950' :
                active ? 'bg-[#FACC15] text-stone-950 ring-2 ring-[#FACC15]/30' :
                'bg-muted text-muted-foreground'
              )}>
                {done ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
                {labels[step]}
              </span>
            </div>
            {idx < FLOW.length - 1 && (
              <div className={cn('h-0.5 w-6 sm:w-12 mb-4 transition-colors', done ? 'bg-green-500' : 'bg-muted')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
