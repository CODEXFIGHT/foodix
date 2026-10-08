/**
 * FoodIX — Sistema de gestión para restaurantes
 * Tipos del sistema de errores humanizados. El código de error (`ErrorCode`)
 * se deriva de las keys de `errorCatalog` — nunca strings sueltos en
 * componentes de negocio (ver lib/errors/errorCatalog.ts).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/lib/types'

export type ErrorSeverity = 'info' | 'advertencia' | 'critico'

export type ErrorActionTone = 'primary' | 'secondary' | 'ghost'

export interface ErrorAction {
  label: string
  tipo: ErrorActionTone
  /** Id de acción, resuelto por quien consume el catálogo (ver `actionHandlers`). */
  onClick: string
}

/**
 * Contexto crudo que viaja con el error (el `context` del backend + metadatos
 * que agrega el propio frontend, como el rol del usuario que lo ve).
 */
export type ErrorContext = Record<string, unknown> & { viewerRole?: UserRole }

/** Un campo del catálogo puede ser estático o depender del contexto (ej. nombre del sustituto, rol requerido). */
export type Resolvable<T> = T | ((context: ErrorContext) => T)

export interface ErrorCatalogEntry {
  titulo: Resolvable<string>
  mensaje: Resolvable<string>
  severidad: ErrorSeverity
  icono: LucideIcon
  acciones: Resolvable<ErrorAction[]>
  /** Si se omite, el error es visible para cualquier rol. */
  rolesVisibles?: UserRole[]
}

/** Misma forma que `ErrorCatalogEntry` pero con los campos ya resueltos contra un contexto concreto. */
export interface ResolvedErrorEntry {
  titulo: string
  mensaje: string
  severidad: ErrorSeverity
  icono: LucideIcon
  acciones: ErrorAction[]
}
