/**
 * FoodIX — Etiquetas de pedido
 * Devuelve la etiqueta principal (la MESA) y secundaria (el folio) de un pedido,
 * para mantener una jerarquía visual consistente en KDS / Cocina / Pedidos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { Order } from '@/lib/types'

type OrderLike = Pick<Order, 'id' | 'table_name' | 'order_type'>

/**
 * Etiqueta principal (jerarquía alta): la mesa cuando es en sitio, o el tipo de
 * pedido para llevar / domicilio. Ej.: "Mesa 7", "Terraza 1", "Para llevar".
 */
export function orderPrimaryLabel(order: OrderLike): string {
  if (order.order_type === 'takeaway') return 'Para llevar'
  if (order.order_type === 'delivery') return 'Domicilio'
  const name = order.table_name?.trim() ?? ''
  if (!name) return `Pedido #${order.id}`
  // Si el nombre empieza con dígito ("7", "12") anteponemos "Mesa".
  return /^\d/.test(name) ? `Mesa ${name}` : name
}

/** Etiqueta secundaria (jerarquía baja): el folio del pedido. Ej.: "Pedido #1024". */
export function orderSecondaryLabel(order: Pick<Order, 'id'>): string {
  return `Pedido #${order.id}`
}
