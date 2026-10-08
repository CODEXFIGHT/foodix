'use client'

import type { Table, TableStatus } from '@/lib/types'
import { cn } from '@/lib/utils/cn'
import { Users, Circle, ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useKioskMode } from '@/hooks/useKioskMode'

interface TableCardProps {
  table: Table
  onClick?: () => void
  onStatusChange?: (newStatus: TableStatus) => void
  onDelete?: () => void
}

const statusStyle: Record<Table['status'], string> = {
  libre:     'border-green-400 bg-green-50 dark:bg-green-950/20',
  ocupada:   'border-red-400 bg-red-50 dark:bg-red-950/20',
  reservada: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20',
}

const statusColor: Record<Table['status'], string> = {
  libre:     'text-green-600',
  ocupada:   'text-red-600',
  reservada: 'text-yellow-600',
}

const statusLabel: Record<Table['status'], string> = {
  libre:     'Libre',
  ocupada:   'Ocupada',
  reservada: 'Reservada',
}

export function TableCard({ table, onClick, onStatusChange, onDelete }: TableCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const { isKiosk } = useKioskMode()

  const statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  return (
    <div
      onClick={onClick}
      className={cn(
        'border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md select-none relative',
        statusStyle[table.status],
        isKiosk && 'p-6 border-3'
      )}
    >
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          aria-label={`Eliminar ${table.name}`}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors",
            isKiosk && "top-3 right-3 p-2"
          )}
        >
          <Trash2 className={cn("h-4 w-4", isKiosk && "h-5 w-5")} />
        </button>
      )}
      <div className={cn("flex items-start justify-between mb-3", isKiosk && "mb-4")}>
        <h3 className={cn("font-heading font-bold text-lg", isKiosk && "text-xl font-extrabold")}>{table.name}</h3>
        <Circle className={cn('h-3 w-3 fill-current mt-1', onDelete ? 'mr-7' : '', statusColor[table.status], isKiosk && 'h-4.5 w-4.5 mt-0.5')} />
      </div>
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground mb-2", isKiosk && "text-sm mb-3 gap-1.5")}>
        <Users className={cn("h-3.5 w-3.5", isKiosk && "h-4.5 w-4.5")} />
        <span>{table.seats} personas</span>
      </div>
      <span className={cn(
        'text-xs font-semibold px-2 py-0.5 rounded-full',
        statusColor[table.status],
        table.status === 'libre'     ? 'bg-green-100 dark:bg-green-900/30' :
        table.status === 'ocupada'   ? 'bg-red-100 dark:bg-red-900/30' :
        'bg-yellow-100 dark:bg-yellow-900/30',
        isKiosk && 'text-sm px-3 py-1'
      )}>
        {statusLabel[table.status]}
      </span>

      {table.status === 'ocupada' && table.current_order_id && (
        <p className={cn("mt-2 text-xs text-muted-foreground font-mono", isKiosk && "text-sm mt-3")}>#{table.current_order_id}</p>
      )}

      {onStatusChange && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn("text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground", isKiosk && "text-sm py-1")}
          >
            Cambiar <ChevronDown className={cn("h-3 w-3", isKiosk && "h-4 w-4")} />
          </button>
          {showMenu && (
            <div className={cn("absolute left-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-10 py-1 min-w-[140px]", isKiosk && "min-w-[170px] py-2")}>
              {statuses.filter(s => s !== table.status).map(s => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); setShowMenu(false) }}
                  className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", isKiosk && "px-4 py-2.5 text-sm")}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
