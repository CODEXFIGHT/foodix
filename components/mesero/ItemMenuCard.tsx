'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Card compacta de producto en la Vista Mesa Activa: tap agrega 1 unidad,
 * long-press abre el selector de modificadores. Sin lógica de negocio: solo
 * reporta la intención del mesero al padre.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Chip } from '@heroui/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { useLongPress } from '@/hooks/useLongPress'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import type { Product } from '@/lib/types'

interface ItemMenuCardProps {
  product: Product
  qtyInCart: number
  onTap: () => void
  onLongPress: () => void
}

export function ItemMenuCard({ product, qtyInCart, onTap, onLongPress }: ItemMenuCardProps) {
  const haptic = useHapticFeedback()
  const available = product.available
  const outOfStock = !available || product.inventory_status === 'out'
  const lowStock = available && product.inventory_status === 'low'

  const longPress = useLongPress(() => {
    if (!available) return
    haptic(20)
    onLongPress()
  })

  const handleTap = () => {
    if (!available) {
      toast.error(`${product.name} no está disponible`)
      return
    }
    haptic()
    onTap()
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: available ? 0.97 : 1 }}
      onClick={handleTap}
      {...longPress}
      className={cn(
        'relative flex min-h-[44px] items-center gap-3 rounded-2xl border p-3 text-left transition-colors touch-manipulation',
        available
          ? 'border-stone-200 bg-white active:border-[#CA8A04]/60 dark:border-stone-800 dark:bg-stone-950'
          : 'border-stone-200 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900',
      )}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-stone-100 text-2xl dark:bg-stone-800">
          {product.emoji ?? '🍽️'}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{product.name}</p>
        <p className="mt-0.5 text-sm font-extrabold text-yellow-700 dark:text-yellow-400">{formatCurrency(product.price)}</p>
        {(outOfStock || lowStock) && (
          <Chip
            size="sm"
            variant="flat"
            color={outOfStock ? 'danger' : 'warning'}
            className="mt-1 h-5 px-1.5 text-[10px] font-bold"
          >
            {outOfStock ? 'Agotado' : 'Pocas piezas'}
          </Chip>
        )}
      </div>

      {qtyInCart > 0 ? (
        <Chip size="sm" className="h-8 w-8 shrink-0 bg-[#FACC15] text-sm font-bold text-stone-950" classNames={{ content: 'px-0 w-full text-center' }}>
          {qtyInCart}
        </Chip>
      ) : available ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800">
          <Plus className="h-4 w-4" />
        </span>
      ) : null}
    </motion.button>
  )
}
