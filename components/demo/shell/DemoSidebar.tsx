/**
 * FoodIX — Modo Demo
 * Sidebar del shell demo. Replica EXACTAMENTE el sidebar real (mismos estilos
 * #1C1917, iconos y comportamiento) pero navega a rutas demo. Los ítems sin
 * equivalente demo se ven igual y avisan que están deshabilitados.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { DemoBrand } from './DemoBrand'
import { notifyDemoBlocked } from '@/components/demo/DemoModeGuard'
import { DEMO_NAV_ITEMS, DEMO_KITCHEN_SUBS, realRoleOf } from './demoNav'
import type { DemoRole } from '@/lib/demo/demo-types'

export function DemoSidebar({ role }: { role: DemoRole }) {
  const [collapsed, setCollapsed] = useState(false)
  const [kitchenOpen, setKitchenOpen] = useState(role === 'kitchen')
  const pathname = usePathname()
  const realRole = realRoleOf(role)

  const visibleItems = DEMO_NAV_ITEMS.filter(item => item.roles.includes(realRole))
  const showKitchen = ['admin', 'cocina'].includes(realRole)
  const isKitchenActive = pathname.startsWith('/demo/kitchen')

  const itemClasses = (active: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full',
      active
        ? 'border-l-2 border-l-[#FACC15] bg-[#FACC15]/10 text-yellow-400 font-semibold pl-[10px]'
        : 'text-stone-400 hover:bg-white/5 hover:text-stone-200 border-l-2 border-l-transparent',
      collapsed && 'justify-center px-2 border-l-0 pl-2',
    )

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen border-r transition-all duration-300 sticky top-0 bg-[#1C1917]',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/10 gap-3', collapsed && 'justify-center px-2')}>
        <DemoBrand size={32} showName={!collapsed} nameClassName="text-white text-base leading-tight" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        <ul className="space-y-1">
          {visibleItems.map(({ href, label, iconSrc, demoHref }) => {
            const active = demoHref ? pathname === demoHref : false
            const icon = (
              <Icons8Image src={iconSrc} alt={label} size={20} className={cn('flex-shrink-0', !active && 'opacity-70')} />
            )
            if (demoHref) {
              return (
                <li key={href}>
                  <Link href={demoHref} title={collapsed ? label : undefined} className={itemClasses(active)}>
                    {icon}
                    {!collapsed && <span>{label}</span>}
                    {active && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FACC15]" />}
                  </Link>
                </li>
              )
            }
            return (
              <li key={href}>
                <button
                  type="button"
                  title={collapsed ? label : undefined}
                  onClick={() => notifyDemoBlocked(`"${label}" está disponible en la versión completa.`)}
                  className={cn(itemClasses(false), 'opacity-90')}
                >
                  {icon}
                  {!collapsed && <span>{label}</span>}
                </button>
              </li>
            )
          })}

          {/* Cocina — expandible (igual que el real) */}
          {showKitchen && (
            <li>
              <button
                onClick={() => setKitchenOpen(o => !o)}
                title={collapsed ? 'Cocina' : undefined}
                className={itemClasses(isKitchenActive)}
              >
                <Icons8Image src={ICONS8.kitchen} alt="Cocina" size={20} className={cn('flex-shrink-0', !isKitchenActive && 'opacity-70')} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Cocina</span>
                    {kitchenOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </>
                )}
              </button>

              {kitchenOpen && !collapsed && (
                <ul className="ml-8 mt-1 space-y-0.5">
                  {DEMO_KITCHEN_SUBS.map(sub => {
                    const active = sub.demoHref ? pathname === sub.demoHref : false
                    const cls = cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full',
                      active ? 'bg-[#FACC15]/10 text-yellow-400' : 'text-stone-500 hover:text-stone-200 hover:bg-white/5',
                    )
                    return (
                      <li key={sub.href}>
                        {sub.demoHref ? (
                          <Link href={sub.demoHref} className={cls}>
                            <span>{sub.emoji}</span>
                            <span>{sub.label}</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => notifyDemoBlocked(`"${sub.label}" está disponible en la versión completa.`)}
                            className={cls}
                          >
                            <span>{sub.emoji}</span>
                            <span>{sub.label}</span>
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors text-stone-400 hover:text-stone-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <span className="flex items-center gap-2 text-xs">
              <ChevronLeft className="h-4 w-4" />
              Colapsar
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
