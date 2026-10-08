/**
 * FoodIX — Registro del Service Worker.
 *
 * Componente cliente sin UI: registra el SW una sola vez al cargar la app
 * (idempotente). Habilita Web Push y deja el SW listo para futuras prestaciones
 * (sin caché agresivo). Montado en el layout raíz.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useEffect } from 'react'
import { registerServiceWorker, isPushSupported } from '@/lib/push'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!isPushSupported()) return
    // No solicita permisos aquí: solo registra el SW. El permiso se pide cuando
    // el usuario activa las notificaciones explícitamente.
    registerServiceWorker()
  }, [])

  return null
}
