'use client'

/**
 * FoodIX — Motor de alertas estructuradas por rol.
 *
 * No hay websockets ni backend nuevo: observa los pedidos que ya se sondean
 * (TanStack Query, 10 s) y detecta transiciones relevantes para emitir señales
 * dirigidas al rol del usuario. Misma técnica que los toasts de cocina.
 *
 *   • Mesero → su pedido pasó a "ready" (cocina terminó): 🔔 listo para servir.
 *   • Admin  → nuevo pedido (📋) y pedido demorado sin completarse (⏰).
 *   • Cocina → sus alertas viven en el KDS (StationPanel); el motor no aplica.
 *
 * Cada señal lanza: toast + sonido + entrada en la campana (alertsStore).
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOrders } from '@/lib/api/queries'
import { useStationSound } from '@/hooks/useStationSound'
import { useAlertsStore } from '@/lib/stores/alertsStore'
import type { OrderStatus } from '@/lib/types'

/** Un pedido pendiente/preparando más de este tiempo se considera demorado. */
const DELAY_MS = 12 * 60 * 1000

const itemCount = (items?: { quantity: number }[]) =>
  items?.reduce((n, it) => n + it.quantity, 0) ?? 0

export function useAlertEngine() {
  const user = useAuthStore(s => s.user)
  const role = user?.role
  const branchId = user?.branch_id ?? null
  const enabled = role === 'admin' || role === 'superadmin' || role === 'mesero'

  const { data: orders = [], dataUpdatedAt } = useOrders(enabled ? branchId : null)
  const { playOrderReady, playNewOrder } = useStationSound()
  const push = useAlertsStore(s => s.push)

  const prevStatus = useRef<Map<number, OrderStatus>>(new Map())
  const seeded = useRef(false)
  const delayedAlerted = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!enabled || !dataUpdatedAt) return

    // Primera respuesta: siembra el estado actual SIN alertar (evita avalancha).
    if (!seeded.current) {
      seeded.current = true
      prevStatus.current = new Map(orders.map(o => [o.id, o.status]))
      return
    }

    const isMesero = role === 'mesero'
    const isAdmin = role === 'admin' || role === 'superadmin'

    for (const o of orders) {
      const prev = prevStatus.current.get(o.id)
      const where = o.table_name || `Pedido #${o.id}`

      // Mesero: su pedido quedó listo para servir.
      if (isMesero && o.created_by === user?.id && o.status === 'ready' && prev !== 'ready') {
        playOrderReady()
        push({ kind: 'order_ready', emoji: '🔔', title: '¡Pedido listo para servir!', body: `${where} · Pedido #${o.id}`, href: '/orders' })
        toast('🔔 ¡Pedido listo para servir!', { description: `${where} · Pedido #${o.id}`, duration: 6000 })
      }

      // Admin: nuevo pedido entrante.
      if (isAdmin && prev === undefined && (o.status === 'pending' || o.status === 'preparing')) {
        playNewOrder()
        const count = itemCount(o.items)
        push({ kind: 'new_order', emoji: '📋', title: 'Nuevo pedido', body: `${where} · ${count} platillo${count !== 1 ? 's' : ''}`, href: '/orders' })
        toast('📋 Nuevo pedido', { description: `${where} · ${count} platillo${count !== 1 ? 's' : ''}`, duration: 4000 })
      }

      // Admin: pedido demorado (una sola alerta por pedido).
      if (isAdmin && (o.status === 'pending' || o.status === 'preparing')) {
        const age = Date.now() - new Date(o.created_at).getTime()
        if (age > DELAY_MS && !delayedAlerted.current.has(o.id)) {
          delayedAlerted.current.add(o.id)
          const mins = Math.round(age / 60000)
          push({ kind: 'order_delayed', emoji: '⏰', title: 'Pedido demorado', body: `${where} lleva ${mins} min sin completarse`, href: '/orders' })
          toast.warning('⏰ Pedido demorado', { description: `${where} lleva ${mins} min sin completarse`, duration: 6000 })
        }
      }
    }

    // Libera los demorados que ya avanzaron (para no fugar memoria).
    for (const id of [...delayedAlerted.current]) {
      const o = orders.find(x => x.id === id)
      if (!o || (o.status !== 'pending' && o.status !== 'preparing')) delayedAlerted.current.delete(id)
    }

    prevStatus.current = new Map(orders.map(o => [o.id, o.status]))
  }, [orders, dataUpdatedAt, enabled, role, user?.id, push, playOrderReady, playNewOrder])
}
