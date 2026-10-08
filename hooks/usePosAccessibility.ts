'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import {
  DEFAULT_POS_ACCESSIBILITY,
  POS_ACCESSIBILITY_PRESETS,
  type PosAccessibilityMode,
  type PosAccessibilitySettings,
  type PosAccessibilityTarget,
  posAccessibilityKey,
  readPosAccessibility,
  resetPosAccessibility,
  writePosAccessibility,
} from '@/lib/accessibility/posAccessibility'

interface ApiPosAccessibilitySettings {
  user_id: number
  branch_id: number | null
  role: string
  mode: PosAccessibilitySettings['mode']
  font_scale: number
  control_scale: number
  icon_scale: number
  high_contrast: boolean
}

function fromApi(data: ApiPosAccessibilitySettings): PosAccessibilitySettings {
  return {
    mode: data.mode,
    fontScale: Number(data.font_scale),
    controlScale: Number(data.control_scale),
    iconScale: Number(data.icon_scale),
    highContrast: Boolean(data.high_contrast),
  }
}

function toApi(settings: PosAccessibilitySettings) {
  return {
    mode: settings.mode,
    fontScale: settings.fontScale,
    controlScale: settings.controlScale,
    iconScale: settings.iconScale,
    highContrast: settings.highContrast,
  }
}

export function usePosAccessibility(target?: PosAccessibilityTarget) {
  const stableTarget = useMemo(
    () => ({ branchId: target?.branchId, role: target?.role, userId: target?.userId }),
    [target?.branchId, target?.role, target?.userId],
  )
  const key = useMemo(() => posAccessibilityKey(stableTarget), [stableTarget])
  const [settings, setSettings] = useState<PosAccessibilitySettings>(DEFAULT_POS_ACCESSIBILITY)
  const qc = useQueryClient()
  const userId = stableTarget.userId ?? null
  const queryKey = useMemo(() => ['pos-accessibility', userId], [userId])

  const remote = useQuery({
    queryKey,
    queryFn: () => apiRequest<ApiPosAccessibilitySettings>(`/accessibility/pos?user_id=${userId}`),
    enabled: userId !== null,
    refetchInterval: 4_000,
    staleTime: 1_000,
    retry: 1,
  })

  const saveRemote = useMutation({
    mutationFn: (next: PosAccessibilitySettings) =>
      apiRequest<ApiPosAccessibilitySettings>(`/accessibility/pos?user_id=${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(toApi(next)),
      }),
    onSuccess: (data) => {
      const mapped = fromApi(data)
      writePosAccessibility(stableTarget, mapped)
      setSettings(mapped)
      qc.setQueryData(queryKey, data)
    },
  })

  const resetRemote = useMutation({
    mutationFn: () =>
      apiRequest<ApiPosAccessibilitySettings>(`/accessibility/pos?user_id=${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      const mapped = fromApi(data)
      resetPosAccessibility(stableTarget)
      setSettings(mapped)
      qc.setQueryData(queryKey, data)
    },
  })

  const refresh = useCallback(() => {
    setSettings(readPosAccessibility(stableTarget))
  }, [stableTarget])

  useEffect(() => {
    refresh()
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) refresh()
    }
    const onCustom = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('restauros:pos-accessibility', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('restauros:pos-accessibility', onCustom as EventListener)
    }
  }, [key, refresh])

  useEffect(() => {
    if (!remote.data) return
    const mapped = fromApi(remote.data)
    writePosAccessibility(stableTarget, mapped)
    setSettings(mapped)
  }, [remote.data, stableTarget])

  const update = useCallback((next: PosAccessibilitySettings) => {
    writePosAccessibility(stableTarget, next)
    setSettings(next)
    if (userId !== null) saveRemote.mutate(next)
  }, [saveRemote, stableTarget, userId])

  const setMode = useCallback((mode: PosAccessibilityMode) => {
    update(POS_ACCESSIBILITY_PRESETS[mode])
  }, [update])

  const reset = useCallback(() => {
    resetPosAccessibility(stableTarget)
    setSettings(DEFAULT_POS_ACCESSIBILITY)
    if (userId !== null) resetRemote.mutate()
  }, [resetRemote, stableTarget, userId])

  return { settings, update, setMode, reset, syncing: remote.isFetching || saveRemote.isPending || resetRemote.isPending }
}
