'use client'

/**
 * FoodIX — Sección: galería de fotos reales.
 * Mezcla de fotografía real de equipos (kioskos, terminal POS, impresora)
 * y escenas reales de operación, en un masonry responsive por columnas CSS.
 */

import Image from 'next/image'
import { Camera } from 'lucide-react'
import { Reveal } from './Reveal'

const GALLERY = [
  {
    key: 'pos-terminal',
    src: '/assets/screenshots/real-pos-terminal.png',
    alt: 'Terminal POS real operando FoodIX en el mostrador',
    caption: 'Terminal POS en el mostrador',
    aspect: 'aspect-square',
  },
  {
    key: 'kiosko-higole',
    src: '/assets/kiosk/kiosk-higole-front.webp',
    alt: 'Kiosko Higole all-in-one instalado con FoodIX',
    caption: 'Kiosko all-in-one Higole',
    aspect: 'aspect-[4/3]',
  },
  {
    key: 'cafe',
    src: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    alt: 'Interior de una cafetería moderna lista para operar',
    caption: 'Salón listo para el servicio',
    aspect: 'aspect-[4/3]',
  },
  {
    key: 'tablet-android',
    src: '/assets/kiosk/android-tablet-restauros.webp',
    alt: 'Tablet Android con FoodIX instalado como app nativa',
    caption: 'Tablet Android con app nativa',
    aspect: 'aspect-[3/4]',
  },
  {
    key: 'comedor',
    src: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
    alt: 'Restaurante con mesas ocupadas durante el servicio',
    caption: 'Comedor en plena operación',
    aspect: 'aspect-[4/3]',
  },
  {
    key: 'impresora',
    src: '/assets/screenshots/pos-printer.png',
    alt: 'Impresora ESC/POS imprimiendo un ticket de FoodIX',
    caption: 'Impresora ESC/POS de tickets',
    aspect: 'aspect-[8/5]',
  },
  {
    key: 'kiosko-demo',
    src: '/assets/kiosk/kiosk-restauros-demo.webp',
    alt: 'Kiosko de autoservicio mostrando FoodIX',
    caption: 'Kiosko de autoservicio',
    aspect: 'aspect-[4/3]',
  },
  {
    key: 'cobro',
    src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    alt: 'Cliente pagando con tarjeta en el mostrador del restaurante',
    caption: 'Cobro en mesa con tarjeta',
    aspect: 'aspect-[4/3]',
  },
  {
    key: 'ticket-movil',
    src: '/assets/screenshots/waiter-ticket-mobile.png',
    alt: 'Ticket y cuenta de FoodIX vistos desde el celular',
    caption: 'Cuenta y ticket desde el celular',
    aspect: 'aspect-[3/4]',
  },
]

export function RealGallerySection() {
  return (
    <section id="galeria" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
      <Reveal className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
          <Camera className="h-3.5 w-3.5" /> Galería real
        </span>
        <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">
          Así se ve FoodIX en equipos reales
        </h2>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Fotografía real de terminales, kioskos y salones en operación. Nada de mockups inventados.
        </p>
      </Reveal>

      <Reveal className="mt-10" delay={80}>
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {GALLERY.map(item => (
            <figure key={item.key} className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`relative ${item.aspect} w-full`}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 32vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pb-3 pt-8 text-xs font-semibold text-white">
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
