/**
 * @fileoverview Hook derivado para calcular totales y estadísticas de órdenes
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { useMemo } from 'react';
import { OrderItem } from '@/lib/types';

export function useOrderTotals(items: OrderItem[], taxRate: number) {
  return useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items, taxRate]);
}
