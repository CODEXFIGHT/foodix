'use client'

import { Monitor, Smartphone, Tablet, RotateCcw, Maximize2, Type, MousePointer2, Eye } from 'lucide-react'
import { Switch } from '@heroui/react'
import { toast } from 'sonner'
import { usePosAccessibility } from '@/hooks/usePosAccessibility'
import { POS_ACCESSIBILITY_PRESETS, type PosAccessibilityMode, type PosAccessibilityTarget } from '@/lib/accessibility/posAccessibility'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'

interface AccessibilitySettingsPanelProps {
  target?: PosAccessibilityTarget
  title?: string
  description?: string
  compact?: boolean
  dark?: boolean
}

const MODES: Array<{ mode: PosAccessibilityMode; label: string; desc: string; Icon: typeof Monitor }> = [
  { mode: 'default', label: 'Web desktop', desc: 'Tamaño normal', Icon: Monitor },
  { mode: 'mobile', label: 'Mobile', desc: 'Restablece base móvil', Icon: Smartphone },
  { mode: 'tablet', label: 'Tablet', desc: 'Controles más cómodos', Icon: Tablet },
  { mode: 'kiosk', label: 'Kiosko', desc: 'Máxima legibilidad', Icon: Maximize2 },
]

export function AccessibilitySettingsPanel({
  target,
  title = 'Accesibilidad del POS',
  description = 'Ajusta letras, botones, inputs e iconos en las pantallas operativas de admin y mesero.',
  compact = false,
  dark = false,
}: AccessibilitySettingsPanelProps) {
  const { settings, update, setMode, reset, syncing } = usePosAccessibility(target)

  const applyMode = (mode: PosAccessibilityMode) => {
    setMode(mode)
    toast.success(mode === 'default' || mode === 'mobile' ? 'Configuración restablecida' : `Modo ${mode === 'tablet' ? 'tablet' : 'kiosko'} aplicado`)
  }

  const setScale = (key: 'fontScale' | 'controlScale' | 'iconScale', value: number) => {
    update({ ...settings, mode: 'default', [key]: value })
  }

  const resetAll = () => {
    reset()
    toast.success('Accesibilidad restablecida')
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 shadow-sm',
      compact && 'p-3',
      dark && 'border-white/10 bg-white/[0.03] text-white shadow-none',
    )}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', dark ? 'border-white/10 text-neutral-400' : 'text-muted-foreground')}>
            {syncing ? 'Sincronizando…' : 'Sincronizado'}
          </span>
        </div>
        <p className={cn('text-sm leading-relaxed text-muted-foreground', dark && 'text-neutral-400')}>{description}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {MODES.map(({ mode, label, desc, Icon }) => {
          const active = settings.mode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => applyMode(mode)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                active ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#D1400F]' : 'hover:border-[#D1400F]/40',
                dark && !active && 'border-white/10 bg-black/20 text-neutral-300 hover:bg-white/5',
              )}
            >
              <Icon className="mb-2 h-5 w-5" />
              <span className="block text-sm font-bold">{label}</span>
              <span className={cn('block text-xs text-muted-foreground', dark && 'text-neutral-500')}>{desc}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ScaleControl icon={<Type className="h-4 w-4" />} label="Letra" value={settings.fontScale} onChange={v => setScale('fontScale', v)} dark={dark} />
        <ScaleControl icon={<MousePointer2 className="h-4 w-4" />} label="Botones e inputs" value={settings.controlScale} onChange={v => setScale('controlScale', v)} dark={dark} />
        <ScaleControl icon={<Eye className="h-4 w-4" />} label="Iconos" value={settings.iconScale} onChange={v => setScale('iconScale', v)} dark={dark} />
      </div>

      <div className={cn('mt-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between', dark && 'border-white/10 bg-black/20')}>
        <div>
          <Label className="text-sm font-semibold">Alto contraste operativo</Label>
          <p className={cn('text-xs text-muted-foreground', dark && 'text-neutral-500')}>Refuerza bordes y estados activos en pantallas de operación.</p>
        </div>
        <Switch
          size="sm"
          isSelected={settings.highContrast}
          onValueChange={checked => update({ ...settings, highContrast: checked })}
          classNames={{ wrapper: 'group-data-[selected=true]:bg-[#D1400F]' }}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={resetAll} className={dark ? 'border-white/10 bg-transparent text-neutral-300 hover:bg-white/5' : ''}>
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Reestablecer configuración inicial
        </Button>
      </div>
    </div>
  )
}

function ScaleControl({
  icon,
  label,
  value,
  onChange,
  dark,
}: {
  icon: React.ReactNode
  label: string
  value: number
  onChange: (value: number) => void
  dark?: boolean
}) {
  return (
    <div className={cn('rounded-lg border bg-background p-3', dark && 'border-white/10 bg-black/20')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">{icon}{label}</span>
        <span className={cn('text-xs font-bold text-[#D1400F]')}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={90}
        max={145}
        step={5}
        value={Math.round(value * 100)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full accent-[#D1400F]"
      />
    </div>
  )
}
