/**
 * FoodIX — Banner de activación de notificaciones push.
 *
 * UX no invasiva: NO solicita permisos al cargar. Muestra un banner elegante
 * explicando el beneficio con un botón "Activar notificaciones". El permiso del
 * navegador solo se pide cuando el usuario lo activa explícitamente.
 *
 * Casos:
 *  - Soportado + permiso pendiente → banner con CTA de activación.
 *  - iOS Safari sin instalar → guía para "Agregar a pantalla de inicio".
 *  - Permiso concedido / denegado / no soportado / descartado → no se muestra.
 *
 * La decisión del usuario (descartar o activar) se recuerda en localStorage para
 * no insistir de forma molesta.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Share, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'restauros_push_banner_dismissed'

export function PushNotificationManager() {
  const { status, ready, loading, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Respeta una decisión previa del usuario (descartado en esta sesión/equipo).
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleActivate = async () => {
    const res = await subscribe()
    if (res.ok) {
      toast.success('Notificaciones activadas en este dispositivo.')
      dismiss()
    } else {
      // Mensaje no invasivo; no volvemos a insistir si el usuario las rechazó.
      toast.error(res.error ?? 'No se pudieron activar las notificaciones.')
      if (res.error?.toLowerCase().includes('denegado')) dismiss()
    }
  }

  // No renderiza hasta conocer el estado real, ni si el usuario ya decidió.
  if (!ready || dismissed) return null

  // Ya suscrito o permiso ya resuelto → nada que ofrecer.
  if (status.subscribed || status.permission === 'granted' || status.permission === 'denied') {
    return null
  }

  // iOS sin instalar: Web Push exige la app en pantalla de inicio.
  if (status.needsInstall) {
    return (
      <Banner onClose={dismiss}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Activa las notificaciones en tu iPhone/iPad</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Para recibir avisos en iOS, instala FoodIX en tu pantalla de inicio: toca{' '}
            <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Compartir" /> <strong>Compartir</strong>{' '}
            y luego <Plus className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Agregar" />{' '}
            <strong>Agregar a pantalla de inicio</strong>. Después ábrela desde el ícono instalado.
          </p>
        </div>
      </Banner>
    )
  }

  // Navegador no compatible con Push: no mostramos banner (fallback silencioso).
  if (!status.supported) return null

  // Caso normal: permiso pendiente → CTA de activación.
  return (
    <Banner onClose={dismiss}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Activa las notificaciones</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          Recibe avisos de pedidos, cocina y reservaciones aunque no tengas la app abierta.
        </p>
      </div>
      <Button
        size="sm"
        loading={loading}
        onClick={handleActivate}
        className="shrink-0 bg-[#D1400F] hover:bg-[#B03508]"
      >
        Activar notificaciones
      </Button>
    </Banner>
  )
}

function Banner({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-x-0 z-50 px-3 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 pl-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:max-w-lg">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1400F]/10 text-[#D1400F]">
          <Bell className="h-5 w-5" />
        </span>
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
