'use client'

/**
 * FoodIX — Guard de caja del lado del cliente.
 *
 * Pieza central del flujo obligatorio de caja en el frontend:
 *  1. Registra el handler global de `api/client`: cuando el backend rechaza una
 *     acción crítica con 409 `cash_session_required`, abre el modal de bloqueo
 *     SIN necesidad de tocar cada botón de cobro.
 *  2. Expone `useCashRegister()` para abrir la apertura de caja desde cualquier
 *     parte (indicador del dashboard, alertas, etc.).
 *
 * La verdad del turno SIEMPRE la decide el backend; esto es solo UX.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { setCashSessionRequiredHandler } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { OpenCashModal } from './OpenCashModal'

interface CashRegisterContextValue {
  /** Abre el modal de apertura de caja / inicio de turno. */
  openCashRegister: () => void
}

const CashRegisterContext = createContext<CashRegisterContextValue | null>(null)

export function useCashRegister(): CashRegisterContextValue {
  const ctx = useContext(CashRegisterContext)
  if (!ctx) throw new Error('useCashRegister debe usarse dentro de <CashGuardProvider>')
  return ctx
}

export function CashGuardProvider({ children }: { children: React.ReactNode }) {
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  // Conecta el handler global de la capa HTTP con este árbol de UI.
  useEffect(() => {
    setCashSessionRequiredHandler(() => setBlockedOpen(true))
    return () => setCashSessionRequiredHandler(null)
  }, [])

  const openCashRegister = useCallback(() => {
    setBlockedOpen(false)
    setOpenModal(true)
  }, [])

  const value = useMemo(() => ({ openCashRegister }), [openCashRegister])

  return (
    <CashRegisterContext.Provider value={value}>
      {children}

      {/* Modal de BLOQUEO: acción crítica sin caja abierta. */}
      <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              Necesitas abrir caja
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para continuar necesitas abrir caja o iniciar turno. Esto asegura que tus ventas,
            pagos y cierre del día se registren correctamente.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setBlockedOpen(false)}>Cancelar</Button>
            <Button onClick={openCashRegister} className="bg-[#FACC15] hover:bg-[#EAB308]">
              Abrir caja ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de APERTURA / inicio de turno. */}
      <OpenCashModal
        open={openModal}
        onOpenChange={setOpenModal}
        reason="Inicia tu turno para poder cobrar y registrar movimientos."
      />
    </CashRegisterContext.Provider>
  )
}
