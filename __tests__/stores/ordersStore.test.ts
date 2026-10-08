import { describe, it, expect, beforeEach } from 'vitest';
import { useOrdersStore } from '@/lib/stores/ordersStore';
import type { OrderItem } from '@/lib/types';

const SAMPLE_ITEM: OrderItem = {
  productId: 'p-1',
  productName: 'Café Americano',
  quantity: 2,
  unitPrice: 35,
  subtotal: 70,
};

const BASE_PAYLOAD = {
  tableId: 'table-1',
  tableName: 'Mesa 1',
  items: [SAMPLE_ITEM],
  taxRate: 16,
  createdBy: 'mesero@restauros.demo',
};

beforeEach(() => {
  useOrdersStore.setState({ orders: [] });
  localStorage.clear();
});

describe('ordersStore — createOrder', () => {
  it('crea orden con status pending', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(order.status).toBe('pending');
  });

  it('genera ID único con prefijo ORD-', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(order.id).toMatch(/^ORD-\d{4}$/);
  });

  it('no duplica IDs al crear varias órdenes', () => {
    const o1 = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    const o2 = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(o1.id).not.toBe(o2.id);
  });

  it('calcula subtotal, tax y total correctamente', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(order.subtotal).toBe(70);
    expect(order.tax).toBeCloseTo(70 * 0.16, 2);
    expect(order.total).toBeCloseTo(70 * 1.16, 2);
  });

  it('guarda tableId, tableName, items, createdBy', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(order.tableId).toBe('table-1');
    expect(order.tableName).toBe('Mesa 1');
    expect(order.items).toHaveLength(1);
    expect(order.createdBy).toBe('mesero@restauros.demo');
  });

  it('persiste paymentMethod cash', () => {
    const order = useOrdersStore.getState().createOrder({ ...BASE_PAYLOAD, paymentMethod: 'cash' });
    expect(order.paymentMethod).toBe('cash');
    const stored = useOrdersStore.getState().orders.find(o => o.id === order.id);
    expect(stored?.paymentMethod).toBe('cash');
  });

  it('persiste paymentMethod card', () => {
    const order = useOrdersStore.getState().createOrder({ ...BASE_PAYLOAD, paymentMethod: 'card' });
    expect(order.paymentMethod).toBe('card');
  });

  it('paymentMethod undefined cuando no se especifica', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(order.paymentMethod).toBeUndefined();
  });

  it('agrega la orden al store', () => {
    useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    expect(useOrdersStore.getState().orders).toHaveLength(1);
  });
});

describe('ordersStore — updateStatus', () => {
  it('cambia status a preparing y registra preparingAt', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().updateStatus(order.id, 'preparing');
    const updated = useOrdersStore.getState().orders.find(o => o.id === order.id);
    expect(updated?.status).toBe('preparing');
    expect(updated?.preparingAt).toBeDefined();
  });

  it('cambia status a ready y registra readyAt', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().updateStatus(order.id, 'ready');
    const updated = useOrdersStore.getState().orders.find(o => o.id === order.id);
    expect(updated?.status).toBe('ready');
    expect(updated?.readyAt).toBeDefined();
  });

  it('cambia status a completed y registra completedAt', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().updateStatus(order.id, 'completed');
    const updated = useOrdersStore.getState().orders.find(o => o.id === order.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeDefined();
  });
});

describe('ordersStore — getActiveOrders', () => {
  it('solo devuelve órdenes activas', () => {
    useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    const o2 = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().updateStatus(o2.id, 'cancelled');
    const active = useOrdersStore.getState().getActiveOrders();
    expect(active.every(o => o.status !== 'cancelled')).toBe(true);
  });
});

describe('ordersStore — cancelOrder', () => {
  it('marca la orden como cancelled', () => {
    const order = useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().cancelOrder(order.id);
    const cancelled = useOrdersStore.getState().orders.find(o => o.id === order.id);
    expect(cancelled?.status).toBe('cancelled');
  });
});

describe('ordersStore — ordenado por createdAt', () => {
  it('orden más reciente aparece primero', () => {
    useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    useOrdersStore.getState().createOrder(BASE_PAYLOAD);
    const [first, second] = useOrdersStore.getState().orders;
    expect(new Date(first.createdAt) >= new Date(second.createdAt)).toBe(true);
  });
});
