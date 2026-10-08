/**
 * FoodIX — Sistema de gestión para restaurantes
 * Orquestador de sincronización del outbox offline del mesero: reintenta,
 * en orden FIFO, los pedidos que quedaron encolados por falta de conexión.
 *
 * Se dispara en primer plano (evento `online`, `visibilitychange`, e
 * intervalo de respaldo) — deliberadamente NO usa Background Sync del
 * Service Worker: no existe en Safari/iPadOS y el dispositivo del mesero
 * mantiene la pestaña abierta durante el turno, así que un mecanismo en JS
 * de la propia página cubre el caso real sin esa dependencia.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { QueryClient } from '@tanstack/react-query'
import { sendOrdenToServer, isNetworkFailure } from '@/lib/api/queries/useMesero'
import { listOutboxEntries, updateOutboxEntry, removeOutboxEntry, type OutboxEntry } from './outbox'

let queryClient: QueryClient | null = null

/** Registrado una sola vez desde <OutboxSyncProvider> — el orquestador vive
 *  fuera del árbol de React (lo dispara `window`, no un componente). */
export function registerQueryClient(qc: QueryClient): void {
  queryClient = qc
}

type Listener = () => void
const listeners = new Set<Listener>()

/** Suscribe a cambios del outbox (encolado, éxito, fallo). Usado por
 *  hooks/useOutboxStatus.ts para refrescar el contador en la UI. */
export function onOutboxChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyChange(): void {
  listeners.forEach(l => l())
}

const QUERY_KEYS_TO_INVALIDATE = ['orders', 'tables', 'table', 'station-orders'] as const

function invalidateAfterSync(mesaId: number): void {
  if (!queryClient) return
  queryClient.invalidateQueries({ queryKey: ['mesa', mesaId, 'orden-activa'] })
  for (const key of QUERY_KEYS_TO_INVALIDATE) {
    queryClient.invalidateQueries({ queryKey: [key] })
  }
}

async function syncEntry(entry: OutboxEntry): Promise<'synced' | 'retry-later' | 'failed'> {
  await updateOutboxEntry(entry.clientRequestId, { status: 'syncing' })
  try {
    await sendOrdenToServer(entry.mesaId, entry.payload)
    await removeOutboxEntry(entry.clientRequestId)
    invalidateAfterSync(entry.mesaId)
    return 'synced'
  } catch (err) {
    if (isNetworkFailure(err)) {
      // Sigue sin haber red: se queda `pending` para el próximo intento.
      await updateOutboxEntry(entry.clientRequestId, {
        status: 'pending',
        attempts: entry.attempts + 1,
        lastError: err instanceof Error ? err.message : 'Sin conexión',
      })
      return 'retry-later'
    }
    // El servidor respondió con un error real (422/409/etc.): no reintentar
    // en bucle, requiere atención del mesero.
    await updateOutboxEntry(entry.clientRequestId, {
      status: 'failed',
      attempts: entry.attempts + 1,
      lastError: err instanceof Error ? err.message : 'No se pudo sincronizar',
    })
    return 'failed'
  }
}

let syncing = false

/** Procesa el outbox en orden FIFO. Idempotente: si ya hay una sync en
 *  curso, la llamada se ignora (los disparadores pueden solaparse). */
export async function triggerSync(): Promise<void> {
  if (syncing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  syncing = true
  try {
    const entries = await listOutboxEntries()
    const pending = entries.filter(e => e.status === 'pending')
    if (pending.length === 0) return

    for (const entry of pending) {
      const result = await syncEntry(entry)
      notifyChange()
      // Si la red se cayó a mitad de la cola, no sigue insistiendo con las
      // demás — espera al próximo disparador (evita ráfagas de timeouts).
      if (result === 'retry-later') break
    }
  } finally {
    syncing = false
    notifyChange()
  }
}

/** Reintenta manualmente las entradas `failed` (botón del banner). */
export async function retryFailedEntries(): Promise<void> {
  const entries = await listOutboxEntries()
  for (const entry of entries.filter(e => e.status === 'failed')) {
    await updateOutboxEntry(entry.clientRequestId, { status: 'pending' })
  }
  notifyChange()
  await triggerSync()
}

let wired = false

/** Instala los disparadores globales (una sola vez por sesión de página). */
export function wireOutboxSyncTriggers(): () => void {
  if (wired || typeof window === 'undefined') return () => {}
  wired = true

  const onOnline = () => { triggerSync() }
  const onVisible = () => { if (document.visibilityState === 'visible') triggerSync() }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  const interval = window.setInterval(() => { triggerSync() }, 15_000)

  // Intento inicial al montar (cubre el caso "recargó la página ya online
  // con entradas pendientes de una sesión anterior").
  triggerSync()

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    window.clearInterval(interval)
    wired = false
  }
}
