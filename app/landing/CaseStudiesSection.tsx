'use client'

/**
 * FoodIX — Sección: casos de éxito con métricas.
 * Cada caso muestra una captura real del sistema, tres cifras de impacto
 * y la cita del negocio. Mobile-first: 1 col → 2 → 3.
 */

import Image from 'next/image'
import { Trophy, Quote } from 'lucide-react'
import { Reveal } from './Reveal'

const CASES = [
  {
    key: 'la-bruma',
    name: 'Cafetería La Bruma',
    location: 'Guadalajara · Cafetería',
    img: '/assets/screenshots/menu-qr-mobile.png',
    alt: 'Carta digital con QR de FoodIX en el celular de un comensal',
    metrics: [
      { value: '+23%', label: 'ticket promedio' },
      { value: '−40%', label: 'tiempo de cobro' },
      { value: '0', label: 'tickets perdidos' },
    ],
    quote: 'Antes perdíamos tickets y la cocina se atascaba. Con FoodIX cada orden llega al instante.',
  },
  {
    key: 'el-guero',
    name: 'Taquería El Güero',
    location: 'Monterrey · Comida rápida',
    img: '/assets/screenshots/waiter-order-mobile.png',
    alt: 'Mesero tomando un pedido de FoodIX desde su celular',
    metrics: [
      { value: '−31%', label: 'merma de insumos' },
      { value: '+18%', label: 'ventas del mes' },
      { value: '2×', label: 'velocidad en pase' },
    ],
    quote: 'Los reportes me dicen qué platillo deja más y qué horas lleno. Bajé la merma en dos semanas.',
  },
  {
    key: 'restaurante-nube',
    name: 'Restaurante Nube',
    location: 'CDMX · 3 sucursales',
    img: '/assets/screenshots/admin-orders-desktop.png',
    alt: 'Panel de órdenes activas de FoodIX en escritorio',
    metrics: [
      { value: '3', label: 'sucursales, 1 panel' },
      { value: '2.4×', label: 'pedidos por hora' },
      { value: '100%', label: 'reportes automáticos' },
    ],
    quote: 'Configuramos la carta en una tarde y al día siguiente ya cobrábamos desde la tablet.',
  },
]

export function CaseStudiesSection() {
  return (
    <section id="casos" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
      <Reveal className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
          <Trophy className="h-3.5 w-3.5" /> Casos de éxito
        </span>
        <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">
          Resultados reales, no promesas
        </h2>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Tres negocios, tres retos distintos y las cifras que cambiaron después de operar con FoodIX.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c, i) => (
          <Reveal key={c.key} delay={i * 90}>
            <article className="group h-full flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all hover:shadow-lg hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#0a0a0a]">
              {/* Captura real del sistema */}
              <div className="relative aspect-[16/10] overflow-hidden border-b border-stone-100 bg-stone-50 dark:border-white/5 dark:bg-white/[0.03]">
                <Image
                  src={c.img}
                  alt={c.alt}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 32vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#FACC15] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-950 shadow-sm">
                  Caso real
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-heading font-bold text-stone-900 dark:text-white">{c.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">{c.location}</p>

                {/* Métricas */}
                <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-stone-100 py-4 dark:border-white/5">
                  {c.metrics.map(m => (
                    <div key={m.label} className="text-center">
                      <dt className="sr-only">{m.label}</dt>
                      <dd className="font-heading font-extrabold text-xl sm:text-2xl leading-none text-yellow-700 dark:text-yellow-400">{m.value}</dd>
                      <p className="mt-1 text-[10px] leading-tight text-stone-500 dark:text-zinc-400">{m.label}</p>
                    </div>
                  ))}
                </dl>

                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
                  <Quote className="h-4 w-4 mb-1 text-[#EAB308]" aria-hidden="true" />
                  “{c.quote}”
                </blockquote>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
