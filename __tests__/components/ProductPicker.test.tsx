import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Product, Category } from '@/lib/types'

// ── Mocks de datos y dependencias ───────────────────────────────────────────
const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) } }))
vi.mock('@/hooks/useBarcodeScanner', () => ({ useBarcodeScanner: () => {} }))
vi.mock('./ModifierDialog', () => ({ ModifierDialog: () => null }))
vi.mock('@/components/orders/ModifierDialog', () => ({ ModifierDialog: () => null }))

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: 1, branch_id: 1, role: 'mesero', name: 'Ana' } }),
}))

function makeProduct(p: Partial<Product> & { id: number; name: string; category_id: number }): Product {
  return {
    branch_id: 1, description: null, ingredients: null, allergens: null, badge: null,
    price: 50, image_url: null, emoji: null, barcode: null, station_override: null,
    available: true, sort_order: 0, created_at: '2026-01-01', updated_at: '2026-01-01', ...p,
  }
}
const CATS: Category[] = [
  { id: 1, branch_id: 1, name: 'Tacos', emoji: '🌮', color: '#f00', sort_order: 0, active: true, station: 'hot' },
  { id: 2, branch_id: 1, name: 'Bebidas', emoji: '🥤', color: '#00f', sort_order: 1, active: true, station: 'cold' },
]
const PRODUCTS: Product[] = [
  makeProduct({ id: 1, name: 'Taco al Pastor', category_id: 1, price: 25 }),
  makeProduct({ id: 2, name: 'Coca-Cola', category_id: 2, price: 30 }),
  makeProduct({ id: 3, name: 'Cerveza', category_id: 2, price: 45, available: false }),
]

vi.mock('@/lib/api/queries', () => ({
  useProducts: () => ({ data: PRODUCTS, isLoading: false }),
  useCategories: () => ({ data: CATS }),
  useModifiers: () => ({ data: [] }),
}))

// Importa después de los mocks.
import { ProductPicker } from '@/components/orders/ProductPicker'
import type { DraftOrderItem } from '@/components/orders/OrderSummary'

const baseProps = {
  items: [] as DraftOrderItem[],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onUpdateQty: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductPicker — render', () => {
  it('muestra el buscador con autofocus', () => {
    render(<ProductPicker {...baseProps} />)
    const input = screen.getByLabelText('Buscar productos')
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('muestra productos disponibles y marca el no disponible', () => {
    render(<ProductPicker {...baseProps} />)
    expect(screen.getByText('Taco al Pastor')).toBeInTheDocument()
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument()
    expect(screen.getByText('Cerveza')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })
})

describe('ProductPicker — búsqueda y filtros', () => {
  it('filtra por nombre (con debounce)', async () => {
    render(<ProductPicker {...baseProps} />)
    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'coca' } })
    await waitFor(() => {
      expect(screen.queryByText('Taco al Pastor')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument()
  })

  it('filtra por categoría al hacer click en el chip', () => {
    render(<ProductPicker {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /tacos/i }))
    expect(screen.getByText('Taco al Pastor')).toBeInTheDocument()
    expect(screen.queryByText('Coca-Cola')).not.toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay resultados', async () => {
    render(<ProductPicker {...baseProps} />)
    fireEvent.change(screen.getByLabelText('Buscar productos'), { target: { value: 'zzz' } })
    await waitFor(() => {
      expect(screen.getByText('No se encontraron productos')).toBeInTheDocument()
    })
  })

  it('el botón X limpia la búsqueda', async () => {
    render(<ProductPicker {...baseProps} />)
    const input = screen.getByLabelText('Buscar productos') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'coca' } })
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'))
    expect(input.value).toBe('')
  })
})

describe('ProductPicker — agregar al pedido', () => {
  it('agrega un producto disponible al hacer click', () => {
    const onAdd = vi.fn()
    render(<ProductPicker {...baseProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Taco al Pastor'))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toMatchObject({ product_id: 1, quantity: 1, unit_price: 25 })
  })

  it('incrementa la cantidad si el producto ya está en el pedido', () => {
    const onUpdateQty = vi.fn()
    const items: DraftOrderItem[] = [
      { uid: 'x', product_id: 1, product_name: 'Taco al Pastor', quantity: 1, unit_price: 25, subtotal: 25 },
    ]
    render(<ProductPicker {...baseProps} items={items} onUpdateQty={onUpdateQty} />)
    fireEvent.click(screen.getByText('Taco al Pastor'))
    expect(onUpdateQty).toHaveBeenCalledWith('x', 2)
  })

  it('bloquea productos no disponibles y avisa', () => {
    const onAdd = vi.fn()
    render(<ProductPicker {...baseProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Cerveza'))
    expect(onAdd).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })
})
