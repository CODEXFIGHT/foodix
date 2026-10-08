import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentDialog } from '@/components/orders/PaymentDialog'
import type { Order } from '@/lib/types'

// Mock dependencies
const mockMutateAsync = vi.fn()
vi.mock('@/lib/api/queries', () => ({
  usePayOrder: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/hooks/usePrinter', () => ({
  usePrinter: () => ({
    enabled: false,
    printOrder: vi.fn(),
    openDrawer: vi.fn(),
  }),
}))

vi.mock('@/hooks/useKioskMode', () => ({
  useKioskMode: () => ({ isKiosk: false }),
}))

const mockOrder: Order = {
  id: 100,
  branch_id: 1,
  table_id: 1,
  table_name: 'Mesa 1',
  status: 'pending',
  payment_status: 'unpaid',
  order_type: 'dine_in',
  subtotal: 120,
  tax: 0,
  total: 120,
  paid: 20,
  tip: 0,
  discount: 0,
  items: [],
  created_at: '2026-06-18',
  updated_at: '2026-06-18',
}

describe('PaymentDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders payment dialog elements correctly', () => {
    render(<PaymentDialog order={mockOrder} open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Cobrar pedido #100')).toBeInTheDocument()
    expect(screen.getByText('Por cobrar')).toBeInTheDocument()
    // Remaining is 120 - 20 = 100
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('makes the Monto field readOnly and prevents manual input', () => {
    render(<PaymentDialog order={mockOrder} open={true} onOpenChange={vi.fn()} />)
    const amountInput = screen.getByLabelText('Monto') as HTMLInputElement
    expect(amountInput.readOnly).toBe(true)
  })

  it('calculates the change correctly when received amount is entered for cash', async () => {
    render(<PaymentDialog order={mockOrder} open={true} onOpenChange={vi.fn()} />)
    
    // Amount is 100 (remaining). We enter 150 as received.
    const receivedInput = screen.getByLabelText('Recibido')
    fireEvent.change(receivedInput, { target: { value: '150' } })

    // Change should be 150 - 100 = 50.
    // It should display "Cambio a entregar" and "$50.00".
    expect(screen.getByText('Cambio a entregar')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })
})
