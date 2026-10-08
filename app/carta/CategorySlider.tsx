'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CategorySliderItem {
  id: number
  name: string
  color?: string | null
}

interface CategorySliderProps {
  categories: CategorySliderItem[]
  activeId: number | null
  onChange: (id: number | null) => void
  labelledBy?: string
}

export const CategorySlider = memo(function CategorySlider({ categories, activeId, onChange, labelledBy }: CategorySliderProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    setCanScrollLeft(viewport.scrollLeft > 2)
    setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    updateScrollState()
    viewport.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(viewport)
    return () => {
      viewport.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [categories.length, updateScrollState])

  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    activeRef.current?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' })
  }, [activeId])

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    viewport.scrollBy({ left: direction * Math.max(220, (viewport.clientWidth || 320) * 0.72), behavior })
  }

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? -1 : event.key === 'End' ? categories.length - 1 : currentIndex + (event.key === 'ArrowRight' ? 1 : -1)
    if (nextIndex < -1 || nextIndex >= categories.length) return
    const next = nextIndex === -1 ? null : categories[nextIndex].id
    onChange(next)
    requestAnimationFrame(() => {
      const selector = next === null ? '[data-category-all]' : `[data-category-id="${next}"]`
      viewportRef.current?.querySelector<HTMLButtonElement>(selector)?.focus()
    })
  }

  return (
    <div className="relative min-w-0" role="region" aria-label="Categorías de la carta">
      {canScrollLeft && <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-stone-100 to-transparent" />}
      {canScrollRight && <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-stone-100 to-transparent" />}
      {canScrollLeft && (
        <button type="button" aria-label="Desplazar categorías a la izquierda" onClick={() => scrollByPage(-1)} className="absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-md hover:text-[#E85D04] focus-visible:ring-2 focus-visible:ring-[#E85D04]/50 md:grid">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div ref={viewportRef} aria-labelledby={labelledBy} className="flex min-w-0 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          data-category-all
          aria-selected={activeId === null}
          role="tab"
          onClick={() => onChange(null)}
          onKeyDown={event => moveWithKeyboard(event, -1)}
          className={cn('min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/50 active:scale-[.98]', activeId === null ? 'border-[#E85D04] bg-[#E85D04] text-white shadow-md' : 'border-stone-200 bg-white text-stone-600 hover:border-[#E85D04]/40 hover:text-[#E85D04]')}
        >
          Todos
        </button>
        {categories.map((category, index) => {
          const active = activeId === category.id
          return (
            <button
              key={category.id}
              ref={active ? activeRef : undefined}
              type="button"
              data-category-id={category.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(active ? null : category.id)}
              onKeyDown={event => moveWithKeyboard(event, index)}
              className={cn('min-h-11 max-w-[220px] shrink-0 truncate rounded-full border px-4 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/50 active:scale-[.98]', active ? 'border-transparent text-white shadow-md' : 'border-stone-200 bg-white text-stone-600 hover:border-[#E85D04]/40 hover:text-[#E85D04]')}
              style={active ? { backgroundColor: category.color || '#E85D04' } : undefined}
            >
              {category.name}
            </button>
          )
        })}
      </div>
      {canScrollRight && (
        <button type="button" aria-label="Desplazar categorías a la derecha" onClick={() => scrollByPage(1)} className="absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-md hover:text-[#E85D04] focus-visible:ring-2 focus-visible:ring-[#E85D04]/50 md:grid">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
})
