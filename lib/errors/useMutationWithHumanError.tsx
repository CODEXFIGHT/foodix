'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Envuelve useMutation para interceptar errores, resolverlos contra
 * errorCatalog y mostrar el ErrorDialog/ErrorToast correspondiente —
 * automáticamente, sin que cada mutation repita el switch de códigos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback, useState } from 'react'
import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { ErrorDialog } from '@/components/errors/ErrorDialog'
import { showErrorToast } from '@/components/errors/ErrorToast'
import { logError } from './errorLogger'
import type { ErrorContext } from './types'

type Presentation = 'dialog' | 'toast'

export interface UseMutationWithHumanErrorOptions<TData, TVariables, TMutationContext = unknown>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables, TMutationContext>, 'onError'> {
  /** 'dialog' (default) para errores que exigen una decisión; 'toast' para fallas no bloqueantes. */
  presentation?: Presentation
  /** Handlers por id de acción del catálogo (ej. ADD_TO_EXISTING, CLOSE_CURRENT). 'DISMISS' siempre cierra sin llamar nada. */
  actionHandlers?: Record<string, (context: ErrorContext) => void>
  onError?: UseMutationOptions<TData, ApiError, TVariables, TMutationContext>['onError']
}

export type UseMutationWithHumanErrorResult<TData, TVariables, TMutationContext = unknown> =
  UseMutationResult<TData, ApiError, TVariables, TMutationContext> & {
    /** Móntalo en el JSX de quien llama al hook; es `null` cuando no hay error activo. */
    errorDialog: React.ReactNode
  }

export function useMutationWithHumanError<TData, TVariables, TMutationContext = unknown>(
  options: UseMutationWithHumanErrorOptions<TData, TVariables, TMutationContext>,
): UseMutationWithHumanErrorResult<TData, TVariables, TMutationContext> {
  const { presentation = 'dialog', actionHandlers, onError, ...mutationOptions } = options
  const viewerRole = useAuthStore(s => s.user?.role)
  const [dialogState, setDialogState] = useState<{ code: string | undefined; context: ErrorContext } | null>(null)

  const runAction = useCallback((actionId: string, context: ErrorContext) => {
    setDialogState(null)
    if (actionId === 'DISMISS') return
    actionHandlers?.[actionId]?.(context)
  }, [actionHandlers])

  const mutation = useMutation<TData, ApiError, TVariables, TMutationContext>({
    ...mutationOptions,
    onError: (err, variables, onMutateResult, mutationFnContext) => {
      const rawCode = err instanceof ApiError ? err.code : undefined
      const context: ErrorContext = { ...(err instanceof ApiError ? err.context : undefined), viewerRole }

      if (presentation === 'dialog') {
        logError(rawCode, context, err)
        setDialogState({ code: rawCode, context })
      } else {
        showErrorToast(rawCode, context, actionId => runAction(actionId, context))
      }
      onError?.(err, variables, onMutateResult, mutationFnContext)
    },
  })

  const errorDialog = dialogState ? (
    <ErrorDialog
      open
      onOpenChange={(open) => { if (!open) setDialogState(null) }}
      code={dialogState.code}
      context={dialogState.context}
      onAction={actionId => runAction(actionId, dialogState.context)}
    />
  ) : null

  return { ...mutation, errorDialog }
}
