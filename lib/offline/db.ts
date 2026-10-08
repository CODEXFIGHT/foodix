/**
 * FoodIX — Sistema de gestión para restaurantes
 * Apertura de la IndexedDB usada como outbox offline del mesero: pedidos ya
 * confirmados que no pudieron llegar al backend por falta de conexión.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

const DB_NAME = 'foodix-offline'
const DB_VERSION = 1
export const OUTBOX_STORE = 'outbox'

let dbPromise: Promise<IDBDatabase> | null = null

/** Abre (o crea) la base, memorizando la promesa para no reabrir en cada llamada. */
export function openOfflineDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este entorno'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: 'clientRequestId' })
        store.createIndex('by-status', 'status')
        store.createIndex('by-createdAt', 'createdAt')
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}
