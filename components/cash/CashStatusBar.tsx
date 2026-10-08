'use client'

/**
 * FoodIX — Barra de estado de caja.
 *
 * Segundo nivel de navegación fijo bajo el Topbar, dedicado por completo al
 * turno de caja (abierta/cerrada). Libera espacio en el Topbar principal en
 * mobile y da al estado de caja el protagonismo que merece: nunca se trunca.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCurrentCashSession } from '@/lib/api/queries'
import { getActivePosId } from '@/lib/pos/activePos'
import { useCashRegister } from './CashGuard'
import { QuickCloseCashModal } from './QuickCloseCashModal'

/** Roles que operan caja y para los que la barra es relevante. */
const CASH_ROLES = new Set(['admin', 'caja', 'mesero'])

export function CashStatusBar() {
  const user = useAuthStore(s => s.user)
  const role = user?.role
  const branchId = user?.branch_id ?? null
  const { data: session } = useCurrentCashSession(branchId)
  const { openCashRegister } = useCashRegister()
  const [closeOpen, setCloseOpen] = useState(false)

  // Solo para roles operativos con sucursal asignada.
  if (!role || !CASH_ROLES.has(role) || branchId === null) return null

  const posId = getActivePosId()
  const canClose = role === 'admin'

  if (!session) {
    return (
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900 dark:bg-amber-950/40">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          <span>No hay caja abierta en esta sucursal</span>
        </div>
        <Button
          size="sm"
          onClick={openCashRegister}
          className="h-8 bg-amber-600 text-white hover:bg-amber-700"
        >
          <Unlock className="h-3.5 w-3.5" />
          Abrir caja
        </Button>
      </div>
    )
  }

  const openedAt = new Date(session.opened_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950/40">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-green-800 dark:text-green-300">
          <span className="flex items-center gap-2">
            <span className="relative flex h-4 w-4 items-center justify-center shrink-0">
              <span className="absolute h-4 w-4 rounded-full bg-green-400/60 animate-ping" />
              <Unlock className="h-4 w-4" />
            </span>
            Caja abierta
          </span>
          <span className="text-green-700/80 dark:text-green-400/80">
            Desde las {openedAt} · POS {session.pos_id ?? posId}
          </span>
        </div>

        {canClose && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCloseOpen(true)}
            className="h-8"
          >
            <Lock className="h-3.5 w-3.5" />
            Cerrar caja
          </Button>
        )}
      </div>

      {canClose && (
        <QuickCloseCashModal open={closeOpen} onOpenChange={setCloseOpen} branchId={branchId} />
      )}
    </>
  )
}
