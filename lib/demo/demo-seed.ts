/**
 * FoodIX — Modo Demo
 * Datos semilla (seed) realistas para inicializar el entorno demo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type {
  DemoState,
  DemoUser,
  DemoProduct,
  DemoOrder,
} from './demo-types'

export const DEMO_USERS: DemoUser[] = [
  { id: 'u-admin', name: 'Admin Demo', role: 'admin', avatarColor: '#E85D04' },
  { id: 'u-waiter', name: 'Mesero Demo', role: 'waiter', avatarColor: '#2563EB' },
  { id: 'u-kitchen', name: 'Cocina Demo', role: 'kitchen', avatarColor: '#16A34A' },
  { id: 'u-menu', name: 'Cliente', role: 'menu', avatarColor: '#9333EA' },
]

export function getDemoUser(role: DemoUser['role']): DemoUser {
  return DEMO_USERS.find(u => u.role === role) ?? DEMO_USERS[0]
}

/** Nombre comercial del restaurante demo (única fuente de verdad). */
export const DEMO_RESTAURANT_NAME = 'Restaurante Demo La Naranja'

/** Construye un estado semilla fresco (sin referencias compartidas). */
export function freshSeedState(): DemoState {
  const now = Date.now()

  const state: DemoState = {
    restaurant: {
      name: DEMO_RESTAURANT_NAME,
      tagline: 'Cocina mexicana · Modo demo FoodIX',
      currency: 'MXN',
      taxRate: 0.16,
      address: 'Av. de la Naranja 100, CDMX',
    },

    categories: [
      { id: 'c-platillos', name: 'Platillos', emoji: '🍽️', order: 1 },
      { id: 'c-bebidas', name: 'Bebidas', emoji: '🥤', order: 2 },
    ],

    modifiers: [
      { id: 'm-sincebolla', name: 'Sin cebolla', price: 0 },
      { id: 'm-sincilantro', name: 'Sin cilantro', price: 0 },
      { id: 'm-picante', name: 'Picante extra', price: 5 },
      { id: 'm-queso', name: 'Extra queso', price: 15 },
      { id: 'm-termino', name: 'Término medio', price: 0 },
      { id: 'm-sinhielo', name: 'Sin hielo', price: 0 },
    ],

    products: [
      {
        id: 'p-arrachera', categoryId: 'c-platillos', name: 'Tacos de arrachera',
        description: 'Tres tacos de arrachera a la parrilla con cebollita y guacamole.',
        price: 135, available: true, emoji: '🌮', station: 'hot',
        modifierIds: ['m-sincebolla', 'm-picante', 'm-queso', 'm-termino'],
      },
      {
        id: 'p-enchiladas', categoryId: 'c-platillos', name: 'Enchiladas verdes',
        description: 'Tortillas rellenas de pollo bañadas en salsa verde y crema.',
        price: 120, available: true, emoji: '🫔', station: 'hot',
        modifierIds: ['m-queso', 'm-sincebolla', 'm-picante'],
      },
      {
        id: 'p-hamburguesa', categoryId: 'c-platillos', name: 'Hamburguesa artesanal',
        description: 'Carne de res sellada, queso fundido, pan brioche y papas.',
        price: 155, available: true, emoji: '🍔', station: 'hot',
        modifierIds: ['m-queso', 'm-sincebolla', 'm-termino'],
      },
      {
        id: 'p-jamaica', categoryId: 'c-bebidas', name: 'Agua fresca de jamaica',
        description: 'Agua de jamaica natural preparada al momento.',
        price: 45, available: true, emoji: '🍹', station: 'cold',
        modifierIds: ['m-sinhielo'],
      },
      {
        id: 'p-limonada', categoryId: 'c-bebidas', name: 'Limonada mineral',
        description: 'Limonada con agua mineral, hielo y hierbabuena.',
        price: 50, available: true, emoji: '🥤', station: 'cold',
        modifierIds: ['m-sinhielo'],
      },
    ],

    tables: [
      { id: 't-1', label: 'Mesa 1', seats: 4, zone: 'Salón', status: 'occupied' },
      { id: 't-2', label: 'Mesa 2', seats: 4, zone: 'Salón', status: 'occupied' },
      { id: 't-3', label: 'Mesa 3', seats: 2, zone: 'Salón', status: 'free' },
    ],

    orders: [
      {
        id: 'o-seed-1',
        tableId: 't-1',
        waiterName: 'Mesero Demo',
        status: 'sent',
        createdAt: now - 1000 * 60 * 6,
        updatedAt: now - 1000 * 60 * 5,
        items: [
          {
            id: 'oi-1', productId: 'p-arrachera', name: 'Tacos de arrachera',
            emoji: '🌮', station: 'hot', basePrice: 135, qty: 1,
            modifiers: [], note: 'Bien doraditos', status: 'preparing',
          },
          {
            id: 'oi-2', productId: 'p-jamaica', name: 'Agua fresca de jamaica',
            emoji: '🍹', station: 'cold', basePrice: 45, qty: 1,
            modifiers: [], note: '', status: 'ready',
          },
        ],
      },
      {
        id: 'o-seed-2',
        tableId: 't-2',
        waiterName: 'Mesero Demo',
        status: 'sent',
        createdAt: now - 1000 * 60 * 2,
        updatedAt: now - 1000 * 60 * 2,
        items: [
          {
            id: 'oi-3', productId: 'p-enchiladas', name: 'Enchiladas verdes',
            emoji: '🫔', station: 'hot', basePrice: 120, qty: 1,
            modifiers: [{ id: 'm-queso', name: 'Extra queso', price: 15 }],
            note: '', status: 'new',
          },
          {
            id: 'oi-4', productId: 'p-limonada', name: 'Limonada mineral',
            emoji: '🥤', station: 'cold', basePrice: 50, qty: 1,
            modifiers: [], note: '', status: 'new',
          },
        ],
      },
    ],
  }

  return state
}

/** Helper para clonar un producto vacío para formularios admin. */
export function emptyProduct(categoryId: string): Omit<DemoProduct, 'id'> {
  return {
    categoryId,
    name: '',
    description: '',
    price: 0,
    available: true,
    emoji: '🍽️',
    station: 'hot',
    modifierIds: [],
  }
}

export type { DemoProduct, DemoOrder }
