import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderSummary } from '@/components/orders/OrderSummary';
import type { DraftOrderItem } from '@/components/orders/OrderSummary';

// Radix Separator renders a <hr>-like element; mock to avoid env issues
vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

const ITEMS: DraftOrderItem[] = [
  { uid: 'u1', product_id: 1, product_name: 'Café Americano', quantity: 2, unit_price: 35, subtotal: 70 },
  { uid: 'u2', product_id: 2, product_name: 'Cappuccino', quantity: 1, unit_price: 48, subtotal: 48 },
];

const BASE_PROPS = {
  items: ITEMS,
  subtotal: 118,
  tax: 18.88,
  total: 136.88,
  taxRate: 16,
};

describe('OrderSummary — renderizado básico', () => {
  it('muestra todos los nombres de productos', () => {
    render(<OrderSummary {...BASE_PROPS} />);
    expect(screen.getByText('Café Americano')).toBeInTheDocument();
    expect(screen.getByText('Cappuccino')).toBeInTheDocument();
  });

  it('muestra el subtotal', () => {
    render(<OrderSummary {...BASE_PROPS} />);
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
  });

  it('muestra IVA con porcentaje', () => {
    render(<OrderSummary {...BASE_PROPS} />);
    expect(screen.getByText('IVA incluido (16%)')).toBeInTheDocument();
  });

  it('muestra Total', () => {
    render(<OrderSummary {...BASE_PROPS} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay productos', () => {
    render(<OrderSummary {...BASE_PROPS} items={[]} />);
    expect(screen.getByText('Sin productos agregados')).toBeInTheDocument();
  });
});
