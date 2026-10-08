import { describe, it, expect } from 'vitest'
import {
  filterProducts, canAddProduct, resolveQuickAdd, normalize, resolveSearchSubmit,
} from '@/lib/utils/productSearch'
import type { Product, Category } from '@/lib/types'

function makeProduct(p: Partial<Product> & { id: number; name: string; category_id: number }): Product {
  return {
    branch_id: 1,
    description: null,
    ingredients: null,
    allergens: null,
    badge: null,
    price: 50,
    image_url: null,
    emoji: null,
    barcode: null,
    station_override: null,
    available: true,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...p,
  }
}

function makeCategory(c: Partial<Category> & { id: number; name: string }): Category {
  return {
    branch_id: 1, emoji: '🍽️', color: '#000', sort_order: 0, active: true, station: 'hot', ...c,
  }
}

const CATS = [
  makeCategory({ id: 1, name: 'Tacos' }),
  makeCategory({ id: 2, name: 'Bebidas' }),
]
const CATS_BY_ID = new Map(CATS.map(c => [c.id, c]))

const PRODUCTS: Product[] = [
  makeProduct({ id: 1, name: 'Taco al Pastor', category_id: 1, barcode: '7501234', description: 'con piña' }),
  makeProduct({ id: 2, name: 'Taco de Bistec', category_id: 1, ingredients: 'res, cebolla, cilantro' }),
  makeProduct({ id: 3, name: 'Coca-Cola', category_id: 2, barcode: 'COKE-600' }),
  makeProduct({ id: 4, name: 'Agua de Horchata', category_id: 2 }),
  makeProduct({ id: 5, name: 'Cerveza', category_id: 2, available: false }),
]

describe('normalize', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalize('Piña Colada')).toBe('pina colada')
    expect(normalize('  CAFÉ  ')).toBe('cafe')
  })
})

describe('filterProducts — por nombre', () => {
  it('encuentra por parte del nombre (insensible a acentos/mayúsculas)', () => {
    const r = filterProducts(PRODUCTS, CATS_BY_ID, { query: 'taco' })
    expect(r.map(p => p.id)).toEqual([1, 2])
  })

  it('acota con varios términos (AND)', () => {
    const r = filterProducts(PRODUCTS, CATS_BY_ID, { query: 'taco pastor' })
    expect(r.map(p => p.id)).toEqual([1])
  })

  it('devuelve todos con consulta vacía', () => {
    expect(filterProducts(PRODUCTS, CATS_BY_ID, { query: '' })).toHaveLength(PRODUCTS.length)
  })
})

describe('filterProducts — por categoría / código / descripción / ingredientes', () => {
  it('busca por nombre de categoría', () => {
    const r = filterProducts(PRODUCTS, CATS_BY_ID, { query: 'bebidas' })
    expect(r.map(p => p.id).sort()).toEqual([3, 4, 5])
  })

  it('busca por código de barras', () => {
    const r = filterProducts(PRODUCTS, CATS_BY_ID, { query: 'COKE-600' })
    expect(r.map(p => p.id)).toEqual([3])
  })

  it('busca por descripción e ingredientes', () => {
    expect(filterProducts(PRODUCTS, CATS_BY_ID, { query: 'piña' }).map(p => p.id)).toEqual([1])
    expect(filterProducts(PRODUCTS, CATS_BY_ID, { query: 'cilantro' }).map(p => p.id)).toEqual([2])
  })

  it('combina búsqueda + filtro de categoría', () => {
    const r = filterProducts(PRODUCTS, CATS_BY_ID, { query: 'taco', categoryId: 1 })
    expect(r.map(p => p.id)).toEqual([1, 2])
    expect(filterProducts(PRODUCTS, CATS_BY_ID, { query: 'taco', categoryId: 2 })).toHaveLength(0)
  })

  it('sin resultados devuelve arreglo vacío', () => {
    expect(filterProducts(PRODUCTS, CATS_BY_ID, { query: 'zzz' })).toHaveLength(0)
  })
})

describe('canAddProduct', () => {
  it('permite productos disponibles con precio > 0', () => {
    expect(canAddProduct({ available: true, price: 50 })).toBe(true)
  })
  it('bloquea no disponibles', () => {
    expect(canAddProduct({ available: false, price: 50 })).toBe(false)
  })
  it('bloquea precio inválido', () => {
    expect(canAddProduct({ available: true, price: 0 })).toBe(false)
  })
})

describe('resolveQuickAdd', () => {
  it('crea nueva línea si el producto no está en el carrito', () => {
    expect(resolveQuickAdd([], 1)).toEqual({ type: 'new' })
  })

  it('incrementa la línea sin modificadores existente', () => {
    const items = [{ uid: 'a', product_id: 1, quantity: 2 }]
    expect(resolveQuickAdd(items, 1)).toEqual({ type: 'increment', uid: 'a', quantity: 3 })
  })

  it('no fusiona con líneas que tienen modificadores', () => {
    const items = [{ uid: 'a', product_id: 1, quantity: 1, modifiers: [{ name: 'extra' }] }]
    expect(resolveQuickAdd(items, 1)).toEqual({ type: 'new' })
  })
})

describe('resolveSearchSubmit', () => {
  const search = (query: string) =>
    resolveSearchSubmit(filterProducts(PRODUCTS, CATS_BY_ID, { query }), query)

  it('agrega cuando el filtro deja un único candidato', () => {
    expect(search('horchata')?.id).toBe(4)
  })

  it('no adivina si hay varios candidatos', () => {
    expect(search('taco')).toBeNull()
  })

  it('prioriza el código de barras exacto sobre el resto', () => {
    expect(search('COKE-600')?.id).toBe(3)
  })

  it('resuelve por nombre exacto aunque haya otros que lo contengan', () => {
    const products = [
      makeProduct({ id: 10, name: 'Café', category_id: 2 }),
      makeProduct({ id: 11, name: 'Café con leche', category_id: 2 }),
    ]
    const query = 'cafe'
    expect(resolveSearchSubmit(filterProducts(products, CATS_BY_ID, { query }), query)?.id).toBe(10)
  })

  it('ignora una consulta vacía', () => {
    expect(resolveSearchSubmit(PRODUCTS, '   ')).toBeNull()
  })

  it('no devuelve nada si no hubo coincidencias', () => {
    expect(search('sushi')).toBeNull()
  })
})
