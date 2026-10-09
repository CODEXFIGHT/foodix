'use client'

/**
 * FoodIX — Centro de Ayuda.
 * Primeros pasos, preguntas frecuentes con buscador, atajos, estado del sistema
 * (versión, API, servidor, licencia) y contacto de soporte. Responsive y
 * compatible con tema claro/oscuro.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, LifeBuoy, Rocket, Keyboard, Mail, MessageCircle, ChevronDown,
  Activity, ShoppingBag, UtensilsCrossed, Wallet, ChefHat, BookOpen, Boxes,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { APP_VERSION, APP_RELEASE_DATE, SUPPORT } from '@/lib/constants/appInfo'

// ── Datos ─────────────────────────────────────────────────────────────────────

const FIRST_STEPS = [
  { icon: BookOpen, label: 'Crear tu carta', desc: 'Categorías, productos y modificadores', href: '/menu' },
  { icon: UtensilsCrossed, label: 'Configurar mesas', desc: 'Da de alta tus mesas y zonas', href: '/tables' },
  { icon: Wallet, label: 'Abrir caja', desc: 'Inicia turno antes de cobrar', href: '/cash' },
  { icon: ShoppingBag, label: 'Tomar pedidos', desc: 'Crea y envía pedidos a cocina', href: '/orders' },
  { icon: ChefHat, label: 'Cocina (KDS)', desc: 'Gestiona la preparación', href: '/kitchen' },
  { icon: Boxes, label: 'Inventario', desc: 'Controla existencias e insumos', href: '/inventory' },
]

const FAQS: { q: string; a: string; tags: string }[] = [
  { q: 'No puedo iniciar sesión', a: 'Verifica usuario/contraseña y que el dispositivo esté aprobado por el administrador. Si la sesión expiró, vuelve a entrar. Si el problema persiste, pide al admin que revise tu usuario en Usuarios.', tags: 'login acceso contraseña sesión' },
  { q: 'Olvidé mi contraseña', a: 'Pide a un administrador de tu sucursal que la restablezca desde Usuarios → editar usuario. El superadmin puede hacerlo para cualquier sucursal.', tags: 'contraseña login recuperar' },
  { q: 'No puedo abrir caja', a: 'Necesitas un turno de caja abierto en tu POS. Ve a Caja → "Abrir caja", captura el monto inicial y confirma. Si ya hay una caja abierta en ese POS, ciérrala antes de abrir otra.', tags: 'caja turno abrir pos' },
  { q: 'No puedo cobrar un pedido', a: 'El cobro exige una caja abierta. Si ves el aviso "Para continuar necesitas abrir caja o iniciar turno", pulsa "Abrir caja ahora" e inicia el turno.', tags: 'cobro pago caja turno' },
  { q: 'No puedo cerrar caja', a: 'Asegúrate de tener la caja abierta y de capturar el efectivo contado. El sistema calcula el efectivo esperado y la diferencia. Tras cerrar, no podrás cobrar hasta abrir un nuevo turno.', tags: 'cierre corte caja' },
  { q: 'No llegan los pedidos a cocina', a: 'Revisa que el dispositivo de cocina tenga conexión y notificaciones activas, y que el pedido se haya enviado. La pantalla KDS se actualiza en tiempo real; recarga si quedó en segundo plano mucho tiempo.', tags: 'cocina kds pedidos tiempo real' },
  { q: 'No imprime los tickets', a: 'Verifica que la impresora esté encendida, con papel y emparejada. En Ajustes → Impresión confirma el dispositivo. El agente de impresión debe estar activo en ese equipo.', tags: 'impresora ticket imprimir' },
  { q: '¿Cómo registro un pago adelantado?', a: 'Solo superadmin: en Billing CRM abre el cliente → pestaña Calendario → "Registrar pago", elige los meses a cubrir (ej. 4) y confirma. El sistema marca esos meses y recalcula el vencimiento.', tags: 'suscripción adelantado pago meses superadmin' },
  { q: '¿Qué pasa si vence mi suscripción?', a: 'Tras la fecha de vencimiento entras en periodo de gracia (configurable, por defecto 5 días) conservando el acceso. Pasada la gracia, la cuenta se suspende automáticamente hasta registrar un nuevo pago.', tags: 'suscripción vencer gracia suspensión' },
  { q: '¿Cómo agrego un usuario?', a: 'Admin: ve a Usuarios → "Nuevo usuario", define nombre, rol (mesero/cocina/admin) y credenciales. Los usuarios de cocina pueden asignarse a estación Caliente o Fría.', tags: 'usuarios alta rol' },
  { q: '¿Cómo agrego un POS o dispositivo?', a: 'Cada dispositivo se registra al iniciar sesión y el admin lo aprueba en Dispositivos. El número de POS por establecimiento lo define el superadmin.', tags: 'pos dispositivo aprobar' },
  { q: '¿Qué hago si no hay internet?', a: 'FoodIX requiere conexión para sincronizar. Si se cae, espera a que vuelva: al reconectar, las pantallas operativas se actualizan solas. Evita cobrar sin conexión.', tags: 'internet conexión offline' },
  { q: 'La aplicación se congeló o muestra un error', a: 'Recarga la página (o reinicia la app). Si persiste, cierra sesión y vuelve a entrar. Si el error continúa, anota qué hacías y contacta a soporte.', tags: 'error congelada bug' },
]

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'F5 / Ctrl+R', action: 'Recargar la pantalla actual' },
  { keys: 'Esc', action: 'Cerrar modal o diálogo abierto' },
  { keys: 'Tab', action: 'Avanzar entre campos de un formulario' },
  { keys: 'Enter', action: 'Confirmar la acción principal del diálogo' },
]

// ── Página ──────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'down'>('checking')

  // Estado de la API/servidor: ping al health del backend.
  useEffect(() => {
    let alive = true
    fetch('/backend/health', { cache: 'no-store' })
      .then(r => { if (alive) setApiStatus(r.ok ? 'ok' : 'down') })
      .catch(() => { if (alive) setApiStatus('down') })
    return () => { alive = false }
  }, [])

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQS
    return FAQS.filter(f => (f.q + ' ' + f.a + ' ' + f.tags).toLowerCase().includes(q))
  }, [query])

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Centro de Ayuda" description="Primeros pasos, preguntas frecuentes y soporte de FoodIX" />

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Busca en la ayuda: caja, pedidos, impresora, suscripción…"
          className="pl-9 h-11"
        />
      </div>

      {/* Primeros pasos */}
      {!query && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Rocket className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Primeros pasos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FIRST_STEPS.map(s => (
              <Link key={s.href} href={s.href}>
                <Card className="h-full transition-colors hover:border-[#EAB308]/40">
                  <CardContent className="p-4">
                    <s.icon className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
                    <p className="mt-2 text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Preguntas frecuentes</h2>
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No encontramos resultados para “{query}”. Prueba otras palabras o contacta a soporte.</p>
        ) : (
          <div className="rounded-xl border divide-y">
            {faqs.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
                >
                  {f.q}
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          ¿Necesitas más detalle? Consulta los manuales por rol en la carpeta <code>docs/</code> del proyecto.
        </p>
      </section>

      {/* Atajos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Keyboard className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Atajos del sistema</h2>
        <div className="rounded-xl border overflow-hidden">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 text-sm border-b last:border-0">
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Estado del sistema + soporte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Estado del sistema</h2>
            <Row label="Versión instalada" value={APP_VERSION} />
            <Row label="Última actualización" value={APP_RELEASE_DATE} />
            <Row
              label="API / Servidor"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full',
                    apiStatus === 'ok' ? 'bg-emerald-500' : apiStatus === 'down' ? 'bg-red-500' : 'bg-amber-500 animate-pulse')} />
                  {apiStatus === 'ok' ? 'En línea' : apiStatus === 'down' ? 'Sin conexión' : 'Comprobando…'}
                </span>
              }
            />
            <Row label="Licencia" value={<Link href="/billing" className="text-yellow-700 dark:text-yellow-400 hover:underline">Ver en Mi Suscripción</Link>} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" /> Contacto de soporte</h2>
            <p className="text-sm text-muted-foreground">¿No resolviste tu duda? Escríbenos y te ayudamos.</p>
            <a href={`mailto:${SUPPORT.email}`} className="flex items-center gap-2 text-sm hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground" /> {SUPPORT.email}
            </a>
            <a href={`https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors">
              <MessageCircle className="h-4 w-4 text-muted-foreground" /> {SUPPORT.whatsapp}
            </a>
            <p className="text-xs text-muted-foreground pt-1">{SUPPORT.company} · Soporte de lunes a sábado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
