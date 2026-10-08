/**
 * FoodIX — Sistema de gestión para restaurantes
 * Cliente HTTP de la API: fetch con auth, manejo de errores y subida de archivos.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

const BASE_URL = '/backend'
const TOKEN_KEY = 'restauros_token'

/** Envelope de error estandarizado que el backend PHP puede devolver en el body. */
export interface StructuredErrorEnvelope {
  code: string
  message_tecnico?: string
  context?: Record<string, unknown>
}

function asStructuredError(value: unknown): StructuredErrorEnvelope | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as { code?: unknown }
  return typeof candidate.code === 'string' ? (candidate as StructuredErrorEnvelope) : null
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
    /** Código humanizable (lib/errors/errorCatalog.ts), si el backend lo envió. */
    public readonly code?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

let _onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
  _onUnauthorized = fn
}

// Detalle del bloqueo por caja cerrada que recibe el handler global.
export interface CashSessionRequired {
  branch_id: number | null
  pos_id: number | null
}

let _onCashSessionRequired: ((detail: CashSessionRequired) => void) | null = null

/**
 * Registra el handler global que se dispara cuando el backend rechaza una
 * acción crítica por no haber caja abierta (409 `cash_session_required`).
 * Permite abrir el modal de apertura SIN tocar cada punto de cobro.
 */
export function setCashSessionRequiredHandler(
  fn: ((detail: CashSessionRequired) => void) | null,
): void {
  _onCashSessionRequired = fn
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const token = getToken()
  const { auth = true, headers: extraHeaders, ...rest } = options

  const method = (rest.method ?? 'GET').toUpperCase()

  // Identificador del dispositivo (inyectado por la app Flutter o generado por
  // el navegador) para la bitácora de auditoría del backend.
  const deviceUid = typeof window !== 'undefined'
    ? window.localStorage.getItem('restauros_device_uid')
    : null

  // POS lógico bajo el que opera esta terminal: el backend lo usa para resolver
  // el turno de caja correcto (header X-Pos-Id, paralelo a X-Device-Uid).
  const posId = typeof window !== 'undefined'
    ? window.localStorage.getItem('restauros_pos_id')
    : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Evita cachés intermedias (proxy/CDN/navegador) que servían respuestas
    // viejas: sin esto, la lista no se refrescaba tras aprobar/eliminar.
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(deviceUid ? { 'X-Device-Uid': deviceUid } : {}),
    ...(posId ? { 'X-Pos-Id': posId } : {}),
    ...(extraHeaders as Record<string, string> | undefined),
  }

  // El servidor cachea respuestas GET por URL exacta; un parámetro único por
  // petición fuerza siempre datos frescos (clave para el "tiempo real").
  let url = `${BASE_URL}${path}`
  if (method === 'GET') {
    url += (path.includes('?') ? '&' : '?') + `_t=${Date.now()}`
  }

  const res = await fetch(url, { ...rest, headers, cache: 'no-store' })

  if (res.status === 401) {
    const err = await res.json().catch(() => ({})) as { message?: string; error?: unknown }
    const structured = asStructuredError(err.error)
    _onUnauthorized?.()
    // 401 en este backend siempre significa token inválido/revocado (ver
    // checkSession en authStore): se cataloga como SESION_EXPIRADA aunque el
    // backend no mande el envelope estructurado.
    throw new ApiError(401, err.message ?? 'No autorizado', err, structured?.code ?? 'SESION_EXPIRADA', structured?.context)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as {
      message?: string
      error?: string | StructuredErrorEnvelope
      branch_id?: number | null
      pos_id?: number | null
    }
    const structured = asStructuredError(err.error)

    // Caja cerrada (contrato legado: `error` es un string, no el envelope nuevo).
    if (res.status === 409 && err.error === 'cash_session_required') {
      _onCashSessionRequired?.({
        branch_id: err.branch_id ?? null,
        pos_id: err.pos_id ?? null,
      })
    }

    throw new ApiError(
      res.status,
      err.message ?? structured?.message_tecnico ?? 'Error del servidor',
      err,
      structured?.code,
      structured?.context,
    )
  }

  return res.json() as Promise<T>
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  const token = getToken()

  // PHP no parsea cuerpos multipart en PATCH/PUT (solo en POST). Enviamos
  // siempre POST y declaramos el método real con override (_method + header).
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  if (method !== 'POST') {
    formData.append('_method', method)
    headers['X-HTTP-Method-Override'] = method
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    _onUnauthorized?.()
    throw new ApiError(401, 'No autorizado')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(res.status, text || 'Error al subir archivo')
  }

  return res.json() as Promise<T>
}
