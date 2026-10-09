'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Barra lateral fija de categorías para la carta digital en escritorio
 * (≥1024px) — equivalente vertical de CategorySlider.tsx, con "riel" activo
 * resaltado por scrollspy (no filtra: solo hace scroll suave a la sección).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { UtensilsCrossed, GlassWater, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CategorySliderItem } from './CategorySlider'

type MenuGroup = 'alimento' | 'bebida'

interface CategorySidebarProps {
  categories: CategorySliderItem[]
  /** Categoría cuya sección está visible en el viewport (scrollspy). */
  activeSectionId: number | null
  /** Hace scroll suave a la sección — NO filtra el grid. */
  onSelect: (id: number | null) => void
  groupTabs?: { value: MenuGroup | null; onChange: (g: MenuGroup | null) => void }
}

const GROUP_OPTIONS = [
  { value: null as MenuGroup | null, label: 'Todo', Icon: LayoutGrid },
  { value: 'alimento' as MenuGroup | null, label: 'Alimentos', Icon: UtensilsCrossed },
  { value: 'bebida' as MenuGroup | null, label: 'Bebidas', Icon: GlassWater },
]

export function CategorySidebar({ categories, activeSectionId, onSelect, groupTabs }: CategorySidebarProps) {
  return (
    <nav aria-label="Categorías de la carta" className="flex flex-col gap-4">
      {groupTabs && (
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1">
          {GROUP_OPTIONS.map(t => (
            <button
              key={t.label}
              type="button"
              onClick={() => groupTabs.onChange(t.value)}
              title={t.label}
              className={cn(
                'flex h-10 items-center justify-center rounded-xl text-stone-500 transition-colors',
                groupTabs.value === t.value ? 'bg-white text-[#D1400F] shadow-sm animate-carta-pop' : 'hover:text-stone-700',
              )}
            >
              <t.Icon className="h-4 w-4" />
              <span className="sr-only">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 rounded-2xl border border-stone-200/70 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'relative flex items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors',
            activeSectionId === null ? 'bg-[#D1400F]/10 text-[#D1400F]' : 'text-stone-600 hover:bg-stone-50',
          )}
        >
          {activeSectionId === null && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[#D1400F]" />}
          Toda la carta
        </button>

        {categories.map(category => {
          const active = activeSectionId === category.id
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                'relative flex items-center truncate rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors',
                active ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50',
              )}
            >
              <span
                className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full transition-opacity"
                style={{ backgroundColor: category.color || '#D1400F', opacity: active ? 1 : 0 }}
              />
              {category.name}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
