/**
 * @fileoverview Funciones de formato para moneda, fechas y unidades del negocio
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
}

export function formatTimeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
}

export function formatOrderId(num: number): string {
  return `ORD-${String(num).padStart(4, '0')}`;
}
