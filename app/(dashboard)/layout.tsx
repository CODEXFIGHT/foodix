'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RouteGuard } from '@/components/layout/RouteGuard'
import { SubscriptionGuard } from '@/components/shared/SubscriptionGuard'
import { PageTransition } from '@/components/shared/PageTransition'
import { CodexFightFooter } from '@/components/shared/DevHiveFooter'
import { PushNotificationManager } from '@/components/shared/PushNotificationManager'
import { CashGuardProvider } from '@/components/cash/CashGuard'
import { PosAccessibilityBridge } from '@/components/layout/PosAccessibilityBridge'
import { useAuthStore } from '@/lib/stores/authStore'
import { useDeviceHeartbeat } from '@/hooks/useDeviceHeartbeat'
import type { DeviceModule } from '@/lib/devices/types'

const MODULE_BY_ROLE: Record<string, DeviceModule> = {
  admin: 'admin', mesero: 'waiter', cocina: 'kitchen', superadmin: 'superadmin',
}

/** Reporta esta sesión web como dispositivo conectado, según el rol. */
function HeartbeatBridge() {
  const role = useAuthStore(s => s.user?.role)
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  useDeviceHeartbeat({
    module: role ? (MODULE_BY_ROLE[role] ?? 'unknown') : 'unknown',
    enabled: !!role && hasHydrated,
  })
  return null
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  return (
    <CashGuardProvider>
    <PosAccessibilityBridge>
      <div className="flex h-screen-dvh overflow-hidden bg-background">
        <HeartbeatBridge />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-4 sm:p-6 pb-20 lg:pb-6 max-w-7xl mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
            <CodexFightFooter />
          </main>
        </div>
        <MobileNav />
        <PushNotificationManager />
      </div>
    </PosAccessibilityBridge>
    </CashGuardProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <SubscriptionGuard>
        <DashboardInner>{children}</DashboardInner>
      </SubscriptionGuard>
    </RouteGuard>
  )
}
