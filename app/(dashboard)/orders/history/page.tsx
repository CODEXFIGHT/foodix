'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Printer, Eye, QrCode, Search, Loader2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useOrderHistory } from '@/lib/api/queries'
import { apiRequest, ApiError } from '@/lib/api/client'
import { usePrinter } from '@/hooks/usePrinter'
import { orderItemsToReceiptLines } from '@/lib/printing/orderLines'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { Order } from '@/lib/types'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Abierto',    cls: 'bg-amber-100 text-amber-700' },
  preparing: { label: 'Preparando', cls: 'bg-orange-100 text-orange-700' },
  ready:     { label: 'Listo',      cls: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Entregado',  cls: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Cobrado',    cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado',  cls: 'bg-red-100 text-red-700' },
}

const TYPE_LABEL: Record<string, string> = {
  dine_in: 'Mesa', takeaway: 'Para llevar', delivery: 'Domicilio',
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export default function TicketHistoryPage() {
  const branchId = useAuthStore(s => s.user?.branch_id ?? null)
  const printer = usePrinter()

  const [status, setStatus] = useState('')
  const [orderType, setOrderType] = useState('')
  const [from, setFrom] = useState(daysAgoStr(7))
  const [to, setTo] = useState(todayStr())
  const [q, setQ] = useState('')
  const [qrText, setQrText] = useState('')
  const [qrError, setQrError] = useState('')

  // Búsqueda por QR/folio: mientras se resuelve se muestra un modal de carga;
  // si el ticket ya está en la lista filtrada, basta con acotar la tabla; si
  // no, se consulta directo por id y se muestra aparte; si tampoco existe,
  // se avisa con un modal de error (en vez de navegar a ciegas a /orders/{id}).
  const [searching, setSearching] = useState(false)
  const [queriedOrder, setQueriedOrder] = useState<Order | null>(null)
  const [notFoundOpen, setNotFoundOpen] = useState(false)
  const [notFoundText, setNotFoundText] = useState('')

  const { data: orders = [], isLoading } = useOrderHistory(branchId, {
    status: status || undefined,
    order_type: orderType || undefined,
    from, to,
  })

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return orders
    return orders.filter(o =>
      String(o.id).includes(term) ||
      o.table_name?.toLowerCase().includes(term) ||
      o.waiter_name?.toLowerCase().includes(term),
    )
  }, [orders, q])

  const reprint = (o: Order) => {
    printer.printOrder({
      orderId: o.id,
      tableName: o.table_name,
      orderType: o.order_type,
      createdAt: formatDate(o.created_at),
      lines: orderItemsToReceiptLines(o.items),
      subtotal: o.subtotal,
      tax: o.tax,
      taxRate: o.subtotal - o.tax > 0 ? Math.round((o.tax / (o.subtotal - o.tax)) * 100) : 0,
      total: o.total,
      paid: o.payment_status === 'paid',
    })
  }

  /** Extrae un id de pedido de: JSON del ticket, URL completa, o folio/id directo. */
  const parseOrderId = (raw: string): number | null => {
    const t = raw.trim()
    if (!t) return null

    try {
      const obj = JSON.parse(t) as unknown
      if (obj && typeof obj === 'object') {
        const record = obj as Record<string, unknown>
        const rawId = record.order_id ?? record.ticket ?? record.id
        if (rawId !== undefined && rawId !== null) {
          const n = Number(rawId)
          if (!isNaN(n) && n > 0) return n
        }
      }
    } catch {
      // No es JSON — seguir con URL/folio plano.
    }

    if (t.startsWith('http://') || t.startsWith('https://')) {
      try {
        const url = new URL(t)
        const parts = url.pathname.split('/')
        const n = Number(parts[parts.length - 1])
        if (!isNaN(n) && n > 0) return n
      } catch {
        // URL inválida — seguir con folio plano.
      }
    }

    const n = Number(t.replace(/^#/, ''))
    return !isNaN(n) && n > 0 ? n : null
  }

  // Consulta por QR/folio. Valida, muestra un modal de carga mientras resuelve,
  // y según el resultado: acota la tabla (si ya estaba en el rango filtrado),
  // muestra el ticket consultado aparte (si existe pero está fuera del rango),
  // o abre un modal de error (folio inválido o pedido inexistente).
  const lookupQr = async () => {
    setQueriedOrder(null)
    const t = qrText.trim()
    if (!t) {
      setQrError('Ingresa el contenido del QR o un folio para buscar.')
      return
    }
    setQrError('')

    const orderId = parseOrderId(t)
    if (!orderId) {
      setNotFoundText('No se reconoció ese QR o folio. Verifica que sea un folio numérico o el QR de un ticket de FoodIX.')
      setNotFoundOpen(true)
      return
    }

    // Ya está en la tabla filtrada actual — solo hace falta acotarla.
    if (orders.some(o => o.id === orderId)) {
      setQ(String(orderId))
      return
    }

    setSearching(true)
    try {
      const found = await apiRequest<Order>(`/orders/${orderId}`)
      setQueriedOrder(found)
      setQ('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFoundText(`No existe ningún ticket con el folio #${orderId}.`)
      } else {
        setNotFoundText('No se pudo consultar el folio. Intenta de nuevo.')
      }
      setNotFoundOpen(true)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader title="Historial de tickets" description="Consulta, reimprime y audita tickets cobrados, abiertos y cancelados" />

      {/* Consulta por QR */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1 w-full">
            <Label className="flex items-center gap-1"><QrCode className="h-4 w-4" /> Consultar por QR o folio</Label>
            <Input
              value={qrText}
              onChange={e => { setQrText(e.target.value); if (qrError) setQrError('') }}
              onKeyDown={e => e.key === 'Enter' && lookupQr()}
              placeholder='Pega el contenido del QR o el folio (ej. 123)'
              aria-invalid={!!qrError}
              className={cn(qrError && 'border-destructive focus-visible:ring-destructive')}
            />
            {qrError && <p className="text-xs text-destructive mt-1">{qrError}</p>}
          </div>
          <Button onClick={lookupQr} disabled={searching} className="bg-[#D1400F] hover:bg-[#B03508]">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consultar'}
          </Button>
        </CardContent>
      </Card>

      {/* Ticket consultado por QR/folio que no está en el rango de fechas filtrado actual. */}
      {queriedOrder && (
        <Card className="border-[#D1400F]/40">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-[#D1400F] mb-2">Ticket consultado (fuera del rango de fechas actual)</p>
            {(() => {
              const o = queriedOrder
              const meta = STATUS_META[o.status] ?? STATUS_META.pending
              return (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">#{String(o.id).padStart(6, '0')}</span>
                      <Badge className={cn('text-xs', meta.cls)}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">{TYPE_LABEL[o.order_type] ?? 'Mesa'}</span>
                      {o.order_type === 'dine_in' && <span className="text-xs text-muted-foreground">· {o.table_name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(o.created_at)}{o.waiter_name ? ` · 👤 ${o.waiter_name}` : ''}
                    </p>
                  </div>
                  <span className="font-bold">{formatCurrency(o.total)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => reprint(o)} title="Reimprimir">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Link href={`/orders/${o.id}`}>
                      <Button variant="outline" size="sm" title="Ver detalle">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <Label>Estado</Label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="pending">Abiertos</option>
              <option value="completed">Cobrados</option>
              <option value="cancelled">Cancelados</option>
              <option value="ready">Listos</option>
            </select>
          </div>
          <div>
            <Label>Tipo</Label>
            <select value={orderType} onChange={e => setOrderType(e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="dine_in">Mesa</option>
              <option value="takeaway">Para llevar</option>
              <option value="delivery">Domicilio</option>
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Search className="h-3.5 w-3.5" /> Buscar</Label>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Folio, mesa o mesero" />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No hay tickets con esos filtros.</p>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.map(o => {
              const meta = STATUS_META[o.status] ?? STATUS_META.pending
              return (
                <div key={o.id} className="p-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">#{String(o.id).padStart(6, '0')}</span>
                      <Badge className={cn('text-xs', meta.cls)}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">{TYPE_LABEL[o.order_type] ?? 'Mesa'}</span>
                      {o.order_type === 'dine_in' && <span className="text-xs text-muted-foreground">· {o.table_name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(o.created_at)}{o.waiter_name ? ` · 👤 ${o.waiter_name}` : ''}
                    </p>
                  </div>
                  <span className="font-bold">{formatCurrency(o.total)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => reprint(o)} title="Reimprimir">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Link href={`/orders/${o.id}`}>
                      <Button variant="outline" size="sm" title="Ver detalle">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Modal de carga mientras se resuelve la búsqueda por QR/folio. */}
      <Dialog open={searching} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[320px] [&>button]:hidden" onInteractOutside={e => e.preventDefault()}>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#D1400F]" />
            <p className="text-sm text-muted-foreground">Buscando el folio…</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de error: folio inválido o inexistente. */}
      <Dialog open={notFoundOpen} onOpenChange={setNotFoundOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Folio no encontrado
            </DialogTitle>
            <DialogDescription>{notFoundText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNotFoundOpen(false)} className="bg-[#D1400F] hover:bg-[#B03508]">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
