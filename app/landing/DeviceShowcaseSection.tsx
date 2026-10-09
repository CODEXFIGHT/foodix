'use client'

/**
 * DeviceShowcaseSection — Sección de screenshots reales de FoodIX
 * dentro de mockups de dispositivos (MacBook Air, iPhone, Android Tablet).
 *
 * Incluye un carrusel Swiper con autoplay, tabs por rol (Admin, Mesero, Cocina)
 * y animaciones de entrada con IntersectionObserver.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Monitor, Pause, Play, Smartphone, Tablet, Printer } from 'lucide-react'
import { Autoplay } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'

/* ═══════════════════════════ Tipos ═══════════════════════════ */

type DeviceType = 'macbook' | 'iphone' | 'tablet' | 'pos'
type RoleKey = 'admin' | 'mesero' | 'cocina' | 'pos' | 'all'

interface ScreenItem {
  key: string
  role: RoleKey
  device: DeviceType
  src: string
  alt: string
  title: string
  desc: string
}

const AUTOPLAY_MS = 4600

/* ═══════════════════════════ Data ═══════════════════════════ */

const SCREENS: ScreenItem[] = [
  {
    key: 'admin-dashboard',
    role: 'admin',
    device: 'macbook',
    src: '/assets/screenshots/admin-dashboard-desktop.png',
    alt: 'Panel de administración de FoodIX en MacBook Air',
    title: 'Panel de administración',
    desc: 'Ventas del día, órdenes activas, ocupación y resumen operativo en una sola vista.',
  },
  {
    key: 'admin-menu',
    role: 'admin',
    device: 'macbook',
    src: '/assets/screenshots/admin-menu-desktop.png',
    alt: 'Gestión de carta y productos de FoodIX en desktop web',
    title: 'Carta y productos',
    desc: 'Alta y edición de productos con categorías, disponibilidad y control visual del menú.',
  },
  {
    key: 'admin-tables',
    role: 'admin',
    device: 'macbook',
    src: '/assets/screenshots/admin-tables-desktop.png',
    alt: 'Control de mesas de FoodIX en desktop web',
    title: 'Control de mesas',
    desc: 'Estado de cada mesa, ocupación actual y consumo acumulado del salón en tiempo real.',
  },
  {
    key: 'admin-orders',
    role: 'admin',
    device: 'macbook',
    src: '/assets/screenshots/admin-orders-desktop.png',
    alt: 'Órdenes activas de FoodIX en desktop web',
    title: 'Órdenes activas',
    desc: 'Seguimiento inmediato de cada mesa con importe, estatus y detalle de artículos enviados.',
  },
  {
    key: 'waiter-order-desktop',
    role: 'mesero',
    device: 'macbook',
    src: '/assets/screenshots/waiter-order-desktop.png',
    alt: 'Toma de pedido de mesero en desktop web',
    title: 'Mesero en desktop web',
    desc: 'Selección de mesa, menú por categorías y cuenta actual lista para enviar a cocina.',
  },
  {
    key: 'waiter-order-mobile',
    role: 'mesero',
    device: 'iphone',
    src: '/assets/screenshots/waiter-order-mobile.png',
    alt: 'Toma de pedido del mesero en iPhone',
    title: 'Mesero en móvil',
    desc: 'La misma operación del mesero adaptada al celular: rápida, clara y lista para trabajar en piso.',
  },
  {
    key: 'waiter-ticket-mobile',
    role: 'mesero',
    device: 'iphone',
    src: '/assets/screenshots/waiter-ticket-mobile.png',
    alt: 'Cuenta actual del mesero en iPhone',
    title: 'Cuenta y envío',
    desc: 'Resumen del pedido, total, IVA y acciones de envío o cobro desde el teléfono.',
  },
  {
    key: 'waiter-qrmenu',
    role: 'mesero',
    device: 'iphone',
    src: '/assets/screenshots/menu-qr-mobile.png',
    alt: 'Carta digital QR de FoodIX en iPhone',
    title: 'Carta digital QR',
    desc: 'El cliente escanea el código y revisa la carta real desde su celular sin instalar nada.',
  },
  {
    key: 'kitchen-kds',
    role: 'cocina',
    device: 'tablet',
    src: '/assets/screenshots/kitchen-kds-tablet.png',
    alt: 'Cocina KDS de FoodIX en tablet Android',
    title: 'Cocina KDS',
    desc: 'Vista de producción en tiempo real con tickets por estación, temporizadores y acciones de avance.',
  },
  {
    key: 'pos-splash',
    role: 'pos',
    device: 'pos',
    src: '/assets/screenshots/pos-splash.png',
    alt: 'Pantalla de carga (Splash) de FoodIX POS',
    title: 'Carga instantánea de Caja',
    desc: 'Carga ultrarrápida y sincronización de datos con el servidor local para operaciones offline.',
  },
  {
    key: 'pos-login',
    role: 'pos',
    device: 'pos',
    src: '/assets/screenshots/pos-login.png',
    alt: 'Pantalla de inicio de sesión de FoodIX POS',
    title: 'Seguridad en Caja',
    desc: 'Acceso seguro para cajeros y meseros con clave PIN en terminales táctiles.',
  },
  {
    key: 'pos-connection',
    role: 'pos',
    device: 'pos',
    src: '/assets/screenshots/pos-connection.png',
    alt: 'Historial de conexión y diagnóstico del POS',
    title: 'Historial de conexión',
    desc: 'Monitoreo de estado de impresoras USB y conectividad directa con el servidor local.',
  },
  {
    key: 'pos-settings',
    role: 'pos',
    device: 'pos',
    src: '/assets/screenshots/pos-settings.png',
    alt: 'Pantalla de configuración del POS',
    title: 'Configuración local',
    desc: 'Vinculación de impresoras térmicas USB/ESC-POS, cajón de dinero y asignación de estación.',
  },
  {
    key: 'pos-printer',
    role: 'pos',
    device: 'pos',
    src: '/assets/screenshots/pos-printer.png',
    alt: 'Detección de impresoras térmicas',
    title: 'Detección de Impresora',
    desc: 'Detección automática de hardware térmico USB OTG para impresión instantánea de comandas y tickets.',
  },
]

const ROLES: { key: RoleKey; label: string; icon: typeof Monitor }[] = [
  { key: 'all', label: 'Todos', icon: Monitor },
  { key: 'admin', label: 'Admin', icon: Monitor },
  { key: 'mesero', label: 'Mesero', icon: Smartphone },
  { key: 'cocina', label: 'Cocina', icon: Tablet },
  { key: 'pos', label: 'POS Android', icon: Printer },
]

const ROLE_COPY: Record<RoleKey, { eyebrow: string; summary: string }> = {
  all: {
    eyebrow: 'Vista completa',
    summary: 'Admin, mesero, cocina y caja conviven en una misma operación conectada.',
  },
  admin: {
    eyebrow: 'Operación administrativa',
    summary: 'Control del restaurante desde desktop con foco en visibilidad y gestión.',
  },
  mesero: {
    eyebrow: 'Servicio en piso',
    summary: 'Captura, seguimiento y cobro con una UI rápida en web y móvil.',
  },
  cocina: {
    eyebrow: 'Producción en cocina',
    summary: 'Flujo KDS claro para avanzar tickets sin perder tiempos ni contexto.',
  },
  pos: {
    eyebrow: 'Caja y Punto de Venta',
    summary: 'FoodIX POS diseñado para terminales de caja touch con impresora de tickets integrada.',
  },
}

/* ═══════════════════════════ Device Frames ═══════════════════════════ */

function MacBookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      {/* Cuerpo del laptop */}
      <div className="relative rounded-t-[12px] border-[10px] border-stone-800 bg-stone-900 shadow-2xl shadow-stone-400/30 dark:border-white/15 dark:shadow-black/50">
        {/* Cámara */}
        <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 h-[4px] w-[4px] rounded-full bg-stone-700" />
        {/* Pantalla */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[2px] bg-stone-100">
          {children}
        </div>
      </div>
      {/* Base del laptop */}
      <div className="relative mx-auto">
        <div className="mx-auto h-[14px] rounded-b-md bg-gradient-to-b from-stone-700 to-stone-800" style={{ width: '75%' }} />
        <div className="mx-auto h-[4px] rounded-b-lg bg-stone-600" style={{ width: '85%' }} />
      </div>
    </div>
  )
}

function IPhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[220px] sm:w-[260px]">
      <div className="rounded-[36px] border-[6px] border-stone-800 bg-stone-900 p-[2px] shadow-2xl shadow-stone-400/30 dark:border-white/15 dark:shadow-black/50">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-[10px] -translate-x-1/2 z-10 h-[14px] w-[70px] rounded-full bg-stone-900" />
        {/* Pantalla */}
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[30px] bg-white">
          {children}
        </div>
      </div>
      {/* Side buttons */}
      <div className="absolute -left-[8px] top-[60px] h-[20px] w-[3px] rounded-l-sm bg-stone-700" />
      <div className="absolute -left-[8px] top-[90px] h-[30px] w-[3px] rounded-l-sm bg-stone-700" />
      <div className="absolute -left-[8px] top-[126px] h-[30px] w-[3px] rounded-l-sm bg-stone-700" />
      <div className="absolute -right-[8px] top-[80px] h-[40px] w-[3px] rounded-r-sm bg-stone-700" />
    </div>
  )
}

function TabletFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div className="rounded-[20px] border-[8px] border-stone-800 bg-stone-900 p-[2px] shadow-2xl shadow-stone-400/30 dark:border-white/15 dark:shadow-black/50">
        {/* Cámara frontal */}
        <div className="absolute left-1/2 top-[4px] -translate-x-1/2 h-[4px] w-[4px] rounded-full bg-stone-700" />
        {/* Pantalla */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-black">
          {children}
        </div>
      </div>
    </div>
  )
}

function POSFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      {/* Impresora térmica trasera / superior */}
      <div className="relative mx-auto h-[26px] w-[88%] rounded-t-[14px] bg-gradient-to-b from-stone-800 to-stone-700 shadow-md flex items-center justify-center border-t border-stone-600/30">
        <div className="w-[60%] h-[3px] rounded-full bg-stone-950 border-b border-stone-800" />
        <div className="absolute -bottom-[2px] w-[50%] h-[1px] bg-stone-400/40" />
      </div>
      {/* Pantalla del POS */}
      <div className="relative rounded-[16px] border-[8px] border-stone-800 bg-stone-900 p-[1px] shadow-2xl shadow-stone-500/45 dark:border-white/10 dark:shadow-black/70">
        {/* LED de encendido */}
        <div className="absolute top-[4px] left-1/2 -translate-x-1/2 h-[4px] w-[18px] rounded-full bg-stone-800" />
        {/* Pantalla */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[8px] bg-stone-950 border border-stone-850">
          {children}
        </div>
      </div>
      {/* Base / Pie del POS */}
      <div className="relative mx-auto w-[60%] h-[14px] rounded-b-[8px] bg-gradient-to-b from-stone-800 to-stone-900 border-t border-stone-700/50" />
    </div>
  )
}

function DeviceFrame({ device, children }: { device: DeviceType; children: React.ReactNode }) {
  switch (device) {
    case 'macbook': return <MacBookFrame>{children}</MacBookFrame>
    case 'iphone': return <IPhoneFrame>{children}</IPhoneFrame>
    case 'tablet': return <TabletFrame>{children}</TabletFrame>
    case 'pos': return <POSFrame>{children}</POSFrame>
  }
}

/* ═══════════════════════════ Helpers ═══════════════════════════ */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, inView }
}

/* ═══════════════════════════ Component ═══════════════════════════ */

export function DeviceShowcaseSection() {
  const { ref: sectionRef, inView } = useInView(0.08)
  const [activeRole, setActiveRole] = useState<RoleKey>('all')
  const [activeIdx, setActiveIdx] = useState(0)
  const [autoplayEnabled, setAutoplayEnabled] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [progressWidth, setProgressWidth] = useState(0)
  const swiperRef = useRef<SwiperType | null>(null)

  const filtered = activeRole === 'all' ? SCREENS : SCREENS.filter(s => s.role === activeRole)
  const count = filtered.length
  const roleCopy = ROLE_COPY[activeRole]
  const activeRoleIndex = ROLES.findIndex((role) => role.key === activeRole)
  const activeRoleCount = useMemo(() => {
    if (activeRole === 'all') return filtered.length
    return SCREENS.filter((screen) => screen.role === activeRole).length
  }, [activeRole, filtered.length])

  const goto = useCallback((i: number) => {
    if (count === 0) return
    const n = ((i % count) + count) % count
    setActiveIdx(n)
    swiperRef.current?.slideTo(n)
  }, [count])

  useEffect(() => {
    setProgressWidth(0)
    const swiper = swiperRef.current
    if (!swiper || count <= 1) return

    if (autoplayEnabled && !isPaused) {
      swiper.autoplay?.start()
      const frame = window.requestAnimationFrame(() => setProgressWidth(100))
      return () => window.cancelAnimationFrame(frame)
    }

    swiper.autoplay?.stop()
  }, [activeIdx, activeRole, autoplayEnabled, count, isPaused])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleVisibility = () => setIsPaused(document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    handleVisibility()
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Pause on hover
  const pauseAutoplay = () => setIsPaused(true)
  const resumeAutoplay = () => setIsPaused(false)

  // Reset index when filter changes
  useEffect(() => {
    setActiveIdx(0)
    swiperRef.current?.slideTo(0, 0)
  }, [activeRole])

  const currentItem = filtered[activeIdx]

  return (
    <section
      id="screenshots"
      ref={sectionRef}
      className="relative py-20 sm:py-28 scroll-mt-24 overflow-hidden"
      aria-labelledby="screenshots-title"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#D1400F]/5 blur-[120px] dark:bg-[#D1400F]/8" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl dark:bg-amber-500/5" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5">
        {/* Encabezado */}
        <div className={cn(
          'text-center max-w-2xl mx-auto transition-all duration-700 ease-out',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}>
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-50 text-[#D1400F] border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">
            <Monitor className="h-3.5 w-3.5" /> Capturas reales del sistema
          </span>
          <h2
            id="screenshots-title"
            className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-stone-900 dark:text-white"
          >
            Así se ve FoodIX{' '}
            <span className="text-[#D1400F]">en acción</span>
          </h2>
          <p className="mt-4 text-stone-600 dark:text-zinc-400 text-base sm:text-lg leading-relaxed">
            Desde la MacBook del administrador, el celular del mesero y la tablet de cocina.
            Cada pantalla está diseñada para funcionar rápido y sin confusión.
          </p>
        </div>

        {/* Tabs por rol */}
        <div className={cn(
          'flex items-center justify-center gap-2 mt-10 transition-all duration-700 ease-out',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )} style={{ transitionDelay: '120ms' }}>
          {ROLES.map(r => {
            const isActive = activeRole === r.key
            return (
              <button
                key={r.key}
                onClick={() => {
                  setActiveRole(r.key)
                  setIsPaused(false)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 h-10 px-4 sm:px-5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95',
                  isActive
                    ? 'bg-[#D1400F] text-white shadow-md shadow-[#D1400F]/25'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-orange-200 hover:text-[#D1400F] dark:bg-[#161616] dark:border-white/15 dark:text-zinc-300 dark:hover:border-orange-500/40',
                )}
              >
                <r.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Carrusel */}
        <div
          className={cn(
            'relative mt-12 transition-all duration-700 ease-out',
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
          )}
          style={{ transitionDelay: '240ms' }}
          onMouseEnter={pauseAutoplay}
          onMouseLeave={resumeAutoplay}
          onTouchStart={pauseAutoplay}
          onTouchEnd={resumeAutoplay}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-black dark:via-black/90" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-black dark:via-black/90" />

          <Swiper
            modules={[Autoplay]}
            onSwiper={(swiper) => { swiperRef.current = swiper }}
            onSlideChange={(swiper) => setActiveIdx(swiper.activeIndex)}
            onAutoplayTimeLeft={(_, __, progress) => {
              if (!autoplayEnabled || isPaused) return
              setProgressWidth((1 - progress) * 100)
            }}
            autoplay={autoplayEnabled ? {
              delay: AUTOPLAY_MS,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            } : false}
            centeredSlides
            grabCursor
            watchSlidesProgress
            slideToClickedSlide
            speed={700}
            resistanceRatio={0.72}
            spaceBetween={20}
            slidesPerView="auto"
            className="px-[5vw] pb-8 sm:px-[12vw] lg:px-[16vw]"
          >
            {filtered.map((screen, i) => (
              <SwiperSlide
                key={screen.key}
                className={cn(
                  'group relative !h-auto shrink-0 cursor-pointer transition-all duration-500 ease-out',
                  screen.device === 'iphone'
                    ? '!w-[58%] sm:!w-[34%] lg:!w-[28%]'
                    : screen.device === 'tablet' || screen.device === 'pos'
                      ? '!w-[90%] sm:!w-[72%] lg:!w-[60%]'
                      : '!w-[92%] sm:!w-[74%] lg:!w-[62%]',
                  i === activeIdx
                    ? 'opacity-100 scale-100'
                    : 'opacity-35 scale-[0.9] sm:scale-[0.93]',
                )}
              >
                <div className={cn(
                  'absolute inset-x-[10%] bottom-1 h-10 rounded-full blur-2xl transition-all duration-500',
                  i === activeIdx ? 'bg-[#D1400F]/30 opacity-100' : 'bg-stone-300/20 opacity-0',
                )} />
                <DeviceFrame device={screen.device}>
                  <Image
                    src={screen.src}
                    alt={screen.alt}
                    fill
                    sizes="(max-width: 768px) 90vw, (max-width: 1280px) 60vw, 680px"
                    className={cn(
                      'object-cover transition-transform duration-700 ease-out',
                      i === activeIdx ? 'scale-100' : 'scale-[0.985]',
                    )}
                    priority={i === 0}
                  />
                </DeviceFrame>
                <div className={cn(
                  'pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md transition-all duration-300',
                  i === activeIdx
                    ? 'border-white/40 bg-black/55 text-white opacity-100'
                    : 'border-black/5 bg-white/80 text-stone-500 opacity-0 group-hover:opacity-100',
                )}>
                  {screen.device === 'macbook' ? 'Desktop web' : screen.device === 'iphone' ? 'Mobile' : screen.device === 'pos' ? 'POS Android' : 'Tablet KDS'}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Controles prev/next */}
          {count > 1 && (
            <>
              <button
                onClick={() => goto(activeIdx - 1)}
                aria-label="Anterior"
                className="hidden sm:grid place-items-center absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 border border-stone-200 shadow-lg hover:bg-white hover:shadow-xl transition-all active:scale-95 backdrop-blur-sm dark:bg-[#161616]/90 dark:border-white/15 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5 text-stone-700 dark:text-zinc-200" />
              </button>
              <button
                onClick={() => goto(activeIdx + 1)}
                aria-label="Siguiente"
                className="hidden sm:grid place-items-center absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 border border-stone-200 shadow-lg hover:bg-white hover:shadow-xl transition-all active:scale-95 backdrop-blur-sm dark:bg-[#161616]/90 dark:border-white/15 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-5 w-5 text-stone-700 dark:text-zinc-200" />
              </button>
            </>
          )}
        </div>

        {/* Info del slide activo + dots */}
        {currentItem && (
          <div className={cn(
            'mt-2 transition-all duration-500',
            inView ? 'opacity-100' : 'opacity-0',
          )}>
            <div className="mx-auto max-w-5xl rounded-[28px] border border-stone-200/70 bg-white/88 p-5 shadow-[0_24px_70px_rgba(28,25,23,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-black/85">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#D1400F] dark:border-orange-500/20 dark:bg-orange-500/10">
                    <span>{roleCopy.eyebrow}</span>
                    <span className="h-1 w-1 rounded-full bg-[#D1400F]" />
                    <span>{activeIdx + 1}/{count}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full',
                      currentItem.device === 'macbook' && 'bg-stone-100 text-stone-600 dark:bg-[#161616] dark:text-zinc-300',
                      currentItem.device === 'iphone' && 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
                      currentItem.device === 'tablet' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
                      currentItem.device === 'pos' && 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
                    )}>
                      {currentItem.device === 'macbook' && <><Monitor className="h-3 w-3" /> MacBook Air</>}
                      {currentItem.device === 'iphone' && <><Smartphone className="h-3 w-3" /> iPhone</>}
                      {currentItem.device === 'tablet' && <><Tablet className="h-3 w-3" /> Android Tablet</>}
                      {currentItem.device === 'pos' && <><Printer className="h-3 w-3" /> Terminal POS</>}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-[#D1400F] dark:bg-orange-500/10">
                      {currentItem.role === 'admin' ? 'Admin' : currentItem.role === 'mesero' ? 'Mesero' : currentItem.role === 'cocina' ? 'Cocina' : 'POS Android'}
                    </span>
                  </div>

                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 dark:text-white">
                    {currentItem.title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-stone-600 dark:text-zinc-400 max-w-2xl">
                    {currentItem.desc}
                  </p>
                  <p className="mt-3 text-sm text-stone-500 dark:text-zinc-400">
                    {roleCopy.summary}
                  </p>
                </div>

                <div className="w-full lg:max-w-[300px]">
                  <div className="rounded-2xl border border-stone-200/80 bg-stone-50/90 p-4 dark:border-white/10 dark:bg-black/60">
                    <div className="flex items-center justify-between text-sm font-semibold text-stone-700 dark:text-zinc-200">
                      <span>Autoplay</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoplayEnabled((prev) => !prev)
                          setIsPaused(false)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-orange-200 hover:text-[#D1400F] dark:border-white/15 dark:bg-[#0a0a0a] dark:text-zinc-300"
                      >
                        {autoplayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {autoplayEnabled ? (isPaused ? 'Pausado' : 'Activo') : 'Apagado'}
                      </button>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-[#161616]">
                      <div
                        className={cn(
                          'h-full rounded-full bg-[#D1400F]',
                          autoplayEnabled && !isPaused ? 'opacity-100' : 'opacity-40',
                        )}
                        style={{
                          width: autoplayEnabled ? `${progressWidth}%` : '0%',
                          transition: autoplayEnabled && !isPaused
                            ? `width ${AUTOPLAY_MS}ms linear, opacity 200ms ease`
                            : 'width 220ms ease, opacity 200ms ease',
                        }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white px-3 py-3 dark:bg-[#0a0a0a]">
                        <p className="text-[11px] uppercase tracking-widest text-stone-400">Rol</p>
                        <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">{activeRoleCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 dark:bg-[#0a0a0a]">
                        <p className="text-[11px] uppercase tracking-widest text-stone-400">Vista</p>
                        <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">{activeIdx + 1}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 dark:bg-[#0a0a0a]">
                        <p className="text-[11px] uppercase tracking-widest text-stone-400">Grupo</p>
                        <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">{ROLES[Math.max(activeRoleIndex, 0)].label}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {filtered.map((s, i) => (
                    <button
                      key={s.key}
                      onClick={() => goto(i)}
                      aria-label={`Ir a ${s.title}`}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        i === activeIdx
                          ? 'w-10 bg-[#D1400F]'
                          : 'w-2 bg-stone-300 hover:bg-stone-400 dark:bg-zinc-800 dark:hover:bg-zinc-700',
                      )}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {filtered.map((screen, i) => (
                    <button
                      key={screen.key}
                      type="button"
                      onClick={() => goto(i)}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-left transition-all duration-300',
                        i === activeIdx
                          ? 'border-orange-200 bg-orange-50 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10'
                          : 'border-stone-200 bg-white hover:border-stone-300 dark:border-white/10 dark:bg-black/50 dark:hover:border-white/20',
                      )}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                        {screen.device === 'macbook' ? 'Desktop' : screen.device === 'iphone' ? 'Mobile' : screen.device === 'pos' ? 'POS' : 'Tablet'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-white line-clamp-1">{screen.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid decorativo de 4 dispositivos */}
        <div className={cn(
          'mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto transition-all duration-700 ease-out',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
        )} style={{ transitionDelay: '400ms' }}>
          {(['macbook', 'iphone', 'tablet', 'pos'] as const).map(device => {
            const items = SCREENS.filter(s => s.device === device)
            const labels = { macbook: 'Desktop Web', iphone: 'Mobile', tablet: 'Tablet / KDS', pos: 'POS Android' }
            const icons = { macbook: Monitor, iphone: Smartphone, tablet: Tablet, pos: Printer }
            const Icon = icons[device]
            return (
              <div
                key={device}
                className="group text-center rounded-2xl border border-stone-100 bg-white/80 p-5 backdrop-blur-sm hover:border-orange-200 hover:shadow-lg transition-all duration-300 dark:border-white/10 dark:bg-black/80 dark:hover:border-orange-500/30"
              >
                <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-orange-50 grid place-items-center group-hover:scale-110 transition-transform dark:bg-orange-500/10">
                  <Icon className="h-6 w-6 text-[#D1400F]" />
                </div>
                <p className="font-heading font-bold text-stone-900 dark:text-white">{labels[device]}</p>
                <p className="text-xs text-stone-500 mt-1 dark:text-zinc-400">{items.length} pantallas</p>
              </div>
            )
          })}
        </div>

        {/* Sección de hardware real / POS compatible */}
        <div className={cn(
          'mt-20 rounded-[32px] border border-stone-200/60 bg-gradient-to-br from-stone-50 to-stone-100/50 p-6 sm:p-10 transition-all duration-700 ease-out dark:border-white/10 dark:from-[#0c0a09] dark:to-[#171514]',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        )} style={{ transitionDelay: '500ms' }}>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Imagen del POS terminal */}
            <div className="lg:col-span-5 relative aspect-square overflow-hidden rounded-2xl shadow-xl border border-stone-200 dark:border-white/10">
              <Image
                src="/assets/screenshots/real-pos-terminal.png"
                alt="Terminal POS FoodIX real en barra de restaurante"
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            {/* Texto y especificaciones */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#D1400F] dark:bg-orange-500/10">
                <span>Hardware Certificado</span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 dark:text-white">
                Compatible con Terminales POS Todo-en-Uno
              </h3>
              <p className="text-sm sm:text-base text-stone-600 dark:text-zinc-400">
                FoodIX está totalmente optimizado para pantallas touch de terminales de venta dedicadas y computadoras All-in-One (como Higole, Sunmi, iMin y similares). La interfaz se auto-escala para botones grandes y de fácil toque en piso de venta y cajas.
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm text-stone-700 dark:text-zinc-300">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 grid place-items-center shrink-0">✓</div>
                  <span>Soporte para sistemas táctiles All-in-One</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 grid place-items-center shrink-0">✓</div>
                  <span>Impresoras USB externas por OTG</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 grid place-items-center shrink-0">✓</div>
                  <span>Apertura de cajón de dinero automática</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 grid place-items-center shrink-0">✓</div>
                  <span>Pantalla de cliente secundaria (Dual-Screen)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
