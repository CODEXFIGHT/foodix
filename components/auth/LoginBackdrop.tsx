'use client'

/**
 * FoodIX — Fondo decorativo del login: íconos de cocina/restaurante
 * dispersos a muy baja opacidad detrás del formulario. Puramente estético,
 * no interactivo — no debe competir con el contenido ni afectar el layout.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  UtensilsCrossed, ChefHat, Coffee, Pizza, Soup, Wine,
  Sandwich, CakeSlice, Receipt, IceCreamCone, Beef, Salad,
} from 'lucide-react'

interface Sprinkle {
  Icon: typeof UtensilsCrossed
  top: string
  left: string
  size: number
  rotate: number
  brand?: boolean
}

const SPRINKLES: Sprinkle[] = [
  { Icon: ChefHat,        top: '8%',  left: '6%',  size: 56, rotate: -12 },
  { Icon: UtensilsCrossed, top: '16%', left: '85%', size: 40, rotate: 14, brand: true },
  { Icon: Coffee,         top: '30%', left: '92%', size: 34, rotate: -8 },
  { Icon: Wine,           top: '4%',  left: '38%', size: 30, rotate: 10 },
  { Icon: Pizza,          top: '46%', left: '4%',  size: 46, rotate: 8 },
  { Icon: Soup,           top: '62%', left: '90%', size: 42, rotate: -14, brand: true },
  { Icon: Sandwich,       top: '78%', left: '10%', size: 38, rotate: 16 },
  { Icon: CakeSlice,      top: '88%', left: '80%', size: 32, rotate: -10 },
  { Icon: Receipt,        top: '58%', left: '20%', size: 28, rotate: 6 },
  { Icon: IceCreamCone,   top: '20%', left: '20%', size: 30, rotate: -18 },
  { Icon: Beef,           top: '70%', left: '55%', size: 30, rotate: 12 },
  { Icon: Salad,          top: '10%', left: '65%', size: 30, rotate: -6, brand: true },
]

export function LoginBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {SPRINKLES.map(({ Icon, top, left, size, rotate, brand }, i) => (
        <Icon
          key={i}
          className={brand ? 'text-yellow-700 dark:text-yellow-400' : 'text-stone-900'}
          style={{
            position: 'absolute',
            top,
            left,
            width: size,
            height: size,
            transform: `rotate(${rotate}deg)`,
            opacity: brand ? 0.07 : 0.05,
          }}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}
