import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Lightbulb, AlertTriangle } from 'lucide-react'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { PageTransition } from '@/components/shared/PageTransition'
import { APP_VERSION } from '@/lib/constants/appInfo'

export const metadata: Metadata = {
  title: 'Manual de Usuario — FoodIX',
  description: 'Guía completa de FoodIX: pedidos, mesas, cocina, caja, inventario, clientes, promociones y combos, WhatsApp con IA, reservaciones, domicilios, suscripciones y administración multi-sucursal.',
}

const TOC = [
  { id: 'intro',       label: '¿Qué es FoodIX?' },
  { id: 'roles',       label: 'Roles de usuario' },
  { id: 'login',       label: 'Inicio de sesión' },
  { id: 'dashboard',   label: 'Panel principal (Admin)' },
  { id: 'orders',      label: 'Gestión de pedidos' },
  { id: 'payments',    label: 'Cobro y formas de pago' },
  { id: 'modifiers',   label: 'Modificadores' },
  { id: 'tables',      label: 'Control de mesas' },
  { id: 'reservations',label: 'Reservaciones' },
  { id: 'deliveries',  label: 'Domicilios' },
  { id: 'menu',        label: 'Carta y menú' },
  { id: 'carta-qr',    label: 'Carta QR (comensal)' },
  { id: 'kitchen',     label: 'Pantalla de cocina' },
  { id: 'kds',         label: 'Estaciones KDS' },
  { id: 'cash',        label: 'Caja y turnos' },
  { id: 'inventory',   label: 'Inventario y compras' },
  { id: 'customers',   label: 'Clientes y lealtad' },
  { id: 'promotions',  label: 'Promociones y combos' },
  { id: 'sales',       label: 'Reportes de ventas' },
  { id: 'printing',    label: 'Impresión y cajón' },
  { id: 'billing',     label: 'Mi Suscripción' },
  { id: 'whatsapp',    label: 'WhatsApp (Plan AI)' },
  { id: 'help',        label: 'Centro de Ayuda' },
  { id: 'faq',         label: 'Preguntas frecuentes' },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-2 w-2 rounded-full bg-[#E85D04] shrink-0" />
        <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
          {title}
        </h2>
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <div className="space-y-4 text-stone-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-blue-50/80 border border-blue-100 px-4 py-3 rounded-xl text-sm text-blue-900 shadow-sm">
      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
      <p><strong className="font-semibold">Consejo:</strong> {children}</p>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-amber-50/80 border border-amber-100 px-4 py-3 rounded-xl text-sm text-amber-900 shadow-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
      <p><strong className="font-semibold">Importante:</strong> {children}</p>
    </div>
  )
}

function RoleBadge({ role, color }: { role: string; color: string }) {
  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mr-1" style={{ background: color + '20', color }}>
      {role}
    </span>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E85D04] text-white text-sm font-bold flex items-center justify-center shadow-sm shadow-[#E85D04]/30">
        {n}
      </span>
      <p className="pt-0.5">{children}</p>
    </div>
  )
}

export default function ManualPage() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1C1917]/95 backdrop-blur-sm text-white border-b border-white/5 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/brand/foodix-icon.svg"
              alt="FoodIX"
              width={32}
              height={32}
              unoptimized
              className="rounded-lg flex-shrink-0 shadow-sm"
            />
            <span className="inline-block font-bold text-lg animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
              Food<span className="text-[#E85D04]">IX</span><sup className="text-[0.55em] align-super">©</sup>
            </span>
            <span className="text-stone-400 text-sm hidden sm:block truncate">/ Manual de usuario</span>
          </div>
          <Link href="/login" className="shrink-0 text-sm bg-[#E85D04] hover:bg-[#C44D00] active:scale-95 px-4 py-1.5 rounded-lg font-semibold transition-all">
            Ir al sistema →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-10 flex gap-8">
        {/* TOC sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-1">Contenido</p>
            <nav className="space-y-0.5 max-h-[calc(100vh-9rem)] overflow-y-auto scrollbar-thin pr-1">
              {TOC.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-[#E85D04]/8 hover:text-[#E85D04] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl">
          {/* Hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#E85D04] to-[#C44D00] text-white rounded-3xl p-8 mb-10 shadow-xl shadow-orange-900/10 animate-fade-in-up">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <span className="relative inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide mb-3">
              FoodIX · v{APP_VERSION}
            </span>
            <h1 className="relative text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">Manual de Usuario</h1>
            <p className="relative text-orange-100 text-base sm:text-lg max-w-xl">
              Guía completa de la plataforma de gestión integral para restaurantes, cafeterías y taquerías
            </p>
          </div>

          {/* ── Sección 1 ── */}
          <Section id="intro" title="¿Qué es FoodIX?">
            <p>
              FoodIX es una plataforma de gestión integral (POS + operación) diseñada especialmente para
              restaurantes, taquerías, cafeterías y cualquier negocio de alimentos. Permite gestionar pedidos,
              mesas, cocina, caja y turnos, inventario y compras, clientes y lealtad, reservaciones, domicilios,
              ventas y la suscripción de tu sucursal, todo desde cualquier dispositivo con navegador web.
            </p>
            <p>
              A diferencia de los sistemas tradicionales que requieren instalación, FoodIX funciona
              directamente desde el navegador de tu tableta, smartphone o computadora, sin necesidad de
              descargar ninguna aplicación. Es un servicio en la nube (SaaS) por suscripción mensual.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              {[
                { icon: ICONS8.multiDevice, title: 'Multiplataforma', desc: 'Funciona en iPad, Android, PC y Mac' },
                { icon: ICONS8.realtime, title: 'Tiempo real', desc: 'Los pedidos llegan a cocina al instante' },
                { icon: ICONS8.secure, title: 'Seguro', desc: 'Acceso por rol: cada usuario ve solo lo que necesita' },
              ].map(f => (
                <div key={f.title} className="bg-white border rounded-xl p-4 text-center shadow-sm hover-lift">
                  <Icons8Image src={f.icon} alt={f.title} size={40} className="mx-auto mb-2" />
                  <p className="font-semibold text-sm text-stone-900">{f.title}</p>
                  <p className="text-xs text-stone-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Sección 2 ── */}
          <Section id="roles" title="Roles de usuario">
            <p>
              FoodIX tiene cuatro roles principales. Cada rol tiene acceso a diferentes funciones
              del sistema según sus responsabilidades:
            </p>
            <div className="space-y-3">
              {[
                {
                  role: 'Administrador', color: '#E85D04', icon: ICONS8.adminAvatar,
                  desc: 'Acceso completo a la sucursal: pedidos, mesas, menú, ventas y configuración.',
                  puede: ['Ver dashboard con métricas del día', 'Crear, editar y eliminar productos y categorías', 'Ver reportes de ventas', 'Gestionar la configuración del negocio', 'Ver pedidos de todos los meseros', 'Compartir la Carta QR / enlace digital con el comensal'],
                },
                {
                  role: 'Mesero', color: '#3b82f6', icon: ICONS8.meseroAvatar,
                  desc: 'Operación de piso: pedidos, mesas, domicilios, reservas, clientes, caja y la Carta QR. No accede a la edición del menú, ventas, inventario ni configuración.',
                  puede: ['Ver y crear pedidos y cobrar', 'Ver el estado de las mesas', 'Gestionar domicilios y reservaciones', 'Consultar clientes', 'Operar la caja del turno', 'Mostrar la Carta QR al comensal (escanear o compartir enlace)'],
                },
                {
                  role: 'Cocina', color: '#f59e0b', icon: ICONS8.cocinaAvatar,
                  desc: 'Ve los pedidos entrantes y actualiza su estado de preparación. Solo accede a las pantallas de cocina.',
                  puede: ['Ver pedidos en tiempo real', 'Marcar ítems como "Preparando" y "Listo"', 'Ver solo la estación que tenga asignada (caliente, fría o ambas)'],
                },
              ].map(r => (
                <div key={r.role} className="bg-white border rounded-xl p-4 shadow-sm hover-lift">
                  <div className="flex items-center gap-3 mb-2">
                    <Icons8Image src={r.icon} alt={r.role} size={28} />
                    <div>
                      <span className="font-bold text-stone-900">{r.role}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: r.color + '20', color: r.color }}>
                        {r.role.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-2">{r.desc}</p>
                  <ul className="space-y-1">
                    {r.puede.map(p => (
                      <li key={p} className="text-xs text-stone-500 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Sección 3 ── */}
          <Section id="login" title="Inicio de sesión">
            <p>
              FoodIX cuenta con dos métodos seguros de acceso, diferenciados según las funciones de cada usuario en el restaurante:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 my-4">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-stone-900 mb-1">🔐 Administradores</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  El rol de <strong>Administrador</strong> inicia sesión ingresando su <strong>usuario y contraseña</strong> en la pantalla de acceso tradicional.
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-[#E85D04] mb-1">⚡ Acceso Rápido (Meseros y Cocina)</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Los empleados de piso y cocina inician sesión seleccionando su nombre e ingresando su <strong>PIN de 4 a 6 dígitos</strong> desde la pantalla de <strong>Acceso por PIN</strong>.
                </p>
              </div>
            </div>

            <Warning>
              <strong>Seguridad mejorada:</strong> Por políticas de seguridad, los empleados operativos no pueden iniciar sesión con usuario y contraseña tradicionales; el sistema rechazará el acceso y les recordará ingresar utilizando su PIN personal en la pantalla de Acceso Rápido.
            </Warning>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Paso a paso para Administradores:</h3>
            <div className="space-y-3">
              <Step n={1}>Escribe tu nombre de usuario en el campo <strong>"Usuario"</strong>.</Step>
              <Step n={2}>Escribe tu contraseña. Puedes presionar el ícono del ojo para verificarla.</Step>
              <Step n={3}>Haz clic en <strong>"Ingresar"</strong> para entrar al panel de administración.</Step>
            </div>

            <Tip>
              <strong>Privacidad reforzada:</strong> Por seguridad, la pantalla de inicio de sesión ya no muestra sugerencias de autocompletado del navegador para el usuario ni la contraseña. Esto evita que credenciales guardadas queden expuestas en dispositivos compartidos del restaurante.
            </Tip>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Paso a paso para Empleados (Acceso por PIN):</h3>
            <div className="space-y-3">
              <Step n={1}>Haz clic en el enlace <strong>"Usar acceso rápido por PIN"</strong> en la pantalla de login (o accede directamente a la URL de PIN de la sucursal).</Step>
              <Step n={2}>Selecciona tu nombre en la lista de personal de la sucursal.</Step>
              <Step n={3}>Ingresa tu PIN personal usando el teclado numérico virtual en pantalla. El sistema validará el PIN automáticamente al ingresar los 4 dígitos.</Step>
            </div>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">El Teclado Numérico Virtual (PinPad Premium):</h3>
            <p className="text-sm text-stone-600">
              FoodIX integra un teclado numérico virtual premium optimizado para pantallas táctiles y tablets en estaciones de trabajo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-stone-600 ml-2">
              <li><strong>Feedback Táctil:</strong> Los botones numéricos cuentan con micro-interacciones de escala y cambios de brillo instantáneos al tacto.</li>
              <li><strong>Indicadores de Progreso:</strong> En la parte de arriba verás círculos indicadores que se rellenan conforme ingresas cada dígito.</li>
              <li>
                <strong>Validación Elegante de Errores (Shake Effect):</strong> Si ingresas un PIN incorrecto,
                el teclado y los indicadores se sacudirán lateralmente, se limpiará la entrada automáticamente
                y se mostrará una notificación visual de acceso denegado.
              </li>
              <li>
                <strong>Animación de Éxito:</strong> Al ingresar el PIN correcto, los indicadores se iluminan en color
                verde brillante con brillo radiante, el teclado numérico se desvanece suavemente y se despliega un ícono animado de éxito (checkmark verde de Icons8) antes de iniciar sesión en un lapso de 1.5 segundos.
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/media__1781756303071.png"
                  alt="Teclado PIN Virtual"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Teclado numérico virtual premium con validaciones visuales</span>
              </div>
            </div>

            <Warning>
              <strong>Aprobación de Dispositivos:</strong> Para que la lista del personal aparezca en la pantalla de PIN, el dispositivo (celular, tableta o computadora) debe estar previamente <strong>aprobado</strong> por el Administrador. Si aparece el mensaje &quot;Dispositivo pendiente de aprobación&quot;, contacta al administrador de la sucursal. Los dispositivos de los administradores se aprueban automáticamente en su primer acceso.
            </Warning>

            <Tip>
              <strong>Administración de contraseñas y PINs:</strong> El administrador de la sucursal puede crear, cambiar o quitar tanto la contraseña como el PIN de acceso rápido de cualquier empleado en cualquier momento desde el módulo **Usuarios**.
            </Tip>
          </Section>

          {/* ── Sección 4 ── */}
          <Section id="dashboard" title="Panel principal (Administrador)">
            <p>
              Al iniciar sesión como administrador, verás el <strong>Dashboard</strong> — tu centro de control
              del día. Desde aquí puedes ver de un vistazo cómo va el negocio.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Tarjetas KPI</h3>
            <p>Las cuatro tarjetas superiores muestran:</p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Ventas Hoy</strong> — total de ingresos del día en curso</li>
              <li><strong>Pedidos Activos</strong> — órdenes pendientes o en preparación</li>
              <li><strong>Mesas Ocupadas</strong> — mesas con clientes vs. total</li>
              <li><strong>Ticket Promedio</strong> — valor promedio por pedido del día</li>
            </ul>
            <Tip>
              En el teléfono las tarjetas KPI se muestran como un <strong>carrusel horizontal</strong>:
              desliza el dedo hacia los lados para ver todas. En computadora aparecen las cuatro en fila.
            </Tip>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Gráfica de ventas</h3>
            <p>
              Muestra los ingresos de los últimos 7 días. Útil para identificar días de mayor y menor
              demanda y planificar el personal adecuado.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Acciones rápidas</h3>
            <p>
              Botones de acceso directo a las acciones más frecuentes: crear pedido, ver mesas,
              ir a pedidos y ver reportes de ventas.
            </p>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Navegación en Dispositivos Móviles (Responsive):</h3>
            <p className="text-sm text-stone-600">
              Para garantizar que el administrador y el personal puedan operar el restaurante al 100% desde cualquier smartphone, FoodIX cuenta con un menú responsivo avanzado:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-stone-600 ml-2">
              <li>
                <strong>Selector Deslizable Horizontal (Slide Selector):</strong> La barra de navegación inferior se convierte
                en un carrusel horizontal. Si tu rol tiene más opciones de las que caben en la pantalla de tu celular, puedes
                deslizar el dedo hacia los lados para ver todas las pestañas principales (por ejemplo, Dashboard, Pedidos, Mesas, Carta QR, Menú, Usuarios).
              </li>
              <li>
                <strong>Gestión de Usuarios Móvil:</strong> Accede al módulo <strong>"Usuarios"</strong> directamente desde la barra deslizable
                para añadir personal, cambiar contraseñas y configurar sus PINs de acceso rápido desde tu teléfono en medio del servicio.
              </li>
              <li>
                <strong>Menú Completo (Botón "Más"):</strong> Al final de la barra deslizante inferior encontrarás la opción <strong>"Más"</strong>.
                Al tocarla, se abrirá un modal elegante con efecto translúcido de fondo (glassmorphism) que muestra un panel completo en cuadrícula de 3 columnas
                con todos los módulos activos de tu sucursal representados con íconos de color de Icons8.
              </li>
              <li>
                <strong>Persistencia del Indicador de Ruta:</strong> Si accedes a una sección desde el menú modal (como <i>Inventario</i> o <i>Ventas</i>),
                la pestaña <strong>"Más"</strong> se mantendrá iluminada con un indicador naranja para mostrarte en qué sección del sistema te encuentras.
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/media__1781760566260.png"
                  alt="Navegación Móvil Deslizable"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Menú móvil deslizable con acceso rápido y modal "Más"</span>
              </div>
            </div>
          </Section>

          {/* ── Sección 5 ── */}
          <Section id="orders" title="Gestión de pedidos">
            <p>
              El módulo de pedidos es el corazón del sistema. Desde aquí, los meseros crean y gestionan
              todas las órdenes del restaurante.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-3">Crear un nuevo pedido</h3>
            <div className="space-y-3">
              <Step n={1}>
                Ve a <strong>Pedidos → Nuevo Pedido</strong> o toca el botón flotante <strong>"+"</strong> en móvil.
              </Step>
              <Step n={2}>
                <strong>Paso 1 — Tipo de pedido:</strong> Elige <strong>Mesa</strong> (solo aparecen las disponibles),
                <strong> Para Llevar</strong> (mostrador) o <strong>Domicilio</strong>. Si es domicilio, escribe la
                dirección de entrega; el pedido aparecerá luego en la pantalla de <strong>Domicilios</strong>.
              </Step>
              <Step n={3}>
                <strong>Paso 2 — Productos:</strong> Busca productos por nombre o usa las categorías para filtrar.
                <strong> Toca la tarjeta o la foto del producto para agregarlo al instante</strong> — funciona incluso en
                productos con modificadores, así puedes agregar varios platillos seguido sin interrupciones. Ajusta las
                cantidades con los botones + y -.
              </Step>
              <Step n={4}>
                <strong>Paso 3 — Confirmar:</strong> Revisa el resumen del pedido, agrega notas especiales si el cliente
                tiene alguna petición (alergias, modificaciones) y confirma.
              </Step>
            </div>
            <Tip>
              Si tu establecimiento usa lectores de código de barras (scanner USB/Bluetooth), puedes
              escanear productos directamente en el Paso 2. El producto aparece automáticamente en el carrito.
            </Tip>
            <Tip>
              Los productos con la etiqueta <strong>"Personalizar"</strong> (término, extras, tamaño, etc.) tienen ese
              botón aparte, debajo de la foto. Tócalo <strong>solo cuando el cliente pida algo especial</strong>
              — abre la ventana de modificadores. Si no lo tocas, tocar la tarjeta agrega el platillo tal cual, sin abrir
              ninguna ventana.
            </Tip>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Productos por kilogramo y de precio variable</h3>
            <p>
              No todos los productos tienen un precio fijo. FoodIX soporta tres formas de capturar el importe
              al agregar el producto al pedido, según el <strong>tipo de precio</strong> que el administrador le
              haya configurado en la carta:
            </p>
            <div className="grid sm:grid-cols-3 gap-3 my-2">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-stone-900 mb-1">⚖️ Por kilogramo</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Ideal para mariscos, ceviche o cualquier producto a granel. Se abre un teclado táctil grande para
                  capturar el <strong>peso (kg)</strong> y el <strong>precio por kilo</strong>; el sistema calcula el
                  <strong> total</strong> automáticamente (peso × precio/kg).
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-stone-900 mb-1">💲 Precio abierto / variable</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Para productos sin precio fijo (ej. "platillo del día" o promociones). Capturas el <strong>importe</strong>
                  directamente en el teclado numérico al agregarlo.
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-stone-900 mb-1">✍️ Línea personalizada</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Agrega un concepto libre con su precio cuando lo que vendes no está en la carta.
                </p>
              </div>
            </div>
            <Tip>
              El teclado de captura valida que el peso y el precio sean mayores a 0 y acepta decimales (el peso
              admite gramos). El total calculado se muestra en grande antes de confirmar, para evitar errores de cobro.
            </Tip>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/kg-price.png"
                  alt="Diálogo de captura de producto por kilogramo"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Captura por kilogramo: peso × precio/kg con total automático</span>
              </div>
            </div>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Estados de un pedido</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { status: 'Pendiente',    color: '#f59e0b', desc: 'Recién creado, esperando inicio en cocina' },
                { status: 'Preparando',   color: '#E85D04', desc: 'Cocina inició la preparación' },
                { status: 'Listo',        color: '#3b82f6', desc: 'Preparación terminada, listo para entregar' },
                { status: 'Entregado',    color: '#8b5cf6', desc: 'Mesero lo llevó a la mesa' },
                { status: 'Completado',   color: '#16a34a', desc: 'Pedido finalizado, mesa liberada' },
                { status: 'Cancelado',    color: '#dc2626', desc: 'Pedido anulado' },
              ].map(s => (
                <div key={s.status} className="bg-white border rounded-lg p-2.5 shadow-sm">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.color + '20', color: s.color }}>
                    {s.status}
                  </span>
                  <p className="text-xs text-stone-500 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Cancelar un pedido desde la lista</h3>
            <p>
              En <strong>Pedidos</strong>, cada tarjeta de un pedido activo (pendiente, preparando o listo) tiene un
              ícono de bote de basura — cancélalo ahí mismo con una confirmación, sin tener que entrar al detalle.
            </p>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Historial de tickets</h3>
            <p>
              Desde <strong>Pedidos → Historial</strong> puedes consultar, reimprimir y auditar tickets cobrados,
              abiertos y cancelados, con filtros de estado, tipo, fecha y búsqueda por folio, mesa o mesero.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Consultar por QR o folio:</strong> pega el contenido de un QR de ticket o escribe un
                folio directo. Si ya está en la tabla filtrada, la acota; si existe pero está fuera del rango de
                fechas, se muestra aparte con sus mismas acciones (reimprimir/ver detalle)</li>
              <li>Mientras se busca aparece un aviso de <strong>"Buscando el folio…"</strong>; si el folio no es
                válido o el pedido no existe, un mensaje explica el motivo en vez de llevarte a una pantalla en blanco</li>
            </ul>
          </Section>

          {/* ── Cobro ── */}
          <Section id="payments" title="Cobro y formas de pago">
            <p>
              Para cobrar una cuenta, abre el pedido y toca el botón verde <strong>"Cobrar"</strong>.
              Se abre la ventana de pago con todas las opciones de una caja profesional.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Formas de pago</h3>
            <p>Puedes registrar el pago con uno o varios métodos:</p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Efectivo</strong> — escribe el monto recibido y el sistema calcula el <strong>cambio</strong></li>
              <li><strong>Tarjeta</strong> y <strong>Transferencia</strong> — con campo de referencia/folio</li>
              <li><strong>Monedero</strong> — descuenta del saldo del cliente</li>
            </ul>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Cuenta dividida</h3>
            <p>
              Toca <strong>"Dividir / agregar forma de pago"</strong> para registrar varios pagos en una misma
              cuenta (por ejemplo, una parte en efectivo y otra con tarjeta, o dividir entre comensales).
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Propina y descuento</h3>
            <p>
              Puedes capturar una <strong>propina</strong> y aplicar un <strong>descuento</strong> antes de cerrar.
              El total se recalcula automáticamente.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">IVA incluido</h3>
            <p>
              Los precios de tu menú <strong>ya incluyen IVA (16%)</strong>. El total que paga el cliente es la
              suma de los productos, <strong>sin sumar nada encima</strong> del precio. El resumen del pedido en
              pantalla (Mesero y Admin) muestra Subtotal y Total sin desglosar el IVA por separado, para mantenerlo
              simple; el <strong>ticket impreso</strong> sí incluye el desglose del IVA contenido, como información
              para tu contabilidad.
            </p>
            <Tip>
              Si la caja tiene impresora y cajón configurados, al cobrar se <strong>imprime el ticket</strong>
              y se <strong>abre el cajón de dinero</strong> automáticamente cuando hay pago en efectivo.
            </Tip>
            <Warning>
              Al marcar <strong>"Cerrar cuenta"</strong> con el pago completo, el pedido pasa a Completado
              y la mesa se libera. Si el pago es parcial, la cuenta queda como "Parcial".
            </Warning>
          </Section>

          {/* ── Modificadores ── */}
          <Section id="modifiers" title="Modificadores (Administrador)">
            <p>
              Los <strong>modificadores</strong> son opciones y extras que se eligen al vender un producto:
              término de la carne, ingredientes extra (con costo), quitar ingredientes, tamaños, etc.
              Se configuran en la sección <strong>Modificadores</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Crear un grupo</h3>
            <div className="space-y-3">
              <Step n={1}>Toca <strong>"Nuevo grupo"</strong> y ponle nombre (ej. "Término", "Extras").</Step>
              <Step n={2}>
                Define el <strong>máximo de selecciones</strong> (1 = opción única) y si es <strong>obligatorio</strong>.
              </Step>
              <Step n={3}>
                Agrega las <strong>opciones</strong> con su costo extra (ej. "Queso extra +$15"). Deja el costo en 0 si no suma.
              </Step>
              <Step n={4}>
                Selecciona a qué <strong>productos</strong> aplica el grupo. Al venderlos, se pedirá elegir.
              </Step>
            </div>
            <Tip>
              Cada combinación de modificadores se cobra y se manda a cocina como una línea independiente,
              con sus notas. El precio del producto se ajusta sumando los extras elegidos.
            </Tip>
          </Section>

          {/* ── Sección 6 ── */}
          <Section id="tables" title="Control de mesas">
            <p>
              La pantalla de mesas muestra el estado actual de todas las mesas de tu sucursal
              en tiempo real. Los colores indican el estado de cada mesa:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
                <span><strong>Verde — Libre:</strong> Mesa disponible para nuevos clientes.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                <span><strong>Rojo — Ocupada:</strong> Hay clientes con un pedido activo.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0" />
                <span><strong>Amarillo — Reservada:</strong> Mesa apartada para una reservación.</span>
              </li>
            </ul>
            <p>
              Al tocar una mesa <strong>libre</strong>, el sistema te lleva directamente a crear un nuevo
              pedido para esa mesa. Si la mesa está <strong>ocupada</strong>, te lleva al pedido activo
              para que puedas actualizarlo o completarlo.
            </p>
            <Tip>
              El administrador puede cambiar manualmente el estado de una mesa (por ejemplo, marcarla
              como "Reservada" para un evento) tocando en la opción "Cambiar" que aparece al pie de la tarjeta.
            </Tip>
          </Section>

          {/* ── Reservaciones ── */}
          <Section id="reservations" title="Reservaciones">
            <p>
              La sección <strong>Reservas</strong> permite apartar mesas para clientes con fecha y hora.
              Disponible para administrador y mesero.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-3">Crear una reservación</h3>
            <div className="space-y-3">
              <Step n={1}>Ve a <strong>Reservas</strong> y toca <strong>"Nueva reservación"</strong>.</Step>
              <Step n={2}>Captura el <strong>nombre del cliente</strong>, teléfono y número de personas.</Step>
              <Step n={3}>Elige <strong>fecha y hora</strong> y, opcionalmente, la <strong>mesa</strong> a apartar.</Step>
              <Step n={4}>Agrega notas (ocasión especial, ubicación preferida) y guarda.</Step>
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-2">Estados de la reservación</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Pendiente</strong> — reservación registrada, esperando al cliente</li>
              <li><strong>Confirmada</strong> — el cliente confirmó su asistencia</li>
              <li><strong>Sentada</strong> — el cliente llegó y ocupó la mesa</li>
              <li><strong>Cancelada / No llegó</strong> — la reservación no se concretó</li>
            </ul>
            <Tip>
              Al marcar una mesa como reservada, aparecerá en <strong>amarillo</strong> en el control de mesas
              para que el equipo sepa que está apartada.
            </Tip>
          </Section>

          {/* ── Domicilios ── */}
          <Section id="deliveries" title="Domicilios (pedidos a domicilio)">
            <p>
              La pantalla de <strong>Domicilios</strong> concentra todos los pedidos a domicilio para darles
              seguimiento desde que se preparan hasta que se entregan. Los pedidos llegan aquí cuando se crean
              con el tipo <strong>Domicilio</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Seguimiento del pedido</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>En preparación</strong> — la cocina está armando el pedido</li>
              <li><strong>En camino</strong> — asignado a un repartidor y en ruta</li>
              <li><strong>Entregado</strong> — el cliente recibió su pedido</li>
            </ul>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Repartidores</h3>
            <p>
              El administrador puede dar de alta <strong>repartidores</strong> (nombre y teléfono). Al despachar
              un pedido se le asigna un repartidor, lo que permite saber quién lleva cada entrega.
            </p>
            <Tip>
              Registra la dirección completa y referencias en el pedido para que el repartidor la tenga a la mano.
            </Tip>
          </Section>

          {/* ── Sección 7 ── */}
          <Section id="menu" title="Carta y menú (Administrador)">
            <p>
              La sección <strong>Carta / Menú</strong> es donde el administrador gestiona el catálogo
              de productos del restaurante. Aquí se crean, editan y organizan categorías y platillos.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Gestión de categorías</h3>
            <p>
              El panel izquierdo muestra las categorías. Para cada categoría puedes definir:
              nombre, <strong>color</strong> (identificador visual) y <strong>estación de preparación</strong>
              (Caliente, Fría/Bar o Ambas).
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Gestión de productos</h3>
            <p>Para agregar un producto, haz clic en <strong>"+ Agregar Producto"</strong> e ingresa:</p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Fotos:</strong> hasta <strong>5 imágenes</strong> por platillo — desde la cámara, la galería, arrastrar y soltar, o pegando una URL (JPG, PNG, WebP, máx. 2MB c/u). La primera es la principal.</li>
              <li><strong>Nombre</strong>, <strong>Descripción</strong> e <strong>Ingredientes</strong> (uno por línea)</li>
              <li><strong>Precio</strong> en MXN y <strong>tipo de precio</strong> (fijo, abierto, por kilogramo o variable)</li>
              <li><strong>Categoría</strong>, <strong>alérgenos</strong> y <strong>etiqueta destacada</strong> (Nuevo, Popular, Recomendado…)</li>
              <li><strong>Código de barras</strong> (si usas scanner)</li>
              <li><strong>Override de estación</strong> — para que un producto de una categoría fría aparezca en cocina caliente (ej. Café americano)</li>
            </ul>

            <h3 className="font-bold text-stone-900 mt-4 mb-2">Rellenar con IA ✨</h3>
            <p>
              Junto a la <strong>Descripción</strong> verás el botón <strong>"Rellenar con IA"</strong>. Escribe el
              nombre del platillo, púlsalo y el sistema genera automáticamente una <strong>descripción</strong>{' '}
              apetitosa y la <strong>lista de ingredientes</strong>. Siempre puedes editar el texto antes de guardar.
            </p>

            <h3 className="font-bold text-stone-900 mt-4 mb-2">Vista previa en la carta</h3>
            <p>
              Mientras editas, el formulario muestra una <strong>vista previa en vivo</strong> de cómo se verá la
              tarjeta del platillo en la carta digital del cliente (foto, nombre, precio y etiquetas), para dejarlo
              tal como quieres antes de guardar.
            </p>

            <Warning>
              Al desactivar un producto (toggle "Disponible"), desaparecerá del selector de productos
              para los meseros pero no se elimina del historial de pedidos.
            </Warning>
          </Section>

          {/* ── Carta QR ── */}
          <Section id="carta-qr" title="Carta QR (para el comensal)">
            <p>
              La sección <strong>Carta QR</strong> permite que el comensal vea la carta digital del
              restaurante desde su propio teléfono. Está disponible tanto para el{' '}
              <strong>Administrador</strong> como para el <strong>Mesero</strong>, en el menú lateral
              (computadora) y en la barra inferior (teléfono).
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Qué muestra</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Código QR</strong> — el comensal lo escanea con la cámara y abre la carta al instante</li>
              <li><strong>Enlace directo</strong> a la carta pública de la sucursal (<code>/carta/&#123;sucursal&#125;</code>)</li>
              <li><strong>Cuadrícula por secciones</strong> con foto grande, precio y etiquetas de cada platillo</li>
              <li><strong>Búsqueda en tiempo real</strong> y filtros por sección, destacados y temperatura (caliente/fría)</li>
              <li>
                <strong>Vista Premium Detallada (UI/UX Espectacular):</strong> Al tocar un platillo, se abre una tarjeta flotante
                con fondo translúcido (glassmorphism) que destaca el nombre del plato alineado a la izquierda, badges informativos
                de la estación (ej. ⏱️ 15 min, 🔥 Picante) y la descripción completa e ingredientes seleccionables (con soporte de
                scroll suave para textos muy extensos) sin recortes. Permite además navegar deslizando el dedo hacia los lados o usando flechas, y agregar directamente al pedido.
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/media__1781757948674.png"
                  alt="Vista detallada de la Carta Digital"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Visor detallado de platillos con diseño esmerilado</span>
              </div>
            </div>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Cómo compartirla</h3>
            <div className="space-y-3">
              <Step n={1}>Entra a <strong>Carta QR</strong> desde el menú.</Step>
              <Step n={2}>Muestra el código QR en pantalla para que el comensal lo escanee, o usa <strong>"Copiar enlace"</strong> para enviarlo por WhatsApp o redes.</Step>
              <Step n={3}>El botón <strong>"Compartir carta"</strong> abre el menú de compartir del teléfono; <strong>"Abrir carta"</strong> la muestra en una pestaña nueva.</Step>
            </div>
            <Tip>
              La carta digital se actualiza sola: cuando el administrador edita productos, precios o
              imágenes en <strong>Carta / Menú</strong>, el comensal ve los cambios sin que tengas que
              generar un QR nuevo. El mismo código sirve siempre.
            </Tip>
          </Section>

          {/* ── Sección 8 ── */}
          <Section id="kitchen" title="Pantalla de cocina">
            <p>
              La pantalla de cocina (<strong>/kitchen</strong>) es la vista que usa el personal de
              cocina para ver y gestionar los pedidos en tiempo real. Se actualiza automáticamente
              cada pocos segundos (cada 2 segundos en las estaciones KDS) sin necesidad de recargar.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Vista unificada</h3>
            <p>
              Muestra todas las órdenes activas en una sola pantalla, como tarjetas agrupadas
              por mesa (una tarjeta por comanda). Cada platillo lleva el icono de su estación
              (<span className="whitespace-nowrap">🔥 Caliente</span> / <span className="whitespace-nowrap">🧊 Fría</span>)
              y su propio botón de acción.
            </p>
            <p>
              En la parte superior, el filtro <strong>Todas / Caliente / Fría</strong> permite ver
              todas las órdenes o solo los platillos de una estación; a la derecha se muestra el
              número de comandas activas.
            </p>
            <p>
              Cada platillo avanza con un toque: <strong>Comenzar preparación</strong> (azul) →
              <strong> Marcar listo</strong> (naranja) → <strong>Marcar entregado</strong> (verde).
              Las tarjetas cuyos platillos están todos listos se resaltan para localizarlas de un vistazo.
            </p>
            <Tip>
              Esta vista combina las dos estaciones en una sola pantalla. Es ideal para el
              administrador o para una cocina pequeña con una sola pantalla; los cocineros con
              estación asignada se redirigen automáticamente a su pantalla dedicada.
            </Tip>
          </Section>

          {/* ── Sección 9 ── */}
          <Section id="kds" title="Estaciones KDS (Kitchen Display System)">
            <p>
              El KDS de FoodIX permite dividir la cocina en dos estaciones independientes,
              cada una con su propia tableta:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-amber-950/30 border border-amber-600/30 rounded-xl p-4">
                <p className="text-amber-400 font-bold text-lg mb-1 flex items-center gap-2">
                  <Icons8Image src={ICONS8.stationHot} alt="Caliente" size={22} /> Estación Caliente
                </p>
                <p className="text-stone-700 text-sm">
                  Recibe los platillos que se preparan en plancha, comal, freidora u horno.
                  Tacos, hamburguesas, pizzas, sopas, alitas, entradas calientes.
                </p>
                <p className="text-stone-500 text-xs mt-2">URL: <code>/kitchen/hot</code></p>
              </div>
              <div className="bg-blue-950/20 border border-cyan-600/30 rounded-xl p-4">
                <p className="text-cyan-400 font-bold text-lg mb-1 flex items-center gap-2">
                  <Icons8Image src={ICONS8.stationCold} alt="Fría" size={22} /> Estación Fría / Bar
                </p>
                <p className="text-stone-700 text-sm">
                  Recibe bebidas, aguas frescas, postres, ensaladas y todo lo que se prepara
                  en frío o en la barra.
                </p>
                <p className="text-stone-500 text-xs mt-2">URL: <code>/kitchen/cold</code></p>
              </div>
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-2">¿Cómo funciona la clasificación?</h3>
            <p>
              Cada categoría de menú tiene asignada una estación: Caliente, Fría o Ambas.
              Cuando el mesero crea un pedido, el sistema envía automáticamente cada ítem
              a la estación correspondiente. El cocinero solo ve <em>sus</em> productos.
            </p>
            <p>
              A cada usuario de <strong>cocina</strong> se le asigna una estación (caliente, fría o ambas).
              Así, el cocinero de la barra solo ve la pantalla fría y el de la plancha solo la caliente.
              El administrador define esta asignación al crear el usuario.
            </p>
            <p>
              Si un producto necesita una estación diferente a su categoría (por ejemplo,
              "Café americano" en la categoría "Bebidas" que normalmente va a la barra,
              pero se prepara en cocina caliente), puedes configurarlo en el menú con
              <strong> Override de estación</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Marcar ítems como listos</h3>
            <p>
              En cada tarjeta de pedido verás los ítems con botones de acción.
              Toca <strong>"Comenzar preparación"</strong> cuando empiezas a preparar un ítem
              y <strong>"Marcar listo"</strong> cuando termines.
            </p>
            <Tip>
              Cuando <em>todos</em> los ítems de <em>todas</em> las estaciones están listos,
              el pedido cambia automáticamente a estado &quot;Listo&quot; y el mesero recibe una notificación
              para ir a recogerlo.
            </Tip>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Pantalla completa en tableta</h3>
            <p>
              Las páginas <code>/kitchen/hot</code> y <code>/kitchen/cold</code> se abren en pantalla
              completa automáticamente y activan el <em>Wake Lock</em> para evitar que la tableta
              se apague durante el servicio.
            </p>
          </Section>

          {/* ── Caja y turnos ── */}
          <Section id="cash" title="Caja y turnos">
            <p>
              El módulo de <strong>Caja</strong> controla el dinero del turno: desde la apertura con fondo inicial
              hasta el cierre con arqueo. Disponible para administrador y mesero (según configuración).
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-3">Flujo de un turno</h3>
            <div className="space-y-3">
              <Step n={1}>
                <strong>Apertura:</strong> al iniciar el turno, captura el <strong>fondo de caja</strong> (dinero
                inicial). La caja queda abierta y empieza a registrar los cobros.
              </Step>
              <Step n={2}>
                <strong>Movimientos:</strong> registra <strong>entradas</strong> y <strong>salidas</strong> de efectivo
                que no son ventas (pago a proveedor, retiro, etc.) con su concepto.
              </Step>
              <Step n={3}>
                <strong>Corte X:</strong> consulta el estado de la caja <em>sin</em> cerrarla (corte parcial informativo).
              </Step>
              <Step n={4}>
                <strong>Cierre / Corte Z:</strong> al terminar el turno, el sistema muestra lo esperado por forma de pago.
                Captura el efectivo contado (<strong>arqueo</strong>) y el sistema calcula la <strong>diferencia</strong>
                (sobrante o faltante).
              </Step>
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-2">Caja obligatoria para cobrar</h3>
            <p>
              El cobro <strong>exige una caja abierta</strong>. Si intentas cobrar sin turno iniciado, FoodIX muestra
              el aviso <em>"Necesitas abrir caja — Para continuar necesitas abrir caja o iniciar turno"</em> con un botón
              <strong> "Abrir caja ahora"</strong> que te lleva directo a la apertura. Esto garantiza que toda venta quede
              registrada dentro de un turno.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/cash-open.png"
                  alt="Modal Abrir caja / Iniciar turno"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Apertura de caja: turno ligado a tu usuario, rol y POS</span>
              </div>
            </div>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">El turno se liga a tu usuario y a tu POS</h3>
            <p>
              Cada caja queda asociada al <strong>usuario</strong> que la abre, su <strong>rol</strong> y el
              <strong> punto de venta (POS)</strong> en el que trabaja, junto con la fecha y hora de apertura. Así, dos
              equipos (POS distintos) pueden tener turnos independientes en la misma sucursal y cada arqueo se hace por
              POS. Al abrir verás estos datos confirmados antes de capturar el fondo inicial.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Indicador de estado</h3>
            <p>
              En la barra superior verás un <strong>indicador de caja</strong>: en <span className="text-green-600 font-semibold">verde</span> cuando
              la caja está <strong>Abierta</strong> y en <span className="text-amber-600 font-semibold">ámbar</span> cuando está
              <strong> Cerrada</strong>. Tócalo para abrir la caja o ver el estado del turno en cualquier momento.
            </p>
            <Warning>
              Tras <strong>cerrar caja</strong> no podrás volver a cobrar hasta abrir un nuevo turno. Abre la caja al
              inicio de cada jornada en cada POS que vaya a cobrar.
            </Warning>
          </Section>

          {/* ── Inventario y compras ── */}
          <Section id="inventory" title="Inventario y compras (Administrador)">
            <p>
              El módulo de <strong>Inventario</strong> controla los insumos y su consumo. Está organizado en pestañas:
              insumos, recetas, proveedores y órdenes de compra.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Insumos</h3>
            <p>
              Da de alta cada insumo (ej. harina, queso, refrescos) con su <strong>unidad</strong> (kg, litro, pieza),
              <strong> stock actual</strong> y <strong>stock mínimo</strong>. Cuando un insumo baja del mínimo, el sistema
              lo resalta como <strong>bajo de stock</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Recetas (escandallos)</h3>
            <p>
              Una <strong>receta</strong> liga un producto del menú con los insumos que consume. Al vender ese producto,
              FoodIX <strong>descuenta automáticamente</strong> los insumos del inventario, manteniendo el stock al día.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Mermas</h3>
            <p>Registra <strong>mermas</strong> (producto echado a perder o desperdicio) para descontarlo del stock con su motivo.</p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Proveedores y órdenes de compra</h3>
            <p>
              Administra tus <strong>proveedores</strong> y genera <strong>órdenes de compra</strong>. Al recibir la mercancía,
              marca la orden como recibida y el stock de los insumos se incrementa.
            </p>
            <Tip>
              Mantén bien definidas las recetas: es lo que permite que el inventario se descuente solo con cada venta,
              sin captura manual.
            </Tip>
          </Section>

          {/* ── Clientes y lealtad ── */}
          <Section id="customers" title="Clientes y lealtad (CRM)">
            <p>
              La sección <strong>Clientes</strong> es el CRM de tu sucursal: guarda a tus comensales frecuentes con su
              <strong> monedero electrónico</strong> y <strong>puntos de lealtad</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Ficha del cliente</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Datos:</strong> nombre, teléfono, correo y dirección</li>
              <li><strong>Monedero:</strong> saldo a favor que el cliente puede usar para pagar</li>
              <li><strong>Puntos:</strong> lealtad acumulada por sus consumos</li>
              <li><strong>Historial:</strong> total gastado y número de visitas</li>
            </ul>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Monedero electrónico</h3>
            <p>
              Puedes <strong>abonar</strong> o <strong>ajustar</strong> el saldo del monedero manualmente desde la ficha.
              Al cobrar un pedido que tenga cliente asignado, puedes pagar con la forma <strong>Monedero</strong> y el
              saldo se descuenta.
            </p>
            <Warning>
              Para que un pedido acumule lealtad o use el monedero, debe tener un <strong>cliente asignado</strong>.
              El monedero también puede gestionarse manualmente desde la ficha del cliente.
            </Warning>
          </Section>

          {/* ── Promociones, combos y lealtad ── */}
          <Section id="promotions" title="Promociones y combos (Administrador)">
            <p>
              La sección <strong>Promociones</strong> del menú reúne cuatro herramientas de crecimiento en una sola
              pantalla, con pestañas: <strong>Promociones</strong>, <strong>Combos</strong>, <strong>Cupones</strong> y{' '}
              <strong>Lealtad</strong>. A diferencia de un descuento manual, estas <strong>se aplican solas al
              cobrar</strong> — el mesero no tiene que hacer nada extra.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Exclusivo Plan Pro, AI y MultiSucursal</span>
            </div>

            <h3 className="font-bold text-stone-900 mt-4 mb-2">🏷️ Promociones</h3>
            <p>
              Un descuento automático por <strong>porcentaje</strong> o <strong>monto fijo</strong>, que puede aplicar
              a:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Todo el pedido</strong> — ej. "10% de descuento en la cuenta"</li>
              <li><strong>Una categoría</strong> — ej. "2x1 en bebidas"</li>
              <li><strong>Un producto específico</strong> — ej. "$20 de descuento en la hamburguesa clásica"</li>
            </ul>
            <p>
              Puedes limitarla a <strong>días de la semana</strong> y a un <strong>horario</strong> (ej. "solo martes,
              de 13:00 a 17:00" para una promo de sobremesa). Si no defines días u horario, queda activa siempre.
            </p>
            <Tip>
              Si dos o más promociones aplican al mismo pedido, <strong>se suman todas</strong> (sin pasar del
              subtotal) — evita traslapar promociones si no quieres que se combinen.
            </Tip>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">📦 Combos</h3>
            <p>
              Un paquete de varios productos a un <strong>precio fijo</strong>, distinto de la suma de sus precios
              normales (ej. "Combo Familiar: 2 hamburguesas + papas + 2 refrescos — $199"). Al armar un pedido en{' '}
              <strong>Nuevo Pedido</strong>, los combos activos aparecen en su propia franja arriba del catálogo de
              productos — un toque lo agrega completo.
            </p>
            <Tip>
              Cocina sigue viendo los platillos reales del combo, cada uno en su estación (caliente/fría) como
              siempre, e inventario descuenta la receta de cada producto — el combo no cambia nada de esa operación,
              solo el precio final que paga el cliente.
            </Tip>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">🎟️ Cupones</h3>
            <p>
              Un código canjeable (ej. <code>BIENVENIDA10</code>) con descuento en <strong>porcentaje</strong> o{' '}
              <strong>monto fijo</strong>. Puedes ponerle un <strong>límite de usos</strong> totales y una{' '}
              <strong>fecha de vencimiento</strong>. El cliente o el mesero lo captura al confirmar el pedido.
            </p>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">⭐ Lealtad</h3>
            <p>
              Reglas de <strong>"cada N compras, un premio"</strong> (ej. "cada 5 compras, agua fresca gratis" o
              "cada 10 compras, 15% de descuento"). Se cuentan los pedidos completados de los <strong>últimos 90
              días</strong> con el mismo número de teléfono del cliente — se repite automáticamente cada vez que se
              vuelve a cumplir el múltiplo, sin que nadie tenga que activarlo a mano.
            </p>
            <Warning>
              La recompensa por producto gratis o el descuento de lealtad requieren que el pedido tenga un{' '}
              <strong>teléfono capturado</strong> (siempre ocurre en pedidos por WhatsApp; en mostrador, solo si se
              captura el teléfono del cliente).
            </Warning>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Dónde se ve el descuento aplicado</h3>
            <p>
              Cada promoción, cupón o recompensa de lealtad que se aplicó queda registrada y se muestra con su
              nombre y monto en el <strong>detalle del pedido</strong> y en el <strong>ticket impreso</strong> — nunca
              es solo un número de "descuento" sin explicación.
            </p>
          </Section>

          {/* ── Sección 10 ── */}
          <Section id="sales" title="Reportes de ventas">
            <p>
              La sección de <strong>Ventas</strong> está disponible solo para administradores
              y muestra el análisis financiero de tu sucursal.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Resumen por período:</strong> hoy, semana, mes</li>
              <li><strong>Gráfica de barras:</strong> ingresos diarios de los últimos 30 días</li>
              <li><strong>Ventas por categoría:</strong> qué sección del menú genera más ingresos</li>
              <li><strong>Historial de pedidos:</strong> tabla con todos los pedidos del rango seleccionado</li>
              <li><strong>Exportar a CSV:</strong> descarga el historial para analizarlo en Excel</li>
            </ul>
            <Tip>
              Usa el rango de fechas personalizado para comparar períodos específicos,
              como comparar el fin de semana pasado con el anterior.
            </Tip>
          </Section>

          {/* ── Impresión y cajón ── */}
          <Section id="printing" title="Impresión y cajón de dinero">
            <p>
              FoodIX imprime tickets y comandas, y abre el cajón de dinero, con impresoras conectadas por
              <strong> USB, Bluetooth o red</strong> (compatibles con ESC/POS, multiplataforma).
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Qué se imprime</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Ticket de venta</strong> — al cobrar, con el detalle de la cuenta, cambio y un código QR único para consulta del cliente</li>
              <li><strong>Comanda de cocina</strong> — el detalle del pedido para la estación correspondiente</li>
            </ul>
            <p className="mt-2 text-sm text-stone-600">
              El <strong>ticket de venta impreso</strong> incluye un código QR único al final. Al escanearlo con cualquier smartphone, el comensal es dirigido a una página web interactiva (`/t`) que le muestra el desglose del servicio y el detalle de su consumo en tiempo real.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Cajón de dinero</h3>
            <p>
              Si tienes un cajón conectado a la impresora, se <strong>abre automáticamente</strong> al cobrar en
              efectivo. También puede abrirse manualmente desde la caja.
            </p>
            <Tip>
              Al conectar o desconectar una impresora o lector USB, verás un aviso (toast) en pantalla confirmando
              el dispositivo. Configura tus dispositivos en <strong>Ajustes</strong>.
            </Tip>
            <Warning>
              <strong>Corte automático del papel:</strong> solo funciona cuando la impresora está conectada por
              <strong> USB, Bluetooth o red</strong> (ESC/POS). Si imprimes por el <strong>diálogo del navegador</strong>
              (por ejemplo en iPhone/iPad), el sistema no puede cortar el papel: es una limitación del navegador, no del
              sistema. Verifica el modo de la impresora en <strong>Ajustes</strong>.
            </Warning>
          </Section>

          {/* ── Mi Suscripción ── */}
          <Section id="billing" title="Mi Suscripción (Administrador)">
            <p>
              En <strong>Mi Suscripción</strong> el administrador de la sucursal ve el estado de su plan y realiza
              los pagos para mantener el servicio activo. FoodIX es un servicio por <strong>suscripción mensual</strong>.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Qué muestra</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Estado</strong> de la suscripción y un mensaje según corresponda</li>
              <li><strong>Plan</strong>, precio mensual y método de pago</li>
              <li><strong>Fechas</strong> de inicio y de próxima renovación</li>
              <li><strong>Días restantes</strong> (verde &gt;7, amarillo ≤7, rojo vencida)</li>
              <li><strong>Historial de pagos</strong></li>
            </ul>
            <h3 className="font-bold text-stone-900 mt-4 mb-3">Pagar con tarjeta</h3>
            <div className="space-y-3">
              <Step n={1}>Toca <strong>"Pagar con tarjeta"</strong>. Te llevará a la pasarela segura de Stripe.</Step>
              <Step n={2}>Captura los datos de tu tarjeta de crédito o débito y confirma.</Step>
              <Step n={3}>Al volver, tu suscripción se activa automáticamente. Usa <strong>"Actualizar método de pago"</strong> para cambiar tu tarjeta o ver facturas.</Step>
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-3">Pagar por transferencia (SPEI)</h3>
            <div className="space-y-3">
              <Step n={1}>Toca <strong>"Pagar por transferencia"</strong>. Verás los datos bancarios y una <strong>referencia única</strong>.</Step>
              <Step n={2}>Realiza la transferencia SPEI usando exactamente <strong>el concepto/referencia indicado</strong> y el monto mostrado.</Step>
              <Step n={3}>Regresa y <strong>reporta tu pago</strong>: fecha, nombre del emisor, banco y clave de rastreo (y comprobante si lo tienes).</Step>
              <Step n={4}>Tu pago queda <strong>en revisión</strong>. Cuando el equipo de FoodIX lo apruebe, tu suscripción se reactiva.</Step>
            </div>
            <h3 className="font-bold text-stone-900 mt-5 mb-2">Estados de la suscripción</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { status: 'Activa',                color: '#16a34a', desc: 'Al corriente, acceso total' },
                { status: 'Prueba',                color: '#3b82f6', desc: 'Periodo de prueba vigente' },
                { status: 'Por vencer',            color: '#f59e0b', desc: 'Acceso con aviso de renovación' },
                { status: 'Pago fallido',          color: '#dc2626', desc: 'Falló el cobro con tarjeta' },
                { status: 'Transf. pendiente',     color: '#ea580c', desc: 'Esperando tu transferencia' },
                { status: 'En revisión',           color: '#7c3aed', desc: 'Transferencia reportada, en revisión' },
                { status: 'Suspendida',            color: '#f59e0b', desc: 'Acceso bloqueado temporalmente' },
                { status: 'Cancelada',             color: '#64748b', desc: 'No renovará al final del periodo' },
                { status: 'Vencida',               color: '#dc2626', desc: 'Venció sin pago' },
              ].map(s => (
                <div key={s.status} className="bg-white border rounded-lg p-2.5 shadow-sm">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.color + '20', color: s.color }}>
                    {s.status}
                  </span>
                  <p className="text-xs text-stone-500 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
            <Warning>
              Si tu suscripción no está activa, el acceso a la operación se bloquea y se te dirige a esta pantalla
              para regularizar el pago. En estado <strong>"Por vencer"</strong> sigues operando, pero verás un aviso.
            </Warning>
          </Section>

          {/* ── WhatsApp ── */}
          <Section id="whatsapp" title="WhatsApp (Plan AI) — Administrador">
            <p>
              FoodIX AI recibe <strong>pedidos automáticos por WhatsApp</strong>, con un flujo pensado para que se
              sienta como un checkout de food-delivery: el cliente escribe al número del restaurante, ve el catálogo
              con fotos, arma su carrito (incluso <strong>varios platillos en un solo mensaje</strong>) y el pedido
              llega directo a <strong>cocina/KDS</strong> — sin preguntas de más.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Exclusivo Plan AI y MultiSucursal</span>
            </div>
            <Warning>
              Si tu sucursal está en <strong>Starter</strong> o <strong>Pro</strong>, el panel de WhatsApp muestra un
              aviso para mejorar tu plan; no podrás conectar ni usar esta función hasta hacerlo.
            </Warning>

            <h3 className="font-bold text-stone-900 mt-4 mb-2">Conectar tu WhatsApp</h3>
            <div className="space-y-3">
              <Step n={1}>
                Con Plan AI (o MultiSucursal) activo, toca el ícono <strong>WhatsApp</strong> (verde) en la barra
                superior del Admin. Se abre el panel <strong>"WhatsApp FoodIX"</strong>.
              </Step>
              <Step n={2}>
                Escanea el código QR con el teléfono que usará WhatsApp, o abre el enlace y envía el mensaje de
                activación indicado en pantalla.
              </Step>
              <Step n={3}>
                El sistema <strong>detecta la conexión automáticamente</strong> en cuanto llega el primer mensaje real
                — no necesitas confirmar nada a mano. Si tarda, puedes tocar <strong>"Ya me uní"</strong> para forzarlo.
              </Step>
              <Step n={4}>
                Cuando quede conectado, verás el número activo y la hora de la última sincronización. El botón rojo{' '}
                <strong>"Cerrar sesión de WhatsApp"</strong> desconecta el canal cuando lo necesites.
              </Step>
            </div>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Qué vive el cliente</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li>Un saludo personalizado con el <strong>nombre de tu restaurante</strong></li>
              <li><strong>Catálogo priorizado</strong>: primero Recomendados y Más vendidos, luego el resto por
                categoría — en bloques de <strong>10 productos</strong>, con "escribe <em>ver más</em>" para avanzar
                a los siguientes 10 sin perder la numeración ya conocida</li>
              <li><strong>Fotos de los platillos</strong> con nombre, descripción y precio</li>
              <li>Puede pedir <strong>varios platillos de un jalón</strong>, por número o por nombre y con cantidades
                (ej. "2 tacos, 1 agua y 3 quesadillas") — el bot entiende el mensaje completo y arma el carrito solo</li>
              <li>Carrito con cantidades, total en <strong>pesos mexicanos</strong> y confirmación del pedido</li>
              <li>Al confirmar, el pedido aparece de inmediato en tu <strong>cocina/KDS</strong> con la etiqueta 📱 WhatsApp</li>
            </ul>

            <h3 className="font-bold text-stone-900 mt-5 mb-2">Sin preguntas innecesarias</h3>
            <p>
              El bot ya <strong>no pregunta</strong> "¿mesa, para llevar o domicilio?" ni el nombre del cliente — el
              pedido se confirma directo apenas el cliente dice que sí.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li>El <strong>tipo de entrega</strong> se toma de un ajuste único por sucursal (ver abajo): si es{' '}
                <strong>Pickup</strong>, cero preguntas extra; si es <strong>A domicilio</strong>, el bot pregunta
                <strong> solo la dirección</strong> justo antes de confirmar</li>
              <li>El nombre del cliente se reemplaza por un <strong>alias automático</strong> derivado de su número de
                WhatsApp — no interrumpe el flujo pidiendo datos</li>
            </ul>
            <Tip>
              Configura el tipo de entrega por defecto en <strong>Ajustes → Pedidos por WhatsApp</strong> (Pickup o
              A domicilio). Puedes cambiarlo cuando quieras — afecta a los pedidos nuevos, no a los ya confirmados.
            </Tip>
            <Tip>
              El menú que recibe el cliente por WhatsApp es el <strong>mismo</strong> que ves en tu Carta QR
              (mismos productos, precios, fotos y categorías) — actualiza tu carta como siempre y se refleja en los dos.
            </Tip>
          </Section>

          {/* ── Centro de Ayuda ── */}
          <Section id="help" title="Centro de Ayuda">
            <p>
              Dentro del sistema, todos los roles tienen acceso al <strong>Centro de Ayuda</strong> desde el menú
              (ruta <code>/help</code>). Es la forma más rápida de resolver dudas sin salir de la operación.
            </p>
            <h3 className="font-bold text-stone-900 mt-4 mb-2">Qué encontrarás</h3>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li><strong>Buscador de ayuda</strong> — escribe una palabra (caja, pedidos, impresora, suscripción…) y filtra las preguntas al instante</li>
              <li><strong>Primeros pasos</strong> — accesos directos a crear la carta, configurar mesas, abrir caja, tomar pedidos, cocina e inventario</li>
              <li><strong>Preguntas frecuentes</strong> — respuestas paso a paso a los problemas más comunes</li>
              <li><strong>Atajos del sistema</strong> — teclas útiles (recargar, cerrar diálogos, confirmar)</li>
              <li><strong>Estado del sistema</strong> — versión instalada, fecha de la última actualización, estado de la API/servidor (en línea / sin conexión) y acceso a tu suscripción</li>
              <li><strong>Contacto de soporte</strong> — correo y WhatsApp para escribirnos directamente</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center my-6">
              <div className="text-center max-w-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/manual/help-center.png"
                  alt="Centro de Ayuda de FoodIX"
                  className="rounded-xl border border-stone-200 shadow-md max-w-full h-auto mx-auto"
                />
                <span className="text-[11px] text-stone-400 block mt-2">Centro de Ayuda: buscador, primeros pasos, FAQ, atajos y estado del sistema</span>
              </div>
            </div>
            <Tip>
              El indicador de <strong>estado de la API</strong> te dice de un vistazo si el servidor responde. Si aparece
              "Sin conexión", revisa tu internet antes de seguir operando.
            </Tip>
          </Section>

          {/* ── Sección 11 ── */}
          <Section id="faq" title="Preguntas frecuentes">
            <div className="space-y-4">
              {[
                {
                  q: '¿Por qué no puedo iniciar sesión aunque mi contraseña es correcta?',
                  a: 'Verifica que tu dispositivo esté aprobado. Si ves "Dispositivo pendiente de aprobación", contacta al administrador de tu sucursal para que lo autorice.',
                },
                {
                  q: '¿Puedo usar FoodIX desde mi celular?',
                  a: 'Sí. La interfaz es responsiva y funciona en cualquier tamaño de pantalla. Para la cocina, se recomienda usar una tableta de 10 pulgadas o más para mejor visibilidad.',
                },
                {
                  q: '¿Qué pasa si se va el internet?',
                  a: 'El sistema requiere conexión a internet para operar. En caso de caída de red, los pedidos activos siguen visibles en pantalla pero no se podrán crear nuevos ni actualizar estados hasta restablecer la conexión.',
                },
                {
                  q: '¿Cómo agrego más mesas?',
                  a: 'Ve a Ajustes (solo administrador) para configurar el número de mesas de tu sucursal, o contáctanos a restauros@atomicmail.io.',
                },
                {
                  q: '¿Las imágenes de los productos son obligatorias?',
                  a: 'No. Si un producto no tiene foto, el sistema muestra un ícono genérico de platillo. Aun así, las imágenes mejoran significativamente la experiencia visual del sistema y se recomienda subirlas.',
                },
                {
                  q: '¿Cómo renuevo o pago mi suscripción?',
                  a: 'Como administrador, entra a "Mi Suscripción" en el menú lateral. Ahí puedes pagar con tarjeta (Stripe, activación inmediata) o por transferencia SPEI (reportas tu pago y el equipo de FoodIX lo aprueba). Verás siempre los días restantes y el estado de tu plan.',
                },
                {
                  q: '¿Qué pasa si no pago a tiempo?',
                  a: 'Si tu suscripción vence o falla el pago, el acceso a la operación se bloquea y se te dirige a "Mi Suscripción" para regularizarlo. En estado "Por vencer" sigues operando con un aviso. Una vez confirmado el pago, el acceso se restablece.',
                },
                {
                  q: '¿Cómo conecto WhatsApp en FoodIX Pro?',
                  a: 'Con Plan Pro activo, toca el ícono de WhatsApp en la barra superior del Admin, escanea el código QR con el teléfono del restaurante y sigue la instrucción en pantalla. La conexión se detecta sola en cuanto llega el primer mensaje — no necesitas confirmar nada a mano. Es una función Beta, la seguimos puliendo.',
                },
                {
                  q: '¿Los pedidos por WhatsApp llegan igual que los del mesero?',
                  a: 'Sí. En cuanto el cliente confirma su pedido por WhatsApp, aparece de inmediato en tu pantalla de cocina/KDS con la etiqueta 📱 WhatsApp, el nombre o número del cliente, los platillos y el total — el mismo flujo en tiempo real que un pedido tomado por el mesero.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="bg-white border rounded-xl shadow-sm group">
                  <summary className="px-4 py-3 font-semibold text-stone-900 cursor-pointer hover:text-[#E85D04] transition-colors list-none flex items-center justify-between">
                    {q}
                    <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="px-4 pb-4 text-stone-600 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </Section>

          {/* Footer del manual */}
          <div className="mt-12 pt-8 border-t text-center">
            <p className="text-stone-400 text-sm">
              ¿Necesitas más ayuda? Contáctanos en{' '}
              <a href="mailto:restauros@atomicmail.io" className="text-[#E85D04] hover:underline">
                restauros@atomicmail.io
              </a>
            </p>
            <div className="flex justify-center gap-6 mt-4 text-xs text-stone-400">
              <Link href="/privacidad" className="hover:text-stone-600">Aviso de Privacidad</Link>
              <Link href="/terminos" className="hover:text-stone-600">Términos y Condiciones</Link>
              <Link href="/cookies" className="hover:text-stone-600">Política de Cookies</Link>
            </div>
            <p className="text-stone-300 text-xs mt-4">© 2026 FoodIX · Desarrollado por CodexFight</p>
          </div>
        </main>
      </div>
    </div>
    </PageTransition>
  )
}
