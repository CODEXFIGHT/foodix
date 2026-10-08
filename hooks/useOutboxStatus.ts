'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Estado del outbox offline del mesero: cuántos pedidos están en espera de
 * enviarse y cuántos fallaron y requieren atención.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback, useEffect, useState } from 'react'
import { listOutboxEntries } from '@/lib/offline/outbox'
import { onOutboxChange, retryFailedEntries } from '@/lib/offline/syncOutbox'

export interface OutboxStatus {
  pendingCount: number
  failedCount: number
  isSyncing: boolean
  retryFailed: () => void
}

export function useOutboxStatus(): OutboxStatus {
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const refresh = useCallback(async () => {
    const entries = await listOutboxEntries()
    setPendingCount(entries.filter(e => e.status === 'pending').length)
    setFailedCount(entries.filter(e => e.status === 'failed').length)
    setIsSyncing(entries.some(e => e.status === 'syncing'))
  }, [])

  useEffect(() => {
    refresh()
    return onOutboxChange(refresh)
  }, [refresh])

  return { pendingCount, failedCount, isSyncing, retryFailed: retryFailedEntries }
}
