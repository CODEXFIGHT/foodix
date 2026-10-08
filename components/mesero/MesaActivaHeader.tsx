'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Header fijo de la Vista Mesa Activa: número de mesa, estado y tiempo
 * transcurrido desde la apertura. Sin sidebar ni navegación anidada.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { Button, Chip } from '@heroui/react'
import type { Table, Order } from '@/lib/types'

interface MesaActivaHeaderProps {
  table: Table | null
  order: Order | null
}

type MesaEstado = 'libre' | 'ocupada' | 'cuenta_pedida'

function deriveEstado(table: Table | null, order: Order | null): MesaEstado {
  if (!order) return table?.status === 'ocupada' ? 'ocupada' : 'libre'
  return order.payment_status !== 'unpaid' ? 'cuenta_pedida' : 'ocupada'
}

const ESTADO_LABEL: Record<MesaEstado, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  cuenta_pedida: 'Cuenta pedida',
}

const ESTADO_COLOR: Record<MesaEstado, 'success' | 'warning' | 'primary'> = {
  libre: 'success',
  ocupada: 'warning',
  cuenta_pedida: 'primary',
}

function formatElapsed(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const mins = Math.max(0, Math.floor(ms / 60_000))
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

export function MesaActivaHeader({ table, order }: MesaActivaHeaderProps) {
  const router = useRouter()
  // Fuerza un re-render cada 30s para refrescar el tiempo transcurrido.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const estado = deriveEstado(table, order)

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 py-2.5">
        <Button
          isIconOnly
          variant="light"
          radius="full"
          onPress={() => router.push('/tables')}
          aria-label="Volver a mesas"
          className="h-11 w-11 shrink-0 text-stone-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{table?.name ?? 'Mesa'}</p>
          {order && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {formatElapsed(order.created_at)}
            </p>
          )}
        </div>

        <Chip color={ESTADO_COLOR[estado]} variant="flat" size="sm" className="shrink-0 font-bold">
          {ESTADO_LABEL[estado]}
        </Chip>
      </div>
    </header>
  )
}
