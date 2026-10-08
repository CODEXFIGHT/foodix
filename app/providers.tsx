'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Providers globales (React Query, toasts, tema).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HeroUIProvider } from '@heroui/react'
import { ApiError } from '@/lib/api/client'
import { registerQueryClient, wireOutboxSyncTriggers } from '@/lib/offline/syncOutbox'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) => {
              if (error instanceof ApiError && error.status === 401) return false
              if (error instanceof ApiError && error.status === 403) return false
              return count < 1
            },
            // ── Equilibrio tiempo-real / escala ──
            // SIN polling global: refrescamos al volver a la pestaña o
            // reconectar (barato y suficiente para catálogos). Solo las
            // pantallas operativas en vivo (pedidos, mesas, cocina, caja,
            // dispositivos) definen su propio refetchInterval. Así, con muchos
            // POS conectados, el backend recibe muchísimas menos peticiones que
            // con un polling global cada 20s.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            // El polling por intervalo SOLO corre cuando la pestaña/pantalla está
            // visible: una caja/cocina/POS dejada en segundo plano deja de pegarle
            // al backend hasta que vuelve al frente (se refresca al recuperar foco).
            refetchIntervalInBackground: false,
            staleTime: 30_000,
            gcTime: 5 * 60_000,
          },
        },
      }),
  )

  // Cablea el sync del outbox offline (mesero) una vez que el QueryClient
  // existe: registra la instancia para que syncOutbox.ts pueda invalidar
  // queries tras un reintento exitoso, y arranca los disparadores globales
  // (online, visibilitychange, intervalo de respaldo).
  useEffect(() => {
    registerQueryClient(queryClient)
    return wireOutboxSyncTriggers()
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider navigate={router.push}>{children}</HeroUIProvider>
    </QueryClientProvider>
  )
}
