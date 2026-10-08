'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, LogOut, MessageCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthOverlay } from '@/components/shared/LoadingSpinner'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { PrinterStatusIndicator } from '@/components/layout/PrinterStatusIndicator'
import { AlertsBell } from '@/components/layout/AlertsBell'
import { CashStatusBar } from '@/components/cash/CashStatusBar'
import { TrialBadge } from '@/components/shared/TrialStatus'
import { WhatsAppPanel } from '@/components/whatsapp/WhatsAppPanel'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils/cn'

const roleLabel: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  mesero: 'Mesero',
  cocina: 'Cocina',
}

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await new Promise(r => setTimeout(r, 600))
    await logout()
    router.push('/login')
  }

  const avatarSrc =
    user?.role === 'superadmin' ? ICONS8.superAdmin :
    user?.role === 'admin'      ? ICONS8.adminAvatar :
    user?.role === 'cocina'     ? ICONS8.cocinaAvatar :
    ICONS8.meseroAvatar

  return (
    <>
      {isLoggingOut && <AuthOverlay message="Cerrando sesión…" />}

      <header className="h-16 border-b bg-card sticky top-0 z-40 flex items-center px-4 gap-4">
        <div className="flex items-center lg:hidden min-w-0 max-w-[60%]">
          <BrandLogo
            forceFoodIX
            size={28}
            showName
            nameClassName="font-heading text-sm sm:text-base"
          />
        </div>

        <div className="flex-1 hidden lg:flex items-center gap-3">
          <BrandLogo forceFoodIX size={26} showName nameClassName="text-base" />
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            En línea
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Estado de la prueba gratuita: discreto, con la fecha exacta en el
              title y creciendo en urgencia según los días restantes. */}
          <TrialBadge />

          <PrinterStatusIndicator />

          {user?.role === 'admin' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWaOpen(true)}
              className="h-9 w-9 text-[#25D366] hover:bg-[#25D366]/10"
              title="WhatsApp FoodIX Pro"
            >
              <MessageCircle className="h-4.5 w-4.5" />
              <span className="sr-only">WhatsApp</span>
            </Button>
          )}

          <AlertsBell />

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
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <span className={cn(
                  'mt-1 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full',
                  user?.role === 'superadmin' ? 'bg-yellow-100 text-yellow-700' :
                  user?.role === 'admin'      ? 'bg-[#E85D04]/10 text-[#E85D04]' :
                  user?.role === 'cocina'     ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700',
                )}>
                  <Icons8Image src={avatarSrc} alt="role" size={12} />
                  {roleLabel[user?.role ?? 'mesero']}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CashStatusBar />

      {user?.role === 'admin' && (
        <WhatsAppPanel open={waOpen} onClose={() => setWaOpen(false)} />
      )}
    </>
  )
}
