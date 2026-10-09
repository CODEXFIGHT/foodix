'use client'

import { useState, useEffect } from 'react'
import {
  useSuperadminSubscriptionDetail,
  useSubscriptionCalendar,
  useBranchSubscriptionAction,
  useReviewBankTransfer,
} from '@/lib/api/queries'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { Pause, Play, Ban, Trash2, Plus, Users, MonitorSmartphone, Building2, Zap, Check, MessageCircle, Loader2 } from 'lucide-react'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import {
  PLAN_BADGE, daysRemainingClass, formatDaysRemaining, formatMXN,
  LICENSE_BY_PLAN, formatLimit, CALENDAR_CELL, SUPERADMIN_PLANS,
} from '@/lib/constants/subscription'
import { useUpdateSubscription } from '@/lib/api/queries'
import { APP_DOMAIN } from '@/lib/utils/slugify'
import type { SubscriptionState, SubscriptionCalendarCell } from '@/lib/types'
import { SubscriptionStatusBadge } from '@/components/superadmin/billing/SubscriptionStatusBadge'
import { SubscriptionCalendar } from '@/components/superadmin/billing/SubscriptionCalendar'
import { RegisterPaymentModal } from '@/components/superadmin/billing/RegisterPaymentModal'
import { PaymentHistoryTimeline } from '@/components/superadmin/billing/PaymentHistoryTimeline'

function fmtDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—'
  try { return format(parseISO(value), withTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy', { locale: es }) } catch { return '—' }
}

export function SubscriptionDetailModal({
  branchId,
  open,
  onOpenChange,
}: {
  branchId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading } = useSuperadminSubscriptionDetail(open ? branchId : null)
  const { data: calendar } = useSubscriptionCalendar(open ? branchId : null)
  const action = useBranchSubscriptionAction()
  const review = useReviewBankTransfer()

  const [terminateConfirm, setTerminateConfirm] = useState('')
  const [showTerminate, setShowTerminate] = useState(false)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [changingPlan, setChangingPlan] = useState(false)
  /** Plan que se está activando ahora mismo (para el loader por-tarjeta en tiempo real). */
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null)

  const [payOpen, setPayOpen] = useState(false)
  const [payFrom, setPayFrom] = useState<string | undefined>(undefined)
  const [selectedCell, setSelectedCell] = useState<SubscriptionCalendarCell | null>(null)

  const updateSub = useUpdateSubscription()

  useEffect(() => {
    if (!open) { setShowTerminate(false); setPayOpen(false); setSelectedCell(null); setChangingPlan(false); setActivatingPlan(null) }
  }, [open])

  const handleChangePlan = async (planId: string) => {
    if (!branchId || activatingPlan || changingPlan) return
    setActivatingPlan(planId)
    try {
      // La invalidación de React Query refresca sub.plan → la palomita se mueve
      // sola a la tarjeta activa (tiempo real).
      await updateSub.mutateAsync({ branchId, plan: planId })
      toast.success(`Plan activado: ${planId}`)
    } catch {
      toast.error('No se pudo cambiar el plan')
    } finally {
      setActivatingPlan(null)
    }
  }

  const handleSetInternal = async () => {
    if (!branchId) return
    setChangingPlan(true)
    try {
      await updateSub.mutateAsync({ branchId, expires_at: '2099-12-31T23:59:59Z', status: 'active' })
      toast.success('Cuenta marcada como interna — sin vencimiento')
    } catch {
      toast.error('No se pudo actualizar la cuenta')
    } finally {
      setChangingPlan(false)
    }
  }

  const branch = data?.branch
  const sub = data?.subscription
  const status = (sub?.status ?? null) as SubscriptionState | null
  const license = sub ? (LICENSE_BY_PLAN[sub.plan] ?? LICENSE_BY_PLAN.trial) : null

  const openPayment = (from?: string) => { setPayFrom(from); setPayOpen(true) }

  const onSelectMonth = (period: string, cell: SubscriptionCalendarCell | null) => {
    if (cell && (cell.status === 'paid' || cell.status === 'prepaid')) {
      setSelectedCell(cell)
    } else {
      setSelectedCell(null)
      openPayment(period)   // mes pendiente/sin actividad → registrar pago para ese mes
    }
  }

  const runAction = async (act: 'suspend' | 'reactivate' | 'cancel', label: string) => {
    if (!branchId) return
    try {
      await action.mutateAsync({ branchId, action: act })
      // Sincroniza la carta pública abierta en otra pestaña del mismo
      // navegador para que la reactivación se refleje sin esperar al polling.
      if (branch?.slug && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('restauros_carta_sync', JSON.stringify({
            slug: branch.slug,
            action: act,
            at: Date.now(),
          }))
        } catch { /* almacenamiento no disponible: el sondeo normal continúa */ }
      }
      toast.success(label)
    }
    catch { toast.error('No se pudo completar la acción') }
  }

  const runTerminate = async () => {
    if (!branchId || !branch) return
    try {
      await action.mutateAsync({ branchId, action: 'terminate', confirm_name: terminateConfirm })
      toast.success('Sucursal dada de baja'); setShowTerminate(false); setTerminateConfirm('')
    } catch { toast.error('El nombre no coincide o hubo un error') }
  }

  const approve = async (paymentId: number) => {
    if (!branchId) return
    try { await review.mutateAsync({ paymentId, action: 'approve', branchId }); toast.success('Pago aprobado. Suscripción activada.') }
    catch { toast.error('No se pudo aprobar el pago') }
  }

  const reject = async () => {
    if (!branchId || rejectingId === null) return
    try {
      await review.mutateAsync({ paymentId: rejectingId, action: 'reject', branchId, rejection_reason: rejectReason })
      toast.success('Pago rechazado'); setRejectingId(null); setRejectReason('')
    } catch { toast.error('Indica un motivo de rechazo') }
  }

  const busy = action.isPending || review.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 flex-wrap">
            {branch?.name ?? 'Detalle de suscripción'}
            <SubscriptionStatusBadge status={status} />
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {branch ? `${APP_DOMAIN}/${branch.slug} · #${branch.id}` : 'Información, pagos y acciones administrativas'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 bg-white/5" />)}</div>
        ) : (
          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/5">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="calendario">Calendario</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="acciones">Acciones</TabsTrigger>
            </TabsList>

            {/* ── Resumen ── */}
            <TabsContent value="resumen" className="space-y-4 mt-4">

              {/* ── Plan switcher ── */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Plan activo</p>
                  {sub?.plan && (
                    <Badge className={cn('text-xs capitalize', PLAN_BADGE[sub.plan] ?? 'bg-white/10 text-white')}>
                      {sub.plan}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUPERADMIN_PLANS.map(p => {
                    const isCurrent    = sub?.plan === p.id
                    const isActivating = activatingPlan === p.id
                    const busy         = !!activatingPlan || changingPlan
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={busy || isCurrent}
                        onClick={() => handleChangePlan(p.id)}
                        className={cn(
                          'group relative overflow-visible flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all duration-300 text-sm',
                          isCurrent
                            // Plan activo: orilla resaltada + glow + check.
                            ? 'border-[#D1400F] bg-[#D1400F]/10 ring-2 ring-[#D1400F]/40 shadow-[0_0_0_1px_rgba(209,64,15,0.25),0_8px_24px_-8px_rgba(209,64,15,0.5)] cursor-default'
                            : isActivating
                              ? 'border-[#D1400F]/50 bg-[#D1400F]/[0.06] ring-1 ring-[#D1400F]/30 cursor-wait'
                              : 'border-white/10 hover:border-[#D1400F]/40 hover:bg-white/[0.04] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {/* Palomita del plan activo (entra con animación) */}
                        {isCurrent && !isActivating && (
                          <span className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-[#D1400F] ring-2 ring-[#0a0a0a] grid place-items-center animate-fade-in-up shadow-lg shadow-[#D1400F]/20">
                            <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                          </span>
                        )}

                        {/* Loader en tiempo real sobre la tarjeta que se está activando */}
                        {isActivating && (
                          <span className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-[#0d0d0f]/70 backdrop-blur-[1px]">
                            <span className="flex items-center gap-2 text-xs font-semibold text-[#D1400F]">
                              <Loader2 className="h-4 w-4 animate-spin" /> Activando…
                            </span>
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{p.label}</span>
                          {p.whatsapp && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase tracking-wide">
                              <MessageCircle className="h-2.5 w-2.5" /> WA Beta
                            </span>
                          )}
                          {isCurrent && !isActivating && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#D1400F]/20 text-[#D1400F] border border-[#D1400F]/30 uppercase tracking-wide">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#D1400F] animate-pulse" /> Activo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-snug">{p.desc}</p>
                        <p className="text-xs font-semibold text-[#D1400F]">${p.price} MXN/mes</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Plan', value: sub ? <Badge className={cn('text-xs capitalize', PLAN_BADGE[sub.plan] ?? 'bg-white/10 text-white')}>{sub.plan}</Badge> : '—' },
                  { label: 'Precio mensual', value: sub ? formatMXN(sub.price_monthly ?? 0, sub.currency ?? 'MXN') : '—' },
                  { label: 'Método', value: sub?.payment_method ?? '—' },
                  { label: 'Alta', value: fmtDate(sub?.starts_at) },
                  { label: 'Próximo vencimiento', value: fmtDate(sub?.expires_at) },
                  { label: 'Días restantes', value: <span className={daysRemainingClass(data.days_remaining)}>{formatDaysRemaining(data.days_remaining)}</span> },
                ].map(item => (
                  <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                    <p className="text-neutral-400 text-xs mb-1">{item.label}</p>
                    <p className="text-white text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Licencia (derivada del plan) */}
              {license && (
                <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                  <p className="text-neutral-400 text-xs mb-2">Licencia ({sub?.plan})</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div><div className="flex items-center justify-center gap-1 text-neutral-500 text-[10px] uppercase"><Users className="h-3 w-3" />Usuarios</div><p className="font-semibold mt-0.5">{formatLimit(license.max_users)}</p></div>
                    <div><div className="flex items-center justify-center gap-1 text-neutral-500 text-[10px] uppercase"><MonitorSmartphone className="h-3 w-3" />POS</div><p className="font-semibold mt-0.5">{formatLimit(license.max_pos)}</p></div>
                    <div><div className="flex items-center justify-center gap-1 text-neutral-500 text-[10px] uppercase"><Building2 className="h-3 w-3" />Sucursales</div><p className="font-semibold mt-0.5">{formatLimit(license.max_branches)}</p></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {license.features.map(f => <span key={f} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-300">{f}</span>)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 space-y-1">
                  <p className="text-neutral-400 text-xs">Propietario</p>
                  <p className="text-white">{data.admin?.name ?? 'Sin admin asignado'}</p>
                  {data.admin?.email && <p className="text-neutral-400 text-xs">{data.admin.email}</p>}
                  {branch?.phone && <p className="text-neutral-400 text-xs">Tel: {branch.phone}</p>}
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 space-y-1">
                  <p className="text-neutral-400 text-xs">Stripe</p>
                  <p className="text-neutral-300 text-xs break-all">Customer: {sub?.stripe_customer_id ?? '—'}</p>
                  <p className="text-neutral-300 text-xs break-all">Subscription: {sub?.stripe_subscription_id ?? '—'}</p>
                </div>
              </div>
            </TabsContent>

            {/* ── Calendario ── */}
            <TabsContent value="calendario" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Calendario de pagos</h3>
                <Button size="sm" onClick={() => openPayment()} className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-4 w-4" /> Registrar pago
                </Button>
              </div>
              <SubscriptionCalendar cells={calendar?.cells ?? []} onSelectMonth={onSelectMonth} />
              {selectedCell && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-xs">{selectedCell.period} · {CALENDAR_CELL[selectedCell.status].label}</span>
                    {selectedCell.payment_id && <span className="text-neutral-500 text-xs">Pago #{selectedCell.payment_id}</span>}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-white font-semibold">{selectedCell.amount !== null ? formatMXN(selectedCell.amount) : '—'}</span>
                    <span className="text-neutral-400 text-xs">{fmtDate(selectedCell.paid_at, true)}</span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-neutral-600">Toca un mes pendiente para registrar su pago, o uno pagado para ver el detalle.</p>
            </TabsContent>

            {/* ── Historial ── */}
            <TabsContent value="historial" className="space-y-5 mt-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Historial de pagos</h3>
                  <Button size="sm" onClick={() => openPayment()} className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4" /> Registrar pago
                  </Button>
                </div>
                <PaymentHistoryTimeline
                  payments={data.payments}
                  renderActions={(p) => p.status === 'bank_transfer_review' ? (
                    rejectingId === p.id ? (
                      <div className="flex flex-col gap-2">
                        <Input placeholder="Motivo del rechazo" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-8 text-xs" />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={busy} onClick={reject} className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white">Confirmar rechazo</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-neutral-400" onClick={() => { setRejectingId(null); setRejectReason('') }}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => approve(p.id)} className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Aprobar</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setRejectingId(p.id)}>Rechazar</Button>
                      </div>
                    )
                  ) : null}
                />
              </div>

              {data.audit_log.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Bitácora de cambios</h3>
                  <div className="space-y-1.5">
                    {data.audit_log.map(a => (
                      <div key={a.id} className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                        <span className="text-neutral-500">{fmtDate(a.created_at, true)}</span>
                        <span className="text-neutral-200 font-medium">{a.action}</span>
                        {(a.previous_status || a.new_status) && <span>{a.previous_status} → {a.new_status}</span>}
                        {a.performed_by_name && <span className="text-neutral-500">por {a.performed_by_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Acciones ── */}
            <TabsContent value="acciones" className="space-y-3 mt-4">

              {/* Cuenta interna */}
              <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#25D366]" />
                  <p className="text-sm font-semibold text-white">Cuenta interna / prueba</p>
                </div>
                <p className="text-xs text-neutral-400">Marca esta cuenta como interna (tuya). Se activa el plan Pro y se elimina el vencimiento — nunca expira.</p>
                <Button
                  size="sm"
                  disabled={changingPlan}
                  onClick={async () => {
                    await handleChangePlan('pro')
                    await handleSetInternal()
                  }}
                  className="h-8 gap-1.5 bg-[#25D366] hover:bg-[#1eb85a] text-white font-semibold w-full justify-center"
                >
                  <Zap className="h-3.5 w-3.5" /> Activar Pro sin vencimiento
                </Button>
              </div>

              {!showTerminate ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {status !== 'suspended' && status !== 'terminated' && (
                      <Button size="sm" disabled={busy} onClick={() => runAction('suspend', 'Sucursal suspendida')} className="justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                        <Pause className="h-4 w-4" /> Suspender
                      </Button>
                    )}
                    {status !== 'active' && status !== 'terminated' && (
                      <Button size="sm" disabled={busy} onClick={() => runAction('reactivate', 'Sucursal reactivada')} className="justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        <Play className="h-4 w-4" /> Reactivar
                      </Button>
                    )}
                    {status !== 'canceled' && status !== 'terminated' && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction('cancel', 'Suscripción cancelada')} className="justify-center gap-1.5 border-white/25 bg-white/5 text-white hover:bg-white/10">
                        <Ban className="h-4 w-4" /> Cancelar plan
                      </Button>
                    )}
                  </div>
                  {status !== 'terminated' && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowTerminate(true)} className="w-full justify-center gap-1.5 border-red-500/40 bg-red-500/5 text-red-300 hover:bg-red-500/15 hover:text-red-200">
                      <Trash2 className="h-4 w-4" /> Dar de baja definitivamente
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-red-300">
                    Esta acción dará de baja definitivamente la sucursal y bloqueará su acceso a FoodIX.
                    El historial financiero y las ventas se conservan.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-neutral-300 text-xs">Escribe <span className="font-semibold text-white">{branch?.name}</span> para confirmar</Label>
                    <Input value={terminateConfirm} onChange={e => setTerminateConfirm(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder={branch?.name} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy || terminateConfirm !== branch?.name} onClick={runTerminate} className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">Dar de baja</Button>
                    <Button size="sm" variant="ghost" className="text-neutral-400" onClick={() => { setShowTerminate(false); setTerminateConfirm('') }}>Cancelar</Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Modal de pago manual / adelantado */}
        <RegisterPaymentModal
          open={payOpen}
          onOpenChange={setPayOpen}
          branchId={branchId}
          priceMonthly={sub?.price_monthly ?? 0}
          currency={sub?.currency ?? 'MXN'}
          defaultCoveredFrom={payFrom}
        />
      </DialogContent>
    </Dialog>
  )
}
