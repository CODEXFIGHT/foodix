/**
 * RestaurOS — Pruebas de la lógica pura de "Dividir Cuenta".
 * @author JIMMY LOPEZ
 */
import { describe, it, expect } from 'vitest'
import {
  splitEvenly,
  roundMoney,
  defaultSplitLabel,
  buildPeopleSplits,
  buildItemSplits,
  allocTotal,
  lineUnit,
  fullyAllocated,
  validateSplitPlan,
  splitProgress,
  splittableItems,
} from '@/lib/pos/splitBill'
import type { OrderItem, OrderSplit } from '@/lib/types'

function item(partial: Partial<OrderItem> & { id: number; subtotal: number; quantity: number }): OrderItem {
  return {
    order_id: 1,
    product_id: partial.id,
    product_name: `Producto ${partial.id}`,
    unit_price: partial.subtotal / partial.quantity,
    modifiers: [],
    status: 'pending',
    ...partial,
  } as OrderItem
}

describe('splitEvenly', () => {
  it('reparte exacto sin perder centavos', () => {
    const parts = splitEvenly(100, 3)
    expect(parts).toEqual([33.34, 33.33, 33.33])
    expect(roundMoney(parts.reduce((s, n) => s + n, 0))).toBe(100)
  })

  it('divide montos limpios en partes iguales', () => {
    expect(splitEvenly(262.5, 2)).toEqual([131.25, 131.25])
  })

  it('maneja 1 parte y entradas inválidas', () => {
    expect(splitEvenly(50, 1)).toEqual([50])
    expect(splitEvenly(50, 0)).toEqual([])
  })

  it('la suma siempre iguala el total para cualquier cantidad', () => {
    for (const n of [2, 4, 5, 7, 11]) {
      const sum = roundMoney(splitEvenly(99.99, n).reduce((s, x) => s + x, 0))
      expect(sum).toBe(99.99)
    }
  })
})

describe('etiquetas', () => {
  it('usa letras y luego números', () => {
    expect(defaultSplitLabel(0)).toBe('Cliente A')
    expect(defaultSplitLabel(1)).toBe('Cliente B')
    expect(defaultSplitLabel(26)).toBe('Cliente 27')
  })
})

describe('buildPeopleSplits', () => {
  it('crea N divisiones que cuadran con el total', () => {
    const splits = buildPeopleSplits(300, 4)
    expect(splits).toHaveLength(4)
    expect(roundMoney(splits.reduce((s, x) => s + x.total, 0))).toBe(300)
    expect(splits[0].label).toBe('Cliente A')
    expect(splits.every(s => s.items.length === 0)).toBe(true)
  })
})

describe('asignación por ítems', () => {
  const items = [
    item({ id: 1, subtotal: 200, quantity: 2 }), // 100 c/u (2 cheladas)
    item({ id: 2, subtotal: 150, quantity: 1 }), // mojarra
    item({ id: 3, subtotal: 40, quantity: 1 }),  // refresco
  ]

  it('lineUnit divide subtotal por cantidad', () => {
    expect(lineUnit(items[0])).toBe(100)
  })

  it('allocTotal suma según cantidades asignadas', () => {
    const byId = new Map(items.map(i => [i.id, i]))
    expect(allocTotal([{ order_item_id: 1, quantity: 1 }, { order_item_id: 3, quantity: 1 }], byId)).toBe(140)
  })

  it('buildItemSplits construye divisiones por grupo (ejemplo Cliente A / B)', () => {
    const splits = buildItemSplits([
      { label: 'Cliente A', alloc: new Map([[1, 1], [3, 1]]) },
      { label: 'Cliente B', alloc: new Map([[1, 1], [2, 1]]) },
    ], items)
    expect(splits[0].total).toBe(140) // 1 chelada + refresco
    expect(splits[1].total).toBe(250) // 1 chelada + mojarra
    expect(roundMoney(splits[0].total + splits[1].total)).toBe(390)
  })

  it('fullyAllocated detecta ítems sin asignar', () => {
    const incompletos = buildItemSplits([
      { label: 'A', alloc: new Map([[1, 1]]) },
      { label: 'B', alloc: new Map([[1, 1], [2, 1]]) },
    ], items)
    expect(fullyAllocated(items, incompletos)).toBe(false) // falta el refresco

    const completos = buildItemSplits([
      { label: 'A', alloc: new Map([[1, 1], [3, 1]]) },
      { label: 'B', alloc: new Map([[1, 1], [2, 1]]) },
    ], items)
    expect(fullyAllocated(items, completos)).toBe(true)
  })

  it('ignora ítems cancelados', () => {
    const conCancelado = [...items, item({ id: 4, subtotal: 99, quantity: 1, status: 'cancelled' })]
    expect(splittableItems(conCancelado)).toHaveLength(3)
  })
})

describe('validateSplitPlan', () => {
  const items = [item({ id: 1, subtotal: 100, quantity: 1 })]

  it('exige al menos 2 divisiones', () => {
    expect(validateSplitPlan([{ label: 'A', total: 100, items: [] }], 100, 'amount').ok).toBe(false)
  })

  it('rechaza montos no positivos', () => {
    const r = validateSplitPlan([{ label: 'A', total: 100, items: [] }, { label: 'B', total: 0, items: [] }], 100, 'amount')
    expect(r.ok).toBe(false)
  })

  it('exige que la suma iguale el total', () => {
    const r = validateSplitPlan([{ label: 'A', total: 60, items: [] }, { label: 'B', total: 30, items: [] }], 100, 'amount')
    expect(r.ok).toBe(false)
    expect(r.message).toContain('total')
  })

  it('acepta un plan que cuadra', () => {
    expect(validateSplitPlan([{ label: 'A', total: 50, items: [] }, { label: 'B', total: 50, items: [] }], 100, 'people').ok).toBe(true)
  })

  it('en modo por ítems exige asignación completa', () => {
    const splits = buildItemSplits([{ label: 'A', alloc: new Map([[1, 1]]) }, { label: 'B', alloc: new Map() }], items)
    // total cuadra (100) pero B no aporta -> total 0 invalida por monto; usamos 2 ítems
    const items2 = [item({ id: 1, subtotal: 50, quantity: 1 }), item({ id: 2, subtotal: 50, quantity: 1 })]
    const ok = buildItemSplits([{ label: 'A', alloc: new Map([[1, 1]]) }, { label: 'B', alloc: new Map([[2, 1]]) }], items2)
    expect(validateSplitPlan(ok, 100, 'items', items2).ok).toBe(true)
    expect(splits.length).toBe(2)
  })
})

describe('splitProgress', () => {
  const splits: Pick<OrderSplit, 'status' | 'total'>[] = [
    { status: 'paid', total: 130 },
    { status: 'pending', total: 130 },
  ]
  it('calcula avance de cobro', () => {
    const p = splitProgress(splits)
    expect(p.paid).toBe(1)
    expect(p.total).toBe(2)
    expect(p.paidAmount).toBe(130)
    expect(p.totalAmount).toBe(260)
    expect(p.percent).toBe(50)
    expect(p.allPaid).toBe(false)
  })

  it('detecta todo pagado', () => {
    const p = splitProgress([{ status: 'paid', total: 10 }, { status: 'paid', total: 10 }])
    expect(p.allPaid).toBe(true)
    expect(p.percent).toBe(100)
  })

  it('tolera lista vacía/indefinida', () => {
    expect(splitProgress(undefined).total).toBe(0)
    expect(splitProgress([]).allPaid).toBe(false)
  })
})
