'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useModifiers,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
} from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ModifierGroupForm } from '@/components/modifiers/ModifierGroupForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/formatters'
import type { ModifierGroup } from '@/lib/types'

export default function ModifiersPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  const { data: groups = [], isLoading } = useModifiers(branchId)
  const createGroup = useCreateModifierGroup()
  const updateGroup = useUpdateModifierGroup()
  const deleteGroup = useDeleteModifierGroup()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ModifierGroup | null>(null)
  const [toDelete, setToDelete] = useState<ModifierGroup | null>(null)

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-8 text-muted-foreground">Sin acceso</div>
  }

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (g: ModifierGroup) => { setEditing(g); setFormOpen(true) }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing.id, ...data })
        toast.success('Grupo actualizado')
      } else {
        await createGroup.mutateAsync({ branch_id: branchId, ...data })
        toast.success('Grupo creado')
      }
      setFormOpen(false)
    } catch {
      toast.error('Error al guardar el grupo')
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteGroup.mutateAsync(toDelete.id)
      toast.success('Grupo eliminado')
      setToDelete(null)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Modificadores"
        description="Opciones y extras de tus productos (términos, ingredientes, tamaños…)"
        actions={
          <Button onClick={openNew} className="bg-[#D1400F] hover:bg-[#B03508]">
            <Plus className="h-4 w-4 mr-1" /> Nuevo grupo
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aún no hay grupos de modificadores.</p>
            <p className="text-xs">Crea uno para ofrecer extras, términos o variantes al vender.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {groups.map(g => (
            <Card key={g.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {g.required ? 'Obligatorio · ' : ''}
                      {g.max_select <= 1 ? 'Opción única' : `Hasta ${g.max_select}`}
                      {' · '}{g.product_ids.length} producto(s)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setToDelete(g)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map((o, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      {o.name}{o.price_delta !== 0 && ` ${o.price_delta > 0 ? '+' : ''}${formatCurrency(o.price_delta)}`}
                    </Badge>
                  ))}
                  {g.options.length === 0 && <span className="text-xs text-muted-foreground">Sin opciones</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModifierGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId}
        group={editing}
        onSave={handleSave}
        saving={createGroup.isPending || updateGroup.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar grupo"
        description={`¿Eliminar "${toDelete?.name}"? Se quitará de todos los productos asignados.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        variant="destructive"
        loading={deleteGroup.isPending}
      />
    </div>
  )
}
