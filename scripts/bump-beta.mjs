#!/usr/bin/env node
/**
 * RestaurOS — Auto-incremento de versión beta.
 * Sube el número de beta en package.json (1.0.0-beta.N → 1.0.0-beta.(N+1)) y
 * mantiene en sincronía el fallback de lib/constants/version.ts.
 *
 * Lo ejecuta el hook .githooks/pre-commit cada vez que se hace commit en master,
 * de modo que la versión mostrada en el login sube sola en cada subida.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')
const verPath = join(root, 'lib', 'constants', 'version.ts')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const current = String(pkg.version ?? '1.0.0-beta.0')

const m = current.match(/^(\d+\.\d+\.\d+)-beta\.(\d+)$/)
if (!m) {
  // Sin patrón beta reconocible: no tocar nada para no romper la versión.
  console.error(`[bump-beta] versión "${current}" no es beta.N; se omite el incremento.`)
  process.exit(0)
}

const next = `${m[1]}-beta.${Number(m[2]) + 1}`
pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// Mantener el fallback de version.ts igual al package.json (por si se importa
// fuera del bundle de Next, en tests o scripts).
try {
  let ver = readFileSync(verPath, 'utf8')
  ver = ver.replace(/(APP_VERSION_RAW = process\.env\.NEXT_PUBLIC_APP_VERSION \?\? ')[^']+(')/, `$1${next}$2`)
  writeFileSync(verPath, ver)
} catch {
  /* version.ts opcional: si no existe, solo se actualiza package.json */
}

console.log(`[bump-beta] ${current} → ${next}`)
