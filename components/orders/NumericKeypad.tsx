'use client'

import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NumericKeypadProps {
  /** Valor actual como string (permite decimales en construcción, ej. "12."). */
  value: string
  onChange: (next: string) => void
  /** Máximo de decimales permitidos (peso suele 3, dinero 2). */
  maxDecimals?: number
  className?: string
}

/**
 * Teclado numérico grande y táctil para capturar montos/pesos en el flujo de
 * pedidos. Pensado para tablet Android, móvil y desktop: botones amplios, una
 * sola mano, sin abrir el teclado del sistema. No formatea: entrega el string
 * crudo (el contenedor decide cómo parsear/mostrar el total).
 */
export function NumericKeypad({ value, onChange, maxDecimals = 2, className }: NumericKeypadProps) {
  const press = (key: string) => {
    if (key === '.') {
      if (value.includes('.')) return
      onChange(value === '' ? '0.' : value + '.')
      return
    }
    // Límite de decimales.
    if (value.includes('.')) {
      const dec = value.split('.')[1] ?? ''
      if (dec.length >= maxDecimals) return
    }
    // Evita ceros a la izquierda redundantes ("00", "01").
    if (value === '0') {
      onChange(key)
      return
    }
    onChange(value + key)
  }

  const backspace = () => onChange(value.slice(0, -1))

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {keys.map(k => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className="h-14 rounded-xl bg-muted/70 text-2xl font-bold tabular-nums text-foreground active:scale-95 hover:bg-muted transition-all select-none"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={backspace}
        aria-label="Borrar"
        className="h-14 rounded-xl bg-muted/70 flex items-center justify-center text-muted-foreground active:scale-95 hover:bg-destructive hover:text-white transition-all select-none"
      >
        <Delete className="h-6 w-6" />
      </button>
    </div>
  )
}
