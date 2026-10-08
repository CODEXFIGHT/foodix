/**
 * FoodIX — Enlace del ticket (QR del recibo).
 *
 * El QR de cada ticket apunta a una página pública `/t` que muestra el recibo
 * con detalle. Para no depender de un endpoint del backend (y para que el recibo
 * quede "congelado" tal cual se cobró), el ticket completo se codifica de forma
 * AUTOCONTENIDA en el hash de la URL (base64url de un JSON compacto). La página
 * lo decodifica en el cliente y lo renderiza. El hash nunca viaja al servidor.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import type { ReceiptData } from './escpos'
import { PRODUCT_BASE } from '@/lib/constants/version'

// Forma COMPACTA (claves cortas) para mantener el QR lo más pequeño posible.
export interface TicketLineLite {
  n: string        // nombre
  q: number        // cantidad
  t: number        // total de la línea
  m?: string[]     // modificadores
  o?: string       // nota/observación
}

export interface TicketPayload {
  b: string              // nombre del negocio
  br?: string            // sucursal
  a?: string             // dirección
  ph?: string            // teléfono
  tk: string             // folio / número de ticket
  oid: string            // id del pedido
  dt: string             // fecha (texto ya formateado)
  tb?: string            // mesa
  ot?: string            // tipo de pedido (dine_in | takeaway | delivery)
  u?: string             // atendió
  dv?: string            // dispositivo
  c?: string             // símbolo de moneda
  it: TicketLineLite[]   // líneas
  sb?: number            // subtotal
  tx?: number            // impuesto
  tt: number             // total
  pd?: boolean           // pagado
  pm?: string[]          // métodos de pago
  ft?: string            // pie / mensaje de cortesía
  v?: string             // versión de la app
}

// ── base64url (seguro para URL, soporta UTF-8: acentos, ñ, etc.) ─────────────
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Construye el payload compacto a partir del ReceiptData del ticket. */
function toPayload(d: ReceiptData): TicketPayload {
  const p: TicketPayload = {
    b: d.businessName,
    br: d.branchName,
    a: d.address,
    ph: d.phone,
    tk: String(d.ticketNumber ?? d.orderId),
    oid: String(d.orderId),
    dt: d.createdAt,
    tb: d.tableName,
    ot: d.orderType,
    u: d.userName,
    c: d.currency ?? '$',
    it: d.lines.map(l => ({
      n: l.name,
      q: l.qty,
      t: l.total,
      ...(l.modifiers && l.modifiers.length ? { m: l.modifiers } : {}),
      ...(l.notes ? { o: l.notes } : {}),
    })),
    sb: d.subtotal,
    tx: d.tax,
    tt: d.total,
    pd: d.paid,
    pm: d.paymentMethods,
    ft: d.footer,
  }
  // Elimina claves `undefined` para acortar el QR al máximo.
  return JSON.parse(JSON.stringify(p)) as TicketPayload
}

/**
 * URL pública del ticket para el QR: `${origin}/t#<base64url(JSON compacto)>`.
 * Usa el origen actual cuando está disponible (mismo host que sirve la app) y,
 * si no, el dominio de producto.
 */
export function buildTicketUrl(d: ReceiptData, origin?: string): string {
  const encoded = toBase64Url(JSON.stringify(toPayload(d)))
  const base =
    origin ??
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : PRODUCT_BASE)
  return `${base}/t#${encoded}`
}

/** Decodifica el hash de `/t` a un payload de ticket (o `null` si es inválido). */
export function decodeTicket(hash: string): TicketPayload | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (!raw) return null
    const obj = JSON.parse(fromBase64Url(raw)) as TicketPayload
    if (!obj || !Array.isArray(obj.it)) return null
    return obj
  } catch {
    return null
  }
}
