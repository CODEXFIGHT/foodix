'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { AdminHeading, Surface } from '@/components/superadmin/ui'
import {
  MessageCircle, Copy, Check, ExternalLink, Zap,
  ShieldCheck, BookOpen, AlertCircle, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const WEBHOOK_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <p className="flex-1 text-sm font-mono text-white break-all">{value}</p>
        <button
          type="button"
          onClick={copy}
          className={cn(
            'shrink-0 h-7 w-7 rounded-md grid place-items-center transition-all',
            copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

function StepCard({
  step, title, children,
}: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="h-7 w-7 rounded-full bg-[#E85D04]/20 border border-[#E85D04]/40 text-[#E85D04] text-xs font-bold grid place-items-center shrink-0">
          {step}
        </div>
        <div className="flex-1 w-px bg-white/5" />
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <p className="font-semibold text-white mb-2">{title}</p>
        <div className="text-sm text-neutral-400 space-y-2">{children}</div>
      </div>
    </div>
  )
}

function EnvRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-white/5 last:border-0">
      <code className="text-xs bg-white/5 text-orange-300 rounded px-2 py-0.5 shrink-0">{name}</code>
      <span className="text-xs text-neutral-500 sm:ml-3">{desc}</span>
    </div>
  )
}

export default function WhatsAppConfigPage() {
  const [tested, setTested] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  const testWebhook = async () => {
    setTested('loading')
    try {
      const res = await fetch('/api/whatsapp/webhook?token=' + (process.env.NEXT_PUBLIC_WATI_WEBHOOK_TOKEN ?? 'test'))
      setTested(res.ok ? 'ok' : 'error')
    } catch {
      setTested('error')
    }
    setTimeout(() => setTested('idle'), 3000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminHeading
        title="WhatsApp · Integración Wati"
        description="Configura pedidos automáticos por WhatsApp para tus clientes Plan Pro"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30">
            <MessageCircle className="h-3.5 w-3.5" /> Solo Plan Pro · Beta
          </span>
        }
      />

      {/* ── Cómo funciona ── */}
      <Surface className="p-5 space-y-1">
        <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#25D366]" /> Cómo funciona
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-center">
          {[
            { icon: '📱', title: 'Cliente escribe', desc: 'El comensal manda "Hola" al número de WhatsApp del restaurante' },
            { icon: '🤖', title: 'Bot toma el pedido', desc: 'FoodIX guía al cliente por el menú, ítems, cantidad y tipo de pedido' },
            { icon: '🔥', title: 'Llega a cocina', desc: 'El pedido aparece automáticamente en el KDS y el POS como cualquier pedido normal' },
          ].map(c => (
            <div key={c.title} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-2xl mb-2">{c.icon}</p>
              <p className="text-sm font-semibold text-white mb-1">{c.title}</p>
              <p className="text-xs text-neutral-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </Surface>

      {/* ── URL del Webhook ── */}
      <Surface className="p-5 space-y-4">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-400" /> Datos del Webhook
        </p>
        <CopyField label="URL del Webhook (pegar en Wati)" value={`${typeof window !== 'undefined' ? window.location.origin : 'https://TU-DOMINIO.com'}/api/whatsapp/webhook`} />
        <p className="text-xs text-neutral-500">
          En Wati: <span className="text-neutral-300">Settings → Webhook URL</span> → pega esta URL y guarda.
          El token de verificación es el valor de <code className="text-orange-300 text-[11px]">WATI_WEBHOOK_TOKEN</code> en tus variables de entorno.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={testWebhook}
          disabled={tested === 'loading'}
          className={cn(
            'h-8 gap-1.5 bg-transparent border-white/15 text-neutral-300 hover:bg-white/5',
            tested === 'ok' && 'border-green-500/40 text-green-400',
            tested === 'error' && 'border-red-500/40 text-red-400',
          )}
        >
          {tested === 'loading' ? 'Probando…' : tested === 'ok' ? '✅ Webhook activo' : tested === 'error' ? '❌ Error — revisa token' : 'Probar conexión'}
        </Button>
      </Surface>

      {/* ── Proveedor recomendado ── */}
      <Surface className="p-5 space-y-4">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" /> Proveedor de WhatsApp — ¿cuál usar?
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {/* Meta — recomendado */}
          <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-sm">Meta Cloud API</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase tracking-wide">✓ Recomendado</span>
            </div>
            <p className="text-2xl font-extrabold text-[#25D366]">Gratis<span className="text-neutral-500 text-[11px] font-normal"> sin mensualidad</span></p>
            <ul className="space-y-1 text-neutral-300">
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#25D366]" /> API oficial de WhatsApp (Meta)</li>
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#25D366]" /> Webhooks incluidos</li>
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#25D366]" /> Mensajes de sesión (pedidos) gratis</li>
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#25D366]" /> 1,000 conversaciones gratis/mes</li>
              <li className="flex items-center gap-1.5 text-neutral-500"><span className="text-neutral-600">–</span> Requiere cuenta Meta Business</li>
              <li className="flex items-center gap-1.5 text-neutral-500"><span className="text-neutral-600">–</span> Configuración técnica inicial</li>
            </ul>
            <p className="text-neutral-500 leading-snug">Solo pagas si lanzas campañas masivas de marketing (~$0.02 USD/msg). Para pedidos entrantes: <span className="text-white font-semibold">$0 costo adicional</span>.</p>
          </div>

          {/* Wati */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-sm">Wati</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/10 uppercase tracking-wide">Alternativa</span>
            </div>
            <p className="text-2xl font-extrabold text-neutral-300">$79<span className="text-neutral-500 text-[11px] font-normal"> USD/mes</span></p>
            <ul className="space-y-1 text-neutral-400">
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-neutral-500" /> Interfaz no-code más sencilla</li>
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-neutral-500" /> Chatbot visual sin código</li>
              <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-neutral-500" /> Soporte incluido</li>
              <li className="flex items-center gap-1.5 text-neutral-600"><span>–</span> $79 USD/mes extra (~$1,580 MXN)</li>
              <li className="flex items-center gap-1.5 text-neutral-600"><span>–</span> Plan Growth no tiene webhooks</li>
            </ul>
            <p className="text-neutral-600 leading-snug">Útil si prefieres evitar la configuración técnica y tienes presupuesto para la mensualidad extra.</p>
          </div>
        </div>
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2.5 text-xs text-blue-300/80">
          <span className="font-semibold text-blue-300">Recomendación:</span> Usa Meta Cloud API.
          El costo adicional para el restaurante es <span className="text-white font-semibold">$0</span> — los pedidos que llegan por WhatsApp caen en ventana de sesión de 24h y son completamente gratuitos.
          Solo pagarías Meta si lanzas campañas de marketing masivo.
        </div>
      </Surface>

      {/* ── Guía de configuración ── */}
      <Surface className="p-5">
        <p className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-400" /> Guía de configuración paso a paso
        </p>
        <div>
          <StepCard step={1} title="Crea una cuenta en Meta Business Suite (gratis)">
            <p>
              Ve a{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer"
                className="text-[#25D366] hover:underline inline-flex items-center gap-0.5">
                business.facebook.com <ExternalLink className="h-3 w-3" />
              </a>{' '}
              y crea un negocio verificado. Luego ve a{' '}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                className="text-[#25D366] hover:underline inline-flex items-center gap-0.5">
                developers.facebook.com <ExternalLink className="h-3 w-3" />
              </a>{' '}
              y crea una app de tipo <span className="text-neutral-200 font-semibold">Business</span>.
            </p>
            <p>En la app, agrega el producto <span className="text-neutral-200">WhatsApp</span>. Meta aprueba en 1–3 días hábiles. El número de teléfono puede ser un número nuevo o tu número actual.</p>
          </StepCard>

          <StepCard step={2} title="Obtén tus credenciales de Meta">
            <p>En el panel de tu app de Meta Developers:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="text-neutral-200">WhatsApp → Configuración</span> → copia el <span className="text-neutral-200">Phone Number ID</span> → <code className="text-orange-300 text-[11px]">WA_PHONE_NUMBER_ID</code></li>
              <li><span className="text-neutral-200">WhatsApp → Configuración</span> → genera un <span className="text-neutral-200">Token de acceso permanente</span> → <code className="text-orange-300 text-[11px]">WA_ACCESS_TOKEN</code></li>
            </ul>
          </StepCard>

          <StepCard step={3} title="Configura el Webhook en Meta">
            <p>En <span className="text-neutral-200">WhatsApp → Configuración → Webhooks</span>:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="text-neutral-200">URL de devolución de llamada</span> → la URL del webhook de arriba</li>
              <li><span className="text-neutral-200">Token de verificación</span> → el valor que definas en <code className="text-orange-300 text-[11px]">WA_WEBHOOK_TOKEN</code></li>
              <li>Suscríbete a los eventos: <code className="text-orange-300 text-[11px]">messages</code></li>
            </ul>
          </StepCard>

          <StepCard step={4} title="Configura las variables de entorno">
            <p>Agrega estas variables en tu <code className="text-orange-300 text-[11px]">.env.local</code> (desarrollo) y en Vercel (producción):</p>
            <div className="mt-2 rounded-lg border border-white/10 bg-[#0a0a0a] divide-y divide-white/5 px-3">
              <EnvRow name="WA_PROVIDER" desc="Proveedor activo: 'meta' (gratis, recomendado) o 'wati'" />
              <EnvRow name="WA_WEBHOOK_TOKEN" desc="Token secreto que defines tú — lo pones en Meta o Wati para verificar el webhook" />
              <EnvRow name="WA_PHONE_NUMBER_ID" desc="(Meta) ID del número de teléfono — Meta Developers → WhatsApp → Configuración" />
              <EnvRow name="WA_ACCESS_TOKEN" desc="(Meta) Token de acceso permanente de tu app de Meta" />
              <EnvRow name="WATI_API_ENDPOINT" desc="(Solo Wati) URL de tu instancia, ej: https://live-server-12345.wati.io" />
              <EnvRow name="WATI_API_TOKEN" desc="(Solo Wati) Bearer token de Wati → Settings → API" />
              <EnvRow name="WATI_BRANCH_SLUG" desc="Slug de la sucursal vinculada a este número de WA (ej: jimmy-restaurant)" />
              <EnvRow name="BACKEND_SERVICE_TOKEN" desc="Token del backend para crear pedidos desde el webhook sin sesión de usuario" />
            </div>
          </StepCard>

          <StepCard step={5} title="Obtén el BACKEND_SERVICE_TOKEN">
            <p>Este token permite que el webhook cree pedidos en nombre de la sucursal sin una sesión de usuario.</p>
            <p>Pídelo a tu equipo técnico o genéralo en el backend con un endpoint de tipo <code className="text-orange-300 text-[11px]">POST /service-tokens</code>.</p>
          </StepCard>

          <StepCard step={6} title="Prueba el flujo completo">
            <p>Escribe <span className="text-white font-semibold">"Hola"</span> al número de WhatsApp de tu restaurante.</p>
            <p>El bot responderá con el menú. Al confirmar un pedido, aparecerá en el KDS en tiempo real.</p>
          </StepCard>
        </div>
      </Surface>

      {/* ── Advertencia Plan Pro ── */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300/80 space-y-1">
          <p className="font-semibold text-amber-300">Esta integración es exclusiva del Plan Pro ($1,100 MXN/mes).</p>
          <p>Las sucursales en Plan Esencial no tienen acceso al webhook de WhatsApp. Puedes cambiar el plan desde Billing CRM → modal de la sucursal → Resumen.</p>
        </div>
      </div>

      {/* ── Flujo conversacional ── */}
      <Surface className="p-5 space-y-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#25D366]" /> Flujo conversacional automático
        </p>
        <div className="space-y-2 text-xs">
          {[
            { from: 'Cliente',    msg: 'Hola' },
            { from: 'Bot',        msg: '🍽️ ¡Bienvenido! Aquí tienes nuestro menú → [Lista interactiva con categorías y precios]' },
            { from: 'Cliente',    msg: '[Selecciona "Pizza Margherita"]' },
            { from: 'Bot',        msg: 'Pizza Margherita — $150 MXN\n¿Cuántas unidades deseas?' },
            { from: 'Cliente',    msg: '2' },
            { from: 'Bot',        msg: '✅ Agregado: 2x Pizza Margherita = $300\n[Botones: ➕ Agregar más · ✅ Confirmar · ❌ Cancelar]' },
            { from: 'Cliente',    msg: '[Confirmar pedido]' },
            { from: 'Bot',        msg: '¿Cómo recibirás tu pedido?\n[Botones: 🍽️ En mesa · 🛍️ Para llevar · 🛵 A domicilio]' },
            { from: 'Cliente',    msg: '[Para llevar]' },
            { from: 'Bot',        msg: '¿A qué nombre ponemos el pedido?' },
            { from: 'Cliente',    msg: 'Juan García' },
            { from: 'Bot',        msg: '🎉 ¡Pedido #1234 confirmado! Ya está en cocina. Te avisamos cuando esté listo ⏱️' },
          ].map((m, i) => (
            <div key={i} className={cn(
              'flex gap-2',
              m.from === 'Bot' ? 'flex-row' : 'flex-row-reverse',
            )}>
              <span className={cn(
                'text-[10px] font-bold shrink-0 mt-1',
                m.from === 'Bot' ? 'text-[#25D366]' : 'text-blue-400',
              )}>{m.from}</span>
              <div className={cn(
                'rounded-lg px-2.5 py-1.5 max-w-[80%] whitespace-pre-line',
                m.from === 'Bot'
                  ? 'bg-white/[0.04] text-neutral-300'
                  : 'bg-blue-500/10 text-blue-200',
              )}>
                {m.msg}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-600 pt-1">
          El cliente puede escribir <span className="text-neutral-400">cancelar</span> en cualquier momento para salir.
          El menú se carga dinámicamente desde el catálogo de la sucursal.
        </p>
      </Surface>

      {/* Link a Wati */}
      <div className="flex justify-end">
        <a
          href="https://www.wati.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Ir al dashboard de Wati <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
