'use client'

import { useState } from 'react'
import { Bot, MessageSquare, Calendar, PieChart, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const AI_AGENTS = [
  {
    id: 'vendedor',
    title: 'Vendedor IA (WhatsApp)',
    tagline: 'Toma de pedidos y venta sugerida por WhatsApp 24/7',
    icon: MessageSquare,
    badge: 'Ventas 24/7',
    color: '#25D366',
    desc: 'Atiende clientes por WhatsApp al instante. Muestra el menú digital, sugiere acompañamientos o bebidas de alto margen, procesa el pedido y genera el link de pago o QR sin intervención humana.',
    features: [
      'Respuesta en menos de 3 segundos',
      'Venta cruzada inteligente (Upselling)',
      'Generación de código QR y link de pago',
      'Envío directo del pedido a la cocina KDS',
    ],
    demoBubble: {
      user: '¡Hola! Quisiera ordenar 2 Tostadas de Camarón para llevar',
      agent: '¡Hola! 🍤 Claro que sí. ¿Te gustaría agregar un Coctel de Pulpo o una limonada fría por solo $45 extra? Ya preparo tu orden y te comparto el link de pago.',
    },
  },
  {
    id: 'recepcionista',
    title: 'Recepcionista IA (Reservaciones)',
    tagline: 'Atención a clientes y agendamiento de mesas automatizado',
    icon: Calendar,
    badge: 'Atención & Reservas',
    color: '#3B82F6',
    desc: 'Responde consultas frecuentes sobre la ubicación del local, estacionamiento, horarios y menú del día. Permite a los clientes agendar y confirmar su mesa directamente por mensaje.',
    features: [
      'Agendamiento automático en el mapa de mesas',
      'Confirmación y recordatorios por WhatsApp',
      'Respuestas sobre alergias, menú y promociones',
      'Atención multicanal sin saturar al personal',
    ],
    demoBubble: {
      user: '¿Tienen mesa disponible para 4 personas hoy a las 8:00 PM?',
      agent: '¡Por supuesto! 🪑 Tengo disponible la Mesa 4 en zona terraza. ¿A nombre de quién registro la reservación?',
    },
  },
  {
    id: 'chef',
    title: 'Chef IA (Costos & Recetas)',
    tagline: 'Optimización de insumos, costos de platillos y mermas',
    icon: PieChart,
    badge: 'Costos & Rentabilidad',
    color: '#D1400F',
    desc: 'Supervisa el costo real de cada platillo ingrediente por ingrediente. Detecta desviaciones de inventario, sugiere ajustes de precio y predice compras para evitar faltantes o mermas.',
    features: [
      'Cálculo de escandallo automático por receta',
      'Alertas de fluctuación en precios de insumos',
      'Sugerencias de combos con mayor margen',
      'Proyección inteligente de compras semanales',
    ],
    demoBubble: {
      user: 'Chef IA, ¿cuál es el platillo más rentable de esta semana?',
      agent: '📊 La Tostada de Camarón tiene un margen del 68%. Te sugiero promover el combo con bebida para incrementar el ticket promedio en $85 MXN.',
    },
  },
]

export function AiAgentsSection() {
  const [activeTab, setActiveTab] = useState('vendedor')
  const currentAgent = AI_AGENTS.find(a => a.id === activeTab) || AI_AGENTS[0]

  return (
    <section id="agentes-ia" className="py-20 bg-stone-900 text-white dark:bg-black border-y border-stone-800 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1400F]/20 border border-[#D1400F]/40 text-[#D1400F] text-xs font-bold uppercase tracking-wider mb-4">
            <Bot className="w-4 h-4" /> Empleados Virtuales FoodIX
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Inteligencia Artificial trabajando en tu restaurante <span className="text-[#D1400F]">24/7</span>
          </h2>
          <p className="mt-4 text-stone-300 text-base sm:text-lg">
            Agentes virtuales especializados que automatizan ventas por WhatsApp, agendan reservas y optimizan los costos de tus platillos.
          </p>
        </div>

        {/* Tabs de selección de Agente */}
        <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-2 [scrollbar-width:none]">
          {AI_AGENTS.map(agent => {
            const Icon = agent.icon
            const isActive = activeTab === agent.id
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActiveTab(agent.id)}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shrink-0 border',
                  isActive
                    ? 'bg-[#D1400F] text-white border-[#D1400F] shadow-lg shadow-[#D1400F]/25 scale-105'
                    : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:border-stone-600 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{agent.title.split(' ')[0]} {agent.title.split(' ')[1]}</span>
              </button>
            )
          })}
        </div>

        {/* Contenido del Agente activo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-stone-800/50 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-stone-700/60 shadow-2xl">
          {/* Lado izquierdo: Descripción y características */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: currentAgent.color }}
              >
                {currentAgent.badge}
              </span>
              <span className="text-xs text-stone-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Impulsado por Sol IA
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              {currentAgent.title}
            </h3>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              {currentAgent.desc}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentAgent.features.map(feat => (
                <li key={feat} className="flex items-start gap-2 text-xs sm:text-sm text-stone-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <a
                href="#precios"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-[#D1400F] hover:bg-[#B03508] transition-all shadow-md active:scale-95"
              >
                Activar Agente IA en tu plan <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Lado derecho: Simulación de chat en vivo */}
          <div className="lg:col-span-5 bg-stone-900 rounded-2xl border border-stone-700 p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#D1400F] flex items-center justify-center font-bold text-white text-xs">
                  Sol
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{currentAgent.title}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En línea 24/7
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-stone-500 font-mono">FoodIX AI</span>
            </div>

            {/* Burbujas de chat */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-stone-800 text-stone-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] border border-stone-700/60">
                <p className="font-medium">{currentAgent.demoBubble.user}</p>
              </div>
              <div className="bg-[#D1400F]/20 text-stone-100 p-3 rounded-2xl rounded-tr-none ml-auto max-w-[85%] border border-[#D1400F]/30 shadow-sm">
                <p className="font-medium">{currentAgent.demoBubble.agent}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
