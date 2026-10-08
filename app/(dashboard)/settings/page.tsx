'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfigStore } from '@/lib/stores/configStore'
import { useBranch, useUpdateBranch, useUpdateMyProfile } from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { PrinterSettings } from '@/components/settings/PrinterSettings'
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings'
import { AccessibilitySettingsPanel } from '@/components/settings/AccessibilitySettingsPanel'
import { TaxSettings } from '@/components/settings/TaxSettings'
import { WhatsAppOrderTypeSettings } from '@/components/settings/WhatsAppOrderTypeSettings'
import { BranchLogoUploader } from '@/components/branding/BranchLogoUploader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ─── Logo del restaurante ─────────────────────────────────────────────────────

function LogoCard({ branchId }: { branchId: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Logotipo del restaurante</CardTitle>
      </CardHeader>
      <CardContent>
        <BranchLogoUploader
          branchId={branchId}
          variant="light"
          helperText="Tu logo aparecerá en la pantalla de inicio de sesión de tu equipo."
        />
      </CardContent>
    </Card>
  )
}

const settingsSchema = z.object({
  businessName: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  slogan: z.string().max(120).optional(),
})
type SettingsInput = z.infer<typeof settingsSchema>

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').or(z.literal('')),
})
type ProfileInput = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const updateAuthUser = useAuthStore(s => s.updateUser)
  const config = useConfigStore(s => s.config)
  const setConfig = useConfigStore(s => s.setConfig)
  const { data: branch } = useBranch(user?.branch_id ?? null)
  const updateProfile = useUpdateMyProfile()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: config.businessName,
      slogan: config.slogan,
    },
  })

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting, isDirty: profileDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  })

  useEffect(() => {
    if (branch) {
      reset({
        businessName: config.businessName === 'Mi Restaurante' ? (branch.name ?? '') : config.businessName,
        slogan: config.slogan,
      })
    }
  }, [branch, config.businessName, config.slogan, reset])

  useEffect(() => {
    resetProfile({
      name: user?.name ?? '',
      email: user?.email ?? '',
    })
  }, [user?.name, user?.email, resetProfile])

  const updateBranch = useUpdateBranch()

  const onSubmit = async (data: SettingsInput) => {
    try {
      setConfig(data)
      if (user?.branch_id) {
        await updateBranch.mutateAsync({
          id: user.branch_id,
          name: data.businessName.trim(),
        })
      }
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar en el servidor')
    }
  }

  const onProfileSubmit = async (data: ProfileInput) => {
    if (!user) return
    try {
      const response = await updateProfile.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim() || null,
      })
      updateAuthUser(response.user)
      resetProfile({
        name: response.user.name,
        email: response.user.email ?? '',
      })
      toast.success('Datos de cuenta actualizados')
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la cuenta')
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-8 text-muted-foreground">Sin acceso</div>
  }

  return (
    <div className="space-y-5 max-w-xl">
      <PageHeader title="Ajustes" description="Configuración de tu sucursal" />

      {user?.role === 'admin' && user.branch_id && (
        <LogoCard branchId={user.branch_id} />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Información del negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre del negocio</Label>
              <Input {...register('businessName')} placeholder="Mi Restaurante" />
              {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Slogan</Label>
              <Input {...register('slogan')} placeholder="Tu restaurante, en orden" />
            </div>
            <Button type="submit" disabled={isSubmitting} className="bg-[#E85D04] hover:bg-[#C44D00]">
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user?.branch_id && <TaxSettings branchId={user.branch_id} />}

      {user?.branch_id && <WhatsAppOrderTypeSettings branchId={user.branch_id} />}

      <PrinterSettings />

      <PushNotificationSettings />

      <AccessibilitySettingsPanel
        target={{ userId: user?.id, role: user?.role, branchId: user?.branch_id }}
        title="Modo visual del POS"
        description="Ajusta el tamaño de letra, botones, inputs e iconos para tu operación diaria. Puedes volver al modo web desktop o mobile en cualquier momento."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Información de la cuenta</CardTitle>
          <CardDescription>Actualiza los datos visibles de tu sesión de administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nombre</Label>
                <Input id="profile-name" {...registerProfile('name')} placeholder="Nombre del administrador" autoComplete="name" />
                {profileErrors.name && <p className="text-xs text-destructive">{profileErrors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" {...registerProfile('email')} placeholder="admin@restaurante.com" autoComplete="email" />
                {profileErrors.email && <p className="text-xs text-destructive">{profileErrors.email.message}</p>}
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Usuario de acceso</p>
                <p className="font-medium">{user?.username ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rol</p>
                <Badge variant="orange" className="mt-1 capitalize">{user?.role ?? '—'}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sucursal</p>
                <p className="font-medium">{branch?.name ?? (user?.branch_id ? `Sucursal #${user.branch_id}` : '—')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sucursal ID</p>
                <p className="font-medium">{user?.branch_id ?? '—'}</p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!profileDirty || profileSubmitting}
                onClick={() => resetProfile({ name: user?.name ?? '', email: user?.email ?? '' })}
              >
                Restablecer
              </Button>
              <Button
                type="submit"
                disabled={!profileDirty || profileSubmitting}
                className="bg-[#E85D04] hover:bg-[#C44D00]"
              >
                {profileSubmitting ? 'Guardando…' : 'Guardar cuenta'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
