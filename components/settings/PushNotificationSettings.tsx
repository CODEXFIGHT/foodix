/**
 * FoodIX — Tarjeta de ajustes de notificaciones push.
 *
 * Muestra el estado real del dispositivo y permite activar/desactivar las
 * notificaciones y enviar una notificación de prueba. Cubre todos los estados:
 * no soportado, permiso pendiente/concedido/denegado, suscrito y errores; y la
 * guía de instalación para Safari iOS.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { Bell } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  cocina: 'Cocina',
  mesero: 'Mesero',
}

export function PushNotificationSettings() {
  const user = useAuthStore(s => s.user)
  const label = ROLE_LABEL[user?.role ?? ''] ?? 'Este rol'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-[#E85D04]" />
          Notificaciones push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PushNotificationToggle
          label={label}
          context={{ userId: user?.id, role: user?.role, branchId: user?.branch_id }}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Las notificaciones son por dispositivo y por usuario. Actívalas en cada equipo donde quieras recibir avisos.
        </p>
      </CardContent>
    </Card>
  )
}
