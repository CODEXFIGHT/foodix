/**
 * FoodIX — Sistema de gestión para restaurantes
 * Diccionario centralizado de errores humanizados: cada código del backend
 * mapea a un título, mensaje y acciones en español, sin jerga técnica.
 * Cero mensajes crudos de MySQL/HTTP llegan hasta aquí — eso se filtra en
 * lib/api/client.ts antes de que un ApiError llegue a este catálogo.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  AlertTriangle, PackageX, LogIn, ShieldAlert, Users, Rocket, WifiOff,
} from 'lucide-react'
import type { ErrorCatalogEntry, ErrorContext, Resolvable, ResolvedErrorEntry } from './types'

function ctxString(context: ErrorContext, key: string): string | undefined {
  const value = context[key]
  return typeof value === 'string' ? value : undefined
}

function ctxNumber(context: ErrorContext, key: string): number | undefined {
  const value = context[key]
  return typeof value === 'number' ? value : undefined
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'superadministrador',
  admin: 'administrador',
  mesero: 'mesero',
  cocina: 'cocina',
}

/** Espejo de las etiquetas de SUPERADMIN_PLANS (lib/constants/subscription.ts). */
const PLAN_DISPLAY_LABEL: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  pro: 'Pro',
  ai: 'AI',
  multisucursal: 'MultiSucursal',
}

export const errorCatalog = {
  MESA_ORDEN_ABIERTA: {
    titulo: 'Esa mesa ya tiene una orden abierta',
    mensaje: (ctx) => {
      const mesa = ctxString(ctx, 'mesaNombre') ?? (ctxNumber(ctx, 'mesaId') != null ? `Mesa ${ctxNumber(ctx, 'mesaId')}` : 'Esta mesa')
      return `${mesa} ya tiene un pedido en curso. ¿Quieres agregar productos a esa orden o cerrarla primero?`
    },
    severidad: 'advertencia',
    icono: AlertTriangle,
    acciones: [
      { label: 'Agregar a la orden existente', tipo: 'primary', onClick: 'ADD_TO_EXISTING' },
      { label: 'Cerrar orden actual', tipo: 'secondary', onClick: 'CLOSE_CURRENT' },
      { label: 'Cancelar', tipo: 'ghost', onClick: 'DISMISS' },
    ],
  },

  PRODUCTO_SIN_INVENTARIO: {
    titulo: 'Ese producto no tiene inventario disponible',
    mensaje: (ctx) => {
      const producto = ctxString(ctx, 'productoNombre') ?? 'El producto'
      const sustituto = ctxString(ctx, 'sustitutoNombre')
      return sustituto
        ? `${producto} está agotado. Puedes ofrecer "${sustituto}" en su lugar.`
        : `${producto} está agotado por ahora.`
    },
    severidad: 'advertencia',
    icono: PackageX,
    acciones: (ctx) => {
      const sustituto = ctxString(ctx, 'sustitutoNombre')
      const acciones = []
      if (sustituto) acciones.push({ label: `Usar "${sustituto}"`, tipo: 'primary' as const, onClick: 'ADD_SUBSTITUTE' })
      acciones.push({ label: 'Quitar del pedido', tipo: sustituto ? 'secondary' as const : 'primary' as const, onClick: 'REMOVE_ITEM' })
      acciones.push({ label: 'Cancelar', tipo: 'ghost' as const, onClick: 'DISMISS' })
      return acciones
    },
  },

  SESION_EXPIRADA: {
    titulo: 'Tu sesión terminó',
    mensaje: 'Por seguridad cerramos tu sesión por inactividad. Tus productos en el carrito siguen ahí — solo vuelve a iniciar sesión.',
    severidad: 'advertencia',
    icono: LogIn,
    acciones: [
      { label: 'Reconectar', tipo: 'primary', onClick: 'RECONNECT' },
      { label: 'Cerrar sesión', tipo: 'ghost', onClick: 'LOGOUT' },
    ],
  },

  PERMISO_INSUFICIENTE: {
    titulo: 'Esta acción necesita otro rol',
    mensaje: (ctx) => {
      const requerido = ctxString(ctx, 'rolRequerido')
      const label = requerido ? ROLE_LABEL[requerido] ?? requerido : 'un rol distinto'
      return `Esta acción está reservada para ${label}. Pide ayuda a alguien con ese acceso.`
    },
    severidad: 'advertencia',
    icono: ShieldAlert,
    acciones: [
      { label: 'Entendido', tipo: 'primary', onClick: 'DISMISS' },
    ],
  },

  CONFLICTO_EDICION_CONCURRENTE: {
    titulo: 'Alguien más ya lo actualizó',
    mensaje: (ctx) => {
      const quien = ctxString(ctx, 'modificadoPor')
      return quien
        ? `${quien} actualizó esto mientras lo editabas. Revisa los cambios antes de continuar.`
        : 'Otra persona actualizó esto mientras lo editabas. Revisa los cambios antes de continuar.'
    },
    severidad: 'advertencia',
    icono: Users,
    acciones: [
      { label: 'Ver cambios', tipo: 'primary', onClick: 'VIEW_CHANGES' },
      { label: 'Sobrescribir con mis cambios', tipo: 'secondary', onClick: 'OVERWRITE_MINE' },
      { label: 'Cancelar', tipo: 'ghost', onClick: 'DISMISS' },
    ],
  },

  LIMITE_SUSCRIPCION_ALCANZADO: {
    titulo: 'Llegaste al límite de tu plan',
    mensaje: (ctx) => {
      const recurso = ctxString(ctx, 'recurso') ?? 'elementos'
      const limite = ctxNumber(ctx, 'limite')
      return limite != null
        ? `Tu plan actual permite hasta ${limite} ${recurso}. Mejora tu plan para seguir creciendo sin límites.`
        : `Alcanzaste el límite de ${recurso} de tu plan actual. Mejora tu plan para seguir creciendo sin límites.`
    },
    severidad: 'critico',
    icono: Rocket,
    acciones: (ctx) => ctx.viewerRole === 'admin' || ctx.viewerRole === 'superadmin'
      ? [
          { label: 'Mejorar plan', tipo: 'primary' as const, onClick: 'UPGRADE_PLAN' },
          { label: 'Cancelar', tipo: 'ghost' as const, onClick: 'DISMISS' },
        ]
      : [
          { label: 'Avisar al administrador', tipo: 'primary' as const, onClick: 'DISMISS' },
        ],
  },

  FUNCION_NO_DISPONIBLE_PLAN: {
    titulo: 'Esta función no está en tu plan actual',
    mensaje: (ctx) => {
      const funcion = ctxString(ctx, 'funcion') ?? 'Esta función'
      const planSugerido = ctxString(ctx, 'planSugerido')
      const planLabel = planSugerido ? PLAN_DISPLAY_LABEL[planSugerido] ?? planSugerido : null
      return planLabel
        ? `${funcion} está disponible en FoodIX ${planLabel}. Actualiza tu plan para desbloquearla.`
        : `${funcion} no está incluida en tu plan actual.`
    },
    severidad: 'critico',
    icono: Rocket,
    acciones: (ctx) => ctx.viewerRole === 'admin' || ctx.viewerRole === 'superadmin'
      ? [
          { label: 'Actualizar plan', tipo: 'primary' as const, onClick: 'UPGRADE_PLAN' },
          { label: 'Cancelar', tipo: 'ghost' as const, onClick: 'DISMISS' },
        ]
      : [
          { label: 'Avisar al administrador', tipo: 'primary' as const, onClick: 'DISMISS' },
        ],
  },

  ERROR_RED: {
    titulo: 'Sin conexión con el servidor',
    mensaje: 'Ya intentamos reconectar varias veces automáticamente y no se pudo. Revisa tu conexión.',
    severidad: 'advertencia',
    icono: WifiOff,
    acciones: [
      { label: 'Reintentar', tipo: 'primary', onClick: 'RETRY' },
      { label: 'Cancelar', tipo: 'ghost', onClick: 'DISMISS' },
    ],
  },
} as const satisfies Record<string, ErrorCatalogEntry>

export type ErrorCode = keyof typeof errorCatalog

/** Fallback para códigos no catalogados: nunca un mensaje técnico crudo. */
const FALLBACK_ENTRY: ErrorCatalogEntry = {
  titulo: 'Algo no salió como esperábamos',
  mensaje: 'Intenta de nuevo en un momento. Si sigue fallando, contacta a soporte.',
  severidad: 'advertencia',
  icono: AlertTriangle,
  acciones: [
    { label: 'Entendido', tipo: 'primary', onClick: 'DISMISS' },
  ],
}

function resolve<T>(value: Resolvable<T>, context: ErrorContext): T {
  return typeof value === 'function' ? (value as (c: ErrorContext) => T)(context) : value
}

/**
 * Resuelve un código crudo (del backend, puede venir vacío/desconocido) contra
 * el catálogo, aplicando el contexto a los campos dinámicos. Códigos fuera del
 * catálogo caen siempre al fallback genérico — nunca se muestra un código o
 * mensaje técnico sin pasar por este filtro.
 */
export function resolveErrorEntry(
  rawCode: string | undefined,
  context: ErrorContext = {},
): { code: ErrorCode | 'DESCONOCIDO'; entry: ResolvedErrorEntry; rawCode: string | undefined } {
  const isKnown = !!rawCode && Object.prototype.hasOwnProperty.call(errorCatalog, rawCode)
  const code = isKnown ? (rawCode as ErrorCode) : 'DESCONOCIDO'
  const source: ErrorCatalogEntry = isKnown ? errorCatalog[rawCode as ErrorCode] : FALLBACK_ENTRY

  return {
    code,
    rawCode,
    entry: {
      titulo: resolve(source.titulo, context),
      mensaje: resolve(source.mensaje, context),
      severidad: source.severidad,
      icono: source.icono,
      acciones: resolve(source.acciones, context),
    },
  }
}
