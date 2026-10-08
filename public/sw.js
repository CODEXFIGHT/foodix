/**
 * RestaurOS — Service Worker (Web Push)
 *
 * Maneja:
 *  - Ciclo de vida (install / activate) con actualización inmediata.
 *  - Evento `push`: muestra la notificación con el payload recibido.
 *  - Evento `notificationclick`: enfoca una pestaña existente o abre la app
 *    en la ruta indicada por la notificación.
 *
 * Diseño deliberado: NO cachea recursos de la app (sin offline cache). La app
 * es un SPA dinámico (POS en tiempo real) y un caché agresivo serviría datos
 * obsoletos. El SW existe únicamente para habilitar Web Push.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

// Versión del SW: cambiarla fuerza la reinstalación en los clientes.
const SW_VERSION = 'restauros-sw-v1'

self.addEventListener('install', () => {
  // Activa este SW de inmediato sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Toma control de las páginas ya abiertas sin requerir recarga.
  event.waitUntil(self.clients.claim())
})

// Permite que la página pida activar la nueva versión inmediatamente.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/**
 * Recibe el push del servidor. El payload (si viene) es JSON:
 *   { title, body, url, icon, badge, tag, data }
 * Si no hay payload, muestra una notificación genérica.
 */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (_e) {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'RestaurOS'
  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    tag: payload.tag || 'restauros-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Al tocar la notificación: si ya hay una pestaña de la app abierta, la enfoca
 * (y navega a la ruta destino si es posible); si no, abre una nueva.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Reutiliza una pestaña existente de la app.
          if ('focus' in client) {
            if ('navigate' in client) {
              try {
                client.navigate(targetUrl)
              } catch (_e) {
                /* navigate puede fallar entre orígenes; ignorar */
              }
            }
            return client.focus()
          }
        }
        // No había pestañas abiertas: abre una nueva.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return undefined
      }),
  )
})
