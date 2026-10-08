'use client'

import type { UserRole } from '@/lib/types'

export type PosAccessibilityMode = 'default' | 'mobile' | 'tablet' | 'kiosk'

export interface PosAccessibilitySettings {
  mode: PosAccessibilityMode
  fontScale: number
  controlScale: number
  iconScale: number
  highContrast: boolean
}

export interface PosAccessibilityTarget {
  userId?: number | null
  branchId?: number | null
  role?: UserRole | string | null
}

export const DEFAULT_POS_ACCESSIBILITY: PosAccessibilitySettings = {
  mode: 'default',
  fontScale: 1,
  controlScale: 1,
  iconScale: 1,
  highContrast: false,
}

export const POS_ACCESSIBILITY_PRESETS: Record<PosAccessibilityMode, PosAccessibilitySettings> = {
  default: DEFAULT_POS_ACCESSIBILITY,
  mobile: {
    mode: 'mobile',
    fontScale: 1,
    controlScale: 1,
    iconScale: 1,
    highContrast: false,
  },
  tablet: {
    mode: 'tablet',
    fontScale: 1.12,
    controlScale: 1.14,
    iconScale: 1.12,
    highContrast: false,
  },
  kiosk: {
    mode: 'kiosk',
    fontScale: 1.24,
    controlScale: 1.28,
    iconScale: 1.2,
    highContrast: true,
  },
}

const KEY_PREFIX = 'restauros_pos_accessibility'

export function posAccessibilityKey(target?: PosAccessibilityTarget): string {
  const branch = target?.branchId ?? 'global'
  const role = target?.role ?? 'unknown'
  const user = target?.userId ?? 'anonymous'
  return `${KEY_PREFIX}:${branch}:${role}:${user}`
}

function sanitize(input: unknown): PosAccessibilitySettings {
  const raw = input as Partial<PosAccessibilitySettings>
  const preset = POS_ACCESSIBILITY_PRESETS[raw.mode ?? 'default'] ?? DEFAULT_POS_ACCESSIBILITY
  return {
    mode: raw.mode && raw.mode in POS_ACCESSIBILITY_PRESETS ? raw.mode : preset.mode,
    fontScale: clampScale(raw.fontScale, preset.fontScale),
    controlScale: clampScale(raw.controlScale, preset.controlScale),
    iconScale: clampScale(raw.iconScale, preset.iconScale),
    highContrast: Boolean(raw.highContrast ?? preset.highContrast),
  }
}

function clampScale(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(1.45, Math.max(0.9, n))
}

export function readPosAccessibility(target?: PosAccessibilityTarget): PosAccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_POS_ACCESSIBILITY
  try {
    const raw = localStorage.getItem(posAccessibilityKey(target))
    if (!raw) return DEFAULT_POS_ACCESSIBILITY
    return sanitize(JSON.parse(raw))
  } catch {
    return DEFAULT_POS_ACCESSIBILITY
  }
}

export function writePosAccessibility(target: PosAccessibilityTarget | undefined, settings: PosAccessibilitySettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(posAccessibilityKey(target), JSON.stringify(sanitize(settings)))
  window.dispatchEvent(new CustomEvent('restauros:pos-accessibility', { detail: { key: posAccessibilityKey(target) } }))
}

export function resetPosAccessibility(target?: PosAccessibilityTarget): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(posAccessibilityKey(target))
  window.dispatchEvent(new CustomEvent('restauros:pos-accessibility', { detail: { key: posAccessibilityKey(target) } }))
}
