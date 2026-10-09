/**
 * FoodIX — Toggle reutilizable de Push Notifications por rol/usuario.
 *
 * El permiso Web Push pertenece al navegador/dispositivo, pero FoodIX guarda
 * una preferencia local y envía contexto de usuario/rol al backend para que la
 * suscripción pueda segmentarse correctamente.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { Bell, BellOff, BellRing, Send, Share, Plus, Smartphone, ShieldAlert } from 'lucide-react'
import { Switch } from '@heroui/react'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { type PushNotificationContext } from '@/lib/push'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface PushNotificationToggleProps {
  label: string
  description?: string
  context?: PushNotificationContext
  compact?: boolean
  className?: string
}

export function PushNotificationToggle({
  label,
  description = 'Activa las notificaciones para recibir avisos importantes de pedidos, cocina, mesas y ventas en tiempo real.',
  context,
  compact = false,
  className,
}: PushNotificationToggleProps) {
  const { status, ready, loading, enabledForRole, subscribe, unsubscribe, sendTest } = usePushNotifications(context)

  const active = status.subscribed && enabledForRole
  const disabled = !ready || loading || !status.supported || status.permission === 'denied' || status.needsInstall

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const res = await subscribe()
      if (res.ok) toast.success(`Notificaciones activadas para ${label}.`)
      else toast.error(res.error ?? 'No se pudieron activar las notificaciones.')
      return
    }

    const res = await unsubscribe()
    if (res.ok) toast.success(`Notificaciones desactivadas para ${label}.`)
    else toast.error('No se pudieron desactivar las notificaciones.')
  }

  const handleTest = async () => {
    const res = await sendTest()
    if (res.ok) toast.success('Notificación de prueba enviada.')
    else toast.error(res.error ?? 'No se pudo enviar la notificación de prueba.')
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', compact && 'p-3', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FACC15]/10 text-yellow-700 dark:text-yellow-400">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge ready={ready} {...status} active={active} />
              <Switch
                size="sm"
                isSelected={active}
                isDisabled={disabled}
                onValueChange={handleToggle}
                aria-label={`Activar notificaciones para ${label}`}
                classNames={{ wrapper: 'group-data-[selected=true]:bg-[#FACC15]' }}
              />
            </div>
          </div>

          {ready && status.needsInstall && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 [&_p]:!text-inherit">
              <p className="flex items-center gap-1.5 font-medium">
                <Smartphone className="h-3.5 w-3.5" /> Safari iPhone/iPad requiere PWA instalada
              </p>
              <p className="mt-1.5">
                Para recibir notificaciones en iPhone/iPad, instala FoodIX en pantalla de inicio desde{' '}
                <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Compartir &gt;{' '}
                <Plus className="inline h-3.5 w-3.5 align-text-bottom" /> Agregar a pantalla de inicio.
              </p>
            </div>
          )}

          {ready && !status.supported && !status.needsInstall && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Este navegador no soporta push en esta instalación. Usa Chrome, Brave o Safari macOS actualizados; en
              Android usa Chrome/Brave y en iPhone/iPad abre FoodIX como PWA instalada.
            </div>
          )}

          {ready && status.supported && status.permission === 'denied' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Permiso bloqueado. Actívalo desde los ajustes del sitio en el navegador y recarga FoodIX.</span>
            </div>
          )}

          {ready && status.supported && active && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleTest} disabled={loading}>
                <Send className="mr-1.5 h-4 w-4" />
                Enviar prueba
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleToggle(false)} disabled={loading}>
                <BellOff className="mr-1.5 h-4 w-4" />
                Desactivar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  ready,
  supported,
  permission,
  subscribed,
  needsInstall,
  active,
}: {
  ready: boolean
  supported: boolean
  permission: string
  subscribed: boolean
  needsInstall: boolean
  active: boolean
}) {
  // Colores explícitos por status (legibles tanto en fondo claro como oscuro,
  // incluido el negro forzado del panel superadmin). Se evita depender de los
  // tokens de tema —p.ej. `outline` usa text-foreground, que se vuelve invisible
  // sobre el fondo negro—.
  if (!ready) return <Badge className="border-stone-400/40 bg-stone-400/10 text-stone-500">Comprobando</Badge>
  if (needsInstall) return <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">Instalar PWA</Badge>
  if (!supported) return <Badge className="border-stone-400/40 bg-stone-400/10 text-stone-500">No soportado</Badge>
  if (permission === 'denied') return <Badge className="border-red-500/40 bg-red-500/10 text-red-500">Bloqueado</Badge>
  if (active) return <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Activo</Badge>
  if (subscribed) return <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-500">Dispositivo suscrito</Badge>
  return <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-500">Pendiente</Badge>
}
