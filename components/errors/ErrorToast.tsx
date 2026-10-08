/**
 * FoodIX — Sistema de gestión para restaurantes
 * Errores no bloqueantes (ej. falla de sincronización en background). Sonner
 * es function-first (no JSX montado), por eso esto exporta una función y no
 * un componente — igual que el resto de toasts de la app (`toast.success(...)`).
 * A diferencia de ErrorDialog, solo puede ofrecer UNA acción sugerida (la
 * primaria); si el error exige una decisión con varias opciones, usa ErrorDialog.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { toast } from 'sonner'
import { resolveErrorEntry } from '@/lib/errors/errorCatalog'
import { logError } from '@/lib/errors/errorLogger'
import type { ErrorContext } from '@/lib/errors/types'

export function showErrorToast(
  rawCode: string | undefined,
  context: ErrorContext = {},
  onAction?: (actionId: string) => void,
): void {
  logError(rawCode, context)
  const { entry } = resolveErrorEntry(rawCode, context)
  const primary = entry.acciones.find(a => a.onClick !== 'DISMISS')

  const toastFn = entry.severidad === 'critico' ? toast.error
    : entry.severidad === 'info' ? toast.info
    : toast.warning

  toastFn(entry.titulo, {
    description: entry.mensaje,
    action: primary ? { label: primary.label, onClick: () => onAction?.(primary.onClick) } : undefined,
  })
}
