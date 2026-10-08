'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronDown, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/authStore'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { ICONS8 } from '@/lib/constants/icons'

const topNavItems = [
  { href: '/',         label: 'Dashboard',    iconSrc: ICONS8.dashboard,  roles: ['admin'] },
  { href: '/orders',   label: 'Pedidos',      iconSrc: ICONS8.orders,     roles: ['admin', 'mesero'] },
  { href: '/tables',   label: 'Mesas',        iconSrc: ICONS8.tables,     roles: ['admin', 'mesero'] },
  { href: '/deliveries',label: 'Domicilios',  iconSrc: ICONS8.delivery,   roles: ['admin', 'mesero'] },
  { href: '/reservations',label: 'Reservas',  iconSrc: ICONS8.reservations, roles: ['admin', 'mesero'] },
  { href: '/customers',label: 'Clientes',     iconSrc: ICONS8.customers,  roles: ['admin', 'mesero'] },
  { href: '/menu',     label: 'Carta / Menú', iconSrc: ICONS8.menu,       roles: ['admin'] },
  { href: '/carta-digital', label: 'Carta QR', iconSrc: ICONS8.carta,    roles: ['admin', 'mesero'] },
  { href: '/modifiers',label: 'Modificadores',iconSrc: ICONS8.modifiers,  roles: ['admin'] },
  { href: '/cash',     label: 'Caja',         iconSrc: ICONS8.payment,    roles: ['admin', 'mesero'] },
  { href: '/inventory',label: 'Inventario',   iconSrc: ICONS8.inventory,  roles: ['admin'] },
  { href: '/promotions',label: 'Promociones', iconSrc: ICONS8.cartaPromos, roles: ['admin'] },
  { href: '/sales',    label: 'Ventas',       iconSrc: ICONS8.sales,      roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios',     iconSrc: ICONS8.staff,      roles: ['admin'] },
  { href: '/devices',  label: 'Dispositivos', iconSrc: ICONS8.device,     roles: ['admin'] },
  { href: '/billing',  label: 'Mi Suscripción',iconSrc: ICONS8.subscription, roles: ['admin'] },
  { href: '/ticket',   label: 'Ticket',       iconSrc: ICONS8.receipt,    roles: ['admin'] },
  { href: '/settings', label: 'Ajustes',      iconSrc: ICONS8.settings,   roles: ['admin'] },
]

const kitchenSubItems = [
  { href: '/kitchen',      label: 'Vista completa', emoji: '📊' },
  { href: '/kitchen/hot',  label: 'Est. Caliente',  emoji: '🔥' },
  { href: '/kitchen/cold', label: 'Est. Fría/Bar',  emoji: '🧊' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [kitchenOpen, setKitchenOpen] = useState(false)
  const pathname = usePathname()
  const user = useAuthStore(s => s.user)
  const role = user?.role ?? 'mesero'
  const station = user?.station

  // Subitems visibles según station del usuario cocina
  const visibleKitchenSubs = kitchenSubItems.filter(item => {
    if (role !== 'cocina') return true // admin ve todos
    if (station === 'hot')  return item.href !== '/kitchen/cold'
    if (station === 'cold') return item.href !== '/kitchen/hot'
    return true // 'both' o null → todos
  })

  const isKitchenActive = pathname.startsWith('/kitchen')

  const visibleItems = topNavItems.filter(item => item.roles.includes(role))
  const showKitchen  = ['admin', 'cocina'].includes(role)

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen border-r transition-all duration-300 sticky top-0 bg-[#1C1917]',
      collapsed ? 'w-16' : 'w-60',
    )}>
      {/* Brand */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-white/10 gap-3',
        collapsed && 'justify-center px-2',
      )}>
        <BrandLogo
          size={32}
          showName={!collapsed}
          invertFallback
          nameClassName="text-white text-base leading-tight"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        <ul className="space-y-1">
          {visibleItems.map(({ href, label, iconSrc }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors overflow-hidden group',
                    active ? 'text-[#E85D04] font-semibold' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-lg bg-[#E85D04]/10 border-l-2 border-l-[#E85D04]"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <Icons8Image
                    src={iconSrc}
                    alt={label}
                    size={20}
                    className={cn(
                      'relative z-10 flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
                      !active && 'opacity-70',
                    )}
                  />
                  {!collapsed && <span className="relative z-10">{label}</span>}
                  {active && !collapsed && (
                    <motion.span
                      layout
                      className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-[#E85D04]"
                    />
                  )}
                </Link>
              </li>
            )
          })}

          {/* Kitchen — expandible */}
          {showKitchen && (
            <li>
              <button
                onClick={() => setKitchenOpen(o => !o)}
                title={collapsed ? 'Cocina' : undefined}
                className={cn(
                  'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors overflow-hidden group',
                  isKitchenActive ? 'text-[#E85D04] font-semibold' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200',
                  collapsed && 'justify-center px-2',
                )}
              >
                {isKitchenActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-[#E85D04]/10 border-l-2 border-l-[#E85D04]"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <Icons8Image
                  src={ICONS8.kitchen}
                  alt="Cocina"
                  size={20}
                  className={cn(
                    'relative z-10 flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
                    !isKitchenActive && 'opacity-70',
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="relative z-10 flex-1 text-left">Cocina</span>
                    <motion.span
                      className="relative z-10"
                      animate={{ rotate: kitchenOpen ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.span>
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {kitchenOpen && !collapsed && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="ml-8 mt-1 space-y-0.5 overflow-hidden"
                  >
                    {visibleKitchenSubs.map(sub => {
                      const active = sub.href === '/kitchen' ? pathname === '/kitchen' : pathname === sub.href
                      return (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                              active
                                ? 'bg-[#E85D04]/10 text-[#E85D04]'
                                : 'text-stone-500 hover:text-stone-200 hover:bg-white/5',
                            )}
                          >
                            <span>{sub.emoji}</span>
                            <span>{sub.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          )}
        </ul>
      </nav>

      {/* Centro de Ayuda — visible para todos los roles */}
      <div className="px-2 pb-1">
        <Link
          href="/help"
          title={collapsed ? 'Centro de Ayuda' : undefined}
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors overflow-hidden group',
            pathname.startsWith('/help') ? 'text-[#E85D04] font-semibold' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200',
            collapsed && 'justify-center px-2',
          )}
        >
          {pathname.startsWith('/help') && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-lg bg-[#E85D04]/10 border-l-2 border-l-[#E85D04]"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <LifeBuoy className={cn(
            'relative z-10 h-5 w-5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
            !pathname.startsWith('/help') && 'opacity-70',
          )} />
          {!collapsed && <span className="relative z-10">Centro de Ayuda</span>}
        </Link>
      </div>

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
