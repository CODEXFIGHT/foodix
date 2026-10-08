/**
 * FoodIX — Sistema de gestión para restaurantes
 * Prueba gratuita: copy y utilidades de presentación.
 *
 * ÚNICA fuente del mensaje comercial ("14 días gratis · Acceso completo · Sin
 * tarjeta") y del cálculo visual de días. Los cálculos de aquí son SOLO para
 * la interfaz: la autorización la decide el backend (ver SubscriptionGuard y
 * php-backend/config/trial_service.php).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

/** Días de la prueba. Debe coincidir con TRIAL_DAYS del backend PHP. */
export const TRIAL_DAYS = 14

/** Línea de garantías que acompaña a cada CTA de prueba. */
export const TRIAL_PERKS = ['14 días gratis', 'Acceso completo', 'Sin tarjeta'] as const

export const TRIAL_PERKS_LINE = TRIAL_PERKS.join(' · ')

export const TRIAL_CTA = {
  landing:   'Comenzar prueba gratis',
  nav:       'Probar gratis',
  login:     'Crear cuenta gratis',
  register:  'Crear mi cuenta gratis',
  section:   'Empezar mis 14 días gratis',
  plans:     'Ver planes',
} as const

export const TRIAL_COPY = {
  heroTitle:    'Prueba FoodIX gratis durante 14 días',
  heroSub:
    'Gestiona pedidos, operación, equipo y herramientas de tu restaurante desde una sola plataforma. ' +
    'Descubre todo FoodIX durante 14 días, sin tarjeta y sin compromiso.',
  registerTitle: 'Empieza gratis con FoodIX',
  registerSub:
    'Prueba todas las herramientas de FoodIX durante 14 días. Sin tarjeta y sin compromiso.',
  expiredTitle: 'Tu prueba gratuita ha terminado',
  expiredBody:
    'Tus 14 días de prueba gratuita de FoodIX han finalizado. Tus datos permanecen seguros. ' +
    'Elige un plan para continuar utilizando FoodIX.',
  activeTitle: 'Tu prueba gratuita está activa',
  activeBody:  'Ya tienes acceso completo a FoodIX durante 14 días.',
  notEligible:
    'Detectamos que ya se utilizó una prueba gratuita asociada a esta cuenta o negocio. ' +
    'Puedes elegir un plan para continuar utilizando FoodIX.',
} as const

/**
 * Días calendario que faltan para una fecha (0 = vence hoy, negativo = pasó).
 * Se usa solo como respaldo cuando el backend no envió `days_remaining`.
 */
export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null
  const end = new Date(dateIso.replace(' ', 'T'))
  if (isNaN(end.getTime())) return null
  const now = new Date()
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const n = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((e - n) / 86_400_000)
}

/** "12 días restantes" · "Último día" · "Termina hoy". */
export function trialDaysLabel(days: number | null): string {
  if (days === null) return 'Prueba gratuita'
  if (days < 0) return 'Prueba finalizada'
  if (days === 0) return 'Último día de prueba'
  if (days === 1) return '1 día restante'
  return `${days} días restantes`
}

/** Fecha larga en es-MX: "3 de septiembre". */
export function trialEndLabel(dateIso: string | null | undefined): string {
  if (!dateIso) return ''
  const d = new Date(dateIso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(d)
}

/** Fecha corta DD/MM/YYYY para la pantalla de confirmación. */
export function trialDateShort(dateIso: string | null | undefined): string {
  if (!dateIso) return '—'
  const d = new Date(dateIso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

/**
 * Urgencia visual del aviso. La visibilidad crece conforme se acerca el final,
 * sin volverse molesta: de 14 a 8 días ni siquiera se muestra banner (solo el
 * badge discreto del Topbar).
 */
export type TrialUrgency = 'none' | 'info' | 'warning' | 'critical'

export function trialUrgency(days: number | null): TrialUrgency {
  if (days === null) return 'none'
  if (days <= 1) return 'critical'
  if (days <= 3) return 'warning'
  if (days <= 7) return 'info'
  return 'none'
}
