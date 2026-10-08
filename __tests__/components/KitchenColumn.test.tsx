import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KitchenOrderCard, KitchenColumn } from '@/app/(dashboard)/kitchen/KitchenComponents';
import type { Order, OrderStatus } from '@/lib/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/components/shared/Icons8Image', () => ({
  Icons8Image: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/hooks/useInterval', () => ({
  useInterval: vi.fn(),
}));

vi.mock('@/hooks/useRealtimeSync', () => ({
  useRealtimeSync: vi.fn(),
}));

vi.mock('date-fns', () => ({
  format: () => '10:30 AM',
}));

vi.mock('date-fns/locale', () => ({
  es: {},
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('@/lib/constants/icons', () => ({
  ICONS8: { pending: '', preparing: '', ready: '' },
}));

vi.mock('@/lib/utils/formatters', () => ({
  formatCurrency: (n: number) => `$${n.toFixed(2)}`,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'ORD-0001',
  tableId: 'table-1',
  tableName: 'Mesa 1',
  status: 'pending',
  items: [{ productId: 'p1', productName: 'Tacos', quantity: 3, unitPrice: 50, subtotal: 150 }],
  subtotal: 150,
  tax: 24,
  total: 174,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'mesero@restauros.demo',
  ...overrides,
});

const noop = vi.fn();

// ── Tests: KitchenOrderCard ───────────────────────────────────────────────────
describe('KitchenOrderCard — renderizado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el ID de la orden', () => {
    render(<KitchenOrderCard order={makeOrder()} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText('ORD-0001')).toBeInTheDocument();
  });

  it('muestra el nombre de la mesa', () => {
    render(<KitchenOrderCard order={makeOrder()} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
  });

  it('muestra los productos', () => {
    render(<KitchenOrderCard order={makeOrder()} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText('Tacos')).toBeInTheDocument();
  });

  it('muestra Efectivo cuando paymentMethod es cash', () => {
    render(<KitchenOrderCard order={makeOrder({ paymentMethod: 'cash' })} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText(/Efectivo/)).toBeInTheDocument();
  });

  it('muestra Tarjeta cuando paymentMethod es card', () => {
    render(<KitchenOrderCard order={makeOrder({ paymentMethod: 'card' })} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText(/Tarjeta/)).toBeInTheDocument();
  });

  it('no muestra badge de pago si paymentMethod es undefined', () => {
    render(<KitchenOrderCard order={makeOrder()} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.queryByText(/Efectivo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tarjeta/)).not.toBeInTheDocument();
  });

  it('muestra "Iniciar preparación" para orden pending', () => {
    render(<KitchenOrderCard order={makeOrder({ status: 'pending' })} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText('Iniciar preparación')).toBeInTheDocument();
  });

  it('muestra "Marcar como lista ✓" para orden preparing', () => {
    render(<KitchenOrderCard order={makeOrder({ status: 'preparing' })} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText(/Marcar como lista/)).toBeInTheDocument();
  });

  it('muestra "Confirmar entrega" para orden ready', () => {
    render(<KitchenOrderCard order={makeOrder({ status: 'ready' })} onAction={noop} onViewDetail={noop} isNew={false} />);
    expect(screen.getByText('Confirmar entrega')).toBeInTheDocument();
  });

  it('llama onAction con el próximo status al hacer click', () => {
    const onAction = vi.fn();
    render(<KitchenOrderCard order={makeOrder({ status: 'pending' })} onAction={onAction} onViewDetail={noop} isNew={false} />);
    fireEvent.click(screen.getByText('Iniciar preparación'));
    expect(onAction).toHaveBeenCalledWith('ORD-0001', 'preparing');
  });

  it('llama onViewDetail al hacer click en "Ver detalle"', () => {
    const onViewDetail = vi.fn();
    const order = makeOrder();
    render(<KitchenOrderCard order={order} onAction={noop} onViewDetail={onViewDetail} isNew={false} />);
    fireEvent.click(screen.getByText('Ver detalle'));
    expect(onViewDetail).toHaveBeenCalledWith(order);
  });
});

// ── Tests: KitchenColumn ──────────────────────────────────────────────────────
describe('KitchenColumn — renderizado', () => {
  it('muestra header "Nuevas órdenes" para columna pending', () => {
    render(<KitchenColumn tab="pending" orders={[]} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('Nuevas órdenes')).toBeInTheDocument();
  });

  it('muestra header "En preparación" para columna preparing', () => {
    render(<KitchenColumn tab="preparing" orders={[]} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('En preparación')).toBeInTheDocument();
  });

  it('muestra header "Listas para entregar" para columna ready', () => {
    render(<KitchenColumn tab="ready" orders={[]} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('Listas para entregar')).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay órdenes', () => {
    render(<KitchenColumn tab="pending" orders={[]} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('Sin órdenes nuevas')).toBeInTheDocument();
  });

  it('muestra el conteo de órdenes en el badge', () => {
    const orders = [makeOrder(), makeOrder({ id: 'ORD-0002' })];
    render(<KitchenColumn tab="pending" orders={orders} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza las tarjetas de órdenes', () => {
    render(<KitchenColumn tab="pending" orders={[makeOrder()]} newIds={new Set()} onAction={noop} onViewDetail={noop} />);
    expect(screen.getByText('ORD-0001')).toBeInTheDocument();
  });
});
