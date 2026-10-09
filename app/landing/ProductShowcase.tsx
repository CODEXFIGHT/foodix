'use client'

/**
 * FoodIX — "Conoce FoodIX por dentro".
 *
 * Recreaciones en HTML/CSS/Tailwind de las pantallas clave del sistema, pensadas
 * como una demo visual del producto (no screenshots estáticos). Cada módulo es un
 * componente independiente con DATOS DEMO realistas y se muestra dentro de un marco
 * de navegador, tablet Android o teléfono según corresponda. Sin imágenes externas:
 * todo se dibuja con divs y los colores de marca para que sea nítido y cargue al
 * instante.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { BrowserFrame, AppShell, PageHead, Bar, BRAND } from './ScreenMockups'

/* ════════════════════════════ Marcos de dispositivo ════════════════════════════ */

/** Tablet Android horizontal — para KDS de cocina y kiosko. */
export function TabletFrame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-[1.4rem] bg-stone-900 p-2 shadow-xl shadow-stone-400/40 ring-1 ring-black/5">
      <div className="relative rounded-[0.9rem] overflow-hidden bg-black aspect-[16/10]">
        {children}
        {/* botón home lateral (Android) */}
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-8 w-[2px] rounded-full bg-white/15" />
      </div>
      {label && <p className="text-center text-[10px] font-medium text-white/40 pt-1.5">{label}</p>}
    </div>
  )
}

/** Teléfono vertical — para la carta digital QR. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[180px] sm:w-[200px] rounded-[2rem] bg-stone-900 p-2 shadow-xl shadow-stone-400/40 ring-1 ring-black/5">
      <div className="relative rounded-[1.5rem] overflow-hidden bg-white aspect-[9/19]">
        {/* notch */}
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 h-2.5 w-12 rounded-full bg-stone-900 z-10" />
        {children}
      </div>
    </div>
  )
}

/* ════════════════════════════ A. Dashboard Admin ════════════════════════════ */
export function AdminDashboardMockup() {
  const kpis = [
    { l: 'Ventas del día', v: '$12,480', s: '32 pedidos', c: BRAND, chip: '💰', bg: '#fff7ed' },
    { l: 'Órdenes activas', v: '6', s: 'en proceso', c: '#3b82f6', chip: '🧾', bg: '#eff6ff' },
    { l: 'Mesas ocupadas', v: '7/12', s: '5 libres', c: '#22c55e', chip: '🍽️', bg: '#f0fdf4' },
    { l: 'Ticket promedio', v: '$390', s: '+8% vs ayer', c: '#a855f7', chip: '📈', bg: '#faf5ff' },
  ]
  const top = [
    { n: 'Tostada de camarón', q: '38 vendidos', pct: 92 },
    { n: 'Coctel de pulpo', q: '27 vendidos', pct: 70 },
    { n: 'Filete empapelado', q: '21 vendidos', pct: 54 },
    { n: 'Aguachile verde', q: '16 vendidos', pct: 42 },
  ]
  return (
    <BrowserFrame title="restauros.app · Panel de administración">
      <AppShell active="Dashboard">
        <PageHead title="Hola, Carlos 👋" sub="Estado general del restaurante · hoy" action="+ Nuevo pedido" ghost="Ver mesas" />
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          {kpis.map(k => (
            <div key={k.l} className="rounded-lg bg-white p-1.5 border border-stone-100" style={{ borderLeft: `2px solid ${k.c}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[5px] text-stone-400 leading-none mb-1">{k.l}</p>
                  <p className="text-[10px] font-extrabold text-stone-900 leading-none">{k.v}</p>
                  <p className="text-[5px] text-stone-400 mt-1">{k.s}</p>
                </div>
                <span className="h-3 w-3 rounded grid place-items-center text-[6px]" style={{ background: k.bg }}>{k.chip}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5" style={{ height: 'calc(100% - 46px)' }}>
          <div className="col-span-1 rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col">
            <p className="text-[6px] font-semibold text-stone-500 mb-1">Ventas — últimos 7 días</p>
            <div className="flex-1 flex items-end gap-1">
              {[42, 60, 48, 78, 55, 70, 92].map((h, i) => <Bar key={i} h={h} c={i % 3 === 0 ? BRAND : '#fed7aa'} />)}
            </div>
          </div>
          <div className="col-span-1 rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col">
            <p className="text-[6px] font-semibold text-stone-500 mb-1.5">Más vendidos hoy</p>
            <div className="space-y-1 flex-1">
              {top.map(t => (
                <div key={t.n}>
                  <div className="flex justify-between"><span className="text-[5px] text-stone-600 truncate">{t.n}</span><span className="text-[4.5px] text-stone-400">{t.q}</span></div>
                  <div className="h-1 rounded-full bg-stone-100 mt-0.5"><div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: BRAND }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col">
            <p className="text-[6px] font-semibold text-stone-500 mb-1.5">Accesos rápidos</p>
            {['+ Nuevo pedido', 'Mapa de mesas', 'Caja / cobro', 'Reportes PDF'].map((a, i) => (
              <div key={a} className="rounded bg-stone-50 border border-stone-100 px-1 py-[3px] mb-1 text-[5.5px] font-medium text-stone-600 flex items-center justify-between" style={i === 0 ? { color: BRAND, borderColor: '#fed7aa', background: '#fff7ed' } : undefined}>
                {a} <span>›</span>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-1 rounded bg-green-50 border border-green-100 px-1 py-[3px]">
              <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[5px] font-semibold text-green-700">Operación en línea</span>
            </div>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ════════════════════════════ B. Mapa de Mesas ════════════════════════════ */
export function TablesMapMockup() {
  const tables = [
    { n: 1, p: 4, st: 'Libre', c: '#22c55e' },
    { n: 2, p: 4, st: 'Ocupada', c: BRAND, total: '$245' },
    { n: 3, p: 2, st: 'Cuenta abierta', c: '#3b82f6', total: '$180' },
    { n: 4, p: 6, st: 'Ocupada', c: BRAND, total: '$620', sel: true },
    { n: 5, p: 2, st: 'En espera', c: '#eab308' },
    { n: 6, p: 4, st: 'Libre', c: '#22c55e' },
    { n: 7, p: 8, st: 'Cuenta abierta', c: '#3b82f6', total: '$915' },
    { n: 8, p: 4, st: 'Libre', c: '#22c55e' },
  ]
  return (
    <BrowserFrame title="restauros.app · Mapa de mesas">
      <AppShell active="Mesas">
        <PageHead title="Mapa de mesas" sub="12 mesas · 7 ocupadas · 2 cuentas abiertas" action="+ Abrir mesa" />
        <div className="flex gap-1 mb-1.5 flex-wrap">
          {[['Libre', '#16a34a', '#f0fdf4'], ['Ocupada', '#c2410c', '#fff7ed'], ['Cuenta abierta', '#2563eb', '#eff6ff'], ['En espera', '#ca8a04', '#fefce8']].map(([l, c, bg]) => (
            <span key={l} className="text-[5px] font-semibold rounded-full px-1.5 py-[2px] flex items-center gap-1" style={{ color: c, background: bg }}>
              <span className="h-1 w-1 rounded-full" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5" style={{ height: 'calc(100% - 42px)' }}>
          <div className="col-span-2 grid grid-cols-4 grid-rows-2 gap-1.5">
            {tables.map(t => (
              <div key={t.n} className="rounded-lg bg-white p-1.5 border flex flex-col justify-between"
                style={t.sel ? { borderColor: t.c, boxShadow: `0 0 0 1.5px ${t.c}` } : { borderColor: `${t.c}55` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-extrabold text-stone-800">Mesa {t.n}</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.c }} />
                </div>
                <p className="text-[4.5px] text-stone-400">👥 {t.p}</p>
                <span className="text-[4.5px] font-semibold rounded px-1 py-[1px] self-start" style={{ color: t.c, background: `${t.c}1a` }}>{t.st}</span>
                {t.total && <p className="text-[6px] font-extrabold text-stone-900">{t.total}</p>}
              </div>
            ))}
          </div>
          {/* Detalle de mesa seleccionada */}
          <div className="rounded-lg bg-white border-2 p-1.5 flex flex-col" style={{ borderColor: BRAND }}>
            <p className="text-[7px] font-extrabold text-stone-900 leading-none">Mesa 4 · 6 pers.</p>
            <p className="text-[5px] mt-0.5" style={{ color: BRAND }}>● Ocupada · 38 min</p>
            <div className="my-1.5 space-y-0.5 flex-1">
              {[['2× Tostada camarón', '$170'], ['1× Coctel pulpo', '$165'], ['3× Cerveza', '$135'], ['2× Agua fresca', '$80'], ['1× Aguachile', '$170']].map(([d, p]) => (
                <div key={d} className="flex justify-between text-[5px] text-stone-600"><span className="truncate">{d}</span><span className="font-semibold">{p}</span></div>
              ))}
            </div>
            <div className="border-t border-stone-100 pt-1 flex justify-between">
              <span className="text-[6px] font-semibold text-stone-500">Total cuenta</span>
              <span className="text-[9px] font-extrabold" style={{ color: BRAND }}>$620.00</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <span className="text-[5px] font-semibold text-center text-stone-600 border border-stone-200 rounded px-1 py-[2px]">+ Agregar</span>
              <span className="text-[5px] font-semibold text-center text-white rounded px-1 py-[2px]" style={{ background: BRAND }}>Cobrar</span>
            </div>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ════════════════════════════ C. Toma de Pedido / Mesero ════════════════════════════ */
export function WaiterOrderMockup() {
  const cats = ['Tostadas', 'Cocteles', 'Pescados', 'Bebidas', 'Postres']
  const prods = [
    { n: 'Tostada camarón', p: '$85' }, { n: 'Tostada ceviche', p: '$80' },
    { n: 'Tostada pulpo', p: '$95' }, { n: 'Tostada mixta', p: '$110' },
    { n: 'Aguachile verde', p: '$170' }, { n: 'Coctel campechana', p: '$180' },
  ]
  return (
    <BrowserFrame title="restauros.app · Toma de pedido (mesero)">
      <div className="h-full flex bg-stone-50">
        {/* catálogo */}
        <div className="flex-1 flex flex-col p-2 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] font-extrabold text-stone-900">Mesa 7 · Nuevo pedido</span>
            <span className="text-[5px] font-semibold rounded px-1.5 py-[2px]" style={{ background: '#fff7ed', color: BRAND }}>Cambiar mesa</span>
          </div>
          <div className="flex gap-1 mb-1.5 overflow-hidden">
            {cats.map((c, i) => (
              <span key={c} className="text-[5.5px] font-semibold rounded-full px-1.5 py-[2px] whitespace-nowrap" style={i === 0 ? { background: BRAND, color: '#fff' } : { background: '#fff', color: '#78716c', border: '1px solid #e7e5e4' }}>{c}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 flex-1 content-start">
            {prods.map((p, i) => (
              <div key={p.n} className="rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col" style={i === 0 ? { borderColor: BRAND } : undefined}>
                <div className="h-5 rounded bg-orange-50 mb-1 grid place-items-center text-[8px]">🦐</div>
                <p className="text-[5px] font-semibold text-stone-700 leading-tight">{p.n}</p>
                <p className="text-[6px] font-extrabold mt-auto" style={{ color: BRAND }}>{p.p}</p>
              </div>
            ))}
          </div>
        </div>
        {/* carrito */}
        <div className="w-[34%] shrink-0 bg-white border-l border-stone-200 flex flex-col p-2">
          <p className="text-[7px] font-extrabold text-stone-900 mb-1.5">🛒 Pedido · Mesa 7</p>
          <div className="flex-1 space-y-1.5">
            <div className="rounded-lg border border-stone-100 p-1.5">
              <div className="flex justify-between"><span className="text-[5.5px] font-semibold text-stone-700">2× Tostada camarón</span><span className="text-[5.5px] font-extrabold">$170</span></div>
              <div className="flex flex-wrap gap-0.5 mt-1">
                {['Sin cebolla', 'Extra aguacate'].map(m => <span key={m} className="text-[4.5px] font-medium rounded-full px-1 py-[1px]" style={{ background: '#fff7ed', color: BRAND }}>{m}</span>)}
              </div>
            </div>
            <div className="rounded-lg border border-stone-100 p-1.5">
              <div className="flex justify-between"><span className="text-[5.5px] font-semibold text-stone-700">1× Aguachile verde</span><span className="text-[5.5px] font-extrabold">$170</span></div>
              <div className="flex flex-wrap gap-0.5 mt-1">
                {['Sin chile', 'Sin arroz'].map(m => <span key={m} className="text-[4.5px] font-medium rounded-full px-1 py-[1px]" style={{ background: '#fff7ed', color: BRAND }}>{m}</span>)}
              </div>
            </div>
          </div>
          <div className="border-t border-stone-100 pt-1.5 mt-1.5">
            <div className="flex justify-between mb-1"><span className="text-[6px] text-stone-500">Total</span><span className="text-[9px] font-extrabold" style={{ color: BRAND }}>$340.00</span></div>
            <div className="rounded-lg text-center text-[6px] font-bold text-white py-1.5" style={{ background: BRAND }}>Enviar a cocina →</div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ════════════════════════════ D. Cocina / KDS Android ════════════════════════════ */
export function KitchenKDSMockup() {
  const Col = ({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) => (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[7px] font-extrabold tracking-wide" style={{ color }}>{title}</span>
        <span className="text-[6px] font-bold rounded-full px-1.5 py-[1px]" style={{ background: `${color}22`, color }}>{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
  const Card = ({ mesa, n, mins, items, btn, btnColor }: { mesa: string; n: string; mins: string; items: { d: string; mods?: string[] }[]; btn: string; btnColor: string }) => (
    <div className="rounded-lg p-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-end justify-between mb-1">
        <span className="text-[11px] font-extrabold text-white leading-none">{mesa}</span>
        <span className="text-[5px] text-white/40">{n}</span>
      </div>
      <span className="text-[5px] font-bold" style={{ color: '#fbbf24' }}>⏱ {mins}</span>
      <div className="my-1 space-y-0.5">
        {items.map((it, i) => (
          <div key={i}>
            <span className="text-[5.5px] font-semibold text-white/90">{it.d}</span>
            {it.mods && <div className="flex flex-wrap gap-0.5 mt-0.5">{it.mods.map(m => <span key={m} className="text-[4.5px] rounded px-1 py-[0.5px]" style={{ background: 'rgba(251,191,36,0.18)', color: '#fcd34d' }}>{m}</span>)}</div>}
          </div>
        ))}
      </div>
      <div className="rounded text-center text-[5.5px] font-bold text-white py-[3px]" style={{ background: btnColor }}>{btn}</div>
    </div>
  )
  return (
    <TabletFrame>
      <div className="h-full flex flex-col" style={{ background: '#0c0a09' }}>
        <div className="flex items-center justify-between px-2.5 h-6 shrink-0 border-b border-white/10">
          <span className="text-[7px] font-extrabold" style={{ color: '#fbbf24' }}>🔥 COCINA — KDS</span>
          <span className="text-[8px] font-bold tracking-widest text-white tabular-nums">19:42:18</span>
          <span className="flex items-center gap-1 text-[5px] text-green-400 font-semibold"><span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />En línea</span>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2 p-2 content-start min-h-0">
          <Col title="NUEVOS" color="#60a5fa" count={2}>
            <Card mesa="Mesa 4" n="#1032" mins="0:48" items={[{ d: '2× Tostada camarón', mods: ['Sin cebolla', 'Extra aguacate'] }, { d: '1× Aguachile', mods: ['Sin chile'] }]} btn="Comenzar →" btnColor="#2563eb" />
            <Card mesa="Llevar" n="#1033" mins="0:12" items={[{ d: '1× Coctel pulpo' }]} btn="Comenzar →" btnColor="#2563eb" />
          </Col>
          <Col title="EN PREPARACIÓN" color="#fbbf24" count={2}>
            <Card mesa="Mesa 7" n="#1031" mins="3:24" items={[{ d: '1× Filete empapelado' }, { d: '2× Arroz tumbada' }]} btn="Marcar listo ✓" btnColor="#d97706" />
            <Card mesa="Mesa 2" n="#1030" mins="5:51" items={[{ d: '1× Mojarra frita', mods: ['Sin arroz'] }]} btn="Marcar listo ✓" btnColor="#d97706" />
          </Col>
          <Col title="LISTOS" color="#34d399" count={1}>
            <Card mesa="Mesa 1" n="#1029" mins="✓ 0:30" items={[{ d: '1× Caldo de mariscos' }]} btn="Entregar ✓" btnColor="#059669" />
          </Col>
        </div>
      </div>
    </TabletFrame>
  )
}

/* ════════════════════════════ E. Kiosko ════════════════════════════ */
export function KioskMockup() {
  const cats = ['🌮 Tacos', '🍔 Burgers', '🥤 Bebidas', '🍟 Extras']
  const prods = [
    { n: 'Taco al pastor', p: '$28', star: true }, { n: 'Taco campechano', p: '$32' },
    { n: 'Orden 5 tacos', p: '$130', star: true }, { n: 'Quesataco', p: '$45' },
  ]
  return (
    <TabletFrame>
      <div className="h-full flex bg-stone-50">
        <div className="flex-1 flex flex-col p-2.5 min-w-0">
          <div className="text-center mb-1.5">
            <p className="text-[9px] font-extrabold text-stone-900">¿Qué se te antoja hoy? 👋</p>
            <p className="text-[5px] text-stone-400">Toca para ordenar · Autoservicio</p>
          </div>
          <div className="flex gap-1.5 mb-2 justify-center">
            {cats.map((c, i) => (
              <span key={c} className="text-[6px] font-bold rounded-full px-2 py-[3px]" style={i === 0 ? { background: BRAND, color: '#fff' } : { background: '#fff', color: '#78716c', border: '1px solid #e7e5e4' }}>{c}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            {prods.map(p => (
              <div key={p.n} className="rounded-xl bg-white border border-stone-100 p-2 flex flex-col relative">
                {p.star && <span className="absolute top-1 right-1 text-[6px] font-bold rounded-full px-1.5 py-[1px]" style={{ background: '#fff7ed', color: BRAND }}>★ Top</span>}
                <div className="h-9 rounded-lg bg-orange-50 mb-1.5 grid place-items-center text-[16px]">🌮</div>
                <p className="text-[7px] font-bold text-stone-800">{p.n}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] font-extrabold" style={{ color: BRAND }}>{p.p}</span>
                  <span className="h-4 w-4 rounded-full text-white grid place-items-center text-[9px] font-bold" style={{ background: BRAND }}>+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* carrito kiosko */}
        <div className="w-[32%] shrink-0 bg-stone-900 flex flex-col p-2.5 text-white">
          <p className="text-[7px] font-extrabold mb-2">🛒 Tu pedido</p>
          <div className="flex-1 space-y-1.5">
            {[['2× Taco pastor', '$56'], ['1× Orden 5 tacos', '$130'], ['2× Agua horchata', '$50']].map(([d, p]) => (
              <div key={d} className="flex justify-between"><span className="text-[5.5px] text-white/80">{d}</span><span className="text-[5.5px] font-bold">{p}</span></div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-1.5">
            <div className="flex justify-between mb-1.5"><span className="text-[6px] text-white/60">Total</span><span className="text-[11px] font-extrabold" style={{ color: '#fdba74' }}>$236.00</span></div>
            <div className="rounded-lg text-center text-[7px] font-extrabold py-2" style={{ background: BRAND }}>Confirmar pedido</div>
          </div>
        </div>
      </div>
    </TabletFrame>
  )
}

/* ════════════════════════════ F. Ticket Abierto ════════════════════════════ */
export function OpenTicketMockup() {
  const tickets = [
    { mesa: 'Mesa 3', n: '#1024', items: '4 platillos · 2 bebidas', total: '$485.00', st: 'Por cobrar', c: '#eab308' },
    { mesa: 'Mesa 9', n: '#1026', items: '6 platillos · 3 bebidas', total: '$912.00', st: 'Por cobrar', c: '#eab308' },
    { mesa: 'Para llevar', n: '#1027', items: '2 platillos', total: '$210.00', st: 'Listo', c: '#3b82f6' },
    { mesa: 'Mesa 5', n: '#1028', items: '3 platillos · 1 bebida', total: '$385.00', st: 'Por cobrar', c: '#eab308' },
  ]
  return (
    <BrowserFrame title="restauros.app · Ticket abierto">
      <AppShell active="Pedidos">
        <PageHead title="Ticket abierto" sub="4 cuentas completadas pendientes de cobro" ghost="Ver historial" />
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[['🧾', '4', 'Cuentas abiertas', '#eab308'], ['💵', '$1,992', 'Por cobrar', BRAND], ['✅', '28', 'Cobradas hoy', '#22c55e']].map(([ic, v, l, c]) => (
            <div key={l as string} className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1.5">
              <span className="text-[9px]">{ic}</span>
              <div><p className="text-[9px] font-extrabold leading-none" style={{ color: c as string }}>{v}</p><p className="text-[5px] text-stone-400 mt-0.5">{l}</p></div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {tickets.map(t => (
            <div key={t.n} className="flex items-center gap-2 rounded-lg bg-white border border-stone-100 p-1.5" style={{ borderLeft: `2px solid ${t.c}` }}>
              <div className="min-w-0 flex-1">
                <p className="text-[7px] font-extrabold text-stone-800">{t.mesa} <span className="font-medium text-stone-400">{t.n}</span></p>
                <p className="text-[5px] text-stone-400 mt-0.5">{t.items}</p>
                <span className="inline-block mt-0.5 text-[4.5px] font-semibold rounded px-1 py-[1px]" style={{ color: t.c, background: `${t.c}1a` }}>{t.st}</span>
              </div>
              <span className="text-[9px] font-extrabold text-stone-900">{t.total}</span>
              <div className="flex flex-col gap-0.5 shrink-0">
                <span className="text-[5px] font-bold text-white rounded px-1.5 py-[2px] text-center" style={{ background: BRAND }}>Cobrar</span>
                <div className="flex gap-0.5">
                  <span className="text-[5px] font-semibold text-stone-500 border border-stone-200 rounded px-1 py-[1px]">Reabrir</span>
                  <span className="text-[5px] font-semibold text-stone-500 border border-stone-200 rounded px-1 py-[1px]">🖨</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ════════════════════════════ G. Caja / Cobro ════════════════════════════ */
export function CashierMockup() {
  return (
    <BrowserFrame title="restauros.app · Caja / cobro">
      <AppShell active="Caja">
        <PageHead title="Cobro · Mesa 5" sub="Cierre de cuenta" ghost="Cancelar" />
        <div className="grid grid-cols-2 gap-2" style={{ height: 'calc(100% - 28px)' }}>
          {/* resumen */}
          <div className="rounded-lg bg-white border border-stone-100 p-2 flex flex-col">
            <p className="text-[6px] font-bold text-stone-500 mb-1">Resumen de cuenta</p>
            <div className="space-y-0.5 flex-1">
              {[['2× Tostada camarón', '$170'], ['1× Aguachile verde', '$170'], ['3× Cerveza', '$135'], ['1× Agua fresca', '$40']].map(([d, p]) => (
                <div key={d} className="flex justify-between text-[5.5px] text-stone-600"><span>{d}</span><span className="font-semibold">{p}</span></div>
              ))}
            </div>
            <div className="border-t border-stone-100 mt-1 pt-1 space-y-0.5">
              <div className="flex justify-between text-[5.5px] text-stone-500"><span>Subtotal</span><span>$515.00</span></div>
              <div className="flex justify-between text-[5.5px] text-stone-500"><span>Propina (10%)</span><span>$51.50</span></div>
              <div className="flex justify-between"><span className="text-[7px] font-extrabold text-stone-900">Total</span><span className="text-[10px] font-extrabold" style={{ color: BRAND }}>$566.50</span></div>
            </div>
          </div>
          {/* pago */}
          <div className="flex flex-col gap-1.5">
            <div className="rounded-lg bg-white border border-stone-100 p-2 flex-1">
              <p className="text-[6px] font-bold text-stone-500 mb-1.5">Método de pago</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[['💵 Efectivo', true], ['💳 Crédito', false], ['💳 Débito', false], ['🔁 SPEI', false]].map(([l, on]) => (
                  <div key={l as string} className="rounded-lg text-center text-[6px] font-semibold py-2" style={on ? { background: '#fff7ed', color: BRAND, border: `1px solid ${BRAND}` } : { background: '#fafaf9', color: '#78716c', border: '1px solid #e7e5e4' }}>{l}</div>
                ))}
              </div>
              <div className="mt-1.5 rounded-lg bg-stone-50 border border-stone-100 p-1.5">
                <p className="text-[5px] text-stone-400">Recibido</p>
                <p className="text-[10px] font-extrabold text-stone-900">$600.00 <span className="text-[5px] font-medium text-green-600">· Cambio $33.50</span></p>
              </div>
            </div>
            <div className="rounded-lg text-center text-[7px] font-extrabold text-white py-2" style={{ background: BRAND }}>Cobrar $566.50</div>
            <div className="rounded-lg text-center text-[6px] font-semibold text-stone-600 border border-stone-200 py-1.5">🖨 Imprimir ticket</div>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ════════════════════════════ H. Carta Digital QR ════════════════════════════ */
export function DigitalMenuMockup() {
  return (
    <div className="flex items-center justify-center gap-4">
      <PhoneFrame>
        <div className="h-full flex flex-col bg-white">
          <div className="pt-5 pb-2 px-2.5 text-center" style={{ background: BRAND }}>
            <p className="text-[9px] font-extrabold text-white">Mariscos El Puerto</p>
            <p className="text-[5px] text-white/80">Carta digital · Mesa 7</p>
          </div>
          <div className="flex gap-1 px-2 py-1.5 overflow-hidden">
            {['Tostadas', 'Cocteles', 'Bebidas'].map((c, i) => (
              <span key={c} className="text-[5px] font-semibold rounded-full px-1.5 py-[2px] whitespace-nowrap" style={i === 0 ? { background: BRAND, color: '#fff' } : { background: '#f5f5f4', color: '#78716c' }}>{c}</span>
            ))}
          </div>
          <div className="flex-1 px-2 space-y-1.5 overflow-hidden">
            {[['Tostada de camarón', '$85'], ['Tostada de ceviche', '$80'], ['Aguachile verde', '$170'], ['Coctel campechana', '$180'], ['Filete empapelado', '$220']].map(([n, p]) => (
              <div key={n} className="flex items-center gap-1.5">
                <span className="h-7 w-7 rounded-lg bg-orange-50 grid place-items-center text-[10px] shrink-0">🦐</span>
                <div className="flex-1 min-w-0"><p className="text-[6px] font-bold text-stone-800 truncate">{n}</p><p className="text-[4.5px] text-stone-400">Especialidad de la casa</p></div>
                <span className="text-[6px] font-extrabold" style={{ color: BRAND }}>{p}</span>
              </div>
            ))}
          </div>
          <div className="p-2"><div className="rounded-lg text-center text-[6px] font-bold text-white py-1.5" style={{ background: BRAND }}>Ver carta completa</div></div>
        </div>
      </PhoneFrame>
      {/* QR */}
      <div className="hidden sm:flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-white border border-stone-200 shadow-lg p-3">
          <div className="grid grid-cols-9 gap-[2px] p-1.5">
            {Array.from({ length: 81 }).map((_, i) => {
              const on = [0,1,2,3,4,6,7,8,9,12,13,16,17,18,21,25,26,27,29,31,33,34,36,38,40,41,42,44,46,48,49,52,54,55,58,60,62,63,64,66,67,68,70,72,73,74,75,76,78,79,80].includes(i)
              return <span key={i} className="h-2 w-2 rounded-[1px]" style={{ background: on ? '#1c1917' : 'transparent' }} />
            })}
          </div>
        </div>
        <p className="text-[11px] font-bold text-stone-700">Escanea y ordena</p>
        <p className="text-[10px] text-stone-400 -mt-1">Sin instalar apps</p>
      </div>
    </div>
  )
}

/* ════════════════════════════ I. Gestión de Productos ════════════════════════════ */
export function ProductManagerMockup() {
  return (
    <BrowserFrame title="restauros.app · Gestión de productos">
      <AppShell active="Carta">
        <PageHead title="Nuevo producto" sub="Agrega platillos a tu carta" ghost="Cancelar" action="Guardar producto" />
        <div className="grid grid-cols-2 gap-2" style={{ height: 'calc(100% - 28px)' }}>
          <div className="rounded-lg bg-white border border-stone-100 p-2 space-y-1.5">
            <div>
              <p className="text-[5px] font-semibold text-stone-400 mb-0.5">Nombre del platillo</p>
              <div className="rounded border border-stone-200 px-1.5 py-1 text-[6px] font-semibold text-stone-700">Tostada de camarón</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[5px] font-semibold text-stone-400 mb-0.5">Precio</p>
                <div className="rounded border border-stone-200 px-1.5 py-1 text-[6px] font-extrabold" style={{ color: BRAND }}>$85.00</div>
              </div>
              <div>
                <p className="text-[5px] font-semibold text-stone-400 mb-0.5">Categoría</p>
                <div className="rounded border border-stone-200 px-1.5 py-1 text-[6px] font-semibold text-stone-700">Tostadas ▾</div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded bg-green-50 border border-green-100 px-1.5 py-1">
              <span className="text-[5.5px] font-semibold text-green-700">Disponible</span>
              <span className="h-2.5 w-4 rounded-full bg-green-500 relative"><span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white" /></span>
            </div>
          </div>
          <div className="rounded-lg bg-white border border-stone-100 p-2">
            <p className="text-[6px] font-bold text-stone-500 mb-1.5">Modificadores</p>
            <div className="flex flex-wrap gap-1">
              {['Sin cebolla', 'Extra queso', 'Sin arroz', 'Más salsa', 'Extra aguacate', 'Sin chile'].map((m, i) => (
                <span key={m} className="text-[5.5px] font-semibold rounded-full px-1.5 py-[2px] flex items-center gap-0.5"
                  style={i < 4 ? { background: '#fff7ed', color: BRAND, border: `1px solid ${BRAND}55` } : { background: '#fafaf9', color: '#a8a29e', border: '1px solid #e7e5e4' }}>
                  {i < 4 ? '✓ ' : '+ '}{m}
                </span>
              ))}
            </div>
            <p className="text-[5px] text-stone-400 mt-2 leading-relaxed">Los modificadores activos aparecen como chips para el mesero al tomar el pedido y viajan hasta la cocina.</p>
            <div className="mt-2 rounded-lg border border-dashed border-stone-200 text-center text-[5.5px] font-semibold text-stone-400 py-1.5">+ Crear modificador nuevo</div>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ════════════════════════════ J. Superadmin / Establecimientos ════════════════════════════ */
export function SuperadminMockup() {
  const rows = [
    { n: 'Mariscos El Puerto', plan: 'Pro', on: true, dev: '6 disp.', loc: 'Cuernavaca' },
    { n: 'Tacos Don Beto', plan: 'Pro', on: true, dev: '4 disp.', loc: 'Jiutepec' },
    { n: 'Café Aroma', plan: 'Lite', on: true, dev: '2 disp.', loc: 'Temixco' },
    { n: 'Fonda La Abuela', plan: 'Lite', on: false, dev: '1 disp.', loc: 'Cuautla' },
  ]
  return (
    <BrowserFrame title="restauros.app · Superadmin — Establecimientos">
      <div className="h-full flex flex-col bg-stone-50 p-2.5">
        <PageHead title="Establecimientos" sub="4 negocios · 12 dispositivos conectados" action="+ Nuevo establecimiento" />
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          {[['🏪', '4', 'Negocios'], ['🟢', '3', 'Activos'], ['🖥️', '12', 'Dispositivos'], ['🛒', '2', 'Kioskos']].map(([ic, v, l]) => (
            <div key={l} className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1.5">
              <span className="text-[8px]">{ic}</span><div><p className="text-[9px] font-extrabold text-stone-900 leading-none">{v}</p><p className="text-[5px] text-stone-400 mt-0.5">{l}</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-white border border-stone-100 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-1 px-2 py-1 bg-stone-50 border-b border-stone-100 text-[5px] font-bold text-stone-400 uppercase">
            <span>Establecimiento</span><span>Plan</span><span>Dispositivos</span><span>Estado</span>
          </div>
          {rows.map(r => (
            <div key={r.n} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-1 px-2 py-1.5 border-b border-stone-50 items-center">
              <div><p className="text-[6px] font-bold text-stone-800">{r.n}</p><p className="text-[4.5px] text-stone-400">📍 {r.loc}</p></div>
              <span className="text-[5px] font-semibold rounded px-1 py-[1px] self-start" style={r.plan === 'Pro' ? { background: '#fff7ed', color: BRAND } : { background: '#f5f5f4', color: '#78716c' }}>{r.plan}</span>
              <span className="text-[5.5px] text-stone-600">{r.dev}</span>
              <span className="text-[5px] font-semibold flex items-center gap-1" style={{ color: r.on ? '#16a34a' : '#a8a29e' }}>
                <span className="h-1 w-1 rounded-full" style={{ background: r.on ? '#22c55e' : '#d6d3d1' }} />{r.on ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ════════════════════════════ K. Dispositivos conectados ════════════════════════════ */
export function ConnectedDevicesMockup() {
  const devices = [
    { ic: '🛒', n: 'Kiosko — Caja 1', t: 'Autoservicio', on: true, last: 'hace 4 s' },
    { ic: '🍳', n: 'KDS Android — Cocina', t: 'Pantalla cocina', on: true, last: 'hace 2 s' },
    { ic: '💵', n: 'Caja registradora', t: 'Punto de venta', on: true, last: 'hace 1 s' },
    { ic: '🔫', n: 'Lector código de barras', t: 'Periférico USB', on: true, last: 'hace 9 s' },
    { ic: '🖥️', n: 'POS-8360', t: 'Terminal all-in-one', on: true, last: 'hace 3 s' },
    { ic: '📱', n: 'Tablet mesero 2', t: 'Toma de pedidos', on: false, last: 'hace 14 min' },
  ]
  return (
    <BrowserFrame title="restauros.app · Dispositivos conectados">
      <div className="h-full flex flex-col bg-stone-50 p-2.5">
        <PageHead title="Dispositivos conectados" sub="Mariscos El Puerto · monitoreo en tiempo real" ghost="Actualizar" />
        <div className="flex gap-1.5 mb-1.5">
          <span className="text-[5.5px] font-semibold rounded-full px-1.5 py-[2px] flex items-center gap-1" style={{ background: '#f0fdf4', color: '#16a34a' }}><span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />5 en línea</span>
          <span className="text-[5.5px] font-semibold rounded-full px-1.5 py-[2px] flex items-center gap-1" style={{ background: '#fafaf9', color: '#a8a29e' }}><span className="h-1 w-1 rounded-full bg-stone-300" />1 desconectado</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1 content-start">
          {devices.map(d => (
            <div key={d.n} className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1.5" style={{ borderLeft: `2px solid ${d.on ? '#22c55e' : '#d6d3d1'}` }}>
              <span className="h-5 w-5 rounded-lg bg-stone-50 grid place-items-center text-[9px] shrink-0">{d.ic}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[6px] font-bold text-stone-800 truncate">{d.n}</p>
                <p className="text-[4.5px] text-stone-400">{d.t} · {d.last}</p>
              </div>
              <span className="text-[5px] font-bold rounded-full px-1.5 py-[1px] flex items-center gap-0.5 shrink-0" style={d.on ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#fafaf9', color: '#a8a29e' }}>
                <span className="h-1 w-1 rounded-full" style={{ background: d.on ? '#22c55e' : '#d6d3d1' }} />{d.on ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ════════════════════════════ Showcase con tabs ════════════════════════════ */

type ShowItem = {
  key: string
  tab: string
  icon: string
  title: string
  desc: string
  bullets: string[]
  el: React.ReactNode
}

const SHOWCASE: ShowItem[] = [
  {
    key: 'admin', tab: 'Administración', icon: ICONS8.adminPanel,
    title: 'Control total del restaurante',
    desc: 'Consulta ventas, mesas, órdenes y operación diaria desde un panel claro y fácil de usar.',
    bullets: ['Ventas del día y ticket promedio', 'Órdenes activas y mesas ocupadas', 'Productos más vendidos en vivo'],
    el: <AdminDashboardMockup />,
  },
  {
    key: 'tables', tab: 'Mapa de mesas', icon: ICONS8.tables,
    title: 'Mesas bajo control',
    desc: 'Visualiza qué mesas están disponibles, cuáles tienen consumo activo y qué cuentas siguen abiertas.',
    bullets: ['Estados: libre, ocupada, cuenta abierta y en espera', 'Detalle de la mesa seleccionada', 'Total acumulado de cada cuenta'],
    el: <TablesMapMockup />,
  },
  {
    key: 'waiter', tab: 'Meseros', icon: ICONS8.meseroAvatar,
    title: 'Pedidos más rápidos y con menos errores',
    desc: 'El mesero captura productos, cantidades y modificadores desde una interfaz táctil, clara y lista para operación real.',
    bullets: ['Productos por categoría', 'Modificadores como chips: Sin cebolla, Extra aguacate…', 'Envío directo a cocina'],
    el: <WaiterOrderMockup />,
  },
  {
    key: 'kds', tab: 'Cocina KDS', icon: ICONS8.kitchen,
    title: 'KDS para cocina en tiempo real',
    desc: 'Las órdenes llegan directo a cocina con mesa, platillos y modificadores visibles para preparar más rápido y evitar confusiones.',
    bullets: ['Columnas: Nuevos, En preparación, Listos', 'Mesa en grande, pedido como dato secundario', 'Optimizado para tablet Android táctil'],
    el: <KitchenKDSMockup />,
  },
  {
    key: 'kiosk', tab: 'Kiosko', icon: ICONS8.kiosk,
    title: 'Kiosko moderno para autoservicio',
    desc: 'Permite que tus clientes o personal capturen pedidos desde una pantalla táctil con una experiencia rápida y visual.',
    bullets: ['Categorías y productos destacados', 'Carrito y total siempre visibles', 'Diseño touch grande y claro'],
    el: <KioskMockup />,
  },
  {
    key: 'ticket', tab: 'Ticket abierto', icon: ICONS8.receipt,
    title: 'Cuentas abiertas sin perder el control',
    desc: 'Los pedidos completados pasan a Ticket Abierto para mantener ordenadas las cuentas antes del cobro final.',
    bullets: ['Mesa, pedido y total por cuenta', 'Estado de cada cuenta', 'Acciones: cobrar, reabrir, imprimir'],
    el: <OpenTicketMockup />,
  },
  {
    key: 'cashier', tab: 'Caja / Cobro', icon: ICONS8.payment,
    title: 'Cobro simple y profesional',
    desc: 'Cierra cuentas, registra pagos e imprime tickets desde una pantalla rápida, clara y lista para caja.',
    bullets: ['Subtotal, propina opcional y total', 'Efectivo, tarjeta de crédito/débito y SPEI', 'Cobrar e imprimir ticket'],
    el: <CashierMockup />,
  },
  {
    key: 'carta', tab: 'Carta QR', icon: ICONS8.carta,
    title: 'Carta digital con QR',
    desc: 'Tus clientes escanean el código y consultan el menú desde su celular, sin instalar aplicaciones.',
    bullets: ['Menú por categorías con precios', 'Vista mobile optimizada', 'QR compartible al instante'],
    el: <DigitalMenuMockup />,
  },
  {
    key: 'products', tab: 'Productos', icon: ICONS8.products,
    title: 'Menú editable en minutos',
    desc: 'Agrega platillos, precios, categorías y modificadores personalizados sin depender de nadie.',
    bullets: ['Precio, categoría y disponibilidad', 'Modificadores como tags', 'Ejemplos: Sin cebolla, Extra queso, Más salsa'],
    el: <ProductManagerMockup />,
  },
  {
    key: 'superadmin', tab: 'Superadmin', icon: ICONS8.superAdmin,
    title: 'Multiestablecimiento y preparado para crecer',
    desc: 'Administra varios negocios, dispositivos y módulos desde una consola central.',
    bullets: ['Lista de establecimientos con estado y plan', 'Dispositivos conectados por negocio', 'Kioskos, pantallas y terminales'],
    el: <SuperadminMockup />,
  },
  {
    key: 'devices', tab: 'Dispositivos', icon: ICONS8.multiDevice,
    title: 'Dispositivos monitoreados en tiempo real',
    desc: 'Visualiza kioskos, pantallas de cocina, cajas, lectores y terminales conectadas por establecimiento.',
    bullets: ['Badges online/offline en vivo', 'Última actividad por dispositivo', 'Kiosko, KDS, caja, lector y POS-8360'],
    el: <ConnectedDevicesMockup />,
  },
]

export function LandingProductShowcase() {
  const [active, setActive] = useState(0)
  const item = SHOWCASE[active]
  const mockupRight = active % 2 === 1

  return (
    <div className="max-w-6xl mx-auto px-5">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SHOWCASE.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setActive(i)}
            className={cn(
              'snap-start shrink-0 inline-flex items-center gap-1.5 h-9 pl-2 pr-3.5 rounded-full text-xs font-semibold transition-all active:scale-95',
              i === active
                ? 'bg-[#D1400F] text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:bg-[#161616] dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10',
            )}
          >
            <Icons8Image src={s.icon} alt="" size={18} className={cn('shrink-0', i === active && 'brightness-0 invert')} />
            {s.tab}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div key={item.key} className="mt-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center animate-fade-in-up">
        {/* Mockup */}
        <div className={cn(mockupRight ? 'lg:order-2' : 'lg:order-1')}>
          {item.el}
        </div>
        {/* Texto comercial */}
        <div className={cn(mockupRight ? 'lg:order-1' : 'lg:order-2')}>
          <span className="inline-flex items-center gap-2 text-xs font-semibold pl-1.5 pr-3 py-1 rounded-full bg-orange-50 text-[#D1400F] border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">
            <Icons8Image src={item.icon} alt="" size={18} className="shrink-0" /> {item.tab}
          </span>
          <h3 className="mt-4 font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 leading-tight dark:text-white">{item.title}</h3>
          <p className="mt-3 text-stone-600 leading-relaxed dark:text-zinc-400">{item.desc}</p>
          <ul className="mt-5 space-y-2.5">
            {item.bullets.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-stone-700 dark:text-zinc-300">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-orange-50 text-[#D1400F] grid place-items-center text-[10px] font-bold dark:bg-orange-500/15">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {SHOWCASE.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setActive(i)}
                aria-label={s.tab}
                className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-6 bg-[#D1400F]' : 'w-1.5 bg-stone-300 hover:bg-stone-400 dark:bg-zinc-800 dark:hover:bg-zinc-700')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
