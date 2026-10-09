/**
 * FoodIX — Modo Demo
 * Barra de navegación inferior móvil del shell demo + modal "Más". Replica el
 * MobileNav real; los ítems con equivalente demo navegan y el resto avisan que
 * están deshabilitados en modo demo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icons8Image } from '@/components/shared/Icons8Image'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { notifyDemoBlocked } from '@/components/demo/DemoModeGuard'
import { DEMO_MOBILE_TABS, DEMO_NAV_ITEMS, realRoleOf } from './demoNav'
import type { DemoRole } from '@/lib/demo/demo-types'

export function DemoMobileNav({ role }: { role: DemoRole }) {
  const pathname = usePathname()
  const realRole = realRoleOf(role)
  const [modalOpen, setModalOpen] = useState(false)

  const visibleTabs = DEMO_MOBILE_TABS.filter(t => t.roles.includes(realRole))
  const modalItems = DEMO_NAV_ITEMS.filter(i => i.roles.includes(realRole))

  const isActive = (demoHref?: string) => !!demoHref && pathname === demoHref
  const anyTabActive = visibleTabs.some(t => isActive(t.demoHref))
  const isMoreActive = !anyTabActive || modalOpen

  const tabClasses = (active: boolean) =>
    cn(
      'flex-shrink-0 min-w-[76px] flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative',
      active ? 'text-yellow-400' : 'text-muted-foreground',
    )

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-inset-bottom shadow-lg">
        <div className="flex items-center overflow-x-auto scrollbar-none flex-nowrap px-2">
          {visibleTabs.map(({ href, label, iconSrc, demoHref }) => {
            const active = isActive(demoHref)
            const inner = (
              <>
                <Icons8Image src={iconSrc} alt={label} size={20} className={cn(!active && 'opacity-70')} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] mt-0.5" />}
              </>
            )
            return demoHref ? (
              <Link key={href} href={demoHref} className={tabClasses(active)}>{inner}</Link>
            ) : (
              <button
                key={href}
                type="button"
                onClick={() => notifyDemoBlocked(`"${label}" está disponible en la versión completa.`)}
                className={tabClasses(false)}
              >
                {inner}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={tabClasses(isMoreActive)}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Más</span>
            {isMoreActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] mt-0.5" />}
          </button>
        </div>
      </nav>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0c0a09]/95 backdrop-blur-md border-white/10 text-white max-h-[85vh] overflow-y-auto scrollbar-thin">
          <DialogHeader className="pb-4 border-b border-white/5">
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2 font-heading">
              <Menu className="h-5 w-5 text-yellow-400" />
              Menú completo
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-xs">
              Accede a todas las secciones de FoodIX
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-4">
            {modalItems.map(({ href, label, iconSrc, demoHref }) => {
              const active = isActive(demoHref)
              const cls = cn(
                'flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 text-center gap-1.5 cursor-pointer',
                active
                  ? 'border-[#EAB308]/50 shadow-[0_0_12px_rgba(250,204,21,0.15)] text-yellow-400 bg-[#FACC15]/5 font-semibold'
                  : 'border-white/5 bg-stone-900/40 hover:bg-stone-800/80 text-stone-300',
              )
              const inner = (
                <>
                  <Icons8Image src={iconSrc} alt={label} size={32} className={cn('transition-transform duration-200', active ? 'scale-105' : 'opacity-80')} />
                  <span className="text-[10px] font-medium leading-tight line-clamp-2">{label}</span>
                </>
              )
              return demoHref ? (
                <Link key={href} href={demoHref} onClick={() => setModalOpen(false)} className={cls}>{inner}</Link>
              ) : (
                <button
                  key={href}
                  type="button"
                  onClick={() => notifyDemoBlocked(`"${label}" está disponible en la versión completa.`)}
                  className={cls}
                >
                  {inner}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
