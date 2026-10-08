'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Carrito flotante (bottom sheet colapsable) de la Vista Mesa Activa.
 * Swipe derecha en un ítem = +1, swipe izquierda = -1/eliminar, swipe hacia
 * arriba en la barra = expande. El botón "Enviar a cocina" siempre visible.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { ChefHat, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { Button, Chip } from '@heroui/react'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import type { DraftOrderItem } from '@/components/orders/OrderSummary'

const SWIPE_THRESHOLD_PX = 72

interface CarritoFlotanteProps {
  items: DraftOrderItem[]
  total: number
  sending: boolean
  disabled?: boolean
  onIncrement: (uid: string) => void
  onDecrement: (uid: string) => void
  onRemove: (uid: string) => void
  onSend: () => void
}

export function CarritoFlotante({
  items, total, sending, disabled, onIncrement, onDecrement, onRemove, onSend,
}: CarritoFlotanteProps) {
  const [expanded, setExpanded] = useState(false)
  const haptic = useHapticFeedback()
  const count = items.reduce((s, i) => s + i.quantity, 0)

  if (items.length === 0) return null

  return (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-950 lg:inset-x-0 lg:w-full lg:max-w-lg"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={(_, info: PanInfo) => {
          if (info.offset.y < -40) setExpanded(true)
          else if (info.offset.y > 40) setExpanded(false)
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3"
        >
          <Chip size="lg" radius="full" className="h-9 w-9 shrink-0 bg-[#E85D04]/10 text-[#E85D04]" classNames={{ content: 'p-0' }}>
            <ChefHat className="h-4 w-4" />
          </Chip>
          <span className="flex-1 text-left">
            <span className="block text-xs text-muted-foreground">{count} {count === 1 ? 'artículo' : 'artículos'}</span>
            <span className="block text-sm font-bold">{formatCurrency(total)}</span>
          </span>
          <ChevronUp className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-h-[45vh] space-y-2 overflow-y-auto border-t border-stone-100 px-3 py-2 scrollbar-thin dark:border-stone-800">
                {items.map(item => (
                  <CarritoRow
                    key={item.uid}
                    item={item}
                    onIncrement={() => { haptic(); onIncrement(item.uid) }}
                    onDecrement={() => { haptic(); onDecrement(item.uid) }}
                    onRemove={() => onRemove(item.uid)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-stone-100 p-3 dark:border-stone-800">
          <Button
            className="h-12 w-full text-base font-semibold text-white"
            style={{ backgroundColor: '#E85D04' }}
            isDisabled={disabled || sending}
            isLoading={sending}
            onPress={onSend}
          >
            {sending ? 'Enviando…' : `Enviar a cocina · ${formatCurrency(total)}`}
          </Button>
        </div>
      </motion.div>
    </>
  )
}

function CarritoRow({
  item, onIncrement, onDecrement, onRemove,
}: {
  item: DraftOrderItem
  onIncrement: () => void
  onDecrement: () => void
  onRemove: () => void
}) {
  const x = useMotionValue(0)
  const addOpacity = useTransform(x, [0, SWIPE_THRESHOLD_PX], [0, 1])
  const removeOpacity = useTransform(x, [-SWIPE_THRESHOLD_PX, 0], [1, 0])
  const extras = [...(item.modifiers ?? []).map(m => m.name), ...(item.selectedModifiers ?? [])]

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: addOpacity }}
        className="absolute inset-y-0 left-0 flex w-16 items-center justify-center rounded-l-xl bg-green-500 text-white"
      >
        <Plus className="h-4 w-4" />
      </motion.div>
      <motion.div
        style={{ opacity: removeOpacity }}
        className="absolute inset-y-0 right-0 flex w-16 items-center justify-center rounded-r-xl bg-red-500 text-white"
      >
        <Minus className="h-4 w-4" />
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={(_, info: PanInfo) => {
          if (info.offset.x > SWIPE_THRESHOLD_PX) onIncrement()
          else if (info.offset.x < -SWIPE_THRESHOLD_PX) onDecrement()
        }}
        className="relative z-10 rounded-xl border border-stone-100 bg-white p-2.5 dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{item.product_name}</p>
          <button onClick={onRemove} aria-label={`Quitar ${item.product_name}`} className="shrink-0 text-stone-300 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {extras.length > 0 && <p className="mt-0.5 text-xs text-stone-500">{extras.join(', ')}</p>}
        {item.item_notes && <p className="mt-0.5 text-xs italic text-amber-600">&ldquo;{item.item_notes}&rdquo;</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">× {item.quantity}</span>
          <span className="text-sm font-semibold">{formatCurrency(item.subtotal)}</span>
        </div>
      </motion.div>
    </div>
  )
}
