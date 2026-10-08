'use client'

import { useCallback, useRef } from 'react'

export function useStationSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext | null {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext()
      }
      return ctxRef.current
    } catch {
      return null
    }
  }

  function beep(freq: number, duration: number, gain = 0.3, delay = 0): void {
    const ctx = getCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gainNode.gain.value = gain
    const start = ctx.currentTime + delay
    osc.start(start)
    osc.stop(start + duration / 1000)
  }

  /** Sonido de nueva orden en cocina — grave urgente */
  const playNewOrder = useCallback(() => {
    beep(440, 180, 0.35)
    beep(550, 180, 0.3, 0.2)
    beep(660, 250, 0.25, 0.4)
  }, [])

  /** Sonido de pedido completamente listo — agradable ascendente */
  const playOrderReady = useCallback(() => {
    beep(660, 150, 0.3)
    beep(880, 150, 0.3, 0.18)
    beep(1100, 250, 0.25, 0.36)
  }, [])

  /** Beep simple al marcar ítem */
  const playItemDone = useCallback(() => {
    beep(880, 100, 0.2)
  }, [])

  return { playNewOrder, playOrderReady, playItemDone }
}
