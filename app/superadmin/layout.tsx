'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/authStore'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { PageLoader, AuthOverlay } from '@/components/shared/LoadingSpinner'
import { PageTransition } from '@/components/shared/PageTransition'
import { PosAccessibilityBridge } from '@/components/layout/PosAccessibilityBridge'
import { cn } from '@/lib/utils/cn'
import { MoreHorizontal, X, MessageCircle } from 'lucide-react'

const navItems: { href: string; label: string; icon: string; badge?: string }[] = [
  { href: '/superadmin',               label: 'Resumen',       icon: ICONS8.saDashboard },
  { href: '/superadmin/branches',      label: 'Sucursales',    icon: ICONS8.saBranch },
  { href: '/superadmin/devices',       label: 'Dispositivos',  icon: ICONS8.saDevice },
  { href: '/superadmin/device-center', label: 'Device Center', icon: ICONS8.saMultiDevice },
  { href: '/superadmin/ticket-preview',label: 'Ticket',        icon: ICONS8.saReceipt },
  { href: '/superadmin/subscriptions', label: 'Suscripciones', icon: ICONS8.saSubscription },
  { href: '/superadmin/trials',        label: 'Trials',        icon: ICONS8.saTrial },
  { href: '/superadmin/leads',         label: 'Contacto',      icon: ICONS8.saLeads },
  { href: '/superadmin/whatsapp',      label: 'WhatsApp',      icon: ICONS8.saLeads, badge: 'Pro' },
]

const PAGE_TITLES: { match: (p: string) => boolean; label: string }[] = [
  { match: p => p === '/superadmin', label: 'Resumen' },
  { match: p => p.startsWith('/superadmin/branches'), label: 'Sucursales' },
  { match: p => p.startsWith('/superadmin/device-center'), label: 'Device Center' },
  { match: p => p.startsWith('/superadmin/ticket-preview'), label: 'Vista previa del ticket' },
  { match: p => p.startsWith('/superadmin/devices'), label: 'Dispositivos' },
  { match: p => p.startsWith('/superadmin/subscriptions'), label: 'Suscripciones' },
  { match: p => p.startsWith('/superadmin/trials'), label: 'Trials' },
  { match: p => p.startsWith('/superadmin/leads'), label: 'Contacto' },
]

const isActive = (pathname: string, href: string) =>
  href === '/superadmin' ? pathname === '/superadmin' : pathname.startsWith(href)

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const checkSession = useAuthStore(s => s.checkSession)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!hasHydrated) return
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'superadmin') { router.replace('/'); return }
  }, [user, hasHydrated, router])

  if (!hasHydrated || !user) return <PageLoader />
  if (user.role !== 'superadmin') return <PageLoader />

  return <>{children}</>
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <ul className="space-y-0.5">
      {navItems.map(({ href, label, icon, badge }) => {
        const active = isActive(pathname, href)
        const isWA = href.includes('whatsapp')
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium transition-colors',
                active
                  ? isWA ? 'bg-[#25D366]/15 text-[#25D366]' : 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-white',
              )}
            >
              {isWA ? (
                <MessageCircle className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#25D366]' : 'opacity-50')} />
              ) : (
                <Icons8Image src={icon} alt={label} size={18} className={cn('brightness-0 invert', !active && 'opacity-50')} />
              )}
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase tracking-wide">
                  {badge}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function UserFooter({ onLogoutStart }: { onLogoutStart: () => void }) {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const router = useRouter()
  const handleLogout = async () => {
    onLogoutStart()
    await logout()
    router.push('/login')
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
        {(user?.name ?? 'SA').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user?.name ?? 'Super Admin'}</p>
        <p className="truncate text-xs text-neutral-500">{user?.email ?? 'superadmin'}</p>
      </div>
      <button
        onClick={handleLogout}
        aria-label="Cerrar sesión"
        className="flex-shrink-0 rounded-md p-2 text-neutral-400 transition-colors hover:bg-white/5 hover:text-red-400 flex items-center justify-center"
      >
        <Icons8Image src={ICONS8.saLogout} alt="Cerrar sesión" size={16} className="brightness-0 invert opacity-50 hover:opacity-100 transition-opacity" />
      </button>
    </div>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/10">
      <Image
        src="/brand/foodix-icon.svg"
        alt="FoodIX"
        width={26}
        height={26}
        unoptimized
        className="rounded-lg flex-shrink-0 shadow-sm"
      />
      <div className="flex flex-col leading-none">
        <span className="text-white font-semibold text-sm tracking-tight">
          FoodIX<sup className="text-[0.55em] align-super">©</sup>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Super Admin</span>
      </div>
    </div>
  )
}

function SuperAdminSidebar({ onLogoutStart }: { onLogoutStart: () => void }) {
  return (
    <aside className="hidden lg:flex flex-col w-60 h-dvh bg-black border-r border-white/10 sticky top-0">
      <BrandHeader />
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        <NavLinks />
      </nav>
      <div className="p-3 border-t border-white/10">
        <UserFooter onLogoutStart={onLogoutStart} />
      </div>
    </aside>
  )
}

/** Barra inferior de navegación (móvil): ítems del menú + cerrar sesión. */
function MobileBottomNav({ onLogoutStart }: { onLogoutStart: () => void }) {
  const pathname = usePathname()
  const logout = useAuthStore(s => s.logout)
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)

  const handleLogout = async () => {
    onLogoutStart()
    await logout()
    router.push('/login')
  }

  const itemCls = (active: boolean) =>
    cn(
      'flex-1 flex flex-col items-center justify-center min-w-0 transition-colors relative',
      active ? 'text-[#E85D04]' : 'text-neutral-500 hover:text-neutral-300',
    )

  const moreItems = [
    { href: '/superadmin/ticket-preview', label: 'Ticket',         icon: ICONS8.saReceipt,      wa: false },
    { href: '/superadmin/subscriptions',  label: 'Suscripciones',  icon: ICONS8.saSubscription, wa: false },
    { href: '/superadmin/trials',         label: 'Trials',         icon: ICONS8.saTrial,        wa: false },
    { href: '/superadmin/leads',          label: 'Contacto',       icon: ICONS8.saLeads,        wa: false },
    { href: '/superadmin/whatsapp',       label: 'WhatsApp',       icon: ICONS8.saLeads,        wa: true  },
  ]

  const isMoreActive = moreItems.some(({ href }) => isActive(pathname, href))

  return (
    <>
      {/* Overlay Background */}
      {showMore && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Drawer Menu */}
      <div 
        className={cn(
          'lg:hidden fixed bottom-[57px] inset-x-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 rounded-t-2xl p-4 transition-transform duration-300 ease-out transform',
          showMore ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <span className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Menú Adicional</span>
          <button 
            onClick={() => setShowMore(false)}
            className="p-1 rounded-full bg-white/5 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {moreItems.map(({ href, label, icon, wa }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all border',
                  active && wa ? 'bg-[#25D366]/15 text-[#25D366] font-medium border-[#25D366]/20'
                  : active ? 'bg-white/10 text-white font-medium border-white/10'
                  : 'text-neutral-400 bg-white/[0.02] border-transparent hover:bg-white/5 hover:text-white'
                )}
              >
                {wa ? (
                  <MessageCircle className={cn('h-5 w-5 shrink-0', active ? 'text-[#25D366]' : 'opacity-50')} />
                ) : (
                  <Icons8Image src={icon} alt={label} size={20} className="brightness-0 invert opacity-80" />
                )}
                <span className="text-sm">{label}</span>
                {wa && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase tracking-wide">
                    Pro
                  </span>
                )}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E85D04]" />}
              </Link>
            )
          })}
          
          <button 
            onClick={() => {
              setShowMore(false)
              handleLogout()
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/10 transition-all text-left mt-2"
          >
            <Icons8Image src={ICONS8.saLogout} alt="Salir" size={20} className="brightness-0 invert sepia hue-rotate-[320deg] saturate-[5] opacity-80" />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Main Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-black/95 backdrop-blur border-t border-white/10 safe-area-inset-bottom">
        <div className="flex items-stretch h-14">
          {navItems.slice(0, 4).map(({ href, label, icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link key={href} href={href} className={itemCls(active)}>
                <Icons8Image src={icon} alt={label} size={18} className={cn('brightness-0 invert', !active && 'opacity-50')} />
                <span className="text-[10px] font-medium leading-none w-full truncate text-center px-0.5 mt-1">{label}</span>
                {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#E85D04]" />}
              </Link>
            )
          })}
          
          <button 
            onClick={() => setShowMore(!showMore)}
            className={itemCls(isMoreActive || showMore)}
          >
            <MoreHorizontal className={cn("h-[18px] w-[18px]", isMoreActive || showMore ? "text-[#E85D04]" : "text-neutral-500")} />
            <span className="text-[10px] font-medium leading-none mt-1">Más</span>
            {(isMoreActive || showMore) && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#E85D04]" />}
          </button>
        </div>
      </nav>
    </>
  )
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = PAGE_TITLES.find(t => t.match(pathname))?.label ?? 'Panel'
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  return (
    <SuperAdminGuard>
      <PosAccessibilityBridge>
        <div className="flex h-dvh overflow-hidden bg-black text-white">
          <SuperAdminSidebar onLogoutStart={() => setIsLoggingOut(true)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-14 flex-shrink-0 sticky top-0 z-30 border-b border-white/10 flex items-center px-4 lg:px-6 gap-3 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo oficial de FoodIX */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Image
                  src="/brand/foodix-icon.svg"
                  alt="FoodIX"
                  width={24}
                  height={24}
                  unoptimized
                  className="rounded-lg flex-shrink-0 shadow-sm"
                />
                <span className="text-white font-semibold text-sm tracking-tight hidden min-[360px]:inline-block animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
                  Food<span className="text-[#E85D04]">IX</span>
                  <sup className="text-[0.55em] align-super">©</sup>
                </span>
              </div>

              {/* Separador */}
              <span className="text-white/20 text-sm select-none">/</span>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-neutral-500 text-sm hidden sm:inline">Panel</span>
                <span className="text-neutral-700 hidden sm:inline">/</span>
                <span className="text-white text-sm font-medium truncate">{pageTitle}</span>
              </div>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              Operativo
            </span>
            </header>
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
          <MobileBottomNav onLogoutStart={() => setIsLoggingOut(true)} />
        </div>
        {isLoggingOut && <AuthOverlay message="Cerrando sesión..." />}
      </PosAccessibilityBridge>
    </SuperAdminGuard>
  )
}
