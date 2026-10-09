'use client'

/**
 * FoodIX — Campana de alertas estructuradas (Topbar).
 * Ejecuta el motor de alertas y muestra el historial reciente con conteo de no
 * leídas. Solo aplica a admin/superadmin y mesero (cocina usa el KDS).
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/stores/authStore'
import { useAlertsStore } from '@/lib/stores/alertsStore'
import { useAlertEngine } from '@/hooks/useAlertEngine'
import { cn } from '@/lib/utils/cn'

export function AlertsBell() {
  const router = useRouter()
  const role = useAuthStore(s => s.user?.role)
  const alerts = useAlertsStore(s => s.alerts)
  const unread = useAlertsStore(s => s.unread)
  const markAllRead = useAlertsStore(s => s.markAllRead)

  // Ejecuta el motor (gateado internamente por rol). Hook siempre llamado.
  useAlertEngine()

  // La campana solo se muestra a quienes reciben alertas por este canal.
  if (role !== 'admin' && role !== 'superadmin' && role !== 'mesero') return null

  return (
    <DropdownMenu onOpenChange={open => { if (open) markAllRead() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Alertas">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FACC15] text-stone-950 text-[10px] font-bold grid place-items-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden border-2 border-[#EAB308] bg-popover p-0 shadow-[0_18px_55px_rgba(250,204,21,0.18)] dark:border-[#FBBF24] dark:shadow-[0_18px_55px_rgba(250,204,21,0.28)]"
      >
        <div className="flex items-center justify-between border-b border-[#EAB308]/25 bg-[#FACC15]/5 px-3 py-2.5 dark:border-[#FBBF24]/30 dark:bg-[#FACC15]/10">
          <p className="text-sm font-semibold">Alertas</p>
          {alerts.length > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-yellow-800 dark:text-yellow-400 hover:text-yellow-700 dark:text-[#FCD34D] dark:hover:text-[#FDE68A]"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#EAB308]/30 bg-[#FACC15]/10 text-yellow-700 dark:border-[#FBBF24]/35 dark:bg-[#FACC15]/15 dark:text-[#FCD34D]">
              <Bell className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">Sin alertas por ahora</p>
            <p className="text-xs text-muted-foreground">Te avisaremos cuando algo necesite tu atención.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {alerts.map(a => (
              <button
                key={a.id}
                onClick={() => { if (a.href) router.push(a.href) }}
                className={cn(
                  'w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors',
                  !a.read && 'bg-amber-50/60 dark:bg-amber-950/20',
                )}
              >
                <span className="text-base leading-none mt-0.5">{a.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground truncate">{a.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{a.body}</span>
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(a.at, { addSuffix: true, locale: es })}
                  </span>
                </span>
                {!a.read && <span className="h-2 w-2 rounded-full bg-[#FACC15] shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
