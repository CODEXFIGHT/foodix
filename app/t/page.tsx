/**
 * FoodIX — Ticket público del cliente: /t#<datos>
 * Página a la que apunta el QR de cada ticket impreso. Decodifica el recibo
 * (autocontenido en el hash) y lo muestra con detalle y diseño FoodIX,
 * responsive para Web Desktop, Android e iOS (Chrome / Safari).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useEffect, useState } from 'react'
import {
  Receipt, MapPin, Phone, CalendarClock, Hash, Store, BadgeCheck,
  Clock3, CreditCard, Printer, Share2, UtensilsCrossed, ShoppingBag, Bike,
} from 'lucide-react'
import { decodeTicket, type TicketPayload } from '@/lib/printing/ticketLink'
import { PRODUCT_URL } from '@/lib/constants/version'

const ORANGE = '#E85D04'

function money(n: number, cur = '$'): string {
  return `${cur}${Number(n ?? 0).toFixed(2)}`
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '🍽️'
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase()
}

function orderTypeMeta(t?: string): { label: string; Icon: typeof UtensilsCrossed } {
  if (t === 'takeaway') return { label: 'Para llevar', Icon: ShoppingBag }
  if (t === 'delivery') return { label: 'Domicilio', Icon: Bike }
  return { label: 'En mesa', Icon: UtensilsCrossed }
}

export default function TicketPage() {
  // undefined = cargando · null = inválido · objeto = listo
  const [t, setT] = useState<TicketPayload | null | undefined>(undefined)

  useEffect(() => {
    const read = () => setT(decodeTicket(window.location.hash))
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  if (t === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#E85D04] border-t-transparent" />
      </div>
    )
  }

  if (t === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-100 px-6 text-center dark:bg-stone-950">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E85D04]/10 text-[#E85D04]">
          <Receipt className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">Ticket no válido</h1>
        <p className="max-w-xs text-sm text-stone-500">
          El enlace del ticket está incompleto o dañado. Vuelve a escanear el código QR de tu recibo.
        </p>
      </div>
    )
  }

  const cur = t.c ?? '$'
  const ot = orderTypeMeta(t.ot)
  const hasTax = typeof t.tx === 'number' && t.tx > 0

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `Ticket ${t.tk} · ${t.b}`, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch { /* cancelado por el usuario */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200 px-4 py-6 dark:from-stone-900 dark:to-stone-950 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        {/* Marca FoodIX (se oculta al imprimir) */}
        <div className="mb-4 flex items-center justify-center gap-2 print:hidden">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E85D04] text-[11px] font-black text-white">F</span>
          <span className="text-sm font-semibold tracking-tight text-stone-500 dark:text-stone-400">FoodIX</span>
        </div>

        {/* Tarjeta-recibo */}
        <div className="overflow-hidden rounded-3xl bg-white text-stone-900 shadow-xl ring-1 ring-black/5">
          {/* Encabezado */}
          <div className="relative px-6 pb-6 pt-7 text-white" style={{ background: `linear-gradient(135deg, ${ORANGE}, #F48C06)` }}>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-black backdrop-blur-sm ring-1 ring-white/30">
                {initials(t.b)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-extrabold leading-tight tracking-tight">{t.b}</h1>
                {t.br && t.br !== t.b && <p className="truncate text-sm text-white/85">{t.br}</p>}
                {t.a && <p className="mt-1 flex items-center gap-1 text-xs text-white/80"><MapPin className="h-3 w-3" /> {t.a}</p>}
                {t.ph && <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80"><Phone className="h-3 w-3" /> {t.ph}</p>}
              </div>
            </div>

            {/* Estado de pago */}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm"
              style={{ color: t.pd ? '#15803d' : '#b45309' }}>
              {t.pd ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              {t.pd ? 'Pagado' : 'Pendiente de pago'}
            </div>
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-5">
            <Meta icon={<Hash className="h-3.5 w-3.5" />} label="Folio" value={`#${t.tk}`} />
            <Meta icon={<CalendarClock className="h-3.5 w-3.5" />} label="Fecha" value={t.dt} />
            <Meta icon={<ot.Icon className="h-3.5 w-3.5" />} label={ot.label} value={t.tb || ot.label} />
            {t.u && <Meta icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Atendió" value={t.u} />}
            {t.dv && <Meta icon={<Store className="h-3.5 w-3.5" />} label="Caja" value={t.dv} />}
          </div>

          <Dashed />

          {/* Detalle del pedido */}
          <div className="px-6 py-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-400">
              <Receipt className="h-3.5 w-3.5" /> Detalle del pedido
            </p>
            <ul className="space-y-3">
              {t.it.map((it, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-[#E85D04]/10 px-1.5 text-xs font-bold text-[#E85D04]">
                    {it.q}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{it.n}</p>
                    {it.m?.map((m, j) => (
                      <p key={j} className="text-xs text-stone-500">+ {m}</p>
                    ))}
                    {it.o && <p className="text-xs italic text-stone-400">“{it.o}”</p>}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{money(it.t, cur)}</span>
                </li>
              ))}
            </ul>
          </div>

          <Dashed />

          {/* Totales */}
          <div className="px-6 py-5">
            {typeof t.sb === 'number' && (
              <div className="flex items-center justify-between text-sm text-stone-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(t.sb, cur)}</span>
              </div>
            )}
            {hasTax && (
              <div className="mt-1 flex items-center justify-between text-sm text-stone-500">
                <span>Impuestos</span>
                <span className="tabular-nums">{money(t.tx!, cur)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-extrabold">TOTAL</span>
              <span className="text-2xl font-extrabold tabular-nums text-[#E85D04]">{money(t.tt, cur)}</span>
            </div>

            {t.pm && t.pm.length > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
                <CreditCard className="h-4 w-4 text-stone-400" />
                <span>Pago: <span className="font-semibold text-stone-800">{t.pm.join(', ')}</span></span>
              </div>
            )}
          </div>

          {/* Mensaje de cortesía */}
          {t.ft && (
            <p className="px-6 pb-6 text-center text-sm font-medium text-stone-500">{t.ft}</p>
          )}

          {/* Pie de marca */}
          <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 text-center">
            <p className="text-xs font-semibold text-stone-500">
              Generado con <span className="text-[#E85D04]">FoodIX</span>
            </p>
            <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-stone-400 underline-offset-2 hover:underline">
              foodix.app
            </a>
            {t.v && <p className="mt-0.5 text-[10px] text-stone-300">{t.v}</p>}
          </div>
        </div>

        {/* Acciones (ocultas al imprimir) */}
        <div className="mt-5 flex gap-3 print:hidden">
          <button onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E85D04] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#cf5303]">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
          <button onClick={share}
            className="flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800">
            <Share2 className="h-4 w-4" /> Compartir
          </button>
        </div>
      </div>
    </div>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {icon} {label}
      </p>
      <p className="truncate text-sm font-semibold text-stone-800">{value}</p>
    </div>
  )
}

function Dashed() {
  return <div className="mx-6 border-t border-dashed border-stone-200" />
}
