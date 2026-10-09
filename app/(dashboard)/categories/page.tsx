'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { useCategories, useDeleteCategory } from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import type { Category } from '@/lib/types'
import Link from 'next/link'

export default function CategoriesPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const { data: categories = [], isLoading } = useCategories(branchId)
  const deleteCategory = useDeleteCategory()

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      toast.success('Categoría eliminada')
      setDeleteTarget(null)
    } catch {
      toast.error('Error al eliminar categoría')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Categorías"
        description={`${categories.length} categorías`}
        actions={
          <Button asChild className="bg-[#FACC15] hover:bg-[#EAB308]">
            <Link href="/menu">
              <Plus className="h-4 w-4 mr-1.5" />
              Gestionar en Carta
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="Sin categorías"
          description="Crea categorías en la página de Carta / Menú"
          action={{ label: 'Ir a Carta / Menú', onClick: () => window.location.href = '/menu' }}
        />
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow"
              style={{ borderLeftWidth: '4px', borderLeftColor: cat.color }}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.active ? 'Activa' : 'Inactiva'}</p>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: cat.color }} />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Eliminar categoría"
        description={deleteTarget ? `¿Eliminar "${deleteTarget.name}"?` : ''}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}
