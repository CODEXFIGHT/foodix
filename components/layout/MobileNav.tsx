'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BookOpen,
  QrCode,
  Users2,
  ChefHat,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/authStore'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

const allTabs = [
  { href: '/',             label: 'Dashboard', icon: LayoutDashboard,  roles: ['admin'] },
  { href: '/orders',       label: 'Pedidos',   icon: ShoppingBag,      roles: ['admin', 'mesero'] },
  { href: '/tables',       label: 'Mesas',     icon: UtensilsCrossed,  roles: ['admin', 'mesero'] },
  { href: '/carta-digital',label: 'Carta QR',  icon: QrCode,           roles: ['admin', 'mesero'] },
  { href: '/menu',         label: 'Menú',      icon: BookOpen,         roles: ['admin'] },
  { href: '/usuarios',     label: 'Usuarios',  icon: Users2,           roles: ['admin'] },
  { href: '/kitchen',      label: 'Cocina',    icon: ChefHat,          roles: ['admin', 'cocina'] },
]

interface MenuItem {
  href: string
  label: string
  iconSrc: string
  roles: string[]
}

const baseMenuItems: MenuItem[] = [
  { href: '/',           label: 'Dashboard',      iconSrc: ICONS8.dashboard,    roles: ['admin'] },
  { href: '/orders',     label: 'Pedidos',        iconSrc: ICONS8.orders,       roles: ['admin', 'mesero'] },
  { href: '/tables',     label: 'Mesas',          iconSrc: ICONS8.tables,       roles: ['admin', 'mesero'] },
  { href: '/deliveries', label: 'Domicilios',     iconSrc: ICONS8.delivery,     roles: ['admin', 'mesero'] },
  { href: '/reservations',label: 'Reservas',      iconSrc: ICONS8.reservations, roles: ['admin', 'mesero'] },
  { href: '/customers',  label: 'Clientes',       iconSrc: ICONS8.customers,    roles: ['admin', 'mesero'] },
  { href: '/menu',       label: 'Carta / Menú',   iconSrc: ICONS8.menu,         roles: ['admin'] },
  { href: '/carta-digital', label: 'Carta QR',    iconSrc: ICONS8.carta,        roles: ['admin', 'mesero'] },
  { href: '/modifiers',  label: 'Modificadores',  iconSrc: ICONS8.modifiers,    roles: ['admin'] },
  { href: '/cash',       label: 'Caja',           iconSrc: ICONS8.payment,      roles: ['admin', 'mesero'] },
  { href: '/inventory',  label: 'Inventario',     iconSrc: ICONS8.inventory,    roles: ['admin'] },
  { href: '/promotions', label: 'Promociones',    iconSrc: ICONS8.cartaPromos,  roles: ['admin'] },
  { href: '/sales',      label: 'Ventas',         iconSrc: ICONS8.sales,        roles: ['admin'] },
  { href: '/usuarios',   label: 'Usuarios',       iconSrc: ICONS8.staff,        roles: ['admin'] },
  { href: '/devices',    label: 'Dispositivos',   iconSrc: ICONS8.device,       roles: ['admin'] },
  { href: '/billing',    label: 'Mi Suscripción', iconSrc: ICONS8.subscription, roles: ['admin'] },
  { href: '/ticket',     label: 'Ticket',         iconSrc: ICONS8.receipt,      roles: ['admin'] },
  { href: '/settings',   label: 'Ajustes',        iconSrc: ICONS8.settings,     roles: ['admin'] },
]

export function MobileNav() {
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const role = user?.role ?? 'mesero'
  const [modalOpen, setModalOpen] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filter tabs visible on bottom bar by active user role
  const visibleTabs = allTabs.filter(t => t.roles.includes(role))

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkScroll = () => {
      setShowLeftFade(el.scrollLeft > 2)
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    }

    checkScroll()
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    const t = setTimeout(checkScroll, 100)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      clearTimeout(t)
    }
  }, [visibleTabs])

  // Determine active states
  const isTabActive = (href: string) => {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }
  const anyTabActive = visibleTabs.some(t => isTabActive(t.href))
  const isMoreActive = !anyTabActive || modalOpen

  // Compute full set of menu items for the modal grid
  const getModalItems = () => {
    const items = baseMenuItems.filter(item => item.roles.includes(role))

    if (role === 'admin' || role === 'cocina') {
      const station = user?.station

      // Complete Kitchen view
      items.push({
        href: '/kitchen',
        label: 'Cocina (Gral)',
        iconSrc: ICONS8.kitchen,
        roles: ['admin', 'cocina']
      })

      // Hot Station
      if (role === 'admin' || station !== 'cold') {
        items.push({
          href: '/kitchen/hot',
          label: 'Est. Caliente',
          iconSrc: ICONS8.stationHot,
          roles: ['admin', 'cocina']
        })
      }

      // Cold Station
      if (role === 'admin' || station !== 'hot') {
        items.push({
          href: '/kitchen/cold',
          label: 'Est. Fría/Bar',
          iconSrc: ICONS8.stationCold,
          roles: ['admin', 'cocina']
        })
      }
    }

    return items
  }

  const modalItems = getModalItems()

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-inset-bottom shadow-lg">
        {/* Indicadores desvanecedores de scroll en las orillas (izq / der) */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent pointer-events-none z-10 transition-opacity duration-300",
            showLeftFade ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 transition-opacity duration-300",
            showRightFade ? "opacity-100" : "opacity-0"
          )}
        />

        <div ref={scrollRef} className="flex items-center overflow-x-auto scrollbar-none flex-nowrap px-2">
          {visibleTabs.map(({ href, label, icon: Icon }) => {
            const active = isTabActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-shrink-0 min-w-[76px] flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative',
                  active ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] mt-0.5" />}
              </Link>
            )
          })}

          {/* More / Más Tab */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              'flex-shrink-0 min-w-[76px] flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative',
              isMoreActive ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground',
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Más</span>
            {isMoreActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] mt-0.5" />}
          </button>
        </div>
      </nav>

      {/* Full Responsive Menu Modal */}
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
            {modalItems.map(({ href, label, iconSrc }) => {
              const active = isTabActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setModalOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 text-center gap-1.5 cursor-pointer",
                    active
                      ? "border-[#EAB308]/50 shadow-[0_0_12px_rgba(250,204,21,0.15)] text-yellow-400 bg-[#FACC15]/5 font-semibold"
                      : "border-white/5 bg-stone-900/40 hover:bg-stone-800/80 text-stone-300"
                  )}
                >
                  <Icons8Image
                    src={iconSrc}
                    alt={label}
                    size={32}
                    className={cn("transition-transform duration-200", active ? "scale-105" : "opacity-80")}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-2">{label}</span>
                </Link>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
