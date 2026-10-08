'use client'

import { useState } from 'react'
import { Sparkles, Bot, X, Send, ChevronRight, TrendingUp, Clock, AlertTriangle, Lightbulb, ChefHat, UserCheck, Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type UserRole = 'admin' | 'mesero' | 'cocina'

interface RoleAiAssistantProps {
  role: UserRole
  className?: string
  defaultOpen?: boolean
}

interface RoleConfig {
  title: string
  subtitle: string
  badge: string
  icon: typeof Bot
  badgeColor: string
  insights: {
    icon: typeof Lightbulb
    color: string
    title: string
    desc: string
  }[]
  presetChips: string[]
  responses: Record<string, string>
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    title: 'Sol IA — Asistente de Gestión',
    subtitle: 'Analítica en tiempo real, proyección de ventas e inventario',
    badge: 'Admin Copilot',
    icon: Shield,
    badgeColor: 'bg-orange-500/10 text-[#E85D04] border-orange-500/20',
    insights: [
      {
        icon: TrendingUp,
        color: 'text-emerald-400',
        title: 'Ventas +14% vs ayer',
        desc: 'Las ventas alcanzan $12,480 MXN a esta hora. El producto más vendido es "Tostada de camarón" (38 órdenes).',
      },
      {
        icon: AlertTriangle,
        color: 'text-amber-400',
        title: 'Alerta de Stock Insumo',
        desc: 'El inventario de "Camarón Mediano" está al 18%. Se sugiere reordenar 5 kg antes del turno nocturno.',
      },
      {
        icon: Clock,
        color: 'text-blue-400',
        title: 'Hora Pico Proyectada',
        desc: 'Mayor afluencia esperada entre 2:30 PM y 4:00 PM. Se recomienda asignar 2 meseros adicionales a terraza.',
      },
    ],
    presetChips: [
      '¿Cuál es la proyección de ventas de hoy?',
      '¿Qué platillo tiene el mejor margen?',
      'Ver resumen de cortes de caja',
      'Insumos por agotarse',
    ],
    responses: {
      '¿Cuál es la proyección de ventas de hoy?':
        '📈 Con el ritmo actual de 32 pedidos, se proyecta un cierre del día de aproximadamente $18,500 MXN (+12% vs el promedio mensual).',
      '¿Qué platillo tiene el mejor margen?':
        '📊 La "Tostada de camarón" genera un 68% de margen bruto con un costo directo de insumos de $42 MXN y precio de venta de $130 MXN.',
      'Ver resumen de cortes de caja':
        '💵 Caja central acumula $12,480 MXN ($8,200 en tarjeta/QR y $4,280 en efectivo). Cuadre sin discrepancias.',
      'Insumos por agotarse':
        '⚠️ Insumos críticos: Camarón Mediano (18% restante) y Limón verde (22% restante). Demás insumos en nivel óptimo.',
    },
  },
  mesero: {
    title: 'Sol IA — Copiloto de Piso',
    subtitle: 'Recomendaciones de venta cruzada y estado de comanda',
    badge: 'Mesero Copilot',
    icon: UserCheck,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    insights: [
      {
        icon: Lightbulb,
        color: 'text-amber-400',
        title: 'Sugerencia para Mesa 4',
        desc: 'Ya consumieron platillo fuerte. ¡Ofrece el Postre Especial o café espresso para subir el ticket +$120 MXN!',
      },
      {
        icon: Clock,
        color: 'text-emerald-400',
        title: '¡Orden lista en Cocina!',
        desc: 'La comanda de la Mesa 2 (Coctel de pulpo) acaba de salir de Estación Fría. Lista para entregar.',
      },
      {
        icon: AlertTriangle,
        color: 'text-orange-400',
        title: 'Mesa 5 pendiente de cuenta',
        desc: 'Lleva 14 min sin consumo adicional. Acércate con la terminal Smart POS para acelerar el cobro.',
      },
    ],
    presetChips: [
      '¿Qué postre sugerir a Mesa 4?',
      'Ver comanda lista para entregar',
      'Calcular cuenta dividida rápida',
      'Bebidas populares hoy',
    ],
    responses: {
      '¿Qué postre sugerir a Mesa 4?':
        '🍰 Te sugiero la Tarta de Queso con Frutos Rojos o Café Carajillo. A las mesas con 4 comensales les encanta pedir 2 para compartir.',
      'Ver comanda lista para entregar':
        '🍽️ Mesa 2: 1 Coctel de pulpo listo en barra. Mesa 7: 2 Tacos de pescado en estación caliente.',
      'Calcular cuenta dividida rápida':
        '🧮 Para dividir $960 MXN entre 4 personas: $240 MXN c/u. Con 10% de propina sugerida: $264 MXN c/u.',
      'Bebidas populares hoy':
        '🥤 Las bebidas más pedidas son: Limonada Mineral con Menta, Cerveza Artesanal Clara y Agua de Horchata.',
    },
  },
  cocina: {
    title: 'Sol IA — Asistente KDS',
    subtitle: 'Priorización de comanda, tiempos de estación y alertas',
    badge: 'Cocina Copilot',
    icon: ChefHat,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    insights: [
      {
        icon: Clock,
        color: 'text-blue-400',
        title: 'Estación Fría (3 pendientes)',
        desc: '3 Tostadas de camarón en espera. Tiempo promedio de salido: 4 min. Prepara en bloque para ganar tiempo.',
      },
      {
        icon: AlertTriangle,
        color: 'text-amber-400',
        title: 'Estación Caliente (Prioridad)',
        desc: 'La comanda #14 de Filete Empapelado lleva 8 min en fuego. Priorizar emplatado.',
      },
      {
        icon: Lightbulb,
        color: 'text-emerald-400',
        title: 'Notificación enviada',
        desc: 'Aviso listo enviado automáticamente al mesero Carlos cuando comanda #12 cambie a estado Preparado.',
      },
    ],
    presetChips: [
      '¿Cuál es el orden de prioridad?',
      'Tiempo promedio estación fría',
      'Notificar platillo listo a mesero',
      'Ver insumos en cocina',
    ],
    responses: {
      '¿Cuál es el orden de prioridad?':
        '🔥 1º Comanda #14 (Filete Empapelado - 8 min). 2º Comanda #15 (Aguachile verde - 5 min). 3º Comanda #16 (Tostada camarón - 2 min).',
      'Tiempo promedio estación fría':
        '⏱️ Tiempo promedio actual en Estación Fría: 4.2 minutos por platillo (excelente ritmo).',
      'Notificar platillo listo a mesero':
        '🔔 Notificación de "Comanda Lista" enviada al smartwatch/teléfono del mesero asignado.',
      'Ver insumos en cocina':
        '📦 Stock de cocina: Tostadas (80 pzas), Pulpo cocido (3.5 kg), Camarón (2.1 kg). Insumos suficientes para el turno.',
    },
  },
}

export function RoleAiAssistant({ role, className, defaultOpen = false }: RoleAiAssistantProps) {
  const config = ROLE_CONFIGS[role]
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<{ sender: 'sol' | 'user'; text: string }[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputText).trim()
    if (!query) return

    setMessages(prev => [...prev, { sender: 'user', text: query }])
    if (!textToSend) setInputText('')
    setLoading(true)

    setTimeout(() => {
      const predefined = config.responses[query]
      const defaultReply = `💡 Sol IA (${config.badge}): He procesado tu consulta "${query}". La operación del rol ${role} se encuentra optimizada y sincronizada en tiempo real con el servidor.`
      const replyText = predefined || defaultReply

      setMessages(prev => [...prev, { sender: 'sol', text: replyText }])
      setLoading(false)
    }, 600)
  }

  const RoleIcon = config.icon

  return (
    <div className={cn('relative', className)}>
      {/* Botón flotante de activación */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-stone-900 text-white border border-stone-700 shadow-xl hover:border-[#E85D04] hover:shadow-orange-500/20 transition-all duration-300 active:scale-95 dark:bg-black dark:border-stone-800"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-xl bg-[#E85D04] flex items-center justify-center font-bold text-xs text-white">
              Sol
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-900 animate-pulse" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-extrabold text-white group-hover:text-[#E85D04] transition-colors flex items-center gap-1">
              Asistente Sol IA <Sparkles className="w-3 h-3 text-amber-400" />
            </p>
            <p className="text-[10px] text-stone-400">{config.badge}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Drawer / Modal Popover del Asistente Sol IA */}
      {isOpen && (
        <div className="w-full sm:w-[420px] rounded-3xl bg-stone-900 text-white border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in dark:bg-black dark:border-stone-800">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-900 to-black border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#E85D04] flex items-center justify-center font-black text-sm text-white shadow-md shadow-[#E85D04]/30">
                Sol
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-white">{config.title}</h4>
                  <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', config.badgeColor)}>
                    {config.badge}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">{config.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo interactivo */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
            {/* Insights Proactivos por Rol */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <RoleIcon className="w-3.5 h-3.5 text-[#E85D04]" /> Sugerencias en tiempo real
              </p>
              {config.insights.map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 hover:border-stone-600 transition-all flex items-start gap-2.5"
                  >
                    <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', item.color)} />
                    <div>
                      <p className="font-bold text-white text-xs">{item.title}</p>
                      <p className="text-stone-300 text-[11px] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Chips de Preguntas Rápidas */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                Consultar a Sol IA
              </p>
              <div className="flex flex-wrap gap-1.5">
                {config.presetChips.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSend(chip)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-[#E85D04] hover:text-white text-stone-300 border border-stone-700 transition-all text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversación / Respuestas */}
            {messages.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-stone-800">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-2xl max-w-[90%] leading-relaxed text-xs',
                      m.sender === 'user'
                        ? 'ml-auto bg-stone-800 text-stone-200 border border-stone-700 rounded-tr-none'
                        : 'bg-[#E85D04]/20 text-stone-100 border border-[#E85D04]/30 rounded-tl-none'
                    )}
                  >
                    {m.text}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-stone-400 text-xs italic">
                    <span className="w-2 h-2 rounded-full bg-[#E85D04] animate-ping" /> Sol IA está analizando...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Preguntar a Sol IA (${role})...`}
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-[#E85D04]"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              className="p-2 rounded-xl bg-[#E85D04] text-white hover:bg-[#C44D00] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
