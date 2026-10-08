'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Diálogo para errores bloqueantes que requieren una decisión del usuario
 * (ej. MESA_ORDEN_ABIERTA). Sobre Radix Dialog: focus trap y navegación por
 * teclado (Tab/Escape) vienen gratis del primitivo, no hay que reimplementarlos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { resolveErrorEntry } from '@/lib/errors/errorCatalog'
import type { ErrorContext, ErrorSeverity } from '@/lib/errors/types'

const SEVERITY_STYLE: Record<ErrorSeverity, { ring: string; bg: string; text: string }> = {
  info: {
    ring: 'ring-blue-100 dark:ring-blue-900/40',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-300',
  },
  advertencia: {
    ring: 'ring-amber-100 dark:ring-amber-900/40',
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-600 dark:text-amber-300',
  },
  critico: {
    ring: 'ring-red-100 dark:ring-red-900/40',
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-300',
  },
}

interface ErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Código crudo del backend (ApiError.code); si no está catalogado, cae al fallback genérico. */
  code: string | undefined
  context?: ErrorContext
  onAction: (actionId: string) => void
}

export function ErrorDialog({ open, onOpenChange, code, context = {}, onAction }: ErrorDialogProps) {
  const { code: resolvedCode, entry, rawCode } = resolveErrorEntry(code, context)
  const Icon = entry.icono
  const style = SEVERITY_STYLE[entry.severidad]

  // Nunca se muestra un código sin catalogar al mesero — solo a admin/superadmin,
  // y solo para reportar el caso no cubierto (nunca message_tecnico).
  const showDebugCode = resolvedCode === 'DESCONOCIDO'
    && (context.viewerRole === 'admin' || context.viewerRole === 'superadmin')
    && !!rawCode

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={cn('mx-auto mb-1 grid h-12 w-12 place-items-center rounded-full ring-8 sm:mx-0', style.bg, style.ring)}>
            <Icon className={cn('h-6 w-6', style.text)} />
          </div>
          <DialogTitle className="text-center sm:text-left">{entry.titulo}</DialogTitle>
          <DialogDescription className="text-center sm:text-left">{entry.mensaje}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {entry.acciones.map(accion => (
            <Button
              key={accion.onClick}
              variant={accion.tipo === 'primary' ? 'brand' : accion.tipo === 'secondary' ? 'outline' : 'ghost'}
              className="w-full"
              onClick={() => onAction(accion.onClick)}
            >
              {accion.label}
            </Button>
          ))}
        </DialogFooter>

        {showDebugCode && (
          <p className="text-center text-[11px] text-muted-foreground">Código: {rawCode}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
