/**
 * FoodIX — Modo Demo
 * Shell de los paneles demo. Replica el chrome del dashboard REAL (sidebar
 * oscuro + topbar + navegación móvil) para que el demo no se vea distinto al
 * sistema productivo. La carta del cliente se renderiza sin chrome, igual que
 * la /carta pública real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { PageHeader } from '@/components/shared/PageHeader'
import { CodexFightFooter } from '@/components/shared/DevHiveFooter'
import { DemoSidebar } from './shell/DemoSidebar'
import { DemoTopbar } from './shell/DemoTopbar'
import { DemoMobileNav } from './shell/DemoMobileNav'
import { DemoPersistentToast } from './DemoPersistentToast'
import { RoleAiAssistant, type UserRole } from '@/components/shared/RoleAiAssistant'
import { setDemoSession } from '@/lib/demo/demo-session'
import type { DemoRole } from '@/lib/demo/demo-types'

interface Props {
  role: DemoRole
  title: string
  /** Contenido a la derecha del título (filtros, acciones). */
  actions?: ReactNode
  children: ReactNode
  /** Contenido a sangre (cocina/kiosko): sin contenedor ni encabezado. */
  fullBleed?: boolean
}

export function DemoShell({ role, title, actions, children, fullBleed }: Props) {
  const [mounted, setMounted] = useState(false)

  // Fija (o conserva) la sesión demo de esta pestaña según el rol del panel.
  useEffect(() => {
    setMounted(true)
    setDemoSession(role)
  }, [role])

  // Carta del cliente: sin chrome de dashboard (igual que /carta pública real).
  if (role === 'menu') {
    return (
      <>
        {mounted ? children : <FullSkeleton />}
        <DemoPersistentToast />
      </>
    )
  }

  const aiRole: UserRole = role === 'waiter' ? 'mesero' : role === 'kitchen' ? 'cocina' : 'admin'

  return (
    <div className="flex h-screen-dvh overflow-hidden bg-background">
      <DemoSidebar role={role} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DemoTopbar role={role} />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {fullBleed ? (
            mounted ? children : <FullSkeleton />
          ) : (
            <>
              <div className="p-4 sm:p-6 pb-20 lg:pb-6 max-w-7xl mx-auto space-y-5">
                <PageHeader title={title} actions={actions} />
                {mounted ? children : <ContentSkeleton />}
              </div>
              <CodexFightFooter />
            </>
          )}
        </main>
      </div>

      {/* Asistente Sol IA inteligente personalizado según el rol activo (Admin, Mesero, Cocina) */}
      {mounted && (
        <RoleAiAssistant
          role={aiRole}
          className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50"
        />
      )}

      <DemoMobileNav role={role} />
      <DemoPersistentToast />
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

function FullSkeleton() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EAB308] border-t-transparent" />
    </div>
  )
}
