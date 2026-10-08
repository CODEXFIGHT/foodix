/**
 * FoodIX — Modo Demo
 * Topbar del shell demo. Replica el topbar real (marca móvil, estado "En línea",
 * toggle de tema y menú de avatar) pero opera sobre la sesión demo: cambia de
 * rol, reinicia datos o termina la prueba. No consulta backend real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

'use client'

import { useRouter } from 'next/navigation'
import { Moon, Sun, LogOut, RotateCcw, ShieldCheck, ConciergeBell, ChefHat } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { cn } from '@/lib/utils/cn'
import { DemoBrand } from './DemoBrand'
import { DemoTimerBadge } from '@/components/demo/DemoTimerBadge'
import { demoActions } from '@/lib/demo/demo-store'
import { endDemoTrial } from '@/lib/demo/demo-session'
import { getDemoUser } from '@/lib/demo/demo-seed'
import type { DemoRole } from '@/lib/demo/demo-types'

const ROLE_LABEL: Record<DemoRole, string> = {
  admin: 'Administrador',
  waiter: 'Mesero',
  kitchen: 'Cocina',
  menu: 'Cliente',
}

const AVATAR_SRC: Record<DemoRole, string> = {
  admin: ICONS8.adminAvatar,
  waiter: ICONS8.meseroAvatar,
  kitchen: ICONS8.cocinaAvatar,
  menu: ICONS8.meseroAvatar,
}

const SWITCH: { role: DemoRole; label: string; href: string; Icon: typeof ShieldCheck }[] = [
  { role: 'admin', label: 'Admin', href: '/demo/admin', Icon: ShieldCheck },
  { role: 'waiter', label: 'Mesero', href: '/demo/waiter', Icon: ConciergeBell },
  { role: 'kitchen', label: 'Cocina', href: '/demo/kitchen', Icon: ChefHat },
]

export function DemoTopbar({ role }: { role: DemoRole }) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const user = getDemoUser(role)
  const avatarSrc = AVATAR_SRC[role]

  function handleReset() {
    demoActions.reset()
    toast.success('Demo reiniciado', { description: 'Los datos volvieron a su estado inicial.' })
  }

  function handleLogout() {
    endDemoTrial('logout')
    router.replace('/demo')
  }

  return (
    <header className="h-16 border-b bg-card sticky top-0 z-40 flex items-center px-4 gap-4">
      <div className="flex items-center lg:hidden min-w-0 max-w-[55%]">
        <DemoBrand size={30} showName nameClassName="font-heading text-base" />
      </div>

      <div className="flex-1 hidden lg:flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Sistema POS para restaurantes</p>
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          En línea
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DemoTimerBadge />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-muted">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-transparent p-0 overflow-hidden">
                  <Icons8Image src={avatarSrc} alt="Avatar" size={28} className="rounded-full" />
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
                {user.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user.name}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-[#E85D04]/10 text-[#E85D04]">
                <Icons8Image src={avatarSrc} alt="role" size={12} />
                {ROLE_LABEL[role]} · Demo
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cambiar rol
            </DropdownMenuLabel>
            {SWITCH.map(({ role: r, label, href, Icon }) => (
              <DropdownMenuItem
                key={r}
                onClick={() => router.push(href)}
                className={cn('cursor-pointer', r === role && 'text-[#E85D04] font-semibold')}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleReset} className="cursor-pointer">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar demo
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Salir del demo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
