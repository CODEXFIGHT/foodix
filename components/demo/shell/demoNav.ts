/**
 * FoodIX — Modo Demo
 * Configuración de navegación del shell demo. Replica los ítems del sidebar y
 * la barra móvil REALES (mismos labels, iconos y filtros por rol). Los ítems
 * que tienen equivalente funcional en el demo llevan `demoHref`; el resto se
 * muestran igual que en producción pero, al pulsarlos, avisan que están
 * deshabilitados en modo demo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { ICONS8 } from '@/lib/constants/icons'
import type { DemoRole } from '@/lib/demo/demo-types'

/** Rol "real" equivalente para filtrar la navegación como en producción. */
export type RealRole = 'admin' | 'mesero' | 'cocina'

export const DEMO_TO_REAL_ROLE: Record<DemoRole, RealRole | 'cliente'> = {
  admin: 'admin',
  waiter: 'mesero',
  kitchen: 'cocina',
  menu: 'cliente',
}

export interface DemoNavItem {
  /** Href real (para label/orden/estado, igual que producción). */
  href: string
  label: string
  iconSrc: string
  roles: RealRole[]
  /** Ruta demo equivalente; si falta, el ítem está deshabilitado en demo. */
  demoHref?: string
}

/** Mismo orden y contenido que el Sidebar real. */
export const DEMO_NAV_ITEMS: DemoNavItem[] = [
  { href: '/', label: 'Dashboard', iconSrc: ICONS8.dashboard, roles: ['admin'], demoHref: '/demo/admin' },
  { href: '/orders', label: 'Pedidos', iconSrc: ICONS8.orders, roles: ['admin', 'mesero'], demoHref: '/demo/waiter' },
  { href: '/tables', label: 'Mesas', iconSrc: ICONS8.tables, roles: ['admin', 'mesero'], demoHref: '/demo/waiter' },
  { href: '/deliveries', label: 'Domicilios', iconSrc: ICONS8.delivery, roles: ['admin', 'mesero'] },
  { href: '/reservations', label: 'Reservas', iconSrc: ICONS8.reservations, roles: ['admin', 'mesero'] },
  { href: '/customers', label: 'Clientes', iconSrc: ICONS8.customers, roles: ['admin', 'mesero'] },
  { href: '/menu', label: 'Carta / Menú', iconSrc: ICONS8.menu, roles: ['admin'], demoHref: '/demo/admin' },
  { href: '/carta-digital', label: 'Carta QR', iconSrc: ICONS8.carta, roles: ['admin', 'mesero'], demoHref: '/demo/menu' },
  { href: '/modifiers', label: 'Modificadores', iconSrc: ICONS8.modifiers, roles: ['admin'] },
  { href: '/cash', label: 'Caja', iconSrc: ICONS8.payment, roles: ['admin', 'mesero'] },
  { href: '/inventory', label: 'Inventario', iconSrc: ICONS8.inventory, roles: ['admin'] },
  { href: '/sales', label: 'Ventas', iconSrc: ICONS8.sales, roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', iconSrc: ICONS8.staff, roles: ['admin'] },
  { href: '/devices', label: 'Dispositivos', iconSrc: ICONS8.device, roles: ['admin'] },
  { href: '/billing', label: 'Mi Suscripción', iconSrc: ICONS8.subscription, roles: ['admin'] },
  { href: '/ticket', label: 'Ticket', iconSrc: ICONS8.receipt, roles: ['admin'] },
  { href: '/settings', label: 'Ajustes', iconSrc: ICONS8.settings, roles: ['admin'] },
]

/** Subitems de Cocina (igual que el sidebar real). Solo "Vista completa" es demo. */
export interface DemoKitchenSub {
  href: string
  label: string
  emoji: string
  demoHref?: string
}

export const DEMO_KITCHEN_SUBS: DemoKitchenSub[] = [
  { href: '/kitchen', label: 'Vista completa', emoji: '📊', demoHref: '/demo/kitchen' },
  { href: '/kitchen/hot', label: 'Est. Caliente', emoji: '🔥' },
  { href: '/kitchen/cold', label: 'Est. Fría/Bar', emoji: '🧊' },
]

/** Tabs inferiores móviles (igual que el real). */
export const DEMO_MOBILE_TABS: { href: string; label: string; iconSrc: string; roles: RealRole[]; demoHref?: string }[] = [
  { href: '/', label: 'Dashboard', iconSrc: ICONS8.dashboard, roles: ['admin'], demoHref: '/demo/admin' },
  { href: '/orders', label: 'Pedidos', iconSrc: ICONS8.orders, roles: ['admin', 'mesero'], demoHref: '/demo/waiter' },
  { href: '/tables', label: 'Mesas', iconSrc: ICONS8.tables, roles: ['admin', 'mesero'], demoHref: '/demo/waiter' },
  { href: '/carta-digital', label: 'Carta QR', iconSrc: ICONS8.carta, roles: ['admin', 'mesero'], demoHref: '/demo/menu' },
  { href: '/kitchen', label: 'Cocina', iconSrc: ICONS8.kitchen, roles: ['admin', 'cocina'], demoHref: '/demo/kitchen' },
]

export function realRoleOf(role: DemoRole): RealRole {
  const r = DEMO_TO_REAL_ROLE[role]
  return r === 'cliente' ? 'mesero' : r
}
