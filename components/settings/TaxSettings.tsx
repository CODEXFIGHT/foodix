'use client'

/**
 * FoodIX — Ajustes de IVA por sucursal.
 *
 * El IVA va incluido en el precio del menú: este switch solo controla si se
 * MUESTRA el desglose "IVA incluido" en resúmenes de pedido y tickets. El total
 * que paga el cliente nunca cambia.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Receipt } from 'lucide-react'
import { useBranch, useUpdateBranch } from '@/lib/api/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export function TaxSettings({ branchId }: { branchId: number }) {
  const { data: branch } = useBranch(branchId)
  const updateBranch = useUpdateBranch()

  const [enabled, setEnabled] = useState(true)
  const [rate, setRate] = useState('16')

  // Sincroniza con la sucursal cuando carga / cambia.
  useEffect(() => {
    if (!branch) return
    setEnabled(branch.tax_enabled === undefined ? true : Number(branch.tax_enabled) === 1)
    setRate(branch.tax_rate === undefined || branch.tax_rate === null ? '16' : String(Number(branch.tax_rate)))
  }, [branch])

  const save = async () => {
    const parsed = parseFloat(rate)
    if (enabled && (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)) {
      toast.error('La tasa de IVA debe estar entre 0 y 100')
      return
    }
    try {
      await updateBranch.mutateAsync({
        id: branchId,
        tax_enabled: enabled ? 1 : 0,
        tax_rate: Number.isFinite(parsed) ? parsed : 16,
      })
      toast.success('Configuración de IVA guardada')
    } catch {
      toast.error('No se pudo guardar la configuración de IVA')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-[#E85D04]" />
          Impuestos (IVA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Switch activar/desactivar */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="tax-enabled" className="font-medium">Mostrar IVA</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Muestra la línea “IVA incluido” en los resúmenes de pedido y en el ticket.
              Desactivarlo no cambia el total que paga el cliente.
            </p>
          </div>
          <Switch
            id="tax-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Tasa de IVA (solo relevante si está activado) */}
        <div className={cn('space-y-1.5 transition-opacity', !enabled && 'opacity-50')}>
          <Label htmlFor="tax-rate">Tasa de IVA (%)</Label>
          <div className="relative max-w-[160px]">
            <Input
              id="tax-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              value={rate}
              disabled={!enabled}
              onChange={e => setRate(e.target.value)}
              className="pr-8 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={updateBranch.isPending}
          className="bg-[#E85D04] hover:bg-[#C44D00]"
        >
          {updateBranch.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </CardContent>
    </Card>
  )
}
