'use client'

/**
 * FoodIX — Sección: Integraciones y conectividad.
 * Muestra los puntos de conexión reales del sistema (pagos, mensajería,
 * hardware, API) en una cuadrícula mobile-first.
 */

import { MessageCircle, CreditCard, Landmark, Printer, Wallet, ScanLine, QrCode, Smartphone, Globe, FileText, Webhook, Layers, ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'

const INTEGRATIONS = [
  { icon: MessageCircle, name: 'WhatsApp Business', tag: 'Mensajería', desc: 'Confirmaciones, recordatorios y pedidos automatizados con tus clientes.' },
  { icon: CreditCard, name: 'Stripe', tag: 'Pagos', desc: 'Cobro con tarjeta en línea para reservas, preventas y suscripciones.' },
  { icon: Landmark, name: 'SPEI / Transferencia', tag: 'Pagos', desc: 'CLABE interbancaria para recibir transferencias al instante.' },
  { icon: Wallet, name: 'Efectivo y propinas', tag: 'Caja', desc: 'Cortes de caja, arqueo, propinas digitales y cuenta dividida.' },
  { icon: Printer, name: 'Impresoras ESC/POS', tag: 'Hardware', desc: 'Tickets de cocina y comanda por USB o red, sin drivers raros.' },
  { icon: ScanLine, name: 'Lectoras de tarjeta', tag: 'Hardware', desc: 'Terminales y lectoras para cobrar en mesa sin levantar la cuenta.' },
  { icon: QrCode, name: 'Carta digital QR', tag: 'Canal', desc: 'Tu menú real en un QR compartible: escanea, ordena y paga.' },
  { icon: Smartphone, name: 'Kiosko y tablets Android', tag: 'Hardware', desc: 'App nativa APK para kioskos, tablets y pantallas táctiles.' },
  { icon: Globe, name: 'Web / PWA', tag: 'Plataforma', desc: 'Funciona en el navegador de cualquier computadora o tablet.' },
  { icon: FileText, name: 'Reportes en PDF', tag: 'Datos', desc: 'Ventas, cortes y analíticas exportables con tu marca.' },
  { icon: Webhook, name: 'API REST & Webhooks', tag: 'Desarrolladores', desc: 'Conecta tu ERP, facturación o herramienta propia.' },
  { icon: Layers, name: 'Multi-dispositivo', tag: 'Operación', desc: 'Caja, cocina KDS, mesero y administración sincronizados.' },
]

export function IntegrationsSection() {
  return (
    <section id="integraciones" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-24">
      <Reveal className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
          <MessageCircle className="h-3.5 w-3.5" /> Integraciones y aliados
        </span>
        <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">
          Se conecta con lo que ya usas
        </h2>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          Pagos, mensajería, impresión y hardware listos desde el primer día. Sin instalaciones raras ni piezas sueltas.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {INTEGRATIONS.map((it, i) => (
          <Reveal key={it.name} delay={(i % 4) * 70}>
            <div className="group h-full rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:border-[#EAB308] hover:shadow-md hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-[#EAB308]/50">
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-yellow-700 transition-colors group-hover:bg-[#FACC15] group-hover:text-stone-950 dark:bg-amber-500/10 dark:text-yellow-400 dark:group-hover:bg-[#FACC15] dark:group-hover:text-stone-950">
                  <it.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500 pt-1">{it.tag}</span>
              </div>
              <h3 className="mt-3.5 font-heading font-bold text-sm text-stone-900 dark:text-white">{it.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">{it.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10" delay={120}>
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left dark:border-white/15 dark:bg-white/[0.03]">
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            <strong className="text-stone-900 dark:text-white">¿Usas una herramienta que no está aquí?</strong> Conectamos FoodIX con tu sistema por API o webhooks.
          </p>
          <a href="#contacto" className="inline-flex shrink-0 items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-[#FACC15] text-stone-950 hover:bg-[#EAB308] transition-all active:scale-95">
            Cuéntanos cuál <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Reveal>
    </section>
  )
}
