/**
 * @fileoverview Badge visual indicador del estado de una orden
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/lib/types';

const statusConfig: Record<OrderStatus, { label: string; variant: 'warning' | 'orange' | 'info' | 'purple' | 'success' | 'muted' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  preparing: { label: 'Preparando', variant: 'orange' },
  ready: { label: 'Listo', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'purple' },
  completed: { label: 'Completado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'muted' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = statusConfig[status];
  return <Badge variant={variant}>{label}</Badge>;
}
