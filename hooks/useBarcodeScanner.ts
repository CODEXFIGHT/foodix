'use client'

import { useEffect, useRef } from 'react'

interface ScannerOptions {
  /** Longitud mínima para considerar válido un código. */
  minLength?: number
  /** Máximo de ms entre teclas para considerarlas parte del mismo escaneo. */
  maxInterKeyMs?: number
}

/**
 * Detecta lectores de código de barras que actúan como teclado HID
 * ("keyboard wedge"). Esto funciona de forma UNIVERSAL: cualquier lector por
 * USB-A, USB-C o Bluetooth, en Windows, macOS, Linux, Android e iOS, en
 * Chrome/Brave/Safari/cualquier navegador, sin permisos ni drivers.
 *
 * La heurística: los lectores "teclean" los dígitos muy rápido (pocos ms entre
 * teclas) y terminan con Enter o Tab. Si el ritmo es humano, se ignora.
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  active = true,
  options: ScannerOptions = {},
) {
  const { minLength = 4, maxInterKeyMs = 100 } = options
  const bufferRef = useRef('')
  const lastTimeRef = useRef(0)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    const commit = () => {
      const code = bufferRef.current.trim()
      bufferRef.current = ''
      if (code.length >= minLength) onScanRef.current(code)
    }

    const handleKey = (e: KeyboardEvent) => {
      // No interceptar cuando el usuario escribe en un campo.
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }

      const now = Date.now()
      const gap = now - lastTimeRef.current

      // Terminadores típicos de lector: Enter o Tab.
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (bufferRef.current.length > 0) {
          e.preventDefault()
          commit()
        }
        return
      }

      // Ignora teclas no imprimibles (Shift, Alt, flechas, etc.).
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return

      // Si pasó demasiado tiempo desde la última tecla, es escritura humana:
      // reinicia el buffer y empieza un nuevo posible escaneo.
      if (gap > maxInterKeyMs) bufferRef.current = ''

      bufferRef.current += e.key
      lastTimeRef.current = now
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, minLength, maxInterKeyMs])
}
