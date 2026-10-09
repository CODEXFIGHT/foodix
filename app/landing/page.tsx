'use client'

/**
 * FoodIX — Landing page oficial.
 * Fondo blanco, botones minimalistas (estilo del sistema), animaciones pro,
 * carrusel de pantallas del SaaS, funciones, precios y footer CodexFight.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Star, Download, Smartphone, Monitor, MonitorSmartphone, ShieldCheck, Wifi, PlayCircle, HeadphonesIcon, Lock, X, Sun, Moon, Menu, Clock, Sparkles, CreditCard, Database } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { cn } from '@/lib/utils/cn'
import { TRIAL_COPY, TRIAL_CTA, TRIAL_PERKS_LINE } from '@/lib/constants/trial'
import { LANDING_SCREENS } from './ScreenMockups'
import { LandingProductShowcase } from './ProductShowcase'
import { RestaurosRealExperienceSection } from './RestaurosRealExperienceSection'
import { DeviceShowcaseSection } from './DeviceShowcaseSection'
import { ContactForm } from './ContactForm'
import { YouTubePlayer } from './YouTubePlayer'
import { ChatbotWidget } from './ChatbotWidget'
import { RoiCalculator } from './RoiCalculator'
import { AiAgentsSection } from './AiAgentsSection'
import { IntegrationsSection } from './IntegrationsSection'
import { ComparisonSection } from './ComparisonSection'
import { CaseStudiesSection } from './CaseStudiesSection'
import { RealGallerySection } from './RealGallerySection'
import { CountrySelector } from '@/components/shared/CountrySelector'
import { PLANS, formatPlanPrice, planDiscountPct, type LandingPlan } from './plans'

const BRAND = '#FACC15'
const DEVHIVE_URL = 'https://codexfight.com/'
const DEMO_URL = 'https://foodix.app/demo'
// Video de presentación (YouTube). Pega aquí SOLO el ID del video — los 11
// caracteres que van después de "v=" o "youtu.be/". Déjalo vacío para ocultar
// la sección. Ej.: const YOUTUBE_VIDEO_ID = 'dQw4w9WgXcQ'
const YOUTUBE_VIDEO_ID = '6t98aiDrux0'
// Descarga del APK: nuestro endpoint resuelve la última versión publicada en
// https://tallercheck.mx/restauros/apk y redirige al archivo más reciente.
const APK_URL = '/api/apk'
const SUPPORT_WHATSAPP = 'https://wa.me/5217734090058?text=Quiero%20instalaci%C3%B3n%20asistida%20de%20FoodIX%20para%20Android'
const LANDING_HEADER_OFFSET = 84

// Todas las secciones que participan del seguimiento de scroll/sección activa.
const NAV_ITEMS = [
  { href: '#inicio', label: 'Inicio', desktop: true },
  { href: '#beneficios', label: 'Beneficios', desktop: true },
  { href: '#galeria', label: 'Galería', desktop: false },
  { href: '#demo', label: 'Demo', desktop: true },
  { href: '#como-funciona', label: 'Cómo funciona', desktop: false },
  { href: '#modulos', label: 'Módulos', desktop: true },
  { href: '#integraciones', label: 'Integraciones', desktop: false },
  { href: '#prueba-gratis', label: 'Prueba gratis', desktop: false },
  { href: '#testimonios', label: 'Testimonios', desktop: false },
  { href: '#casos', label: 'Casos de éxito', desktop: false },
  { href: '#comparativa', label: 'Comparativa', desktop: false },
  { href: '#precios', label: 'Precios', desktop: true },
  { href: '#contacto', label: 'Contacto', desktop: true },
] as const

// Barra de escritorio: subconjunto corto. Con 10 etiquetas la fila no cabe en
// el ancho de la pastilla flotante (max-w-6xl) y el texto se partía en dos
// líneas. Las secciones extra siguen en el menú móvil y en el seguimiento de
// scroll, así que no queda ninguna sección inalcanzable.
const DESKTOP_NAV_ITEMS = NAV_ITEMS.filter(item => item.desktop)

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getSectionId(href: string) {
  return href.startsWith('#') ? href.slice(1) : href
}

function scrollToSection(id: string) {
  if (typeof window === 'undefined') return false

  const sectionId = getSectionId(id)
  const target = document.getElementById(sectionId)

  if (!target) {
    window.location.hash = sectionId
    return false
  }

  const y = target.getBoundingClientRect().top + window.scrollY - LANDING_HEADER_OFFSET
  window.scrollTo({
    top: Math.max(y, 0),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })

  window.history.replaceState(null, '', `#${sectionId}`)
  target.classList.remove('section-arrival')
  window.setTimeout(() => target.classList.add('section-arrival'), prefersReducedMotion() ? 0 : 220)
  window.setTimeout(() => target.classList.remove('section-arrival'), 1300)
  return true
}

function handleAnchorNavigation(e: React.MouseEvent<HTMLAnchorElement>, href: string, afterNavigate?: () => void) {
  if (!href.startsWith('#')) return
  e.preventDefault()
  scrollToSection(href)
  afterNavigate?.()
}

/* ─── Aparición al hacer scroll ─── */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        setShown(entry.isIntersecting)
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('reveal', shown && 'in-view', className)} style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}>
      {children}
    </div>
  )
}

/* ─── Botones minimalistas (estilo del sistema) ─── */
function BrandButton({ href, children, className, onNavigate }: { href: string; children: React.ReactNode; className?: string; onNavigate?: () => void }) {
  const classes = cn(
    'group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-stone-950',
    'bg-[#FACC15] hover:bg-[#EAB308] transition-all duration-300 active:scale-95 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(250,204,21,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
    className,
  )
  if (href.startsWith('#')) {
    return (
      <a href={href} onClick={(e) => handleAnchorNavigation(e, href, onNavigate)} className={classes}>
        {children}
      </a>
    )
  }
  return (
    <Link
      href={href}
      className={classes}
    >
      {children}
    </Link>
  )
}
function GhostButton({ href, children, className, onNavigate }: { href: string; children: React.ReactNode; className?: string; onNavigate?: () => void }) {
  const classes = cn(
    'group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold',
    'border border-stone-200 text-stone-700 hover:border-amber-200 hover:bg-amber-50/70 hover:text-yellow-700 transition-all duration-300 active:scale-95 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2',
    'dark:border-white/15 dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:focus-visible:ring-offset-black',
    className,
  )
  if (href.startsWith('#')) {
    return (
      <a href={href} onClick={(e) => handleAnchorNavigation(e, href, onNavigate)} className={classes}>
        {children}
      </a>
    )
  }
  return (
    <Link
      href={href}
      className={classes}
    >
      {children}
    </Link>
  )
}

/* ─── Sección: 14 días para descubrir todo FoodIX ─── */
const TRIAL_BENEFITS = [
  {
    Icon: Check,
    title: 'Acceso completo',
    desc: 'Explora las herramientas de FoodIX sin limitar artificialmente las funciones principales durante tu prueba.',
  },
  {
    Icon: CreditCard,
    title: 'Sin tarjeta',
    desc: 'Empieza sin proporcionar información de pago. Solo confirmas tu correo y tu teléfono.',
  },
  {
    Icon: Database,
    title: 'Tus datos permanecen',
    desc: 'Si decides contratar después del periodo de prueba, continúa trabajando con la información que ya configuraste.',
  },
]

function TrialSection() {
  return (
    <section id="prueba-gratis" className="scroll-mt-24 border-y border-stone-100 bg-stone-50/70 py-20 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Prueba gratuita
          </span>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-stone-900 sm:text-4xl dark:text-white">
            14 días para descubrir todo FoodIX
          </h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">
            Crea tu cuenta y prueba todas las herramientas disponibles para administrar tu restaurante
            antes de elegir un plan.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TRIAL_BENEFITS.map(({ Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-stone-100 bg-white p-6 hover-lift dark:border-white/10 dark:bg-[#0a0a0a]">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                  <Icon className="h-5 w-5 text-yellow-700 dark:text-yellow-400" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-bold text-stone-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center" delay={120}>
          <BrandButton href="/register" className="h-12 px-7 text-base">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {TRIAL_CTA.section}
          </BrandButton>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
            {TRIAL_PERKS_LINE}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── CTA de un plan que todavía no se puede contratar ─── */
function UnavailableButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={cn(
        'inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-100 px-6 py-3 text-sm font-semibold text-stone-500',
        'dark:border-white/15 dark:bg-white/5 dark:text-zinc-400',
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      {children}
    </button>
  )
}

/* ─── Botón externo (abre en nueva pestaña): demo, descargas, soporte ─── */
function ExtButton({ href, children, className, variant = 'solid' }: { href: string; children: React.ReactNode; className?: string; variant?: 'solid' | 'ghost' | 'dark' }) {
  const styles = {
    solid: 'bg-[#FACC15] hover:bg-[#EAB308] text-stone-950 shadow-sm hover:shadow-md',
    ghost: 'border border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50 dark:border-white/15 dark:text-zinc-200 dark:hover:border-white/25 dark:hover:bg-white/5',
    dark: 'border border-white/20 text-white hover:bg-white/10',
  }[variant]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
        styles,
        className,
      )}
    >
      {children}
    </a>
  )
}

/* ─── Toggle de tema claro/oscuro ─── */
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isDark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-xl border transition-all active:scale-95',
        'border-stone-200 text-stone-600 hover:bg-stone-50',
        'dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5',
        className,
      )}
    >
      {/* Sin estado montado renderizamos ambos ocultos para evitar mismatch */}
      {mounted ? (
        isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />
      ) : (
        <span className="h-[18px] w-[18px]" />
      )}
    </button>
  )
}

/* ─── Logo de marca ─── */
function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-[#FACC15] text-stone-950 font-bold grid place-items-center font-heading">F</span>
      <span className={cn('inline-block font-heading font-bold text-lg animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]', light ? 'text-white' : 'text-stone-900 dark:text-white')}>
        Food<span className="text-yellow-700 dark:text-yellow-400">IX</span><sup className="text-[0.5em] align-super">©</sup>
      </span>
    </span>
  )
}

/* ─── Carrusel de pantallas ─── */
function ScreensCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const count = LANDING_SCREENS.length

  const goto = useCallback((i: number) => {
    const n = (i + count) % count
    idxRef.current = n
    setIdx(n)
    const track = trackRef.current
    if (!track) return
    const child = track.children[n] as HTMLElement | undefined
    if (!child) return
    track.scrollTo({ left: child.offsetLeft - (track.clientWidth - child.clientWidth) / 2, behavior: 'smooth' })
  }, [count])

  // Autoplay con pausa al pasar el cursor.
  useEffect(() => {
    const track = trackRef.current
    let paused = false
    const onEnter = () => { paused = true }
    const onLeave = () => { paused = false }
    track?.addEventListener('mouseenter', onEnter)
    track?.addEventListener('mouseleave', onLeave)
    const t = setInterval(() => { if (!paused) goto(idxRef.current + 1) }, 4000)
    return () => {
      clearInterval(t)
      track?.removeEventListener('mouseenter', onEnter)
      track?.removeEventListener('mouseleave', onLeave)
    }
  }, [goto])

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 px-[6vw] sm:px-[18vw] lg:px-[22vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {LANDING_SCREENS.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              'snap-center shrink-0 w-[88%] sm:w-[64%] lg:w-[52%] transition-all duration-500',
              i === idx ? 'opacity-100 scale-100' : 'opacity-55 scale-[0.93]',
            )}
          >
            {s.el}
            <p className="text-center text-sm font-medium text-stone-500 mt-3 dark:text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <button
        onClick={() => goto(idx - 1)}
        aria-label="Anterior"
        className="hidden sm:grid place-items-center absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white border border-stone-200 shadow-md hover:bg-stone-50 transition-colors dark:bg-[#161616] dark:border-white/15 dark:hover:bg-white/10"
      >
        <ChevronLeft className="h-5 w-5 text-stone-600 dark:text-zinc-300" />
      </button>
      <button
        onClick={() => goto(idx + 1)}
        aria-label="Siguiente"
        className="hidden sm:grid place-items-center absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white border border-stone-200 shadow-md hover:bg-stone-50 transition-colors dark:bg-[#161616] dark:border-white/15 dark:hover:bg-white/10"
      >
        <ChevronRight className="h-5 w-5 text-stone-600 dark:text-zinc-300" />
      </button>

      {/* Puntos */}
      <div className="flex items-center justify-center gap-2 mt-2">
        {LANDING_SCREENS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => goto(i)}
            aria-label={`Ir a ${s.label}`}
            className={cn(
              'h-2 rounded-full transition-all',
              i === idx ? 'w-6 bg-[#FACC15]' : 'w-2 bg-stone-300 hover:bg-stone-400 dark:bg-zinc-800 dark:hover:bg-zinc-700',
            )}
          />
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: ICONS8.orders, title: 'Pedidos en tiempo real', desc: 'Mesa, para llevar y domicilio en un flujo de 3 pasos, con cobro, propina y cuenta dividida.' },
  { icon: ICONS8.kitchen, title: 'Cocina KDS por estaciones', desc: 'Estación caliente y fría reciben cada platillo al instante, con avisos y tiempos por orden.' },
  { icon: ICONS8.tables, title: 'Control de mesas', desc: 'Estado de cada mesa en vivo: libre, ocupada o reservada, y el pedido asociado.' },
  { icon: ICONS8.payment, title: 'Caja y turnos', desc: 'Apertura/cierre, cortes X/Z, arqueo y movimientos. Cajón de dinero por USB o red.' },
  { icon: ICONS8.inventory, title: 'Inventario y recetas', desc: 'Insumos, escandallos, mermas y proveedores. Descuento automático por venta.' },
  { icon: ICONS8.customers, title: 'Clientes y lealtad', desc: 'CRM con monedero electrónico y puntos para fidelizar a tus comensales.' },
  { icon: ICONS8.carta, title: 'Carta digital con QR', desc: 'Tu menú real en un QR compartible. El comensal escanea y ordena desde su teléfono.' },
  { icon: ICONS8.sales, title: 'Reportes en PDF', desc: 'Análisis de ventas profesional, exportable a PDF con tu marca y totales detallados.' },
  { icon: ICONS8.device, title: 'Multi-sucursal & Cloud Central', desc: 'Administra varias sucursales en la nube, con control de marcas, stock inter-sucursal y consolidados.' },
  { icon: ICONS8.aiAgent, title: 'Agentes IA 24/7 ("Sol")', desc: 'Vendedor automático por WhatsApp, Recepcionista de reservas y optimización inteligente de menú.' },
  { icon: ICONS8.cloudSync, title: 'Modo Offline (Cloud-Sync)', desc: 'Si falla el internet local, la cocina y los meseros siguen comandando sin interrupciones.' },
]

/* ─── Módulos principales ─── */
const MODULES = [
  { icon: ICONS8.adminPanel, name: 'Administración', desc: 'Controla ventas, mesas, usuarios y operación diaria desde un panel central.', benefit: 'Visibilidad total del negocio' },
  { icon: ICONS8.meseroAvatar, name: 'Meseros', desc: 'Toma pedidos desde celular o tablet con modificadores y envío directo a cocina.', benefit: 'Menos errores y más velocidad' },
  { icon: ICONS8.kitchen, name: 'Cocina KDS', desc: 'Recibe órdenes en tiempo real y avanza cada platillo por estado.', benefit: 'Cocina sincronizada' },
  { icon: ICONS8.kiosk, name: 'Kiosko', desc: 'Captura pedidos desde una pantalla táctil con una experiencia rápida y visual.', benefit: 'Autoservicio sin filas' },
  { icon: ICONS8.payment, name: 'Caja / Punto de venta', desc: 'Cobra cuentas, registra pagos e imprime tickets sin complicaciones.', benefit: 'Cierre de cuenta profesional' },
  { icon: ICONS8.carta, name: 'Carta QR', desc: 'Comparte tu menú digital para que tus clientes lo consulten desde su celular.', benefit: 'Menú siempre actualizado' },
  { icon: ICONS8.products, name: 'Productos y modificadores', desc: 'Crea platillos, precios, categorías y modificadores personalizados en minutos.', benefit: 'Menú editable sin depender de nadie' },
  { icon: ICONS8.receipt, name: 'Ticket abierto', desc: 'Mantén ordenadas las cuentas completadas antes del cobro final.', benefit: 'Control de cuentas pendientes' },
  { icon: ICONS8.aiAgent, name: 'Agentes IA (Sol)', desc: 'Vendedor WhatsApp 24/7 y Recepcionista IA para agendar mesas y atender pedidos.', benefit: 'Automatización completa' },
  { icon: ICONS8.multiDevice, name: 'Dispositivos conectados', desc: 'Monitorea kioskos, pantallas de cocina, cajas, lectores y terminales en vivo.', benefit: 'Operación en tiempo real' },
]

/* ─── Impacto comercial ─── */
const IMPACT = [
  { icon: ICONS8.target, t: 'Reduce errores de comunicación', d: 'El pedido viaja del mesero a la cocina con modificadores claros, sin malentendidos.' },
  { icon: ICONS8.realtime, t: 'Acelera la toma de pedidos', d: 'Interfaz táctil por categorías para capturar órdenes en segundos.' },
  { icon: ICONS8.receipt, t: 'Mejor control de cuentas abiertas', d: 'Sabes en todo momento qué mesas tienen consumo activo y cuánto deben.' },
  { icon: ICONS8.secure, t: 'Evita pérdida de información', d: 'Todo queda registrado en la nube: pedidos, cobros y movimientos.' },
  { icon: ICONS8.carta, t: 'Digitaliza la carta del restaurante', d: 'Tu menú en un QR que tus clientes consultan desde su celular.' },
  { icon: ICONS8.visibility, t: 'Da visibilidad al dueño', d: 'Ventas, mesas y operación del día en un solo panel, desde donde estés.' },
  { icon: ICONS8.rocket, t: 'Prepara el negocio para crecer', d: 'Multiestablecimiento y control de dispositivos para sumar sucursales.' },
]

/* ─── Cifras de confianza (estilo Fudo) ─── */
const STATS = [
  { value: '100%', label: 'En la nube & Offline', sub: 'Opera con o sin conexión a internet' },
  { value: '3', label: 'Pasos por pedido', sub: 'De la mesa a la cocina en segundos' },
  { value: '24/7', label: 'Agentes IA', sub: 'Atención automatizada por WhatsApp' },
  { value: '+10', label: 'Módulos integrados', sub: 'Todo conectado en un solo sistema' },
]

/* ─── Cuatro pilares de la plataforma (estilo Fudo Pro: Gestión / Cobros / Delivery / Agentes IA) ─── */
const PILLARS = [
  {
    icon: ICONS8.adminPanel,
    kicker: 'Tu gestión',
    title: 'Opera todo el restaurante',
    desc: 'Comandas, mesas, cocina KDS por estaciones, inventario y recetas conectadas en tiempo real.',
    points: ['Pedidos en 3 pasos', 'Cocina por estaciones', 'Inventario y mermas'],
  },
  {
    icon: ICONS8.payment,
    kicker: 'Tus cobros & Smart POS',
    title: 'Cobra sin fricción',
    desc: 'Caja, turnos, cortes X/Z, propina digital y cobro en mesa con cuenta dividida.',
    points: ['Apertura y cierre de caja', 'Cobro con tarjeta y QR', 'Cuenta dividida y propinas'],
  },
  {
    icon: ICONS8.carta,
    kicker: 'Tu delivery & Carta QR',
    title: 'Vende desde el celular',
    desc: 'Carta QR siempre actualizada para que el comensal consulte, ordene y pague desde su teléfono.',
    points: ['Menú digital en QR', 'Precios al instante', 'Autoservicio y WhatsApp'],
  },
  {
    icon: ICONS8.bot,
    kicker: 'Tus Agentes IA 24/7',
    title: 'Empleados virtuales',
    desc: 'Vendedor automatizado por WhatsApp, Recepcionista de reservas y Chef IA de costos trabajando 24/7.',
    points: ['Vendedor WhatsApp 24/7', 'Agendamiento de reservas', 'Optimización de recetas y costos'],
  },
]

/* ─── Preguntas frecuentes (estilo Fudo) ─── */
const FAQ = [
  { q: '¿Necesito tarjeta para comenzar?', a: 'No. Puedes probar FoodIX durante 14 días sin registrar una tarjeta. Creas tu cuenta, confirmas tu correo y tu teléfono, y empiezas a usar el sistema con los datos de tu propio restaurante.' },
  { q: '¿Qué puedo utilizar durante la prueba?', a: 'Tendrás acceso a las funcionalidades disponibles durante el periodo de prueba para conocer FoodIX antes de contratar: pedidos, cocina, caja, productos, reportes y carta QR.' },
  { q: '¿Qué sucede después de los 14 días?', a: 'Tu prueba finalizará y podrás elegir un plan para continuar. La información de tu restaurante permanecerá guardada: al contratar, sigues justo donde te quedaste.' },
  { q: '¿Puedo crear otra cuenta para obtener otra prueba?', a: 'La prueba gratuita está disponible una vez por negocio o cliente elegible. FoodIX aplica mecanismos de validación para proteger el uso adecuado del servicio.' },
  { q: '¿Necesito instalar algo para empezar?', a: 'No. FoodIX funciona en la nube desde el navegador. Entras con tu usuario y operas desde cualquier computadora, tablet o kiosko Android, sin instalaciones complicadas.' },
  { q: '¿Sirve para taquerías, cafeterías y fondas?', a: 'Sí. FoodIX se adapta a restaurantes, taquerías, cafeterías, fondas y negocios de comida rápida. Activas solo los módulos que necesitas y sumas más conforme creces.' },
  { q: '¿Puedo administrar varias sucursales?', a: 'Sí. Con los planes multi-sucursal administras varios locales desde una consola central, con control de dispositivos, roles por usuario y reportes consolidados.' },
  { q: '¿Cómo funciona la carta con QR?', a: 'Cada negocio tiene su carta digital en un QR compartible. El comensal lo escanea y ve tu menú real y actualizado desde su teléfono, sin apps ni descargas.' },
  { q: '¿Hay contratos forzosos?', a: 'No. Pagas mes a mes con tarjeta o transferencia SPEI y cancelas cuando quieras. Sin permanencia ni penalizaciones.' },
]

/* ─── Sección: FoodIX para Kioskos Android ─── */
const KIOSK_DEVICES = [
  { Icon: Smartphone, title: 'Tablets Android', desc: 'Cualquier tablet Android moderna como terminal de pedidos o caja.' },
  { Icon: Monitor, title: 'Kioskos Android', desc: 'Kioskos de autoservicio y paneles all-in-one para tu local.' },
  { Icon: MonitorSmartphone, title: 'Pantallas touch Android', desc: 'Pantallas táctiles para cocina, despacho o punto de venta.' },
  { Icon: ShieldCheck, title: 'Dispositivos All Touch / POS', desc: 'Equipos tipo All Touch Higole y POS Android con periféricos.' },
]

// Capturas reales montadas en mockups de terminal POS para mostrar el sistema
// "como se ve en un equipo real" del restaurante.
const POS_SHOWCASE = [
  { src: '/assets/screenshots/admin-dashboard-desktop.png', alt: 'Panel de administración de FoodIX en una terminal POS', caption: 'Panel de administración' },
  { src: '/assets/screenshots/waiter-order-desktop.png', alt: 'Toma de pedido de FoodIX en una terminal POS', caption: 'Toma de pedido en caja' },
  { src: '/assets/screenshots/admin-tables-desktop.png', alt: 'Control de mesas de FoodIX en una terminal POS', caption: 'Control de mesas' },
]

/** Mockup realista de terminal POS all-in-one (monitor táctil + soporte) con captura real. */
function PosTerminal({ src, alt, caption, priority = false }: { src: string; alt: string; caption: string; priority?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      {/* Monitor táctil */}
      <div className="relative rounded-[20px] border border-stone-300 bg-stone-900 p-2.5 shadow-[0_30px_55px_-26px_rgba(0,0,0,0.55)] dark:border-white/15 dark:bg-stone-950">
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-stone-600" />
        <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-black">
          <Image src={src} alt={alt} fill sizes="(max-width:768px) 92vw, 440px" className="object-cover object-left-top" priority={priority} />
        </div>
      </div>
      {/* Cuello del soporte */}
      <div className="mx-auto h-6 w-12 bg-gradient-to-b from-stone-300 to-stone-400 dark:from-zinc-700 dark:to-zinc-800" />
      {/* Base */}
      <div className="mx-auto h-3 w-44 rounded-[10px] bg-gradient-to-b from-stone-300 to-stone-400 shadow-md dark:from-zinc-700 dark:to-zinc-800" />
      <p className="mt-4 text-center text-sm font-semibold text-stone-600 dark:text-zinc-300">{caption}</p>
    </div>
  )
}

/** Mini-mockup de una pantalla de la app en modo tablet/kiosko (login, POS, menú…). */
function AppMock({ title, tone, children }: { title: string; tone: 'brand' | 'dark'; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm ring-1 ring-black/[0.02] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 dark:border-white/10 dark:ring-0 dark:shadow-black/40">
      <div className={cn('h-8 flex items-center gap-1.5 px-3', tone === 'dark' ? 'bg-[#1C1917]' : 'bg-amber-50')}>
        <span className="h-2 w-2 rounded-full bg-red-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-green-400/70" />
        <span className="ml-2 text-[10px] font-semibold text-stone-400 truncate">{title}</span>
      </div>
      <div className="aspect-[3/4] p-3">{children}</div>
    </div>
  )
}

function KioskAndroidSection() {
  return (
    <section id="kioskos" className="py-20 bg-stone-50/70 border-y border-stone-100 scroll-mt-24 dark:bg-white/[0.02] dark:border-white/10">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <Smartphone className="h-3.5 w-3.5" /> App nativa Android
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">FoodIX para Kioskos Android</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">
            Instala FoodIX como app nativa en tablets y kioskos Android, con impresión de tickets,
            cajón de dinero y modo kiosko a pantalla completa.
          </p>
        </Reveal>

        {/* Tipos de dispositivo */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KIOSK_DEVICES.map((d, i) => (
            <Reveal key={d.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-stone-200 bg-white p-5 hover:border-amber-200 hover:shadow-md transition-all dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-amber-500/40">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-yellow-700 dark:bg-amber-500/10">
                  <d.Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-heading font-bold text-stone-900 dark:text-white">{d.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{d.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Capturas reales montadas en terminales POS */}
        <Reveal className="mt-16 text-center max-w-2xl mx-auto">
          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 dark:text-white">El sistema real en tu punto de venta</h3>
          <p className="mt-2 text-stone-600 dark:text-zinc-400">Capturas reales de FoodIX montadas en una terminal táctil, tal como se ve operando en el mostrador.</p>
        </Reveal>
        <div className="mt-10 grid gap-12 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {POS_SHOWCASE.map((s, i) => (
            <Reveal key={s.src} delay={i * 90} className="sm:last:col-span-2 lg:last:col-span-1">
              <PosTerminal src={s.src} alt={s.alt} caption={s.caption} priority={i === 0} />
            </Reveal>
          ))}
        </div>

        {/* Mockups de la app en modo kiosko */}
        <Reveal className="mt-16 text-center max-w-2xl mx-auto">
          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 dark:text-white">Así se ve en modo kiosko</h3>
          <p className="mt-2 text-stone-600 dark:text-zinc-400">Botones grandes, navegación simple y optimizado para pantallas táctiles.</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Reveal delay={0}>
            <AppMock title="Login" tone="brand">
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#FACC15] flex items-center justify-center text-stone-950 font-extrabold">F</div>
                <div className="h-8 w-full rounded-lg bg-stone-100" />
                <div className="h-8 w-full rounded-lg bg-stone-100" />
                <div className="h-9 w-full rounded-lg bg-[#FACC15]" />
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={80}>
            <AppMock title="Punto de venta" tone="brand">
              <div className="h-full flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-lg bg-amber-50 border border-amber-100" />)}
                </div>
                <div className="h-9 rounded-lg bg-[#FACC15]" />
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={160}>
            <AppMock title="Menú / Carta" tone="brand">
              <div className="h-full flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-stone-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 rounded bg-stone-200" />
                      <div className="h-2.5 w-1/3 rounded bg-amber-200" />
                    </div>
                  </div>
                ))}
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={240}>
            <AppMock title="Mapa de mesas" tone="brand">
              <div className="grid h-full grid-cols-3 grid-rows-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-center rounded-lg border text-[10px] font-bold',
                      i % 4 === 0
                        ? 'border-amber-200 bg-amber-50 text-yellow-700'
                        : 'border-stone-200 bg-stone-50 text-stone-400',
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={0}>
            <AppMock title="Caja / Cobro" tone="brand">
              <div className="h-full flex flex-col gap-2">
                <div className="rounded-lg border border-stone-100 bg-stone-50 p-2">
                  <div className="h-2 w-1/3 rounded bg-stone-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-[#FACC15]/80" />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="rounded-lg border border-stone-200 bg-white" />
                  <div className="rounded-lg border border-stone-200 bg-white" />
                </div>
                <div className="h-9 rounded-lg bg-[#FACC15]" />
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={80}>
            <AppMock title="Cocina KDS" tone="brand">
              <div className="grid h-full grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, c) => (
                  <div key={c} className="space-y-1.5 rounded-lg border border-stone-100 bg-stone-50 p-1.5">
                    {Array.from({ length: 3 }).map((_, r) => (
                      <div key={r} className="space-y-1 rounded border border-stone-200 bg-white p-1.5">
                        <div className="h-1.5 w-2/3 rounded bg-amber-200" />
                        <div className="h-1.5 w-full rounded bg-stone-200" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={160}>
            <AppMock title="Domicilios" tone="brand">
              <div className="h-full flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 p-1.5">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-amber-100" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-3/4 rounded bg-stone-200" />
                      <div className="h-2 w-1/3 rounded bg-amber-200" />
                    </div>
                    <div className="h-4 w-8 rounded bg-[#FACC15]/15" />
                  </div>
                ))}
              </div>
            </AppMock>
          </Reveal>
          <Reveal delay={240}>
            <AppMock title="Suscripción vencida" tone="dark">
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-[#FACC15]/15 flex items-center justify-center text-yellow-700 dark:text-yellow-400"><Lock className="h-6 w-6" /></div>
                <p className="text-[11px] font-bold text-stone-700 leading-tight px-2">Suscripción vencida o dispositivo desactivado</p>
                <div className="h-7 w-full rounded-lg bg-[#FACC15]" />
                <div className="h-7 w-full rounded-lg border border-stone-200" />
              </div>
            </AppMock>
          </Reveal>
        </div>

        {/* Descarga e instalación */}
        <Reveal className="mt-16">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 sm:p-10 grid lg:grid-cols-2 gap-8 items-center dark:border-white/10 dark:bg-[#0a0a0a]">
            <div>
              <h3 className="font-heading font-extrabold text-2xl text-stone-900 dark:text-white">Descarga e instala en tu dispositivo</h3>
              <p className="mt-3 text-stone-600 leading-relaxed dark:text-zinc-400">
                Puedes instalar FoodIX en tu equipo Android de tres formas: descargando el
                <strong> APK </strong> e instalándolo directamente, usándolo desde el
                <strong> navegador web / PWA</strong>, o solicitando una
                <strong> instalación asistida</strong> por CodexFight.
          </p>
              <ul className="mt-5 space-y-2.5 text-sm text-stone-600 dark:text-zinc-400">
                <li className="flex items-center gap-2"><Download className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> APK directo para tablets y kioskos</li>
                <li className="flex items-center gap-2"><Wifi className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Web / PWA sin instalar nada</li>
                <li className="flex items-center gap-2"><HeadphonesIcon className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Instalación asistida y configuración del hardware</li>
              </ul>
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-700 dark:text-yellow-400">Equipo completo POS / Kiosko</p>
                <h4 className="mt-2 font-heading text-xl font-extrabold text-stone-900 dark:text-white">También podemos equipar tu punto de venta</h4>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-zinc-300">
                  Si necesitas el equipo completo de kiosko o POS, podemos cotizarlo para agregarlo a tu mensualidad
                  o manejarlo como un pago único. Escríbenos por WhatsApp para revisar características, disponibilidad
                  y precios según el hardware que necesita tu restaurante.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <ExtButton href={APK_URL}><Download className="h-4 w-4" /> Descargar APK para Android</ExtButton>
                <ExtButton href={SUPPORT_WHATSAPP} variant="ghost"><HeadphonesIcon className="h-4 w-4" /> Cotizar equipo por WhatsApp</ExtButton>
              </div>
            </div>
            <div className="relative">
              <PosTerminal
                src="/assets/screenshots/admin-orders-desktop.png"
                alt="FoodIX mostrando órdenes activas en una terminal POS"
                caption="FoodIX operando en una terminal POS"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [detailPlan, setDetailPlan] = useState<LandingPlan | null>(null)
  const [activeSection, setActiveSection] = useState('inicio')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const [heroAnimationKey, setHeroAnimationKey] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sectionIds = NAV_ITEMS.map(item => getSectionId(item.href))
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!sections.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        rootMargin: `-${LANDING_HEADER_OFFSET}px 0px -58% 0px`,
        threshold: [0.18, 0.32, 0.5],
      },
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return
    window.setTimeout(() => scrollToSection(window.location.hash), 80)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let wasAtTop = window.scrollY < 24
    if (wasAtTop) setActiveSection('inicio')
    setAtTop(wasAtTop)

    const onScroll = () => {
      const isAtTop = window.scrollY < 24
      setAtTop(isAtTop)
      if (isAtTop) {
        setActiveSection('inicio')
        setMobileMenuOpen(false)
      }
      if (isAtTop && !wasAtTop && !prefersReducedMotion()) {
        setHeroAnimationKey(key => key + 1)
      }
      if (isAtTop !== wasAtTop) {
        setMobileMenuOpen(false)
      }
      wasAtTop = isAtTop
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenuOpen])

  const navLinkClass = (href: string) => {
    const isActive = activeSection === getSectionId(href)
    return cn(
      'relative shrink-0 whitespace-nowrap rounded-full px-3 py-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
      isActive
        ? 'bg-amber-50 text-yellow-700 dark:text-yellow-400 shadow-sm shadow-amber-100/60 dark:bg-amber-500/10 dark:shadow-none'
        : 'text-stone-600 hover:bg-stone-50 hover:text-yellow-700 dark:text-zinc-400 dark:hover:bg-white/5',
    )
  }

  const renderNavContent = () => (
    <>
      <Wordmark />
      <div className="hidden xl:flex items-center gap-0.5 text-sm font-medium">
        {DESKTOP_NAV_ITEMS.map(item => (
          <a
            key={item.href}
            href={item.href}
            onClick={(e) => handleAnchorNavigation(e, item.href)}
            className={navLinkClass(item.href)}
            aria-current={activeSection === getSectionId(item.href) ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
        <Link href="/manual" className="whitespace-nowrap rounded-full px-3 py-2 text-stone-600 hover:bg-stone-50 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors dark:text-zinc-400 dark:hover:bg-white/5">Manual</Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/login" className="hidden sm:inline text-sm font-semibold text-stone-600 hover:text-stone-900 px-3 py-2 transition-colors dark:text-zinc-400 dark:hover:text-white">
          Iniciar sesión
        </Link>
        <BrandButton href="/register" className="hidden sm:inline-flex h-9 px-4">Probar gratis</BrandButton>
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(open => !open)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 text-stone-700 transition-all hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2 xl:hidden dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </>
  )

  const renderMobileMenu = () => (
    <div className="fixed inset-0 z-[70] xl:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setMobileMenuOpen(false)}
        className="absolute inset-0 h-full w-full bg-stone-900/40 backdrop-blur-sm animate-fade-in"
      />
      <div className="absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl shadow-stone-900/20 animate-slide-down sm:inset-x-5 dark:border-white/10 dark:bg-black">
        <div className="flex items-center justify-between px-2 pb-2">
          <Wordmark />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileMenuOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 text-stone-700 transition-all hover:bg-stone-50 active:scale-95 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-1 text-sm font-semibold">
          {NAV_ITEMS.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleAnchorNavigation(e, item.href, () => setMobileMenuOpen(false))}
              className={cn(navLinkClass(item.href), 'rounded-xl px-4')}
              aria-current={activeSection === getSectionId(item.href) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
          <Link href="/manual" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-50 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors dark:text-zinc-400 dark:hover:bg-white/5">
            Manual
          </Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-4 py-2 text-stone-600 hover:bg-stone-50 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors dark:text-zinc-400 dark:hover:bg-white/5">
            Iniciar sesión
          </Link>
          <BrandButton href="/register" onNavigate={() => setMobileMenuOpen(false)} className="mt-1 h-10 w-full">
            Probar gratis · 14 días
          </BrandButton>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-stone-800 font-sans overflow-x-hidden dark:bg-black dark:text-zinc-200">
      {/* ── Navegación ──
          Siempre visible: arriba del todo usa el estilo "principal" (barra
          integrada al hero, ancho completo) y al hacer scroll cambia al
          estilo flotante en pastilla. */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
          atTop ? 'px-0 pt-0' : 'px-3 pt-3 sm:px-5',
        )}
      >
        <nav
          /* Ojo: las opacidades van en sintaxis arbitraria (`/[0.94]`). Un
             `bg-white/94` no existe en la escala de Tailwind y se compila a
             nada, dejando la barra transparente sobre el contenido. */
          className={cn(
            'relative mx-auto flex h-14 items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            atTop
              ? 'max-w-none rounded-none border-b border-stone-200/70 bg-white/80 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/60 sm:px-8'
              : 'max-w-6xl rounded-2xl border border-stone-200/80 bg-white/[0.94] px-4 shadow-[0_18px_50px_rgba(28,25,23,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/[0.85] dark:shadow-[0_18px_55px_rgba(0,0,0,0.38)] sm:px-5',
          )}
          aria-label="Navegación principal"
        >
          {renderNavContent()}
        </nav>
      </header>

      {mobileMenuOpen && renderMobileMenu()}

      {/* ── Hero ── */}
      <section id="inicio" className="relative scroll-mt-24">
        {/* blobs animados */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#FACC15]/8 blur-3xl animate-blob dark:bg-amber-500/10" />
          <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-stone-200/40 blur-3xl animate-blob dark:bg-white/5" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-24 pb-12 lg:pt-28 grid lg:grid-cols-2 gap-12 items-center">
          <div key={`hero-copy-${heroAnimationKey}`} className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15] animate-pulse" />
              Sistema POS en la nube para restaurantes
            </span>
            <h1 className="mt-5 font-heading font-extrabold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.05] text-stone-900 dark:text-white">
              ¡Cocina, sirve y crece con <span className="text-yellow-700 dark:text-yellow-400">FoodIX</span>!
              <span className="mt-3 block text-2xl font-bold sm:text-3xl lg:text-[2rem]">
                Pruébalo gratis 14 días.
              </span>
            </h1>
            <p className="mt-5 text-lg text-stone-600 max-w-md leading-relaxed dark:text-zinc-400">
              {TRIAL_COPY.heroSub}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <BrandButton href="/register">
                <Sparkles className="h-4 w-4" /> {TRIAL_CTA.landing}
              </BrandButton>
              {/* La DEMO pública (datos de muestra) es un producto distinto de la
                  prueba real: se conserva como CTA secundario. */}
              <ExtButton href={DEMO_URL} variant="ghost"><PlayCircle className="h-4 w-4" /> Ver demostración</ExtButton>
              <GhostButton href="#pantallas">Ver cómo funciona <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></GhostButton>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">{TRIAL_PERKS_LINE}</p>
            {/* Prueba social estilo Fudo: rating + confianza */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <Star key={i} className="h-4 w-4 fill-yellow-700 dark:fill-yellow-400 text-yellow-700 dark:text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-stone-600 dark:text-zinc-400">
                <span className="font-bold text-stone-900 dark:text-white">Restaurantes, taquerías y cafeterías</span> ya operan con FoodIX
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Menos errores en pedidos</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Operación en tiempo real</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Multiplataforma</span>
            </div>
          </div>

          <div key={`hero-visual-${heroAnimationKey}`} className="relative animate-fade-in-up delay-200">
            <div className="animate-float-slow">{LANDING_SCREENS[0].el}</div>
          </div>
        </div>

        {/* Marquee de módulos */}
        <div className="relative border-y border-stone-100 bg-stone-50/60 py-4 overflow-hidden dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex w-max animate-marquee gap-10 text-sm font-semibold text-stone-400 dark:text-zinc-500">
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                <Icons8Image src={f.icon} alt="" size={18} className="opacity-70" />
                {f.title}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cifras de confianza (estilo Fudo) ── */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={(i % 4) * 70}>
              <div className="h-full rounded-2xl border border-stone-100 bg-white p-6 text-center hover-lift dark:border-white/10 dark:bg-[#0a0a0a]">
                <p className="font-heading font-extrabold text-4xl sm:text-5xl text-yellow-700 dark:text-yellow-400 leading-none">{s.value}</p>
                <p className="mt-2 font-bold text-stone-900 dark:text-white">{s.label}</p>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed dark:text-zinc-400">{s.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Cuatro pilares: una sola plataforma (estilo Fudo Pro) ── */}
      <section className="max-w-6xl mx-auto px-5 py-16 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <MonitorSmartphone className="h-3.5 w-3.5" /> Una sola plataforma
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Gestión, cobros, delivery y Agentes IA en un solo lugar</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">Todo lo que tu restaurante necesita para operar, conectado y trabajando en conjunto desde el primer día.</p>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p, i) => (
            <Reveal key={p.kicker} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-stone-200 bg-white p-8 transition-all hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/40 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-amber-500/40 dark:hover:shadow-amber-500/5">
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-50 blur-2xl transition-opacity opacity-0 group-hover:opacity-100 dark:bg-amber-500/10" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 grid place-items-center mb-5 transition-transform group-hover:scale-110 dark:bg-amber-500/10">
                    <Icons8Image src={p.icon} alt={p.title} size={30} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">{p.kicker}</p>
                  <h3 className="mt-1.5 font-heading font-extrabold text-xl text-stone-900 dark:text-white">{p.title}</h3>
                  <p className="mt-2 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{p.desc}</p>
                  <ul className="mt-5 space-y-2 border-t border-stone-100 dark:border-white/5 pt-5">
                    {p.points.map(pt => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-stone-700 dark:text-zinc-300">
                        <Check className="h-4 w-4 text-green-500 shrink-0" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Calculadora Interactiva de ROI & Ahorro ── */}
      <RoiCalculator />

      {/* ── Suite de Empleados Virtuales / Agentes IA 24/7 ── */}
      <AiAgentsSection />

      {/* ── Funciones ── */}
      <section id="beneficios" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Todo tu restaurante conectado en una sola plataforma</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">
            Desde que el mesero toma la orden hasta que cocina la prepara, caja cobra y el administrador
            revisa la operación: FoodIX centraliza cada paso para que trabajes más rápido, con menos errores y mejor control.
          </p>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="h-full rounded-2xl border border-stone-100 bg-white p-6 hover-lift dark:border-white/10 dark:bg-[#0a0a0a]">
                <div className="h-12 w-12 rounded-xl bg-amber-50 grid place-items-center mb-4 dark:bg-amber-500/10">
                  <Icons8Image src={f.icon} alt={f.title} size={28} />
                </div>
                <h3 className="font-bold text-stone-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <RestaurosRealExperienceSection supportWhatsapp={SUPPORT_WHATSAPP} />

      {/* ── Screenshots reales en dispositivos ── */}
      <DeviceShowcaseSection />

      {/* ── Galería de fotos reales (equipos y operación) ── */}
      <RealGallerySection />

      {/* ── Pantallas (showcase con tabs) ── */}
      <section id="demo" className="py-20 bg-stone-50/70 border-y border-stone-100 scroll-mt-24 dark:bg-white/[0.02] dark:border-white/10">
        <div id="pantallas" className="scroll-mt-24" />
        <Reveal className="text-center max-w-2xl mx-auto px-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <Monitor className="h-3.5 w-3.5" /> Recorrido por el sistema
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Conoce FoodIX por dentro</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">
            Explora las pantallas clave del sistema y descubre cómo FoodIX conecta mesas, meseros,
            cocina, caja, kiosko y administración en un solo flujo de trabajo.
          </p>
        </Reveal>
        <Reveal className="mt-10">
          <LandingProductShowcase />
        </Reveal>

        {/* Carrusel de apoyo */}
        <Reveal className="mt-16 text-center max-w-2xl mx-auto px-5">
          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 dark:text-white">Del pedido al cobro, todo conectado</h3>
          <p className="mt-2 text-stone-600 dark:text-zinc-400">FoodIX une el trabajo de meseros, cocina, caja y administración para que cada orden fluya sin confusión.</p>
        </Reveal>
        <Reveal className="mt-8">
          <ScreensCarousel />
        </Reveal>
      </section>

      {/* ── Cómo funciona (3 pasos con fotografía real) ── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <Clock className="h-3.5 w-3.5" /> Cómo funciona
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Listo en 3 pasos, el mismo día</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">Sin instalaciones complicadas ni contratos eternos. Configuras, operas y creces.</p>
        </Reveal>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: '01',
              title: 'Configura tu carta',
              desc: 'Sube tus platillos, precios y fotos desde cualquier dispositivo. Nosotros te acompañamos en la carga inicial.',
              img: '/assets/screenshots/admin-menu-desktop.png',
              alt: 'Gestión de carta y productos de FoodIX en escritorio',
            },
            {
              n: '02',
              title: 'Toma pedidos y cocina',
              desc: 'Meseros toman órdenes en tablet y la cocina las recibe al instante en su pantalla KDS, sin tickets perdidos.',
              img: '/assets/screenshots/kitchen-kds-tablet.png',
              alt: 'Cocina KDS de FoodIX recibiendo pedidos en una tablet',
            },
            {
              n: '03',
              title: 'Cobra y crece',
              desc: 'Cobra en efectivo, tarjeta o SPEI, revisa ventas en tiempo real y toma decisiones con reportes claros.',
              img: '/assets/screenshots/admin-dashboard-desktop.png',
              alt: 'Panel de ventas y reportes de FoodIX en escritorio',
            },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 90}>
              <li className="group h-full overflow-hidden rounded-2xl border border-stone-200 bg-white hover-lift dark:border-white/10 dark:bg-[#0a0a0a]">
                <div className="relative aspect-[16/10] overflow-hidden bg-amber-50 dark:bg-amber-500/10">
                  <Image
                    src={step.img}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 32vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-4 top-4 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#FACC15] px-2 text-sm font-extrabold text-stone-950 shadow-sm">
                    {step.n}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-bold text-stone-900 dark:text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{step.desc}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── Módulos principales ── */}
      <section id="modulos" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Módulos del sistema
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Un módulo para cada parte de tu operación</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">Todos integrados entre sí. Activa lo que necesitas y suma más conforme tu negocio crece.</p>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((m, i) => (
            <Reveal key={m.name} delay={(i % 3) * 80}>
              <div className="group h-full rounded-2xl border border-stone-100 bg-white p-6 hover-lift dark:border-white/10 dark:bg-[#0a0a0a]">
                <div className="h-12 w-12 rounded-xl bg-amber-50 grid place-items-center mb-4 transition-transform group-hover:scale-110 dark:bg-amber-500/10">
                  <Icons8Image src={m.icon} alt={m.name} size={28} />
                </div>
                <h3 className="font-heading font-bold text-stone-900 dark:text-white">{m.name}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{m.desc}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  <Check className="h-3.5 w-3.5" /> {m.benefit}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Integraciones y aliados ── */}
      <IntegrationsSection />

      {/* ── Impacto comercial ── */}
      <section id="funciones" className="py-20 bg-stone-50/70 border-y border-stone-100 scroll-mt-24 dark:bg-white/[0.02] dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Diseñado para vender más y operar mejor</h2>
            <p className="mt-3 text-stone-600 dark:text-zinc-400">Beneficios reales para el día a día de tu restaurante, taquería, cafetería o fonda.</p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {IMPACT.map((c, i) => (
              <Reveal key={c.t} delay={(i % 3) * 80}>
                <div className="h-full rounded-2xl border border-stone-200 bg-white p-6 hover:border-amber-200 hover:shadow-md transition-all dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-amber-500/40">
                  <div className="h-11 w-11 rounded-xl bg-amber-50 grid place-items-center mb-4 dark:bg-amber-500/10">
                    <Icons8Image src={c.icon} alt={c.t} size={24} />
                  </div>
                  <h3 className="font-heading font-bold text-stone-900 leading-snug dark:text-white">{c.t}</h3>
                  <p className="mt-1.5 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video de presentación (YouTube) ── */}
      {YOUTUBE_VIDEO_ID && (
        <section id="video" className="max-w-5xl mx-auto px-5 py-20 scroll-mt-24">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Mira FoodIX en acción</h2>
            <p className="mt-3 text-stone-600 dark:text-zinc-400">Un vistazo rápido a cómo funciona el sistema en tu restaurante.</p>
          </Reveal>
          <Reveal className="mt-10">
            <YouTubePlayer videoId={YOUTUBE_VIDEO_ID} title="Video de presentación de FoodIX" />
          </Reveal>
        </section>
      )}

      {/* ── FoodIX para Kioskos Android ── */}
      <KioskAndroidSection />

      {/* ── Prueba gratuita de 14 días ── */}
      <TrialSection />

      {/* ── Testimonios (fotografía real) ── */}
      <section id="testimonios" className="py-20 bg-stone-50/70 border-y border-stone-100 scroll-mt-24 dark:bg-white/[0.02] dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
              <Star className="h-3.5 w-3.5 fill-current" /> Testimonios
            </span>
            <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Negocios reales que ya operan con FoodIX</h2>
            <p className="mt-3 text-stone-600 dark:text-zinc-400">Taquerías, cafeterías y restaurantes que redujeron errores y cobraron más rápido.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: 'Antes perdíamos tickets y la cocina se atascaba. Con FoodIX cada orden llega al instante y las mesas vuelven a fluir.',
                name: 'María Fernanda R.',
                role: 'Cafetería La Bruma · Guadalajara',
                img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
              },
              {
                quote: 'Los reportes me dicen qué platillo deja más y qué horas lleno. Bajé la merma y ordené la caja en dos semanas.',
                name: 'Carlos Méndez',
                role: 'Taquería El Güero · Monterrey',
                img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
              },
              {
                quote: 'Configuramos la carta en una tarde y al día siguiente ya cobrábamos con tarjeta desde la tablet. El equipo lo adoptó sin quejarse.',
                name: 'Ana Sofía Delgado',
                role: 'Restaurante Nube · CDMX',
                img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80',
              },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <figure className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-[#0a0a0a]">
                  <div className="flex items-center gap-1 text-amber-400" aria-label="5 estrellas">
                    {[0, 1, 2, 3, 4].map(s => (
                      <Star key={s} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-stone-700 dark:text-zinc-300">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-stone-100 pt-4 dark:border-white/10">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/20">
                      <Image src={t.img} alt={t.name} fill sizes="44px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-stone-900 dark:text-white">{t.name}</span>
                      <span className="block truncate text-xs text-stone-500 dark:text-zinc-400">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Casos de éxito / métricas ── */}
      <CaseStudiesSection />

      {/* ── Comparativa vs competencia ── */}
      <ComparisonSection />

      {/* ── Precios ── */}
      <section id="precios" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Elige el plan a la medida de tu restaurante</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">Sin contratos forzosos. Paga con tarjeta o transferencia SPEI. Cancela cuando quieras.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-yellow-700 dark:border-amber-500/25 dark:bg-amber-500/10">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Prueba FoodIX durante 14 días antes de contratar
          </p>
        </Reveal>

        {/* Banner WhatsApp */}
        <Reveal delay={60}>
          <div className="mt-10 max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-[#25D366]/10 via-green-50 to-[#25D366]/10 border border-[#25D366]/30 dark:from-[#25D366]/5 dark:via-[#25D366]/5 dark:to-[#25D366]/5 dark:border-[#25D366]/20 px-5 py-4 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="h-11 w-11 rounded-xl bg-[#25D366] grid place-items-center shrink-0 shadow-md shadow-green-300/40">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-stone-900 dark:text-white text-sm">
                WhatsApp + Automatización — exclusivo del plan AI
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 uppercase tracking-wide align-middle">
                  <Clock className="h-3 w-3" /> Próximamente
                </span>
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">Pedidos por WhatsApp, confirmaciones automáticas, seguimiento en tiempo real y campañas de promoción — todo sin esfuerzo manual. Estamos afinando los últimos detalles: se activará sin costo extra en los planes que ya lo incluyen.</p>
            </div>
            <span className="text-xs font-bold text-green-700 dark:text-green-400 whitespace-nowrap shrink-0">Solo en AI ↓</span>
          </div>
        </Reveal>

        <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className={cn(
                  'relative h-full rounded-3xl bg-white p-8 transition-all dark:bg-[#0a0a0a]',
                  plan.featured
                    ? 'border-2 border-[#EAB308]/30 shadow-xl shadow-amber-100/50 dark:shadow-amber-500/5'
                    : 'border border-stone-200 hover:border-stone-300 dark:border-white/10 dark:hover:border-white/20',
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#FACC15] text-stone-950 whitespace-nowrap">
                    <Star className="h-3 w-3 fill-stone-950" /> Más popular
                  </span>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading font-bold text-base text-stone-900 dark:text-white">{plan.name}</p>
                  {planDiscountPct(plan) > 0 && (
                    <span className="inline-flex items-center text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 whitespace-nowrap">
                      -{planDiscountPct(plan)}% dto.
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">{plan.tagline}</p>
                {plan.comingSoon && <ComingSoonBadge className="mt-2.5" />}

                {plan.originalPrice && (
                  <p className="mt-4 text-base text-stone-400 line-through leading-none">{formatPlanPrice(plan.originalPrice)} MXN</p>
                )}
                <div className={cn('flex items-end gap-1', plan.originalPrice ? 'mt-0.5' : 'mt-4')}>
                  <span className="font-heading font-extrabold text-5xl text-yellow-700 dark:text-yellow-400">{formatPlanPrice(plan.price)}</span>
                  <span className="text-stone-500 dark:text-zinc-400 mb-1.5 text-sm">MXN / mes</span>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">1 sucursal incluida · IVA incluido · cancela cuando quieras</p>
                {plan.perBranch && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 dark:bg-amber-500/10 dark:border-amber-500/20">
                    <Star className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Sucursal adicional: <span className="whitespace-nowrap">+{formatPlanPrice(plan.perBranch)} MXN/mes</span></span>
                  </p>
                )}

                {plan.available === false ? (
                  <UnavailableButton className="mt-6">Disponible próximamente</UnavailableButton>
                ) : plan.featured ? (
                  <BrandButton href={`/landing/checkout?plan=${plan.id}`} className="w-full mt-6">Contratar ahora <ArrowRight className="h-4 w-4" /></BrandButton>
                ) : (
                  <GhostButton href={`/landing/checkout?plan=${plan.id}`} className="w-full mt-6">Contratar {plan.name.replace('FoodIX ', '')}</GhostButton>
                )}

                <button
                  type="button"
                  onClick={() => setDetailPlan(plan)}
                  className="w-full mt-2.5 text-sm font-semibold text-stone-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors inline-flex items-center justify-center gap-1"
                >
                  Ver todo lo que incluye <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <ul className="mt-6 space-y-2.5 border-t border-stone-100 dark:border-white/5 pt-5">
                  {plan.features.map(f => {
                    const isWhatsApp = f.includes('WhatsApp')
                    return (
                      <li key={f} className={cn(
                        'flex items-start gap-2.5 text-sm',
                        isWhatsApp
                          ? 'text-[#25D366] font-semibold'
                          : 'text-stone-700 dark:text-zinc-300',
                      )}>
                        {isWhatsApp ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366] mt-0.5 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        ) : (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        )}
                        {f}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-xs text-stone-400 mt-6">
          ¿Necesitas una demo o cotización multi-sucursal? Escríbenos a{' '}
          <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400 hover:underline">restauros@atomicmail.io</a>
        </p>
      </section>

      {/* ── Preguntas frecuentes (estilo Fudo) ── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-20 scroll-mt-24">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">Preguntas frecuentes</h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">Lo que más nos preguntan antes de empezar con FoodIX.</p>
        </Reveal>
        <Reveal className="mt-10 space-y-3">
          {FAQ.map(item => (
            <details
              key={item.q}
              className="group rounded-2xl border border-stone-200 bg-white px-5 py-1 transition-colors open:border-amber-200 hover:border-stone-300 dark:border-white/10 dark:bg-[#0a0a0a] dark:open:border-amber-500/40 dark:hover:border-white/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-stone-900 dark:text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronRight className="h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="pb-4 text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ── CTA ── */}
      <section id="contacto" className="max-w-6xl mx-auto px-5 pb-20 scroll-mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#1C1917] px-8 py-14 text-center">
            <div className="pointer-events-none absolute -top-16 -right-10 h-60 w-60 rounded-full bg-[#FACC15]/30 blur-3xl animate-blob" />
            <h2 className="relative font-heading font-extrabold text-3xl sm:text-4xl text-white">Empieza a ordenar la operación de tu restaurante</h2>
            <p className="relative mt-3 text-stone-300 max-w-lg mx-auto">
              FoodIX te ayuda a trabajar con más control, menos errores y una experiencia moderna para tu equipo.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <BrandButton href="/register"><Sparkles className="h-4 w-4" /> {TRIAL_CTA.landing}</BrandButton>
              <ExtButton href={DEMO_URL} variant="dark"><PlayCircle className="h-4 w-4" /> Ver demostración</ExtButton>
              <GhostButton href="#kioskos" className="border-white/20 text-white hover:bg-white/10"><Monitor className="h-4 w-4" /> Equipo POS / Kiosko completo</GhostButton>
              <GhostButton href="#modulos" className="border-white/20 text-white hover:bg-white/10">Ver módulos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></GhostButton>
            </div>
          </div>
        </Reveal>

        {/* Formulario de contacto / cotización */}
        <Reveal>
          <div className="mt-12">
            <ContactForm />
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-100 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <Wordmark />
            <p className="mt-3 text-sm text-stone-500 max-w-xs leading-relaxed">
              El sistema operativo para tu restaurante. Pedidos, cocina, caja, inventario y reportes en la nube.
            </p>
            <p className="mt-4 text-sm text-stone-500">
              ✉️ Contacto:{' '}
              <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400 font-medium hover:underline">
                restauros@atomicmail.io
              </a>
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Producto</p>
            <ul className="space-y-2 text-sm text-stone-600 dark:text-zinc-400">
              <li><a href="#beneficios" onClick={(e) => handleAnchorNavigation(e, '#beneficios')} className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Beneficios</a></li>
              <li><a href="#pantallas" onClick={(e) => handleAnchorNavigation(e, '#pantallas')} className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Pantallas</a></li>
              <li><a href="#modulos" onClick={(e) => handleAnchorNavigation(e, '#modulos')} className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Módulos</a></li>
              <li><a href="#precios" onClick={(e) => handleAnchorNavigation(e, '#precios')} className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Precios</a></li>
              <li><Link href="/register" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Crear cuenta gratis</Link></li>
              <li><Link href="/login" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Recursos</p>
            <ul className="space-y-2 text-sm text-stone-600 dark:text-zinc-400">
              <li><Link href="/manual" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Manual de usuario</Link></li>
              <li><Link href="/privacidad" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Privacidad</Link></li>
              <li><Link href="/terminos" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Términos</Link></li>
              <li><Link href="/cookies" className="hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-100 dark:border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <a href={DEVHIVE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors group dark:text-zinc-400 dark:hover:text-white">
              <Image src="https://i.ibb.co/j9vRcWRb/logo-img1.png" alt="CodexFight" width={20} height={20} className="rounded-sm group-hover:scale-110 transition-transform" unoptimized />
              <span className="font-semibold">CodexFight</span>
              <span className="text-stone-400">· 2026 · Todos los derechos reservados</span>
            </a>
            <div className="flex items-center gap-4">
              <CountrySelector />
              <a href={DEVHIVE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 hover:underline">
                codexfight.com →
              </a>
            </div>
          </div>
        </div>
      </footer>

      <PlanDetailsModal plan={detailPlan} onClose={() => setDetailPlan(null)} />
      <ChatbotWidget />
    </div>
  )
}

/* ─── Leyenda "Próximamente" para las funciones de WhatsApp + AI ─── */
function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold leading-tight text-amber-700',
        'dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300',
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">WhatsApp + AI · <span className="whitespace-nowrap">Próximamente</span></span>
    </span>
  )
}

/* ─── Modal de detalles de plan ─── */
function PlanDetailsModal({ plan, onClose }: { plan: LandingPlan | null; onClose: () => void }) {
  useEffect(() => {
    if (!plan) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [plan, onClose])

  if (!plan) return null
  const pct = planDiscountPct(plan)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:w-[600px] max-h-[88vh] sm:max-h-[88vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-modal-enter dark:bg-[#0a0a0a]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={plan.name}
      >
        {/* Handle (mobile) — también cierra al tocarlo */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 w-full"
        >
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </button>

        {/* Encabezado */}
        <div className="shrink-0 px-6 pt-4 sm:pt-6 pb-4 border-b border-stone-100 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {plan.featured && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FACC15] text-stone-950 mb-1.5">
                  <Star className="h-3 w-3 fill-stone-950" /> Más popular
                </span>
              )}
              <h3 className="font-heading font-extrabold text-2xl text-stone-900 leading-tight dark:text-white">{plan.name}</h3>
              <p className="text-sm text-stone-500 mt-0.5 dark:text-zinc-400">{plan.tagline}</p>
              {plan.comingSoon && <ComingSoonBadge className="mt-2" />}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors dark:bg-[#161616] dark:hover:bg-white/10 dark:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Precio promo */}
          <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
            {plan.originalPrice && (
              <span className="text-base text-stone-400 line-through">{formatPlanPrice(plan.originalPrice)}</span>
            )}
            <span className="font-heading font-extrabold text-4xl text-yellow-700 dark:text-yellow-400 leading-none">{formatPlanPrice(plan.price)}</span>
            <span className="text-stone-500 text-sm mb-0.5">MXN / mes · incluye 1 sucursal · IVA incluido</span>
            {pct > 0 && (
              <span className="inline-flex items-center text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-green-100 text-green-700">-{pct}% promo</span>
            )}
          </div>
          {plan.perBranch && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 dark:bg-amber-500/10 dark:border-amber-500/20">
              <Star className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>¿Más sucursales? Cada sucursal adicional suma <span className="whitespace-nowrap">+{formatPlanPrice(plan.perBranch)} MXN/mes</span> a tu suscripción.</span>
            </p>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-sm text-stone-600 leading-relaxed dark:text-zinc-400">{plan.summary}</p>

          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Todo lo que incluye</p>
            <ul className="space-y-2.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-zinc-300">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Cómo funciona y extras</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {plan.highlights.map(h => (
                <div key={h.title} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-2xl leading-none">{h.icon}</div>
                  <p className="mt-2 font-bold text-sm text-stone-900 dark:text-white">{h.title}</p>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed dark:text-zinc-400">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          className="shrink-0 border-t border-stone-100 bg-white px-6 pt-3 pb-5 dark:border-white/10 dark:bg-[#0a0a0a]"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {plan.available === false ? (
            <UnavailableButton>Disponible próximamente · {formatPlanPrice(plan.price)}/mes</UnavailableButton>
          ) : (
            <BrandButton href={`/landing/checkout?plan=${plan.id}`} className="w-full">
              Contratar {plan.name.replace('FoodIX ', '')} · {formatPlanPrice(plan.price)}/mes <ArrowRight className="h-4 w-4" />
            </BrandButton>
          )}
        </div>
      </div>
    </div>
  )
}
