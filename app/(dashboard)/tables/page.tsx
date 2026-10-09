'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useTables, useUpdateTableStatus, useCreateTable, useDeleteTable,
} from '@/lib/api/queries'
import type { Table, TableStatus } from '@/lib/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableCard } from '@/components/tables/TableCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function TablesPage() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const { data: tables = [], isLoading } = useTables(branchId)
  const updateTableStatus = useUpdateTableStatus()
  const createTable = useCreateTable()
  const deleteTable = useDeleteTable()

  const [changeTarget, setChangeTarget] = useState<{ table: Table; newStatus: TableStatus } | null>(null)
  const [changing, setChanging] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSeats, setNewSeats] = useState('4')

  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null)

  const isAdmin = user?.role === 'admin'

  const handleTableClick = (table: Table) => {
    if (user?.role === 'mesero') {
      router.push(`/mesero/mesa/${table.id}`)
      return
    }
    if (table.current_order_id) {
      router.push(`/orders/${table.current_order_id}`)
    } else {
      router.push(`/orders/new?table=${table.id}`)
    }
  }

  const handleStatusChange = async () => {
    if (!changeTarget) return
    setChanging(true)
    try {
      await updateTableStatus.mutateAsync({ id: changeTarget.table.id, status: changeTarget.newStatus })
      toast.success(`${changeTarget.table.name} actualizada a ${changeTarget.newStatus}`)
    } catch {
      toast.error('Error al actualizar mesa')
    } finally {
      setChanging(false)
      setChangeTarget(null)
    }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) { toast.error('Escribe un nombre para la mesa'); return }
    const seats = Math.max(1, parseInt(newSeats, 10) || 4)
    try {
      await createTable.mutateAsync({ name, seats })
      toast.success(`Mesa "${name}" agregada`)
      setNewName('')
      setNewSeats('4')
      setShowAdd(false)
    } catch {
      toast.error('Error al agregar la mesa')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTable.mutateAsync(deleteTarget.id)
      toast.success(`Mesa "${deleteTarget.name}" eliminada`)
    } catch {
      toast.error('Error al eliminar la mesa')
    } finally {
      setDeleteTarget(null)
    }
  }

  const normalizedTables = useMemo(() => {
    return tables.map(t => {
      if (t.current_order_id) {
        return { ...t, status: 'ocupada' as TableStatus }
      }
      return t
    })
  }, [tables])

  const libre    = normalizedTables.filter(t => t.status === 'libre').length
  const ocupada  = normalizedTables.filter(t => t.status === 'ocupada').length
  const reservada = normalizedTables.filter(t => t.status === 'reservada').length

  // Orden natural por número de mesa (1, 2, … 10, 11); los nombres sin número
  // (p. ej. "Para llevar") se muestran al final.
  const sortedTables = useMemo(() => {
    const num = (t: Table) => {
      const m = t.name.match(/\d+/)
      return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY
    }
    return [...normalizedTables].sort((a, b) => {
      const d = num(a) - num(b)
      return d !== 0 ? d : a.name.localeCompare(b.name, 'es', { numeric: true })
    })
  }, [normalizedTables])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mesas"
        description={`${tables.length} mesas · ${ocupada} ocupadas`}
        actions={isAdmin ? (
          <Button onClick={() => setShowAdd(true)} className="gap-1.5 hidden sm:inline-flex">
            <Plus className="h-4 w-4" />
            Agregar mesa
          </Button>
        ) : undefined}
      />

      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Libres', count: libre, color: 'bg-green-100 text-green-700' },
          { label: 'Ocupadas', count: ocupada, color: 'bg-red-100 text-red-700' },
          { label: 'Reservadas', count: reservada, color: 'bg-yellow-100 text-yellow-700 dark:text-yellow-400' },
        ].map(s => (
          <Badge key={s.label} className={s.color}>
            {s.count} {s.label}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedTables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => handleTableClick(table)}
              onStatusChange={isAdmin ? (newStatus) => setChangeTarget({ table, newStatus }) : undefined}
              onDelete={isAdmin ? () => setDeleteTarget(table) : undefined}
            />
          ))}
        </div>
      )}

      {/* Agregar mesa (solo admin) */}
      <Dialog open={showAdd} onOpenChange={o => { if (!o) setShowAdd(false) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agregar mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="table-name">Nombre / número</Label>
              <Input
                id="table-name"
                placeholder="Ej. Mesa 5, Terraza 2…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="table-seats">Capacidad (personas)</Label>
              <Input
                id="table-seats"
                type="number"
                min={1}
                value={newSeats}
                onChange={e => setNewSeats(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={createTable.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createTable.isPending}>
              {createTable.isPending ? 'Agregando…' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar mesa (solo admin) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Eliminar mesa"
        description={deleteTarget
          ? `¿Eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
          : ''}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteTable.isPending}
      />

      <ConfirmDialog
        open={!!changeTarget}
        onOpenChange={o => { if (!o) setChangeTarget(null) }}
        title="Cambiar estado de mesa"
        description={changeTarget
          ? `¿Cambiar ${changeTarget.table.name} a "${changeTarget.newStatus}"?`
          : ''}
        confirmLabel="Confirmar"
        onConfirm={handleStatusChange}
        loading={changing}
      />

      {/* FAB para agregar mesa en móvil. Se renderiza en document.body para que
          `fixed` se ancle al viewport y no al contenedor animado (transform) de
          la transición de página; así queda siempre visible al hacer scroll. */}
      {isAdmin && (
        <BodyPortal>
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Agregar mesa"
            className="sm:hidden fixed right-4 bottom-20 z-50 h-14 w-14 rounded-full bg-[#FACC15] text-stone-950 shadow-lg flex items-center justify-center hover:bg-[#EAB308] active:scale-95 transition-all"
            style={{ bottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </BodyPortal>
      )}
    </div>
  )
}

/** Renderiza children en document.body (escapa de ancestros con `transform`). */
function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
