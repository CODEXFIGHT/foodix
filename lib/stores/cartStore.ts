/**
 * FoodIX — Sistema de gestión para restaurantes
 * Store del carrito de la carta digital del cliente.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

/**
 * @fileoverview Store Zustand para el carrito de compras de la carta digital
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  /**
   * Clave única de la línea. Para un producto suelto es su id; para un paquete
   * es `combo:{id}` — así combos y productos conviven en la misma lista sin
   * colisionar de ids y sin tocar removeItem/updateQty.
   */
  productId: string;
  productName: string;
  image: string;
  unitPrice: number;
  quantity: number;
  /** Solo en paquetes: id real del combo, el que espera POST /orders. */
  comboId?: number;
  /** Solo en paquetes: qué incluye, para pintarlo en el carrito. */
  includes?: string[];
}

/** Clave de carrito de un paquete (ver CartItem.productId). */
export function comboCartId(comboId: number): string {
  return `combo:${comboId}`;
}

interface CartStore {
  items: CartItem[];
  tableNumber: string;
  notes: string;
  setTableNumber: (t: string) => void;
  setNotes: (n: string) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableNumber: '',
      notes: '',

      setTableNumber: (t) => set({ tableNumber: t }),
      setNotes: (n) => set({ notes: n }),

      addItem: (item, qty = 1) => {
        const existing = get().items.find(i => i.productId === item.productId);
        if (existing) {
          set(s => ({
            items: s.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          }));
        } else {
          set(s => ({ items: [...s.items, { ...item, quantity: qty }] }));
        }
      },

      removeItem: (productId) => {
        set(s => ({ items: s.items.filter(i => i.productId !== productId) }));
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set(s => ({
          items: s.items.map(i =>
            i.productId === productId ? { ...i, quantity: qty } : i
          ),
        }));
      },

      clearCart: () => set({ items: [], notes: '' }),
    }),
    {
      name: 'restauros_cart',
      partialize: (s) => ({ items: s.items, tableNumber: s.tableNumber }),
    }
  )
);

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
