'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Wallet, Star, Phone, History } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useAdjustWallet,
  useCustomerLedger,
} from '@/lib/api/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Customer, CustomerSegment } from '@/lib/types'

const SEGMENT_LABEL: Record<CustomerSegment, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  vip: { label: 'VIP', variant: 'default' },
  nuevo: { label: 'Nuevo', variant: 'secondary' },
  frecuente: { label: 'Frecuente', variant: 'secondary' },
  inactivo: { label: 'Inactivo', variant: 'destructive' },
  regular: { label: 'Regular', variant: 'outline' },
}

const LEDGER_LABEL: Record<string, string> = {
  points_earned: 'Puntos ganados',
  points_adjustment: 'Ajuste de puntos',
  wallet_credit: 'Abono a monedero',
  wallet_debit: 'Cargo a monedero',
}

export default function CustomersPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<CustomerSegment | 'all'>('all')
  const { data: allCustomers = [], isLoading } = useCustomers(branchId, search)
  const customers = segment === 'all' ? allCustomers : allCustomers.filter(c => c.segment === segment)
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const remove = useDeleteCustomer()
  const adjustWallet = useAdjustWallet()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

  const [walletCust, setWalletCust] = useState<Customer | null>(null)
  const [walletAmount, setWalletAmount] = useState('')
  const [walletType, setWalletType] = useState<'add' | 'subtract'>('add')

  const [ledgerCust, setLedgerCust] = useState<Customer | null>(null)

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '' }); setOpen(true) }
  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '' })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...form })
      else await create.mutateAsync({ branch_id: branchId, ...form })
      toast.success('Cliente guardado'); setOpen(false)
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (c: Customer) => {
    try { await remove.mutateAsync(c.id); toast.success('Cliente eliminado') }
    catch { toast.error('Error al eliminar') }
  }

  const handleWallet = async () => {
    if (!walletCust) return
    try {
      await adjustWallet.mutateAsync({ id: walletCust.id, amount: parseFloat(walletAmount) || 0, type: walletType })
      toast.success('Monedero actualizado'); setWalletCust(null); setWalletAmount('')
    } catch { toast.error('Error al actualizar monedero') }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Clientes"
        description="CRM, monedero y puntos de lealtad"
        actions={<Button onClick={openNew} className="bg-[#E85D04] hover:bg-[#C44D00]"><Plus className="h-4 w-4 mr-1" />Nuevo</Button>}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono…" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setSegment('all')}
          className={`px-2.5 h-7 rounded-full text-xs font-medium border ${segment === 'all' ? 'bg-[#E85D04] text-white border-[#E85D04]' : 'text-muted-foreground border-border'}`}>
          Todos ({allCustomers.length})
        </button>
        {(Object.keys(SEGMENT_LABEL) as CustomerSegment[]).map(s => {
          const count = allCustomers.filter(c => c.segment === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-2.5 h-7 rounded-full text-xs font-medium border ${segment === s ? 'bg-[#E85D04] text-white border-[#E85D04]' : 'text-muted-foreground border-border'}`}>
              {SEGMENT_LABEL[s].label} ({count})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : customers.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin clientes</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-1.5">
                    {c.name}
                    <Badge variant={SEGMENT_LABEL[c.segment].variant} className="text-[10px]">{SEGMENT_LABEL[c.segment].label}</Badge>
                  </p>
                  <div className="flex gap-2 flex-wrap text-xs text-muted-foreground items-center">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />{c.points} pts</Badge>
                    <Badge variant="secondary" className="gap-1"><Wallet className="h-3 w-3" />{formatCurrency(c.wallet_balance)}</Badge>
                    <span>{c.visits} visitas · {formatCurrency(c.total_spent)}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setLedgerCust(c)} title="Historial">
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => { setWalletCust(c); setWalletType('add') }} title="Monedero">
                      <Wallet className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  {isAdmin && <Button variant="outline" size="sm" onClick={() => handleDelete(c)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Dirección</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Para domicilios" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || create.isPending || update.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monedero */}
      <Dialog open={!!walletCust} onOpenChange={(o) => !o && setWalletCust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Monedero · {walletCust?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Saldo actual</span>
              <span className="font-semibold">{formatCurrency(walletCust?.wallet_balance ?? 0)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={walletType === 'add' ? 'default' : 'outline'} onClick={() => setWalletType('add')}
                className={walletType === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}>Abonar</Button>
              <Button variant={walletType === 'subtract' ? 'default' : 'outline'} onClick={() => setWalletType('subtract')}
                className={walletType === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}>Retirar</Button>
            </div>
            <div className="space-y-1.5"><Label>Monto</Label>
              <Input type="number" inputMode="decimal" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} placeholder="0.00" autoFocus /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletCust(null)}>Cancelar</Button>
            <Button onClick={handleWallet} disabled={adjustWallet.isPending} className="bg-[#E85D04] hover:bg-[#C44D00]">Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ledgerCust} onOpenChange={(o) => !o && setLedgerCust(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historial · {ledgerCust?.name}</DialogTitle></DialogHeader>
          {ledgerCust && <CustomerLedgerList customerId={ledgerCust.id} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLedgerCust(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CustomerLedgerList({ customerId }: { customerId: number }) {
  const { data: entries = [], isLoading } = useCustomerLedger(customerId)
  if (isLoading) return <Skeleton className="h-24 rounded-xl" />
  if (entries.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados aún.</p>
  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const isCredit = e.kind === 'points_earned' || e.kind === 'wallet_credit'
        const amountLabel = e.kind.startsWith('points') ? `${e.amount} pts` : formatCurrency(e.amount)
        return (
          <div key={i} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
            <div>
              <p className="font-medium">{LEDGER_LABEL[e.kind] ?? e.kind}</p>
              <p className="text-xs text-muted-foreground">{e.reason ?? '—'} · {formatDate(e.created_at)}</p>
            </div>
            <p className={`font-semibold tabular-nums ${isCredit ? 'text-green-600' : 'text-destructive'}`}>
              {isCredit ? '+' : '-'}{amountLabel}
            </p>
          </div>
        )
      })}
    </div>
  )
}
