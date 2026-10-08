'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Panel deslizante desde abajo (bottom-sheet), base compartida de
 * ModificadorSheet, CarritoFlotante (vista expandida) y VoiceConfirmSheet.
 * Se arrastra hacia abajo para cerrar; renderiza en document.body para
 * anclarse al viewport sin importar ancestros con `transform`.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'

const DRAG_CLOSE_THRESHOLD_PX = 120
const DRAG_CLOSE_VELOCITY = 500

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

export function BottomSheet({ open, onClose, children, maxHeight = '85vh' }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative rounded-t-3xl bg-background shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info: PanInfo) => {
              if (info.offset.y > DRAG_CLOSE_THRESHOLD_PX || info.velocity.y > DRAG_CLOSE_VELOCITY) onClose()
            }}
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-stone-300 dark:bg-stone-700" />
            <div
              className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 scrollbar-thin"
              style={{ maxHeight }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
