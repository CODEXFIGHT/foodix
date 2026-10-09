'use client'

/**
 * FoodIX — Selector de combos para el POS.
 *
 * El frontend NUNCA calcula la composición/precio de un combo: solo manda
 * `{combo_id, quantity}` al backend (ver handleConfirm en orders/new/page.tsx),
 * que lo expande y reprecia server-side (evaluateOrderPromotions() en
 * promotions.php) — misma regla de "no confiar en el cliente" que ya rige
 * el resto del carrito.
 */

import { PackagePlus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCombos } from '@/lib/api/queries/usePromotions'
import { formatCurrency } from '@/lib/utils/formatters'
import type { DraftOrderItem } from './OrderSummary'

interface ComboPickerProps {
  onAddCombo: (item: DraftOrderItem) => void
}

function makeUid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ComboPicker({ onAddCombo }: ComboPickerProps) {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const { data: combos = [] } = useCombos(branchId)

  const activeCombos = combos.filter(c => c.active)
  if (activeCombos.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl border bg-amber-50/60 p-3 dark:bg-amber-950/10">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-yellow-200">
        <PackagePlus className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
        Combos
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeCombos.map(combo => (
          <button
            key={combo.id}
            type="button"
            onClick={() => onAddCombo({
              uid: makeUid(),
              product_id: 0,
              product_name: combo.name,
              quantity: 1,
              unit_price: combo.price,
              subtotal: combo.price,
              combo_id: combo.id,
              combo_name: combo.name,
            })}
            className="min-w-[190px] max-w-[220px] rounded-xl border border-amber-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-[#EAB308] hover:shadow-md active:scale-[0.98] dark:border-amber-900/40 dark:bg-stone-950"
          >
            <span className="block truncate text-sm font-bold">{combo.name}</span>
            {combo.items.length > 0 && (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {combo.items.map(i => `${i.quantity}x ${i.name ?? 'producto'}`).join(' + ')}
              </span>
            )}
            <span className="mt-1 block text-sm font-extrabold text-yellow-700 dark:text-yellow-400">{formatCurrency(combo.price)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
