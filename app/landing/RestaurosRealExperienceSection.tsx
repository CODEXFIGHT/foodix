'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, MessageCircle, PlayCircle, Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const POS_IMAGES = [
  'https://tallercheck.mx/restauros/uploads/chica_restauros1.png',
  'https://tallercheck.mx/restauros/uploads/chica_restauros2.png',
  'https://tallercheck.mx/restauros/uploads/chica_restauros3.png',
] as const

const POS_IMAGE_INTERVAL = 2000

const TESTIMONIALS = [
  {
    quote: 'Ahora tomamos pedidos mas rapido y cocina recibe todo al instante, sin tener que repetir comandas.',
    business: 'Restaurante familiar',
    accent: 'Servicio mas agil',
  },
  {
    quote: 'La carta QR y el control de mesas nos ayudaron a reducir errores y dar una experiencia mas ordenada.',
    business: 'Cafeteria local',
    accent: 'Menos errores operativos',
  },
  {
    quote: 'Es facil de usar para meseros, cocina y administracion. El equipo se adapto en muy poco tiempo.',
    business: 'Negocio de comida rapida',
    accent: 'Adopcion inmediata',
  },
] as const

const OPERATIVE_POINTS = [
  'Pedidos, mesas, caja y cocina coordinados en tiempo real.',
  'Interfaz clara para tablets, pantallas tactiles y computadoras.',
  'Listo para restaurantes, taquerias, cafeterias, marisquerias y dark kitchens.',
] as const

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(true)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

export function RestaurosRealExperienceSection({ supportWhatsapp }: { supportWhatsapp: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const imageCardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [isVisible, setIsVisible] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(() => {
      setActiveImage(prev => (prev + 1) % POS_IMAGES.length)
    }, POS_IMAGE_INTERVAL)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.2, rootMargin: '0px 0px -12% 0px' },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const imageCard = imageCardRef.current
    const glow = glowRef.current

    if (!imageCard) return

    if (reducedMotion) {
      imageCard.style.transform = 'none'
      if (glow) glow.style.transform = 'none'
      return
    }

    const updateParallax = () => {
      const section = sectionRef.current
      const currentImageCard = imageCardRef.current
      const currentGlow = glowRef.current

      if (!section || !currentImageCard) return

      const rect = section.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 1
      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height)
      const clamped = Math.min(Math.max(progress, 0), 1)
      const translateY = (clamped - 0.5) * 34
      const rotate = (clamped - 0.5) * 1.8

      currentImageCard.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) rotate(${rotate.toFixed(2)}deg)`
      if (currentGlow) {
        currentGlow.style.transform = `translate3d(0, ${(-translateY * 0.45).toFixed(1)}px, 0) scale(${(1 + clamped * 0.05).toFixed(3)})`
      }
    }

    const scheduleUpdate = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        updateParallax()
      })
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [reducedMotion])

  const animate = !reducedMotion
  const visibleClass = isVisible || !animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'

  return (
    <section
      id="experiencia-real"
      ref={sectionRef}
      className="relative py-20 sm:py-24 scroll-mt-24"
      aria-labelledby="experiencia-real-title"
    >
      <div id="operacion-real" className="scroll-mt-24" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-8 h-64 w-64 -translate-x-[58%] rounded-full bg-[#D1400F]/8 blur-3xl dark:bg-[#D1400F]/10" />
        <div className="absolute -right-10 bottom-4 h-72 w-72 rounded-full bg-stone-200/40 blur-3xl dark:bg-white/5" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-[32px] border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(0,0,0,0.14)] dark:border-white/10 dark:bg-[#0a0a0a] dark:shadow-[0_28px_70px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(209,64,15,0.05),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(209,64,15,0.08),transparent_55%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-black/5 dark:bg-white/10" />

          <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div className={cn('max-w-xl', animate && 'transition-all duration-700 ease-out', visibleClass)}>
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#D1400F] dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                  <span className="h-2 w-2 rounded-full bg-[#D1400F]" />
                  Operacion real en punto de venta
                </span>

                <h2
                  id="experiencia-real-title"
                  className="mt-5 font-heading text-3xl font-extrabold leading-tight text-stone-900 sm:text-4xl dark:text-white"
                >
                  FoodIX se adapta a tu operación real
                </h2>

                <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg dark:text-zinc-300">
                  Administra pedidos, mesas, caja, cocina, menu digital y ventas desde una interfaz moderna
                  diseñada para restaurantes, cafeterias, marisquerias, taquerias y negocios de comida que
                  necesitan velocidad, control y una experiencia profesional frente al cliente.
                </p>

                <p className="mt-4 max-w-lg text-sm leading-7 text-stone-500 sm:text-base dark:text-zinc-400">
                  Desde una pantalla tactil, tablet o computadora, tu equipo puede tomar pedidos, enviarlos a
                  cocina, cobrar, consultar ventas y mantener el negocio bajo control en tiempo real, sin flujos
                  torpes ni pantallas improvisadas.
                </p>

                <ul className="mt-6 space-y-3">
                  {OPERATIVE_POINTS.map((point, index) => (
                    <li
                      key={point}
                      className={cn(
                        'flex items-start gap-3 text-sm leading-6 text-stone-700 dark:text-zinc-300',
                        animate && 'transition-all duration-500 ease-out',
                        visibleClass,
                      )}
                      style={animate ? { transitionDelay: `${160 + index * 90}ms` } : undefined}
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D1400F]/10 text-[#D1400F] ring-1 ring-orange-200/70 dark:bg-[#D1400F]/15 dark:ring-orange-500/20">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <div className={cn('mt-7 flex flex-wrap gap-3', animate && 'transition-all duration-700 ease-out', visibleClass)} style={animate ? { transitionDelay: '320ms' } : undefined}>
                  <a
                    href="#demo"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#D1400F] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#B03508] hover:shadow-md active:scale-95"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Ver demo
                  </a>
                  <a
                    href={supportWhatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white/75 px-6 text-sm font-semibold text-stone-700 backdrop-blur transition-all hover:border-stone-300 hover:bg-white active:scale-95 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/25 dark:hover:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Hablar por WhatsApp
                  </a>
                </div>
              </div>

              <div
                className={cn(
                  'relative',
                  animate && 'transition-all duration-700 ease-out',
                  isVisible || !animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
                )}
                style={animate ? { transitionDelay: '160ms' } : undefined}
              >
                <div className="absolute inset-x-4 top-8 h-48 rounded-full bg-[#D1400F]/15 blur-3xl dark:bg-[#D1400F]/16" ref={glowRef} />
                <div
                  ref={imageCardRef}
                  className="relative mx-auto w-full max-w-[760px] rounded-[28px] border border-stone-200 bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_30px_60px_-24px_rgba(0,0,0,0.28)] will-change-transform dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)]"
                >
                  <div className="relative overflow-hidden rounded-[22px] border border-black/5 bg-stone-100 dark:border-white/10 dark:bg-[#161616]">
                    <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-md">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Operacion en vivo
                    </div>
                    <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/11]">
                      {POS_IMAGES.map((src, index) => (
                        <Image
                          key={src}
                          src={src}
                          alt="FoodIX funcionando en un punto de venta real con una persona del equipo atendiendo"
                          fill
                          priority={index === 0}
                          sizes="(max-width: 768px) 96vw, (max-width: 1280px) 58vw, 760px"
                          className={cn(
                            'object-cover object-center transition-opacity duration-1000 ease-in-out',
                            index === activeImage ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden={index !== activeImage}
                        />
                      ))}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 max-w-[280px] rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-left backdrop-blur-md">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Listo para operar</p>
                        <p className="mt-1 text-sm font-semibold leading-snug text-white">Mesa, cocina, caja y ticket en un solo flujo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <article
                  key={testimonial.business}
                  className={cn(
                    'group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-stone-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:border-orange-500/25 dark:hover:bg-white/7',
                    animate && 'duration-500 ease-out',
                    isVisible || !animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
                  )}
                  style={animate ? { transitionDelay: `${260 + index * 120}ms` } : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">{testimonial.accent}</span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-700 dark:text-zinc-300">
                    "{testimonial.quote}"
                  </p>

                  <div className="mt-5 border-t border-stone-200/80 pt-4 dark:border-white/10">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">{testimonial.business}</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">Usuarios reales de FoodIX</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
