/**
 * FoodIX — Descarga del APK Android (siempre la última versión).
 *
 * Lee el índice del directorio público de APKs, detecta los archivos con el
 * patrón `FoodIX_Android_<version>.apk`, elige la versión más alta y redirige
 * al archivo correspondiente. Así el botón de la landing siempre entrega la
 * build más reciente sin tener que actualizar el enlace a mano.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'

// El endpoint siempre se evalúa en el servidor (no se cachea como estático),
// para reflejar de inmediato una nueva versión subida al directorio.
export const dynamic = 'force-dynamic'

const APK_DIR = 'https://tallercheck.mx/restauros/apk'
const FILE_RE = /FoodIX_Android_(\d+(?:\.\d+)*)\.apk/gi

/** Compara dos versiones tipo "1.2.0" segmento a segmento. >0 si a es mayor. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export async function GET() {
  try {
    const res = await fetch(`${APK_DIR}/`, { cache: 'no-store' })
    if (res.ok) {
      const html = await res.text()
      let best: { file: string; version: string } | null = null
      let match: RegExpExecArray | null
      while ((match = FILE_RE.exec(html)) !== null) {
        const file = match[0]
        const version = match[1]
        if (!best || compareVersions(version, best.version) > 0) {
          best = { file, version }
        }
      }
      if (best) {
        return NextResponse.redirect(`${APK_DIR}/${best.file}`, 302)
      }
    }
  } catch {
    // Sin conexión o listado no disponible: caemos al directorio.
  }
  // Respaldo: enviamos al directorio para que el usuario elija manualmente.
  return NextResponse.redirect(`${APK_DIR}/`, 302)
}
