'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { Button } from '@/components/ui/button'

export function DeviceRejectedScreen() {
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
        <Icons8Image src={ICONS8.cancelled} alt="Rechazado" size={96} className="mx-auto" />
        <h1 className="text-2xl font-bold text-stone-900">Dispositivo rechazado</h1>
        <p className="text-stone-600 text-sm leading-relaxed">
          Este dispositivo ha sido rechazado o revocado. Contacta al administrador de tu
          sucursal para solicitar acceso.
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Button asChild variant="outline">
            <a href="mailto:restauros@atomicmail.io">Contactar Soporte</a>
          </Button>
          <Button variant="ghost" onClick={() => logout()} className="text-stone-500">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
