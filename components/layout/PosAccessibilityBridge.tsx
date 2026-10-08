'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { usePosAccessibility } from '@/hooks/usePosAccessibility'
import { type PosAccessibilityTarget } from '@/lib/accessibility/posAccessibility'

export function PosAccessibilityBridge({ children, target }: { children: React.ReactNode; target?: PosAccessibilityTarget }) {
  const user = useAuthStore(s => s.user)
  const effectiveTarget = target ?? { userId: user?.id, role: user?.role, branchId: user?.branch_id }
  const { settings } = usePosAccessibility(effectiveTarget)

  useEffect(() => {
    document.documentElement.dataset.posMode = settings.mode
    document.documentElement.dataset.posContrast = settings.highContrast ? 'true' : 'false'
    document.documentElement.style.setProperty('--pos-font-scale', String(settings.fontScale))
    document.documentElement.style.setProperty('--pos-control-scale', String(settings.controlScale))
    document.documentElement.style.setProperty('--pos-icon-scale', String(settings.iconScale))
  }, [settings])

  return (
    <div
      data-pos-accessibility="true"
      data-pos-mode={settings.mode}
      data-pos-contrast={settings.highContrast ? 'true' : 'false'}
      style={{
        '--pos-font-scale': settings.fontScale,
        '--pos-control-scale': settings.controlScale,
        '--pos-icon-scale': settings.iconScale,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
