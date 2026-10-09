'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Tabs horizontales scrolleables de categorías del menú (Entradas, Fuertes,
 * Bebidas, Postres…), dinámicas por sucursal.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { Chip } from '@heroui/react'
import type { Category } from '@/lib/types'

interface CategoryTabsProps {
  categories: Category[]
  activeId: number | null
  onChange: (id: number | null) => void
}

export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible">
      <Chip
        as="button"
        type="button"
        onClick={() => onChange(null)}
        variant={activeId === null ? 'solid' : 'flat'}
        size="lg"
        className="shrink-0 cursor-pointer font-semibold"
        style={activeId === null ? { backgroundColor: '#D1400F', color: 'white' } : undefined}
      >
        Todos
      </Chip>
      {categories.map(cat => {
        const active = activeId === Number(cat.id)
        return (
          <Chip
            key={cat.id}
            as="button"
            type="button"
            onClick={() => onChange(Number(cat.id))}
            variant={active ? 'solid' : 'flat'}
            size="lg"
            className="shrink-0 cursor-pointer font-semibold"
            style={active ? { backgroundColor: cat.color, color: 'white' } : undefined}
          >
            {cat.emoji} {cat.name}
          </Chip>
        )
      })}
    </div>
  )
}
