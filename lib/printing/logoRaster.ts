/**
 * FoodIX — Rasterización de logotipo a ESC/POS
 * Convierte una imagen (data URL) en un comando de imagen rasterizada
 * GS v 0 monocromo, listo para enviarse a una impresora térmica.
 * Solo funciona en el navegador / WebView (usa <canvas>).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { PaperWidth } from './escpos'

// Ancho útil de puntos por ancho de papel térmico.
const MAX_DOTS: Record<PaperWidth, number> = { 58: 384, 80: 576 }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar el logotipo'))
    img.src = src
  })
}

/**
 * Rasteriza el logo a bytes ESC/POS (GS v 0). Devuelve un arreglo de bytes que
 * incluye el comando completo (cabecera + datos), centrado por el ancho real.
 * Si algo falla (sin canvas, imagen inválida), devuelve null.
 */
export async function rasterizeLogoToEscPos(
  dataUrl: string,
  paperWidth: PaperWidth,
): Promise<number[] | null> {
  if (typeof document === 'undefined') return null
  try {
    const img = await loadImage(dataUrl)
    if (!img.width || !img.height) return null

    const maxDots = MAX_DOTS[paperWidth]
    // Ancho final múltiplo de 8 (requisito del formato), sin exceder el papel, tope en 200 para logo pequeño.
    let width = Math.min(img.width, maxDots, 200)
    width = Math.max(8, Math.floor(width / 8) * 8)
    const height = Math.max(1, Math.round(img.height * (width / img.width)))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Fondo blanco para que la transparencia no salga negra.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const { data } = ctx.getImageData(0, 0, width, height)
    const bytesPerRow = width / 8

    const out: number[] = [
      0x1d, 0x76, 0x30, 0x00,            // GS v 0 m=0
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
    ]

    for (let y = 0; y < height; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          const idx = (y * width + x) * 4
          const a = data[idx + 3]
          // Transparente = blanco. Umbral por luminancia.
          const lum = a < 128
            ? 255
            : 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          if (lum < 160) byte |= 0x80 >> bit
        }
        out.push(byte)
      }
    }
    return out
  } catch {
    return null
  }
}
