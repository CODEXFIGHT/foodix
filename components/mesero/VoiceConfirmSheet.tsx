'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Confirmación de la comanda por voz cuando la confianza es baja o hay
 * ambigüedades: el mesero edita cantidades/quita líneas antes de agregarlas
 * al carrito. Nunca se envía a cocina directamente desde aquí.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Product, VoiceParseResult } from '@/lib/types'

export interface VoiceReviewLine {
  productId: number
  productName: string
  unitPrice: number
  quantity: number
  resolved: boolean
}

interface VoiceConfirmSheetProps {
  result: VoiceParseResult | null
  products: Product[]
  onClose: () => void
  onConfirm: (lines: VoiceReviewLine[]) => void
}

export function VoiceConfirmSheet({ result, products, onClose, onConfirm }: VoiceConfirmSheetProps) {
  const [lines, setLines] = useState<VoiceReviewLine[]>([])

  useEffect(() => {
    if (!result) return
    setLines(result.items.map(item => {
      const product = products.find(p => p.id === item.productoId)
      return {
        productId: item.productoId,
        productName: product?.name ?? `Producto #${item.productoId}`,
        unitPrice: product?.price ?? 0,
        quantity: item.cantidad,
        resolved: !!product,
      }
    }))
  }, [result, products])

  if (!result) return null

  const updateQty = (idx: number, delta: number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
  }
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))

  return (
    <BottomSheet open={!!result} onClose={onClose}>
      <h2 className="pr-8 text-base font-bold">Confirma el pedido por voz</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confianza {Math.round(result.confianza * 100)}%. Revisa antes de agregarlo al carrito.
      </p>

      {result.ambiguedades.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.ambiguedades.join(' · ')}</span>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {lines.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se detectaron platillos. Intenta de nuevo o agrégalos manualmente.
          </p>
        )}
        {lines.map((line, idx) => (
          <div
            key={`${line.productId}-${idx}`}
            className={cn(
              'rounded-xl border p-3',
              !line.resolved && 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{line.productName}</p>
              <button onClick={() => removeLine(idx)} aria-label={`Quitar ${line.productName}`} className="shrink-0 text-stone-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {!line.resolved && <p className="mt-0.5 text-xs text-amber-600">No identificado en el menú — revisa el nombre</p>}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(idx, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 dark:border-stone-700">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 dark:border-stone-700">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(line.unitPrice * line.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background px-4 pt-3">
        <Button
          variant="brand"
          className="h-12 w-full"
          disabled={lines.length === 0}
          onClick={() => { onConfirm(lines); onClose() }}
        >
          Agregar al pedido
        </Button>
      </div>
    </BottomSheet>
  )
}
