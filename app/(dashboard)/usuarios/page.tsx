'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { UsersManager } from '@/components/users/UsersManager'
import type { UserRole } from '@/lib/types'

export default function UsuariosPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  // El admin de la sucursal puede dar de alta a su equipo.
  const allowedRoles: UserRole[] = ['mesero', 'cocina', 'admin']

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Usuarios"
        description="Da de alta a tu equipo: meseros, cocina y administradores"
      />
      <UsersManager branchId={branchId} allowedRoles={allowedRoles} theme="light" />
    </div>
  )
}
