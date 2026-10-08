'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { usePrinterStore } from '@/lib/stores/printerStore'
import { useConfigStore } from '@/lib/stores/configStore'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  APP_VERSION_FULL,
} from '@/lib/constants/version'
import {
  printReceipt,
  openCashDrawer,
  printTest,
  printKitchenTicket,
  hasRawPrinter,
} from '@/lib/printing/printer'
import type { ReceiptData, KitchenTicketData } from '@/lib/printing/escpos'
import { buildTicketUrl } from '@/lib/printing/ticketLink'

interface ReceiptInput {
  orderId: number | string
  ticketNumber?: string
  tableName?: string
  orderType?: string
  createdAt: string
  lines: { name: string; qty: number; total: number }[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  /** Descuentos automáticos aplicados (promoción/cupón/lealtad) — se imprimen solo si hay alguno. */
  discountBreakdown?: { label: string; amount: number }[]
  paid?: boolean
  paymentMethods?: string[]
}

export function usePrinter() {
  const printerCfg = usePrinterStore((s) => s.config)
  const business = useConfigStore((s) => s.config)
  const user = useAuthStore((s) => s.user)
  const branch = useAuthStore((s) => s.branch)

  const buildData = useCallback(
    (input: ReceiptInput): ReceiptData => {
      const ticketNumber = input.ticketNumber ?? String(input.orderId).padStart(6, '0')
      const deviceName = typeof window !== 'undefined'
        ? window.localStorage.getItem('restauros_device_name') ?? undefined
        : undefined
      const base: ReceiptData = {
        businessName: business.businessName,
        address: business.address || undefined,
        phone: business.phone || undefined,
        footer: business.footer || undefined,
        logo: business.ticketLogo || undefined,
        currency: business.currency === 'MXN' ? '$' : business.currency,
        branchName: branch?.name,
        userName: user?.name,
        deviceName,
        appVersion: APP_VERSION_FULL,
        ...input,
        ticketNumber,
      }
      // QR del ticket: enlace a la página pública `/t` con el recibo detallado
      // (autocontenido en la URL). Al escanearlo, el cliente ve su ticket con
      // diseño FoodIX en su teléfono, en vez de un texto plano.
      return { ...base, qr: buildTicketUrl(base) }
    },
    [business, branch, user],
  )

  const printOrder = useCallback(
    async (input: ReceiptInput, opts?: { silent?: boolean }) => {
      try {
        const res = await printReceipt(buildData(input), printerCfg)
        if (!opts?.silent) {
          toast.success(
            res.method === 'browser'
              ? 'Ticket enviado al diálogo de impresión'
              : 'Ticket impreso',
          )
        }
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al imprimir')
        return false
      }
    },
    [buildData, printerCfg],
  )

  // Comanda de cocina (AGREGADO/CANCELAR). Silenciosa por defecto: la estación
  // imprime sin interrumpir; si no hay impresora, no molesta con un error.
  const printKitchen = useCallback(
    async (input: Omit<KitchenTicketData, 'businessName'>): Promise<boolean> => {
      try {
        await printKitchenTicket({ businessName: business.businessName, ...input }, printerCfg)
        return true
      } catch {
        return false
      }
    },
    [business.businessName, printerCfg],
  )

  const openDrawer = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        await openCashDrawer(printerCfg)
        if (!opts?.silent) toast.success('Cajón abierto')
        return true
      } catch (err) {
        if (!opts?.silent) {
          toast.error(err instanceof Error ? err.message : 'Error al abrir cajón')
        }
        return false
      }
    },
    [printerCfg],
  )

  const testPrint = useCallback(async () => {
    try {
      const res = await printTest(business.businessName, printerCfg)
      toast.success(
        res.method === 'browser'
          ? 'Prueba enviada al diálogo de impresión'
          : 'Ticket de prueba impreso',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en la prueba')
    }
  }, [business.businessName, printerCfg])

  // Imprime un ticket de muestra (productos ficticios) usando el encabezado
  // actual. `header` permite sobrescribir los datos en vivo del editor para
  // probar la impresión sin tener que guardar primero.
  type TicketHeader = Pick<ReceiptData, 'businessName' | 'address' | 'phone' | 'footer' | 'logo'>
  const printSample = useCallback(
    async (header?: Partial<TicketHeader>) => {
      const sample: ReceiptInput = {
        orderId: 'PRUEBA',
        tableName: 'Mesa 7',
        orderType: 'dine_in',
        createdAt: new Date().toLocaleString('es-MX'),
        lines: [
          { name: 'Tostadas', qty: 2, total: 90 },
          { name: 'Agua de jamaica', qty: 1, total: 25 },
          { name: 'Guacamole', qty: 1, total: 60 },
        ],
        subtotal: 175,
        tax: 0,
        taxRate: 16,
        total: 175,
      }
      try {
        const data: ReceiptData = { ...buildData(sample), ...header }
        const res = await printReceipt(data, printerCfg)
        toast.success(
          res.method === 'browser'
            ? 'Prueba enviada al diálogo de impresión'
            : 'Ticket de prueba impreso',
        )
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error en la prueba')
        return false
      }
    },
    [buildData, printerCfg],
  )

  return {
    config: printerCfg,
    enabled: printerCfg.mode !== 'off',
    // Impresora física lista (sin caer al diálogo del navegador).
    canPrintRaw: hasRawPrinter(printerCfg),
    printOrder,
    printKitchen,
    openDrawer,
    testPrint,
    printSample,
  }
}
