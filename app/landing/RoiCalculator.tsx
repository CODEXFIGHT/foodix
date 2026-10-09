'use client'

import { useState } from 'react'
import { Clock, TrendingUp, ShieldCheck, Sparkles, ChevronRight, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const BUSINESS_TYPES = [
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', multiplier: 1.2 },
  { id: 'cafeteria', label: 'Cafetería / Panadería', icon: '☕', multiplier: 1.0 },
  { id: 'taqueria', label: 'Taquería / Fast Food', icon: '🌮', multiplier: 1.35 },
  { id: 'bar', label: 'Bar / Pizzería', icon: '🍕', multiplier: 1.15 },
]

export function RoiCalculator() {
  const [businessType, setBusinessType] = useState('restaurante')
  const [dailyOrders, setDailyOrders] = useState(45)
  const [avgTicket, setAvgTicket] = useState(280)

  const selectedBusiness = BUSINESS_TYPES.find(b => b.id === businessType) || BUSINESS_TYPES[0]

  // Cálculos dinámicos
  const monthlyRevenue = dailyOrders * avgTicket * 30
  const hoursSavedPerWeek = Math.round((dailyOrders * 2.5 * 7) / 60 * selectedBusiness.multiplier)
  const estimatedSalesIncrease = Math.round(monthlyRevenue * 0.18 * selectedBusiness.multiplier)
  const wasteSavedMonthly = Math.round(monthlyRevenue * 0.05 * selectedBusiness.multiplier)
  const totalMonthlyBenefit = estimatedSalesIncrease + wasteSavedMonthly

  return (
    <section className="relative py-20 overflow-hidden bg-stone-900 text-white dark:bg-black border-y border-stone-800">
      {/* Glow ambiental */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-[#D1400F]/15 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1400F]/20 border border-[#D1400F]/40 text-[#D1400F] text-xs font-bold uppercase tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5" /> Calculadora de Impacto Financiero
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Descubre cuánto ahorra y gana tu restaurante con <span className="text-[#D1400F]">FoodIX</span>
          </h2>
          <p className="mt-4 text-stone-300 text-base sm:text-lg">
            Calcula el retorno de inversión real ajustado al flujo diario de tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-stone-800/60 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-700/60 shadow-2xl">
          {/* Columna Izquierda: Parámetros del Restaurante */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                1. Selecciona el tipo de negocio
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {BUSINESS_TYPES.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBusinessType(b.id)}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm font-semibold transition-all duration-200',
                      businessType === b.id
                        ? 'border-[#D1400F] bg-[#D1400F]/20 text-white shadow-lg shadow-[#D1400F]/10'
                        : 'border-stone-700 bg-stone-900/50 text-stone-300 hover:border-stone-600 hover:bg-stone-800'
                    )}
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="truncate">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Pedidos Diarios */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  2. Pedidos promedio por día
                </label>
                <span className="text-lg font-extrabold text-[#D1400F] bg-[#D1400F]/10 px-3 py-0.5 rounded-lg border border-[#D1400F]/30">
                  {dailyOrders} pedidos/día
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={dailyOrders}
                onChange={e => setDailyOrders(Number(e.target.value))}
                className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#D1400F]"
              />
              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>10 pedidos</span>
                <span>125 pedidos</span>
                <span>250+ pedidos</span>
              </div>
            </div>

            {/* Slider Ticket Promedio */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  3. Ticket promedio estimado
                </label>
                <span className="text-lg font-extrabold text-[#D1400F] bg-[#D1400F]/10 px-3 py-0.5 rounded-lg border border-[#D1400F]/30">
                  ${avgTicket} MXN
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1200"
                step="25"
                value={avgTicket}
                onChange={e => setAvgTicket(Number(e.target.value))}
                className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#D1400F]"
              />
              <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                <span>$50 MXN</span>
                <span>$600 MXN</span>
                <span>$1,200+ MXN</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resultados de Impacto Financiero */}
          <div className="lg:col-span-6 bg-gradient-to-br from-stone-900 via-stone-900 to-black p-6 sm:p-8 rounded-2xl border border-stone-700/80 shadow-inner flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Resultado Estimado Mensual
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" /> ROI Mayor a 12x
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/70">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold mb-1">
                  <Clock className="w-4 h-4 text-[#D1400F]" /> Tiempo Ahorrado
                </div>
                <p className="text-2xl font-black text-white">{hoursSavedPerWeek} hrs<span className="text-xs text-stone-400 font-normal">/semana</span></p>
                <p className="text-[11px] text-stone-400 mt-1">En comandas, caja y cobros</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/70">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Aumento en Ventas
                </div>
                <p className="text-2xl font-black text-emerald-400">+${estimatedSalesIncrease.toLocaleString('es-MX')} <span className="text-xs font-normal">MXN</span></p>
                <p className="text-[11px] text-stone-400 mt-1">Vía WhatsApp Bot + QR</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-300 font-medium">Beneficio Neto Adicional Estimado</p>
                <p className="text-3xl font-extrabold text-white">
                  +${totalMonthlyBenefit.toLocaleString('es-MX')} <span className="text-sm font-normal text-emerald-400">MXN/mes</span>
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            </div>

            <a
              href="/register"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-white bg-[#D1400F] hover:bg-[#B03508] transition-all duration-300 active:scale-95 shadow-lg shadow-[#D1400F]/25"
            >
              Comenzar prueba gratis <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
