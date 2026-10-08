'use client'

import { useEffect, useState } from 'react'

/**
 * Fondo full-screen rotativo de imágenes de restaurantes (stock Unsplash)
 * con crossfade y opacidad 0.3. Usa background CSS (cover) para ser responsive
 * y no depender de next/image. Decorativo: pointer-events-none + aria-hidden.
 */
const IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=70',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1920&q=70',
]

const INTERVAL_MS = 6000

export function LoginBackground() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Precargar para que el crossfade no parpadee
    IMAGES.forEach(src => { const img = new Image(); img.src = src })
    const id = setInterval(() => setIndex(i => (i + 1) % IMAGES.length), INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{ backgroundImage: `url(${src})`, opacity: i === index ? 0.3 : 0 }}
        />
      ))}
      {/* Velo para mantener legibilidad del formulario sobre cualquier imagen */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/40 to-background/10" />
    </div>
  )
}
