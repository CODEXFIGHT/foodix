/**
 * FoodIX — Sistema de gestión para restaurantes
 * CRUD sobre el object store `outbox`: pedidos del mesero que no pudieron
 * enviarse por falta de conexión y esperan reintento.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { openOfflineDb, OUTBOX_STORE } from './db'
import type { EnviarOrdenInput } from '@/lib/api/queries/useMesero'

export type OutboxStatus = 'pending' | 'syncing' | 'failed'

export interface OutboxEntry {
  /** UUID — también viaja al backend como `client_request_id`. Clave primaria. */
  clientRequestId: string
  mesaId: number
  branchId: number
  kind: 'create_order' | 'add_items'
  existingOrderId: number | null
  payload: EnviarOrdenInput
  status: OutboxStatus
  attempts: number
  lastError: string | null
  createdAt: number
  updatedAt: number
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openOfflineDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, mode)
    const store = tx.objectStore(OUTBOX_STORE)
    const req = fn(store)

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => {
      if (req) resolve(req.result)
      else resolve(undefined as T)
    }
  })
}

export async function enqueueOutboxEntry(entry: Omit<OutboxEntry, 'status' | 'attempts' | 'lastError' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now()
  const full: OutboxEntry = {
    ...entry,
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  }
  await withStore('readwrite', store => store.put(full))
}

export async function listOutboxEntries(): Promise<OutboxEntry[]> {
  const entries = await withStore<OutboxEntry[]>('readonly', store => store.getAll() as IDBRequest<OutboxEntry[]>)
  return entries.sort((a, b) => a.createdAt - b.createdAt)
}

export async function updateOutboxEntry(
  clientRequestId: string,
  patch: Partial<Pick<OutboxEntry, 'status' | 'attempts' | 'lastError'>>,
): Promise<void> {
  const db = await openOfflineDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite')
    const store = tx.objectStore(OUTBOX_STORE)
    const getReq = store.get(clientRequestId)

    getReq.onsuccess = () => {
      const current = getReq.result as OutboxEntry | undefined
      if (current) {
        store.put({ ...current, ...patch, updatedAt: Date.now() })
      }
    }

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve()
  })
}

export async function removeOutboxEntry(clientRequestId: string): Promise<void> {
  await withStore('readwrite', store => store.delete(clientRequestId))
}
