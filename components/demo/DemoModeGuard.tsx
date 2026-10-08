/**
 * FoodIX — Modo Demo
 * Guarda de acciones sensibles. Envuelve un control (pago real, configuración
 * fiscal, integraciones, subida de archivos, cambios de suscripción…) e
 * intercepta su click para mostrar el aviso de modo demo, sin ejecutar nada.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import type { MouseEvent, ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

const DEMO_BLOCKED_MSG = 'Esta acción está deshabilitada en el modo demo.'

/** Muestra el aviso estándar de acción bloqueada en demo. */
export function notifyDemoBlocked(detail?: string): void {
  toast.info(DEMO_BLOCKED_MSG, {
    description: detail ?? 'Estás explorando FoodIX en modo demo.',
    icon: <Lock className="h-4 w-4" />,
  })
}

interface Props {
  children: ReactNode
  /** Mensaje contextual opcional para la descripción del toast. */
  detail?: string
  className?: string
}

/**
 * Intercepta (en fase de captura) cualquier click dentro de `children` y, en
 * lugar de ejecutar la acción, muestra el aviso de demo. Úsalo alrededor de
 * botones de acciones que no deben ejecutarse en la prueba.
 */
export function DemoModeGuard({ children, detail, className }: Props) {
  function block(e: MouseEvent<HTMLSpanElement>) {
    e.preventDefault()
    e.stopPropagation()
    notifyDemoBlocked(detail)
  }

  return (
    <span onClickCapture={block} className={className}>
      {children}
    </span>
  )
}
