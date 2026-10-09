'use client'

/**
 * FoodIX — Sección: comparativa frente a alternativas del mercado.
 * Tabla responsive: en móvil se desliza horizontalmente con la primera
 * columna fija (sticky), en desktop se ve completa de una vez.
 */

import { Check, Minus, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Reveal } from './Reveal'

type Cell = 'yes' | 'partial' | 'no'

const COLS = ['FoodIX', 'Square', 'Toast', 'Hoja de cálculo'] as const

const ROWS: { label: string; cells: [Cell, Cell, Cell, Cell]; hint?: string }[] = [
  { label: 'POS + cocina KDS en la nube', cells: ['yes', 'partial', 'partial', 'no'], hint: 'Square solo POS; Toast no opera en México.' },
  { label: 'Carta digital con QR para comensales', cells: ['yes', 'partial', 'yes', 'no'] },
  { label: 'Agentes IA por WhatsApp (ventas 24/7)', cells: ['yes', 'no', 'no', 'no'] },
  { label: 'Modo offline: sigue operando sin internet', cells: ['yes', 'no', 'partial', 'no'] },
  { label: 'Multi-sucursal desde un solo panel', cells: ['yes', 'partial', 'partial', 'no'] },
  { label: 'Soporte en español y en México', cells: ['yes', 'partial', 'no', 'no'] },
  { label: 'Cancela cuando quieras, sin contrato', cells: ['yes', 'yes', 'no', 'yes'] },
  { label: 'Kiosko y tablets Android (app nativa)', cells: ['yes', 'partial', 'no', 'no'] },
  { label: 'Precio de entrada para un negocio nuevo', cells: ['yes', 'yes', 'no', 'yes'], hint: 'Toast exige contrato anual e instalación cara.' },
]

const ICON: Record<Cell, { C: typeof Check; cls: string; label: string }> = {
  yes: { C: Check, cls: 'text-green-600 dark:text-green-400', label: 'Sí' },
  partial: { C: Minus, cls: 'text-amber-600 dark:text-amber-400', label: 'Parcial' },
  no: { C: X, cls: 'text-stone-400 dark:text-zinc-600', label: 'No' },
}

function StatusIcon({ value }: { value: Cell }) {
  const { C, cls, label } = ICON[value]
  return (
    <span className="inline-flex items-center justify-center" title={label} aria-label={label}>
      <C className={cn('h-5 w-5', cls)} aria-hidden="true" />
    </span>
  )
}

export function ComparisonSection() {
  return (
    <section id="comparativa" className="py-20 bg-stone-50/70 border-y border-stone-100 scroll-mt-24 dark:bg-white/[0.02] dark:border-white/10">
      <div className="max-w-6xl mx-auto px-5">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-yellow-700 dark:text-yellow-400 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20">
            <Sparkles className="h-3.5 w-3.5" /> Comparativa
          </span>
          <h2 className="mt-5 font-heading font-extrabold text-3xl sm:text-4xl text-stone-900 dark:text-white">
            ¿Por qué FoodIX y no otra opción?
          </h2>
          <p className="mt-3 text-stone-600 dark:text-zinc-400">
            Compara lo que de verdad importa al operar un restaurante todos los días.
          </p>
        </Reveal>

        <Reveal className="mt-10" delay={80}>
          <p className="mb-2 text-xs text-stone-400 sm:hidden dark:text-zinc-500">Desliza la tabla para ver todas las opciones →</p>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm [scrollbar-width:thin] dark:border-white/10 dark:bg-[#0a0a0a]">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <caption className="sr-only">Comparativa de FoodIX frente a Square, Toast y una hoja de cálculo</caption>
              <thead>
                <tr className="border-b border-stone-200 dark:border-white/10">
                  <th scope="col" className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-400 dark:bg-[#0a0a0a] dark:text-zinc-500">
                    Característica
                  </th>
                  {COLS.map((c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(
                        'px-4 py-4 text-center text-xs font-bold uppercase tracking-wider',
                        i === 0
                          ? 'bg-[#FACC15]/15 text-stone-900 dark:text-white'
                          : 'text-stone-400 dark:text-zinc-500',
                      )}
                    >
                      {i === 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-md bg-[#FACC15] grid place-items-center text-[10px] font-black text-stone-950">F</span>
                          FoodIX
                        </span>
                      ) : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-stone-100 last:border-0 dark:border-white/5',
                      ri % 2 === 1 && 'bg-stone-50/60 dark:bg-white/[0.02]',
                    )}
                  >
                    <th
                      scope="row"
                      className={cn(
                        'sticky left-0 z-10 border-r border-stone-100 px-5 py-3.5 text-left font-medium text-stone-700 dark:border-white/5 dark:text-zinc-300',
                        ri % 2 === 1 ? 'bg-stone-50 dark:bg-[#101010]' : 'bg-white dark:bg-[#0a0a0a]',
                      )}
                    >
                      {row.label}
                      {row.hint && <span className="mt-0.5 block text-[11px] font-normal text-stone-400 dark:text-zinc-500">{row.hint}</span>}
                    </th>
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          'px-4 py-3.5 text-center',
                          ci === 0 && 'bg-[#FACC15]/15 border-x border-[#EAB308]/30',
                        )}
                      >
                        <StatusIcon value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-stone-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-green-600 dark:text-green-400" /> Sí</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Parcial / limitado</span>
            <span className="inline-flex items-center gap-1.5"><X className="h-4 w-4 text-stone-400 dark:text-zinc-600" /> No</span>
            <span className="text-stone-400 dark:text-zinc-500">Comparativa según información pública de los productos.</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
