'use client'

/**
 * FoodIX — Monitoreo de dispositivos conectados.
 * Hook reutilizable: registra el dispositivo del módulo actual y emite heartbeat
 * periódico. Detecta actividad del usuario (idle) y reporta offline al salir.
 *
 * Uso típico (en el layout/guard de un módulo, ya con sesión):
 *   useDeviceHeartbeat({ module: 'kitchen' })
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { getDeviceUid, getDeviceName } from '@/lib/deviceId'
import { getDeviceInfo, moduleDefaults } from '@/lib/devices/deviceInfo'
import { deviceRegistry } from '@/lib/devices/registry'
import { HEARTBEAT_INTERVAL_MS } from '@/lib/devices/constants'
import { APP_VERSION } from '@/lib/constants/version'
import type { DeviceModule, DeviceType } from '@/lib/devices/types'

interface Options {
  /** Módulo desde el que se conecta. */
  module: DeviceModule
  /** Forzar el tipo de dispositivo (si no, se infiere del módulo + navegador). */
  type?: DeviceType
  /** Desactivar (p. ej. mientras carga la sesión). Por defecto activo. */
  enabled?: boolean
}

/**
 * Registra heartbeat mientras el componente está montado. Seguro en SSR y
 * tolerante a fallos de red (nunca lanza). No hace nada sin branch_id.
 */
export function useDeviceHeartbeat({ module, type, enabled = true }: Options): void {
  const branchId = useAuthStore(s => s.user?.branch_id ?? null)
  const userId = useAuthStore(s => s.user?.id ?? null)
  const userName = useAuthStore(s => s.user?.name ?? null)
  const role = useAuthStore(s => s.user?.role ?? null)

  const activityRef = useRef(false)
  const deviceIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !branchId) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const markActivity = () => { activityRef.current = true }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart']
    events.forEach(e => window.addEventListener(e, markActivity, { passive: true }))

    const beat = async (firstBeat = false) => {
      const info = getDeviceInfo()
      const uid = await getDeviceUid()
      if (cancelled) return

      const res = await deviceRegistry.sendHeartbeat({
        unique_device_id: uid,
        branch_id: branchId,
        name: getDeviceName(),
        type: type ?? moduleDefaults(module, info),
        module,
        activity: firstBeat || activityRef.current,
        user_agent: info.userAgent,
        os: info.os,
        browser: info.browser,
        app_version: APP_VERSION,
        user_id: userId,
        user_name: userName,
        role,
      })
      activityRef.current = false
      if (res?.device_id) deviceIdRef.current = res.device_id
    }

    void beat(true)

    // Timer en Web Worker: los navegadores estrangulan (o congelan) setInterval
    // del hilo principal cuando la pestaña está en segundo plano, así que el
    // dispositivo dejaba de latir y caía a offline aunque la app siguiera abierta.
    // Un worker mantiene el ritmo en background. Fallback a setInterval si no hay
    // soporte. (Nota: una pantalla móvil BLOQUEADA suspende todo el JS; eso solo
    // lo resuelve el heartbeat nativo del APK.)
    let worker: Worker | null = null
    try {
      const src = `let h;onmessage=e=>{if(e.data==='start'){h=setInterval(()=>postMessage(0),${HEARTBEAT_INTERVAL_MS})}else{clearInterval(h)}}`
      const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }))
      worker = new Worker(url)
      URL.revokeObjectURL(url)
      worker.onmessage = () => void beat()
      worker.postMessage('start')
    } catch {
      timer = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS)
    }

    // Al volver a primer plano, latir de inmediato para reaparecer online sin
    // esperar al siguiente ciclo.
    const onVisible = () => { if (document.visibilityState === 'visible') void beat() }
    document.addEventListener('visibilitychange', onVisible)

    // Beacon de salida: best-effort para acelerar el paso a offline.
    const onHide = () => {
      const id = deviceIdRef.current
      if (id && navigator.sendBeacon) {
        // Sin auth header (sendBeacon no la permite); el backend igual reconcilia
        // por timeout. Útil sobre todo en kioskos públicos.
        navigator.sendBeacon(
          `/backend/device-monitor/${id}/status`,
          new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' }),
        )
      }
    }
    window.addEventListener('pagehide', onHide)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (worker) { worker.postMessage('stop'); worker.terminate() }
      document.removeEventListener('visibilitychange', onVisible)
      events.forEach(e => window.removeEventListener(e, markActivity))
      window.removeEventListener('pagehide', onHide)
    }
  }, [enabled, branchId, userId, userName, role, module, type])
}
