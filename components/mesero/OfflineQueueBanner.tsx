'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Aviso no bloqueante del estado del outbox offline: pedidos en espera de
 * conexión, sincronizando, o que fallaron y requieren atención del mesero.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { CloudOff, Loader2, AlertTriangle } from 'lucide-react'

interface OfflineQueueBannerProps {
  pendingCount: number
  failedCount: number
  isSyncing: boolean
  isOnline: boolean
  onRetryFailed: () => void
}

export function OfflineQueueBanner({
  pendingCount,
  failedCount,
  isSyncing,
  isOnline,
  onRetryFailed,
}: OfflineQueueBannerProps) {
  if (failedCount > 0) {
    return (
      <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {failedCount} pedido{failedCount > 1 ? 's' : ''} no se {failedCount > 1 ? 'pudieron' : 'pudo'} sincronizar.
        </span>
        <button type="button" onClick={onRetryFailed} className="shrink-0 font-semibold underline underline-offset-2">
          Reintentar
        </button>
      </div>
    )
  }

  if (pendingCount === 0) return null

  if (isSyncing) {
    return (
      <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>Sincronizando {pendingCount} pedido{pendingCount > 1 ? 's' : ''}…</span>
      </div>
    )
  }

  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
      <CloudOff className="h-4 w-4 shrink-0" />
      <span>
        {isOnline ? 'Esperando para sincronizar' : 'Sin conexión'} — {pendingCount} pedido{pendingCount > 1 ? 's' : ''} en espera.
      </span>
    </div>
  )
}
