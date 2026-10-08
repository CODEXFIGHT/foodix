/**
 * FoodIX — Hook de notificaciones push.
 *
 * Expone el estado de las notificaciones y las acciones para activar, desactivar
 * y enviar una prueba. Encapsula la capa cliente de `lib/push` con estado React
 * y feedback consistente para la UI.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  type PushStatus,
  getPushNotificationStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
  getLocalPushPreference,
  type PushNotificationContext,
} from '@/lib/push'

const INITIAL: PushStatus = {
  supported: false,
  permission: 'default',
  subscribed: false,
  isIOS: false,
  isStandalone: false,
  needsInstall: false,
}

export function usePushNotifications(context?: PushNotificationContext) {
  const [status, setStatus] = useState<PushStatus>(INITIAL)
  const [enabledForRole, setEnabledForRole] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const next = await getPushNotificationStatus()
    setStatus(next)
    return next
  }, [])

  useEffect(() => {
    let active = true
    getPushNotificationStatus().then((s) => {
      if (active) {
        setStatus(s)
        setEnabledForRole(getLocalPushPreference(context))
        setReady(true)
      }
    })
    return () => {
      active = false
    }
  }, [context?.branchId, context?.role, context?.userId])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      await subscribeToPushNotifications(context)
      await refresh()
      setEnabledForRole(true)
      return { ok: true as const }
    } catch (err) {
      await refresh()
      return { ok: false as const, error: err instanceof Error ? err.message : 'Error al activar notificaciones.' }
    } finally {
      setLoading(false)
    }
  }, [context, refresh])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const ok = await unsubscribeFromPushNotifications(context)
      await refresh()
      if (ok) setEnabledForRole(false)
      return { ok }
    } finally {
      setLoading(false)
    }
  }, [context, refresh])

  const sendTest = useCallback(async () => {
    setLoading(true)
    try {
      await sendTestPushNotification(context)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Error al enviar la prueba.' }
    } finally {
      setLoading(false)
    }
  }, [context])

  return { status, loading, ready, enabledForRole, refresh, subscribe, unsubscribe, sendTest }
}
