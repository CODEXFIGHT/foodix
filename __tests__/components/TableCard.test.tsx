import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableCard } from '@/components/tables/TableCard'
import type { Table } from '@/lib/types'

// Mock useKioskMode
vi.mock('@/hooks/useKioskMode', () => ({
  useKioskMode: () => ({ isKiosk: false }),
}))

describe('TableCard Component', () => {
  const mockTable: Table = {
    id: 1,
    branch_id: 1,
    name: 'Mesa 1',
    seats: 4,
    status: 'libre',
    current_order_id: null,
    created_at: '2026-06-18',
    updated_at: '2026-06-18',
  }

  it('renders table details correctly when libre', () => {
    render(<TableCard table={mockTable} />)
    expect(screen.getByText('Mesa 1')).toBeInTheDocument()
    expect(screen.getByText('4 personas')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
  })

  it('renders table details and current order id when occupied', () => {
    const occupiedTable: Table = {
      ...mockTable,
      status: 'ocupada',
      current_order_id: 123,
    }
    render(<TableCard table={occupiedTable} />)
    expect(screen.getByText('Mesa 1')).toBeInTheDocument()
    expect(screen.getByText('Ocupada')).toBeInTheDocument()
    expect(screen.getByText('#123')).toBeInTheDocument()
  })
})
