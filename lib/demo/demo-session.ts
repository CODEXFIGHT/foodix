/**
 * FoodIX — Modo Demo
 * Sesión demo POR PESTAÑA (sessionStorage), para que una pestaña pueda ser
 * Mesero y otra Cocina al mismo tiempo. Nunca reutiliza tokens reales ni
 * consulta el backend real.
 *
 * Incluye la lógica de "prueba gratis de 30 minutos": cada sesión guarda su
 * inicio y expiración exactos; al vencer (o al hacer logout) se purgan TODOS
 * los datos demo del navegador.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  DEMO_TRIAL_MS,
  type DemoEndReason,
  type DemoRole,
  type DemoSession,
} from './demo-types'
import { getDemoUser, DEMO_RESTAURANT_NAME } from './demo-seed'
import { DEMO_KEYS, purgeAll, resetState } from './demo-storage'

function hasSession(): boolean {
  return typeof window !== 'undefined' && !!window.sessionStorage
}

/** Construye (sin persistir) una sesión demo de 30 min para un rol. */
export function createDemoSession(role: DemoRole): DemoSession {
  const user = getDemoUser(role)
  const startedAt = Date.now()
  return {
    isDemo: true,
    role,
    demoRole: role,
    userId: user.id,
    userName: user.name,
    demoStartedAt: startedAt,
    demoExpiresAt: startedAt + DEMO_TRIAL_MS,
    demoRestaurantName: DEMO_RESTAURANT_NAME,
    startedAt,
  }
}

function persist(session: DemoSession): DemoSession {
  if (hasSession()) {
    try {
      window.sessionStorage.setItem(DEMO_KEYS.session, JSON.stringify(session))
    } catch {
      /* modo privado: la sesión vive en memoria mientras dure la pestaña */
    }
  }
  return session
}

/** Lee la sesión demo de esta pestaña. Devuelve null si no existe o ya venció. */
export function getDemoSession(): DemoSession | null {
  if (!hasSession()) return null
  try {
    const raw = window.sessionStorage.getItem(DEMO_KEYS.session)
    if (!raw) return null
    const session = JSON.parse(raw) as Partial<DemoSession>
    // Compat: sesiones antiguas sin campos de prueba.
    if (typeof session.demoExpiresAt !== 'number' || typeof session.role !== 'string') {
      return null
    }
    if (Date.now() >= session.demoExpiresAt) {
      // Vencida al cargar la app: limpiar todo y reportar sin sesión.
      endDemoTrial('expired')
      return null
    }
    return session as DemoSession
  } catch {
    return null
  }
}

/** ¿Hay una sesión demo viva (no vencida) en esta pestaña? */
export function isDemoSessionActive(): boolean {
  return getDemoSession() !== null
}

/** Milisegundos restantes de la prueba (0 si no hay sesión o ya venció). */
export function getDemoRemainingMs(): number {
  const session = getDemoSession()
  if (!session) return 0
  return Math.max(0, session.demoExpiresAt - Date.now())
}

/**
 * Inicia una prueba demo nueva para un rol: reinicia los datos demo al seed
 * y crea una sesión de 30 minutos. Es el punto de entrada desde el login.
 */
export function startDemoTrial(role: DemoRole): DemoSession {
  resetState() // datos frescos "Restaurante Demo La Naranja"
  return persist(createDemoSession(role))
}

/**
 * Fija (o cambia) el rol de la sesión demo de esta pestaña SIN reiniciar el
 * cronómetro: si ya hay una prueba activa, conserva su inicio/expiración; si
 * no, arranca una prueba nueva. Lo usan los paneles al navegar entre roles.
 */
export function setDemoSession(role: DemoRole): DemoSession {
  const current = getDemoSession()
  if (!current) return startDemoTrial(role)
  const user = getDemoUser(role)
  return persist({
    ...current,
    role,
    demoRole: role,
    userId: user.id,
    userName: user.name,
  })
}

/** Borra solo la sesión de rol de esta pestaña (no los datos demo). */
export function clearDemoSession(): void {
  if (hasSession()) window.sessionStorage.removeItem(DEMO_KEYS.session)
}

/**
 * Termina la prueba demo: limpia sesión y TODOS los datos demo del navegador.
 * Se invoca en logout, expiración o cierre. Nunca toca datos reales.
 */
export function endDemoTrial(_reason: DemoEndReason = 'manual'): void {
  clearDemoSession()
  purgeAll()
}
