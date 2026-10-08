'use client'

import { useEffect, useRef } from 'react'

/**
 * FoodIX — Calentamiento del backend.
 *
 * El backend vive detrás de un rewrite (Vercel → tallercheck.mx/PHP). El primer
 * acceso paga DNS + TLS + TCP + arranque de PHP/opcache, lo que hace lento el
 * primer login/consulta. Este componente dispara una petición ligera y
 * "fire-and-forget" en cuanto carga la app (y al volver a la pestaña) para dejar
 * esa ruta CALIENTE antes de que el usuario actúe.
 *
 * Nota: aunque `/backend/health` aún no exista en el PHP, la petición igual abre
 * la conexión y arranca el intérprete; cuando exista un /health real que responda
 * 200 rápido, el efecto es óptimo. Por eso ignoramos el resultado y los errores.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
export function BackendWarmup() {
  const lastWarmRef = useRef(0)

  useEffect(() => {
    const warm = () => {
      const now = Date.now()
      // Throttle: como mucho una vez por minuto, para no generar ruido.
      if (now - lastWarmRef.current < 60_000) return
      lastWarmRef.current = now
      // _t evita cualquier caché intermedia; keepalive permite que sobreviva a
      // una navegación inmediata. Sin auth y sin bloquear nada.
      fetch(`/backend/health?_t=${now}`, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => { /* da igual: el objetivo es abrir/encender la ruta */ })
    }

    warm()
    const onVisible = () => { if (!document.hidden) warm() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return null
}
