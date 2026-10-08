/**
 * FoodIX — Sistema de gestión para restaurantes
 * Registro interno de errores (code + context + detalle técnico), separado
 * por completo de lo que ve el usuario — nada de lo que se logea aquí llega
 * a un ErrorDialog/ErrorToast. Punto único para enchufar un proveedor real
 * (Sentry, etc.) sin tocar los call sites.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { ErrorContext } from './types'

export interface ErrorLogEntry {
  code: string | undefined
  status?: number
  messageTecnico?: string
  context: ErrorContext
  timestamp: string
}

export function logError(
  code: string | undefined,
  context: ErrorContext,
  original?: unknown,
): void {
  const entry: ErrorLogEntry = {
    code,
    status: original instanceof Error && 'status' in original ? (original as { status?: number }).status : undefined,
    messageTecnico: original instanceof Error ? original.message : undefined,
    context,
    timestamp: new Date().toISOString(),
  }

  // TODO: sustituir por el proveedor de telemetría real (Sentry/Datadog/etc.)
  // cuando esté disponible. Mientras tanto, consola — nunca UI.
  // eslint-disable-next-line no-console
  console.error('[error-humanizado]', entry)
}
