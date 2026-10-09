'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { categorySchema, type CategoryInput } from '@/lib/validators/schemas'
import type { Category } from '@/lib/types'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCreateCategory, useUpdateCategory } from '@/lib/api/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { X, Check } from 'lucide-react'

interface CategoryFormProps {
  category?: Category
  onDone: () => void
}

export function CategoryForm({ category, onDone }: CategoryFormProps) {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? 0
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? '#D1400F',
      menu_group: category?.menu_group ?? 'alimento',
    },
    mode: 'onChange',
  })

  const menuGroup = watch('menu_group') ?? 'alimento'

  const onSubmit = async (data: CategoryInput) => {
    setLoading(true)
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, ...data })
        toast.success('Categoría actualizada')
      } else {
        await createCategory.mutateAsync({ ...data, branch_id: branchId })
        toast.success('Categoría creada')
      }
      onDone()
    } catch {
      toast.error('Error al guardar categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cat-name">Nombre *</Label>
              <Input id="cat-name" {...register('name')} placeholder="Nombre" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-color">Color *</Label>
              <Input id="cat-color" type="color" {...register('color')} className="h-10 p-1 cursor-pointer" />
              {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
            </div>
          </div>

          {/* Grupo en la carta: Alimento / Bebida */}
          <div className="space-y-1">
            <Label>Grupo en la carta</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'alimento', label: '🍽️ Alimento' },
                { value: 'bebida',   label: '🥤 Bebida' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('menu_group', opt.value, { shouldDirty: true })}
                  className={
                    'h-10 rounded-md border text-sm font-medium transition-colors ' +
                    (menuGroup === opt.value
                      ? 'border-[#D1400F] bg-[#D1400F]/10 text-[#D1400F]'
                      : 'border-input bg-background text-muted-foreground hover:bg-accent')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Define en qué pestaña aparece en la carta pública.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid || loading}
              className="bg-[#D1400F] hover:bg-[#B03508]"
            >
              <Check className="h-4 w-4 mr-1" />
              {category ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
