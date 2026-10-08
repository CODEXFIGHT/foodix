/**
 * FoodIX — Sistema de gestión para restaurantes
 * Hooks de TanStack Query para promociones, combos, cupones y reglas de
 * lealtad (Módulo 5 — crecimiento). Ver php-backend/routes/promotions.php.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import type { Promotion, Combo, Coupon, LoyaltyRule } from '@/lib/types'

// ─── Promociones ──────────────────────────────────────────────────────────────

export function usePromotions(branchId: number | null) {
  return useQuery({
    queryKey: ['promotions', branchId],
    queryFn: () => apiRequest<Promotion[]>(`/promotions?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Promotion>('/promotions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['promotions', data.branch_id] }),
  })
}

export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Promotion>(`/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['promotions', data.branch_id] }),
  })
}

export function useDeletePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })
}

// ─── Combos ───────────────────────────────────────────────────────────────────

export function useCombos(branchId: number | null) {
  return useQuery({
    queryKey: ['combos', branchId],
    queryFn: () => apiRequest<Combo[]>(`/promotions/combos?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Combo>('/promotions/combos', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['combos', data.branch_id] }),
  })
}

export function useUpdateCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Combo>(`/promotions/combos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['combos', data.branch_id] }),
  })
}

export function useDeleteCombo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/promotions/combos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combos'] }),
  })
}

// ─── Cupones ──────────────────────────────────────────────────────────────────

export function useCoupons(branchId: number | null) {
  return useQuery({
    queryKey: ['coupons', branchId],
    queryFn: () => apiRequest<Coupon[]>(`/promotions/coupons?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Coupon>('/promotions/coupons', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['coupons', data.branch_id] }),
  })
}

export function useUpdateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<Coupon>(`/promotions/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['coupons', data.branch_id] }),
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/promotions/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}

// ─── Lealtad ──────────────────────────────────────────────────────────────────

export function useLoyaltyRules(branchId: number | null) {
  return useQuery({
    queryKey: ['loyalty-rules', branchId],
    queryFn: () => apiRequest<LoyaltyRule[]>(`/promotions/loyalty?branch_id=${branchId}`),
    enabled: branchId !== null,
  })
}

export function useCreateLoyaltyRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<LoyaltyRule>('/promotions/loyalty', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['loyalty-rules', data.branch_id] }),
  })
}

export function useUpdateLoyaltyRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiRequest<LoyaltyRule>(`/promotions/loyalty/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['loyalty-rules', data.branch_id] }),
  })
}

export function useDeleteLoyaltyRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/promotions/loyalty/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-rules'] }),
  })
}
