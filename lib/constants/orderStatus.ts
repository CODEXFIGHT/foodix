/**
 * FoodIX — Agrupación de estados de pedido
 * Fuente única de verdad para clasificar pedidos por estado en Pedidos / Cocina.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { OrderStatus } from '@/lib/types'

/**
 * Estados que representan un pedido ACTIVO / en proceso (no finalizado).
 * Son los únicos que aparecen en la pestaña "Todos". Los pedidos cancelados
 * (Cancelados) y completados (Ticket Abierto) se excluyen de "Todos".
 */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'delivered',
]

/** ¿El pedido está activo / en proceso (no finalizado)? */
export const isActiveOrderStatus = (status: OrderStatus): boolean =>
  ACTIVE_ORDER_STATUSES.includes(status)
