'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { branchSchema, type BranchInput } from '@/lib/validators/schemas'
import { useCreateBranch } from '@/lib/api/queries'
import { slugify, APP_DOMAIN } from '@/lib/utils/slugify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBranchPage() {
  const router = useRouter()
  const createBranch = useCreateBranch()
  const [slugEdited, setSlugEdited] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
  })

  const slug = watch('slug') || ''

  // El nombre genera el slug en vivo mientras no se edite manualmente.
  const onNameChange = (value: string) => {
    if (!slugEdited) setValue('slug', slugify(value), { shouldValidate: true })
  }

  const onSubmit = async (data: BranchInput) => {
    try {
      await createBranch.mutateAsync(data)
      toast.success('Cliente registrado. La cuenta admin ya puede iniciar sesión.')
      router.push('/superadmin/subscriptions')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar el cliente')
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
          <Link href="/superadmin/subscriptions"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Registrar cliente</h1>
          <p className="text-neutral-400 text-sm">Crea la sucursal, su suscripción y la cuenta de administrador</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos del restaurante */}
        <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm">Datos del restaurante</h2>

          <div className="space-y-1.5">
            <Label className="text-neutral-300">Nombre del restaurante *</Label>
            <Input
              {...register('name', { onChange: e => onNameChange(e.target.value) })}
              placeholder="El Rincón Norteño"
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-neutral-300">Slug (URL) *</Label>
            <Input
              {...register('slug', { onChange: () => setSlugEdited(true) })}
              placeholder="rincon-norteno"
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 font-mono"
            />
            <p className="text-neutral-500 text-xs">
              URL pública: <span className="text-white">https://{APP_DOMAIN}/{slug || 'nombre-restaurante'}</span>
            </p>
            {errors.slug && <p className="text-red-400 text-xs">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-neutral-300">Dirección</Label>
            <Textarea
              {...register('address')}
              placeholder="Av. Principal 123, Col. Centro"
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-neutral-300">Teléfono</Label>
            <Input
              {...register('phone')}
              placeholder="+52 (123) 456-7890"
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Cuenta de administrador */}
        <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-6 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-sm">Cuenta de administrador</h2>
            <p className="text-neutral-500 text-xs mt-0.5">Credenciales con las que el cliente iniciará sesión y podrá crear sus usuarios</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-neutral-300">Nombre del admin *</Label>
              <Input
                {...register('admin_name')}
                placeholder="Juan Pérez"
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
              />
              {errors.admin_name && <p className="text-red-400 text-xs">{errors.admin_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-300">Usuario *</Label>
              <Input
                {...register('admin_username')}
                placeholder="rincon.admin"
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 font-mono"
              />
              {errors.admin_username && <p className="text-red-400 text-xs">{errors.admin_username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-300">Email *</Label>
              <Input
                type="email"
                {...register('admin_email')}
                placeholder="admin@rincon.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
              />
              {errors.admin_email && <p className="text-red-400 text-xs">{errors.admin_email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-300">Contraseña *</Label>
              <Input
                type="text"
                {...register('admin_password')}
                placeholder="Mínimo 6 caracteres"
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
              />
              {errors.admin_password && <p className="text-red-400 text-xs">{errors.admin_password.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-white hover:bg-neutral-200 text-black font-medium"
          >
            {isSubmitting ? 'Registrando…' : 'Registrar cliente'}
          </Button>
          <Button asChild variant="ghost" className="text-neutral-400">
            <Link href="/superadmin/subscriptions">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
