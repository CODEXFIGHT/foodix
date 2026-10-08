'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Aviso no bloqueante cuando otra estación modificó la misma mesa mientras
 * el mesero armaba el pedido (detectado por cambio de `updated_at`).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { AlertCircle, X } from 'lucide-react'

interface ConflictBannerProps {
  waiterName?: string | null
  onViewChanges: () => void
  onDismiss: () => void
}

export function ConflictBanner({ waiterName, onViewChanges, onDismiss }: ConflictBannerProps) {
  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Esta mesa fue actualizada por {waiterName || 'otra estación'}.{' '}
        <button type="button" onClick={onViewChanges} className="font-semibold underline underline-offset-2">
          Ver cambios
        </button>
      </span>
      <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="shrink-0 text-amber-500 hover:text-amber-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
