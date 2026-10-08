/**
 * FoodIX — Sistema de gestión para restaurantes
 * Hooks de TanStack Query para la Vista "Mesa Activa" del mesero: menú,
 * orden activa con detección de conflicto, envío optimista y parseo de voz.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest, ApiError } from '@/lib/api/client'
import { enqueueOutboxEntry } from '@/lib/offline/outbox'
import { useProducts, useCategories, useModifiers, useTable } from '@/lib/api/queries'
import type { Order, OrderItem, Table, VoiceParseResult } from '@/lib/types'
import type { DraftOrderItem } from '@/components/orders/OrderSummary'
import type { NewOrderItemInput } from '@/lib/api/queries'

// ─── Menú (catálogo de la carta, cambia poco) ─────────────────────────────────

export function useMenu(branchId: number | null) {
  const products = useProducts(branchId)
  const categories = useCategories(branchId)
  const modifiers = useModifiers(branchId)

  return {
    products: products.data ?? [],
    categories: categories.data ?? [],
    modifierGroups: modifiers.data ?? [],
    isLoading: products.isLoading || categories.isLoading || modifiers.isLoading,
  }
}

// ─── Orden activa de la mesa (con detección de conflicto) ─────────────────────

export interface MesaOrdenData {
  table: Table | null
  order: Order | null
}

/**
 * Trae mesa + su orden activa bajo una sola queryKey estable, con refetch
 * corto: si otra estación (otro mesero, caja, cocina) toca la misma mesa,
 * `order.updated_at` cambia y el llamador puede comparar contra el timestamp
 * que tenía al empezar a editar para mostrar el banner de conflicto.
 */
export function useMesaOrden(mesaId: number | null) {
  const tableQuery = useTable(mesaId)
  const table = tableQuery.data ?? null
  const orderId = table?.current_order_id ?? null

  return useQuery({
    queryKey: ['mesa', mesaId, 'orden-activa'],
    queryFn: async (): Promise<MesaOrdenData> => {
      const order = orderId ? await apiRequest<Order>(`/orders/${orderId}`) : null
      return { table, order }
    },
    enabled: mesaId !== null && tableQuery.isSuccess,
    refetchInterval: 4_000,
  })
}

// ─── Envío a cocina (optimista, con rollback) ─────────────────────────────────

function itemFromDraft(draft: DraftOrderItem, tempId: number): OrderItem {
  return {
    id: tempId,
    order_id: -1,
    product_id: draft.product_id,
    product_name: draft.product_name,
    quantity: draft.quantity,
    unit_price: draft.unit_price,
    price_type: draft.price_type,
    weight_kg: draft.weight_kg,
    price_per_kg: draft.price_per_kg,
    subtotal: draft.subtotal,
    modifiers: draft.modifiers,
    selectedModifiers: draft.selectedModifiers,
    item_notes: draft.item_notes ?? null,
    status: 'pending',
  }
}

function toNewOrderItems(items: DraftOrderItem[]): NewOrderItemInput[] {
  return items.map(i => ({
    product_id: i.product_id,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    price_type: i.price_type,
    weight_kg: i.weight_kg,
    price_per_kg: i.price_per_kg,
    modifiers: [
      ...(i.modifiers ?? []),
      ...(i.selectedModifiers ?? []).map(name => ({ name, price_delta: 0 })),
    ],
    item_notes: i.item_notes ?? null,
  }))
}

export interface EnviarOrdenInput {
  branchId: number
  createdBy?: number
  tableName: string
  existingOrderId: number | null
  items: DraftOrderItem[]
  notes?: string
  /** UUID generado una sola vez por intento de envío — permite al backend
   *  ignorar reintentos duplicados (offline retry) sin crear pedidos/líneas
   *  repetidas. Ver php-backend/routes/orders.php + mesero_request_dedup. */
  clientRequestId: string
}

/**
 * Hace la petición real al backend para enviar un pedido (nuevo o agregando
 * a uno existente). Extraído de `useEnviarOrden` para que el orquestador del
 * outbox offline (lib/offline/syncOutbox.ts) pueda reintentar el mismo
 * request fuera de un componente React, sin duplicar la construcción del
 * body ni el `client_request_id`.
 */
export async function sendOrdenToServer(
  mesaId: number | null,
  input: EnviarOrdenInput,
): Promise<{ order: Order; new_item_ids: number[] }> {
  if (input.existingOrderId) {
    return apiRequest<{ order: Order; new_item_ids: number[] }>(
      `/orders/${input.existingOrderId}/items`,
      {
        method: 'POST',
        body: JSON.stringify({
          items: toNewOrderItems(input.items),
          client_request_id: input.clientRequestId,
        }),
      },
    )
  }
  const subtotal = input.items.reduce((s, i) => s + i.subtotal, 0)
  const order = await apiRequest<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      branch_id: input.branchId,
      table_id: mesaId,
      table_name: input.tableName,
      order_type: 'dine_in',
      notes: input.notes?.trim() || null,
      subtotal,
      tax: 0,
      total: subtotal,
      created_by: input.createdBy,
      items: toNewOrderItems(input.items),
      client_request_id: input.clientRequestId,
    }),
  })
  return { order, new_item_ids: [] as number[] }
}

/**
 * Un fallo de `apiRequest` es "de red" (sin respuesta del servidor) cuando
 * NO es un `ApiError` — `apiRequest` solo lanza `ApiError` una vez que el
 * `fetch` resolvió con una respuesta HTTP real. Si la red falla antes de
 * eso, `fetch` rechaza con `TypeError` (o `NetworkError` en Safari), nunca
 * con `ApiError`. Este criterio decide si encolar (offline) o revertir
 * (error real de validación/negocio).
 */
export function isNetworkFailure(err: unknown): boolean {
  return !(err instanceof ApiError)
}

/**
 * Envía el borrador a cocina. Si la mesa ya tiene una orden abierta, agrega
 * los ítems a esa orden; si no, crea una nueva. Aplica el borrador a la
 * caché de inmediato (mutación optimista).
 *
 * Si el envío falla por un error real del servidor (validación, 409, etc.)
 * revierte el optimista. Si falla por falta de conexión, en vez de revertir
 * encola el pedido en el outbox offline (lib/offline/syncOutbox.ts) y deja
 * el estado optimista visible — se sincronizará solo al recuperar señal.
 */
export function useEnviarOrden(mesaId: number | null) {
  const qc = useQueryClient()
  const key = ['mesa', mesaId, 'orden-activa'] as const

  return useMutation({
    mutationFn: (input: EnviarOrdenInput) => sendOrdenToServer(mesaId, input),

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<MesaOrdenData>(key)

      qc.setQueryData<MesaOrdenData>(key, (current) => {
        const base = current ?? { table: null, order: null }
        const optimisticItems = input.items.map((d, idx) => itemFromDraft(d, -(idx + 1)))

        if (base.order) {
          return { ...base, order: { ...base.order, items: [...base.order.items, ...optimisticItems] } }
        }

        const subtotal = input.items.reduce((s, i) => s + i.subtotal, 0)
        const optimisticOrder: Order = {
          id: -1,
          branch_id: input.branchId,
          table_id: mesaId,
          table_name: input.tableName,
          status: 'pending',
          order_type: 'dine_in',
          customer_id: null,
          delivery_address: null,
          delivery_status: null,
          driver_id: null,
          source: 'mesero',
          items: optimisticItems,
          subtotal,
          tax: 0,
          total: subtotal,
          discount: 0,
          tip: 0,
          paid: 0,
          payment_status: 'unpaid',
          notes: input.notes?.trim() || null,
          created_by: input.createdBy ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
        }
        return { ...base, order: optimisticOrder }
      })

      return { previous }
    },

    onError: async (err, input, context) => {
      if (isNetworkFailure(err) && mesaId !== null) {
        // Sin conexión: no revertimos el optimista, lo encolamos para que
        // lib/offline/syncOutbox.ts lo reintente al reconectar. El pedido
        // ya confirmado por el mesero se ve como "enviado" en pantalla.
        await enqueueOutboxEntry({
          clientRequestId: input.clientRequestId,
          mesaId,
          branchId: input.branchId,
          kind: input.existingOrderId ? 'add_items' : 'create_order',
          existingOrderId: input.existingOrderId,
          payload: input,
        })
        return
      }
      // Error real del servidor (validación, 409, etc.): revertir de verdad.
      if (context?.previous) qc.setQueryData(key, context.previous)
    },

    onSettled: (_data, error) => {
      // Si quedó encolado (fallo de red), NO invalidamos: traería de vuelta
      // el estado "sin este pedido" del servidor y pisaría el optimista.
      // La invalidación real ocurre en syncOutbox.ts tras el reintento.
      if (error && isNetworkFailure(error)) return

      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['table'] })
      qc.invalidateQueries({ queryKey: ['station-orders'] })
    },
  })
}

// ─── Detección de conflicto (edición concurrente de otra estación) ───────────

/**
 * Compara el `updated_at` de la orden contra el que se tenía al abrir la
 * pantalla: si cambió y no fue por nuestro propio envío, es que otra estación
 * tocó la mesa mientras el mesero armaba el pedido.
 */
export function useConflictDetector(order: Order | null, baselineUpdatedAt: string | null) {
  return useMemo(() => {
    if (!order || !baselineUpdatedAt) return false
    return order.updated_at !== baselineUpdatedAt
  }, [order, baselineUpdatedAt])
}

// ─── Comanda por voz ──────────────────────────────────────────────────────────

/**
 * Backend (PHP) pendiente de implementar: POST /ordenes/parse-voz recibe
 * { transcript, mesaId } y devuelve { items, confianza, ambiguedades }.
 */
export function useParseVoz() {
  return useMutation({
    mutationFn: (body: { transcript: string; mesaId: number }) =>
      apiRequest<VoiceParseResult>('/ordenes/parse-voz', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}
