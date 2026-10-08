'use client'

/**
 * FoodIX — Centro de alertas estructuradas (en cliente).
 * Historial corto de señales por rol (mesero/admin) para la campana del Topbar.
 * Las alertas se generan en `useAlertEngine` detectando transiciones en los
 * datos que ya se sondean (sin backend nuevo).
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { create } from 'zustand'

export type AlertKind = 'order_ready' | 'new_order' | 'order_delayed'

export interface AppAlert {
  id: string
  kind: AlertKind
  emoji: string
  title: string
  body: string
  at: number
  href?: string
  read: boolean
}

const MAX = 30

interface AlertsState {
  alerts: AppAlert[]
  unread: number
  push: (a: Omit<AppAlert, 'id' | 'at' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
}

export const useAlertsStore = create<AlertsState>(set => ({
  alerts: [],
  unread: 0,
  push: a =>
    set(s => ({
      alerts: [
        { ...a, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), read: false },
        ...s.alerts,
      ].slice(0, MAX),
      unread: s.unread + 1,
    })),
  markAllRead: () => set(s => ({ alerts: s.alerts.map(a => ({ ...a, read: true })), unread: 0 })),
  clear: () => set({ alerts: [], unread: 0 }),
}))
