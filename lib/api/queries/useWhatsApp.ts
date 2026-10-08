/**
 * FoodIX — Integración WhatsApp (FoodIX Pro).
 * Hooks de TanStack Query para el estado de conexión y las acciones de
 * conectar/desconectar. Habla directo con el backend PHP (`/whatsapp/*`) vía
 * apiRequest; el gating Pro se valida también en el backend.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'

export type WhatsAppConnState = 'desconectado' | 'conectando' | 'conectado' | 'error'

export interface WhatsAppStatus {
  plan_pro: boolean
  provider: string
  status: WhatsAppConnState
  phone_number: string | null
  from_number: string | null
  last_sync_at: string | null
}

const KEY = 'whatsapp-status'

/** Estado de conexión de WhatsApp de la sucursal — autodetección en tiempo real. */
export function useWhatsAppStatus(branchSlug?: string | null, enabled = true) {
  return useQuery({
    queryKey: [KEY, branchSlug ?? 'self'],
    queryFn: () =>
      apiRequest<WhatsAppStatus>(
        `/whatsapp/status${branchSlug ? `?branch_slug=${encodeURIComponent(branchSlug)}` : ''}`,
      ),
    enabled,
    // Mientras no esté conectado, sondea cada 4s para detectar el primer
    // mensaje real del cliente casi al instante (sin clic manual). Una vez
    // conectado, baja a 30s — ya no hace falta la vigilancia activa.
    refetchInterval: query => (query.state.data?.status === 'conectado' ? 30_000 : 4_000),
    staleTime: 2_000,
  })
}

/** Marca la conexión como conectado/conectando. */
export function useConnectWhatsApp(branchSlug?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input?: { status?: WhatsAppConnState; from_number?: string; phone_number?: string }) =>
      apiRequest<WhatsAppStatus>('/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, branchSlug ?? 'self'] }),
  })
}

/** Cierra la sesión de WhatsApp (limpia el estado de conexión). */
export function useLogoutWhatsApp(branchSlug?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ ok: boolean }>('/whatsapp/logout', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, branchSlug ?? 'self'] }),
  })
}
