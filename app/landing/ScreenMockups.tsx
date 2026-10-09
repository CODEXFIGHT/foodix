'use client'

/**
 * Recreaciones en CSS de las pantallas reales de FoodIX para el carrusel de
 * la landing. Replican fielmente la UI del sistema (sidebar oscuro, topbar,
 * tarjetas KPI, listas de pedidos, KDS, carta QR…) pero con DATOS DEMO
 * neutrales — nunca datos de clientes reales. Se dibujan con divs y los colores
 * de marca: nítidas a cualquier tamaño y carga instantánea, sin imágenes.
 */

export const BRAND = '#D1400F'
export const SIDEBAR = '#1c1917'

/* ─── Ventana tipo navegador que envuelve cada pantalla ─── */
export function BrowserFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-300/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-stone-100 bg-stone-50">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[11px] text-stone-400 font-medium truncate">{title}</span>
      </div>
      <div className="aspect-[16/10] bg-stone-100/70">{children}</div>
    </div>
  )
}

/* ─── Shell de administración: sidebar oscuro + topbar (igual al sistema) ─── */
const NAV = [
  { l: 'Dashboard', i: '🏠' },
  { l: 'Pedidos', i: '🧾' },
  { l: 'Mesas', i: '🍽️' },
  { l: 'Domicilios', i: '🛵' },
  { l: 'Clientes', i: '👥' },
  { l: 'Carta', i: '📖' },
  { l: 'Caja', i: '💵' },
  { l: 'Inventario', i: '📦' },
  { l: 'Ventas', i: '📊' },
]

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex text-stone-800">
      {/* Sidebar */}
      <aside className="w-[26%] shrink-0 flex flex-col py-2.5 px-2 gap-0.5" style={{ background: SIDEBAR }}>
        <div className="flex items-center gap-1.5 px-1.5 pb-2.5 mb-1 border-b border-white/5">
          <span className="h-4 w-4 rounded-md grid place-items-center text-[8px] font-bold text-white" style={{ background: BRAND }}>F</span>
          <span className="text-[8px] font-bold text-white truncate">Mariscos El Puerto</span>
        </div>
        {NAV.map(n => {
          const on = n.l === active
          return (
            <div
              key={n.l}
              className="relative flex items-center gap-1.5 rounded-md px-1.5 py-[3px]"
              style={on ? { background: 'rgba(209,64,15,0.18)' } : undefined}
            >
              {on && <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: BRAND }} />}
              <span className="text-[7px] leading-none w-2.5 text-center">{n.i}</span>
              <span className="text-[7px] font-semibold" style={{ color: on ? '#fdba74' : 'rgba(255,255,255,0.55)' }}>{n.l}</span>
              {on && <span className="ml-auto h-1 w-1 rounded-full" style={{ background: BRAND }} />}
            </div>
          )
        })}
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50">
        {/* Topbar */}
        <div className="flex items-center justify-between px-2.5 h-6 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[6px] text-stone-400">Sistema POS FoodIX para restaurantes</span>
            <span className="h-1 w-1 rounded-full bg-green-500" />
            <span className="text-[6px] text-green-600 font-medium">En línea</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[6px] text-stone-400 border border-stone-200 rounded px-1 py-[1px]">🖨 Impresora</span>
            <span className="text-[7px]">☀️</span>
            <span className="h-2.5 w-2.5 rounded-full bg-orange-200 grid place-items-center text-[5px]">👤</span>
          </div>
        </div>
        <div className="flex-1 p-2.5 min-h-0">{children}</div>
      </div>
    </div>
  )
}

/* Encabezado de página reutilizable */
export function PageHead({ title, sub, action, ghost }: { title: string; sub: string; action?: string; ghost?: string }) {
  return (
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="text-[10px] font-extrabold text-stone-900 leading-none">{title}</p>
        <p className="text-[6px] text-stone-400 mt-1">{sub}</p>
      </div>
      <div className="flex items-center gap-1">
        {ghost && <span className="text-[6px] font-semibold text-stone-600 border border-stone-200 rounded-md px-1.5 py-[3px]">{ghost}</span>}
        {action && <span className="text-[6px] font-semibold text-white rounded-md px-1.5 py-[3px]" style={{ background: BRAND }}>{action}</span>}
      </div>
    </div>
  )
}

export function Bar({ h, c = '#d6d3d1' }: { h: number; c?: string }) {
  return <span className="flex-1 rounded-t" style={{ height: `${h}%`, background: c }} />
}

/* ─── 1. Dashboard ─── */
export function DashboardScreen() {
  const kpis = [
    { l: 'Ventas Hoy', v: '$8,450', s: '24 pedidos', c: BRAND, chip: '🧮', bg: '#fff7ed' },
    { l: 'Pedidos Activos', v: '5', s: 'preparando', c: '#3b82f6', chip: '🧾', bg: '#eff6ff' },
    { l: 'Mesas Ocupadas', v: '4/10', s: '6 libres', c: '#22c55e', chip: '🍽️', bg: '#f0fdf4' },
    { l: 'Ticket Promedio', v: '$352', s: 'de hoy', c: '#a855f7', chip: '🧾', bg: '#faf5ff' },
  ]
  return (
    <BrowserFrame title="foodix.app · Panel de administración">
      <AppShell active="Dashboard">
        <PageHead title="Hola, Carlos 🙌" sub="Panel de administración" action="+ Nuevo Pedido" ghost="Ver Mesas" />
        <div className="grid grid-cols-4 gap-1.5 mb-2">
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
          <div className="col-span-2 rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col">
            <p className="text-[6px] font-semibold text-stone-500 mb-1">Ventas — últimos 7 días</p>
            <div className="flex-1 flex items-end gap-1">
              {[42, 60, 48, 78, 55, 70, 92].map((h, i) => <Bar key={i} h={h} c={i % 3 === 0 ? BRAND : '#fed7aa'} />)}
            </div>
          </div>
          <div className="rounded-lg bg-white border border-stone-100 p-1.5">
            <p className="text-[6px] font-semibold text-stone-500 mb-1.5">Acciones rápidas</p>
            {['+ Nuevo pedido', 'Ver mesas', 'Ver pedidos', 'Reportes'].map((a, i) => (
              <div key={a} className="rounded bg-stone-50 border border-stone-100 px-1 py-[3px] mb-1 text-[5.5px] font-medium text-stone-600" style={i === 0 ? { color: BRAND } : undefined}>{a}</div>
            ))}
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ─── 2. Pedidos ─── */
export function PosScreen() {
  const orders = [
    { n: 5, st: 'Completado', c: '#22c55e', t: 'Mesa 1 · 1 artículo · hace 2 h', d: 'Tostada de camarón', p: '$135.00', q: '1 pza' },
    { n: 4, st: 'Preparando', c: BRAND, t: 'Mesa 3 · 2 artículos · hace 12 min', d: 'Camarones empanizados', p: '$215.00', q: '2 pzas' },
    { n: 3, st: 'Listo', c: '#3b82f6', t: 'Mesa 2 · 2 artículos · hace 18 min', d: 'Tostada de ceviche', p: '$195.00', q: '2 pzas' },
    { n: 2, st: 'Pendiente', c: '#eab308', t: 'Mesa 5 · 5 artículos · hace 24 min', d: 'Coctel grande de pulpo', p: '$748.20', q: '5 pzas' },
  ]
  return (
    <BrowserFrame title="foodix.app · Pedidos">
      <AppShell active="Pedidos">
        <PageHead title="Pedidos" sub="4 pedidos activos" action="+ Nuevo Pedido" />
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          {[['⏰', '2', 'Pendientes', '#eab308'], ['🍳', '1', 'Preparando', BRAND], ['✅', '1', 'Listos', '#3b82f6'], ['🟢', '24', 'Hoy', '#22c55e']].map(([ic, v, l, c]) => (
            <div key={l} className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1">
              <span className="text-[7px]">{ic}</span>
              <div><p className="text-[9px] font-extrabold leading-none" style={{ color: c }}>{v}</p><p className="text-[5px] text-stone-400 mt-0.5">{l}</p></div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mb-1.5">
          {[['Todos', 4], ['Pendiente', 2], ['Preparando', 1], ['Listo', 1], ['Completado', 1]].map(([l, n], i) => (
            <span key={l as string} className="text-[5.5px] font-medium rounded-full px-1.5 py-[2px]" style={i === 0 ? { background: '#fff7ed', color: BRAND } : { background: '#f5f5f4', color: '#78716c' }}>{l} {n}</span>
          ))}
        </div>
        <div className="space-y-1">
          {orders.map(o => (
            <div key={o.n} className="flex items-center gap-1.5 rounded-lg bg-white border border-stone-100 p-1.5" style={{ borderLeft: `2px solid ${o.c}` }}>
              <span className="h-3.5 w-3.5 rounded-full grid place-items-center text-[6px]" style={{ background: `${o.c}22` }}>•</span>
              <div className="min-w-0 flex-1">
                <p className="text-[6px] font-bold text-stone-800 leading-none">#{o.n} <span className="font-medium" style={{ color: o.c }}>{o.st}</span></p>
                <p className="text-[5px] text-stone-400 mt-0.5 truncate">{o.t}</p>
                <p className="text-[5px] text-stone-400 truncate">{o.d}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[7px] font-extrabold text-stone-900 leading-none">{o.p}</p>
                <p className="text-[5px] text-stone-400 mt-0.5">{o.q}</p>
              </div>
            </div>
          ))}
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ─── 3. Cocina KDS ─── */
export function KitchenScreen() {
  const Ticket = ({ n, mesa, mins, items, urgent }: { n: number; mesa: string; mins: string; items: string[]; urgent?: boolean }) => (
    <div className="rounded-md p-1.5 shadow-sm" style={{ background: 'rgba(255,255,255,0.97)', borderTop: `2px solid ${urgent ? '#ef4444' : '#f59e0b'}` }}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[6px] font-extrabold text-stone-800">#{n} · {mesa}</span>
        <span className="text-[6px] font-bold" style={{ color: urgent ? '#ef4444' : '#f59e0b' }}>{mins}</span>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1 mb-0.5">
          <span className="h-1.5 w-1.5 rounded-[1px] border" style={{ borderColor: '#a8a29e' }} />
          <span className="text-[5.5px] text-stone-600">{it}</span>
        </div>
      ))}
    </div>
  )
  return (
    <BrowserFrame title="foodix.app · Cocina KDS">
      <div className="h-full flex flex-col" style={{ background: '#0c0a09' }}>
        <div className="flex items-center justify-between px-3 h-7 shrink-0 border-b border-white/5">
          <span className="text-[8px] font-extrabold" style={{ color: '#fbbf24' }}>🔥 COCINA — ESTACIÓN CALIENTE</span>
          <span className="text-[9px] font-bold tracking-widest text-white tabular-nums">19:24:07</span>
          <span className="text-[7px] font-bold text-right" style={{ color: '#fbbf24' }}>4 pedidos<br /><span className="text-[5px] font-normal text-stone-500">activos</span></span>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1.5 p-2 content-start">
          <Ticket n={42} mesa="Mesa 3" mins="2:10" items={['Camarones empanizados', 'Arroz a la tumbada']} />
          <Ticket n={43} mesa="Mesa 7" mins="5:48" items={['Filete de pescado', 'Tostada de camarón', 'Orden de papas']} urgent />
          <Ticket n={44} mesa="Para llevar" mins="0:54" items={['Coctel de pulpo']} />
          <Ticket n={45} mesa="Mesa 1" mins="1:32" items={['Caldo de mariscos', 'Empanizado mixto']} />
          <Ticket n={46} mesa="Mesa 5" mins="3:05" items={['Mojarra frita']} />
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── 4. Mesas ─── */
export function TablesScreen() {
  const tables = [
    { n: 1, p: 4, st: 'Libre', c: '#22c55e' }, { n: 2, p: 4, st: 'Ocupada', c: BRAND },
    { n: 3, p: 2, st: 'Libre', c: '#22c55e' }, { n: 4, p: 2, st: 'Reservada', c: '#3b82f6' },
    { n: 5, p: 6, st: 'Ocupada', c: BRAND }, { n: 6, p: 4, st: 'Libre', c: '#22c55e' },
    { n: 7, p: 4, st: 'Libre', c: '#22c55e' }, { n: 8, p: 8, st: 'Ocupada', c: BRAND },
    { n: 9, p: 2, st: 'Libre', c: '#22c55e' }, { n: 10, p: 4, st: 'Libre', c: '#22c55e' },
  ]
  return (
    <BrowserFrame title="foodix.app · Mesas">
      <AppShell active="Mesas">
        <PageHead title="Mesas" sub="10 mesas · 3 ocupadas" action="+ Agregar mesa" />
        <div className="flex gap-1 mb-2">
          {[['7 Libres', '#16a34a', '#f0fdf4'], ['3 Ocupadas', '#dc2626', '#fef2f2'], ['0 Reservadas', '#ca8a04', '#fefce8']].map(([l, c, bg]) => (
            <span key={l} className="text-[5.5px] font-semibold rounded-full px-1.5 py-[2px]" style={{ color: c, background: bg }}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {tables.map(t => (
            <div key={t.n} className="rounded-lg bg-white p-1.5 border" style={{ borderColor: `${t.c}55` }}>
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-extrabold text-stone-800">Mesa {t.n}</span>
                <span className="h-1 w-1 rounded-full" style={{ background: t.c }} />
              </div>
              <p className="text-[5px] text-stone-400 mt-0.5">👥 {t.p} personas</p>
              <span className="inline-block mt-1 text-[5px] font-semibold rounded px-1 py-[1px]" style={{ color: t.c, background: `${t.c}1a` }}>{t.st}</span>
            </div>
          ))}
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ─── 5. Ventas / Reportes ─── */
export function ReportsScreen() {
  return (
    <BrowserFrame title="foodix.app · Ventas (Reportes PDF)">
      <AppShell active="Ventas">
        <PageHead title="Ventas" sub="Análisis y reportes de ingresos" ghost="📄 Exportar PDF" />
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[['💰', 'Hoy', '$8,450', '24 pedidos', BRAND], ['📈', 'Esta semana', '$48,720', '142 pedidos', '#3b82f6'], ['🧾', 'Este mes', '$196,300', '588 pedidos', '#22c55e']].map(([ic, l, v, s, c]) => (
            <div key={l} className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1.5" style={{ borderLeft: `2px solid ${c}` }}>
              <span className="text-[9px]">{ic}</span>
              <div><p className="text-[5px] text-stone-400 leading-none">{l}</p><p className="text-[9px] font-extrabold text-stone-900 leading-none mt-0.5">{v}</p><p className="text-[5px] text-stone-400 mt-0.5">{s}</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-white border border-stone-100 p-1.5 flex items-center gap-1.5 mb-1.5">
          <span className="text-[5px] text-stone-400">Desde</span>
          <span className="text-[5px] text-stone-600 border border-stone-200 rounded px-1.5 py-[2px]">04/05/2026</span>
          <span className="text-[5px] text-stone-400">Hasta</span>
          <span className="text-[5px] text-stone-600 border border-stone-200 rounded px-1.5 py-[2px]">02/06/2026</span>
          <span className="text-[5px] text-stone-400 ml-auto">588 pedidos en el rango</span>
        </div>
        <div className="rounded-lg bg-white border border-stone-100 p-1.5 flex flex-col" style={{ height: 'calc(100% - 86px)' }}>
          <p className="text-[6px] font-semibold text-stone-500 mb-1">Ingresos diarios — últimos 30 días</p>
          <div className="flex-1 flex items-end gap-[2px]">
            {[40, 55, 48, 70, 62, 80, 58, 72, 90, 66, 78, 52, 84, 60, 95, 70, 88, 64, 76, 58].map((h, i) => <Bar key={i} h={h} c={i % 2 ? BRAND : '#fdba74'} />)}
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

/* ─── 6. Carta digital con QR ─── */
export function CartaScreen() {
  return (
    <BrowserFrame title="foodix.app · Carta digital con QR">
      <AppShell active="Carta">
        <PageHead title="Carta Digital" sub="Comparte el menú por código QR o enlace" action="↗ Ver carta" />
        <div className="grid grid-cols-2 gap-1.5" style={{ height: 'calc(100% - 28px)' }}>
          {/* QR */}
          <div className="rounded-lg overflow-hidden border border-stone-100 bg-white flex flex-col">
            <div className="text-center py-1.5" style={{ background: BRAND }}>
              <p className="text-[7px] font-extrabold text-white leading-none">Código QR</p>
              <p className="text-[5px] text-white/80 mt-0.5">Muéstralo al comensal</p>
            </div>
            <div className="flex-1 grid place-items-center p-1.5">
              <div className="grid grid-cols-7 gap-[1px] p-1.5 bg-white rounded border border-stone-200">
                {Array.from({ length: 49 }).map((_, i) => {
                  const on = [0, 1, 2, 4, 5, 6, 7, 13, 14, 18, 20, 21, 25, 27, 28, 30, 32, 34, 35, 40, 42, 43, 44, 46, 47, 48].includes(i)
                  return <span key={i} className="h-[3px] w-[3px] rounded-[0.5px]" style={{ background: on ? '#1c1917' : 'transparent' }} />
                })}
              </div>
            </div>
            <p className="text-[5px] text-stone-400 text-center pb-1.5 truncate px-2">restauros.app/carta/mariscos-el-puerto</p>
          </div>
          {/* Panel derecho */}
          <div className="flex flex-col gap-1.5">
            <div className="rounded-lg p-1.5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-[6px] font-bold text-stone-700">📱 Instrucción para el comensal</p>
              <p className="text-[5px] text-stone-500 mt-0.5 leading-relaxed">Escanea el QR con la cámara de tu teléfono para ver la carta interactiva.</p>
            </div>
            <div className="text-[5.5px] font-semibold text-stone-600 border border-stone-200 rounded-md px-1.5 py-[3px] text-center">⧉ Copiar enlace</div>
            <div className="text-[5.5px] font-semibold text-stone-600 border border-stone-200 rounded-md px-1.5 py-[3px] text-center">↗ Compartir carta</div>
            <div className="text-[5.5px] font-semibold text-white rounded-md px-1.5 py-[3px] text-center" style={{ background: BRAND }}>↗ Abrir carta en nueva pestaña</div>
            <div className="grid grid-cols-3 gap-1 mt-auto">
              {[['2', 'Categorías'], ['12', 'Platillos'], ['1', 'Promos']].map(([v, l]) => (
                <div key={l} className="rounded-md bg-white border border-stone-100 py-1 text-center">
                  <p className="text-[8px] font-extrabold text-stone-800 leading-none">{v}</p>
                  <p className="text-[4.5px] text-stone-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  )
}

export const LANDING_SCREENS: { key: string; label: string; el: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Panel de administración', el: <DashboardScreen /> },
  { key: 'pos', label: 'Pedidos en tiempo real', el: <PosScreen /> },
  { key: 'kitchen', label: 'Cocina KDS en tiempo real', el: <KitchenScreen /> },
  { key: 'tables', label: 'Control de mesas', el: <TablesScreen /> },
  { key: 'reports', label: 'Ventas y reportes en PDF', el: <ReportsScreen /> },
  { key: 'carta', label: 'Carta digital con QR', el: <CartaScreen /> },
]
