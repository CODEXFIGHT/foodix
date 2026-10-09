'use client'

/**
 * FoodIX — Panel lateral de WhatsApp (FoodIX AI).
 * Slide-over derecho con el estado de conexión de WhatsApp por sucursal.
 * Solo planes AI / MultiSucursal: si no, muestra un upsell premium.
 *
 * Proveedor recomendado para FoodIX AI: Meta Cloud API directa. Twilio se
 * conserva como fallback técnico para sandbox o clientes que ya lo usan.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useState } from 'react'
import QRCode from 'react-qr-code'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import {
  X, Loader2, LogOut, AlertCircle, Lock, Crown, RefreshCw, Copy, Check, MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/authStore'
import { hasWhatsApp } from '@/lib/constants/subscription'
import {
  useWhatsAppStatus, useConnectWhatsApp, useLogoutWhatsApp,
} from '@/lib/api/queries/useWhatsApp'

const SANDBOX_NUMBER  = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER  ?? '+14155238886'
const SANDBOX_KEYWORD = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_KEYWORD ?? ''
// El codeword del sandbox de Twilio NO lo elegimos nosotros: Twilio lo asigna
// por cuenta y se consulta en su consola (Messaging → Try it out → Send a
// WhatsApp message). Si la env var no está configurada (o quedó con el valor
// de ejemplo del repo), el mensaje "join <vacío>" o "join join-tu-palabra"
// que mandaría el cliente NUNCA es un codeword real → Twilio siempre
// responde "Failed to join sandbox". Detectamos ese caso para avisar en el
// panel antes de que el cliente lo intente y falle.
const SANDBOX_KEYWORD_MISCONFIGURED =
  !SANDBOX_KEYWORD || SANDBOX_KEYWORD === 'join-tu-palabra' || SANDBOX_KEYWORD === 'join'
const waLink = SANDBOX_KEYWORD_MISCONFIGURED
  ? ''
  : `https://wa.me/${SANDBOX_NUMBER.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`join ${SANDBOX_KEYWORD}`)}`

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export function WhatsAppPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useAuthStore(s => s.subscription?.plan)
  const isPro = hasWhatsApp(plan)

  const { data: status, isLoading, refetch, isRefetching } = useWhatsAppStatus(null, open && isPro)
  const connect = useConnectWhatsApp()
  const logout  = useLogoutWhatsApp()
  const [copied, setCopied] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const connState = status?.status ?? 'desconectado'
  // Proveedor real que reporta el backend (wa_connections.provider, default
  // 'twilio') — no una env var del cliente que hay que recordar configurar.
  const provider = (status?.provider ?? 'twilio') as 'meta' | 'wati' | 'twilio'

  const handleConnect = async () => {
    try {
      await connect.mutateAsync({ status: 'conectado' })
      toast.success('WhatsApp conectado')
    } catch {
      toast.error('No se pudo conectar. Intenta de nuevo.')
    }
  }

  const confirmLogoutWhatsApp = async () => {
    try {
      await logout.mutateAsync()
      toast.success('Sesión de WhatsApp cerrada')
      setConfirmLogout(false)
    } catch {
      toast.error('No se pudo cerrar la sesión.')
    }
  }

  const copyNumber = () => {
    navigator.clipboard.writeText(SANDBOX_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="WhatsApp FoodIX Pro"
        className={cn(
          'fixed top-0 right-0 z-[61] h-full w-full sm:w-[420px] max-w-full',
          'bg-[#0d0d0f] border-l border-white/10 shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-[#25D366]/15 grid place-items-center">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                WhatsApp FoodIX AI
                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                  Beta
                </span>
              </p>
              <p className="text-[11px] text-neutral-500">Pedidos automáticos por WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg grid place-items-center text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
          {!isPro ? (
            <UpsellView />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : connState === 'conectado' ? (
            <ConnectedView
              number={status?.phone_number ?? status?.from_number ?? SANDBOX_NUMBER}
              lastSync={fmtDate(status?.last_sync_at ?? null)}
              onLogout={() => setConfirmLogout(true)}
              loggingOut={logout.isPending}
            />
          ) : (
            <ConnectView
              state={connState}
              provider={provider}
              link={waLink}
              number={SANDBOX_NUMBER}
              keyword={SANDBOX_KEYWORD}
              keywordMisconfigured={SANDBOX_KEYWORD_MISCONFIGURED}
              copied={copied}
              onCopy={copyNumber}
              onConnect={handleConnect}
              connecting={connect.isPending}
              onRefresh={() => refetch()}
              refreshing={isRefetching}
            />
          )}
        </div>
      </aside>

      <LogoutConfirmModal
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        onConfirm={confirmLogoutWhatsApp}
        loading={logout.isPending}
      />
    </>
  )
}

// ─── Modal de confirmación (reemplaza window.confirm) ──────────────────────────

function LogoutConfirmModal({
  open, onOpenChange, onConfirm, loading,
}: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; loading: boolean }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={v => !loading && onOpenChange(v)}>
      <DialogPrimitive.Portal>
        {/* z-[70]/[71] > el slide-over de WhatsApp (z-[61]) para que el modal quede por encima */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] sm:w-full max-w-sm',
            '-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10',
            'bg-[#161618] p-5 sm:p-6 text-white shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'focus:outline-none',
          )}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <span className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 grid place-items-center">
              <LogOut className="h-5.5 w-5.5 text-red-400" />
            </span>
            <DialogPrimitive.Title className="text-base font-bold text-white">
              ¿Cerrar sesión de WhatsApp?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-neutral-400 leading-relaxed">
              Esta sucursal dejará de recibir pedidos automáticos por WhatsApp hasta que vuelvas a conectar el número.
            </DialogPrimitive.Description>
          </div>

          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 bg-transparent border-white/15 text-neutral-300 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Cerrar sesión
            </Button>
          </div>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-lg p-1 text-neutral-500 hover:bg-white/5 hover:text-white transition-colors focus:outline-none"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── Sub-vistas ────────────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    conectado:    { label: 'Conectado',    cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    conectando:   { label: 'Conectando…',  cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    error:        { label: 'Error',        cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    desconectado: { label: 'Desconectado', cls: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' },
  }
  const s = map[state] ?? map.desconectado
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border', s.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', state === 'conectado' ? 'bg-green-400 animate-pulse' : 'bg-current')} />
      {s.label}
    </span>
  )
}

function ConnectedView({
  number, lastSync, onLogout, loggingOut,
}: { number: string; lastSync: string; onLogout: () => void; loggingOut: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <Icons8Image src={ICONS8.whatsappSuccess} alt="Conectado" size={72} />
        <div>
          <p className="text-lg font-bold text-white">WhatsApp conectado</p>
          <p className="text-sm text-neutral-400 mt-0.5">Tu restaurante ya recibe pedidos por WhatsApp.</p>
        </div>
        <StatusBadge state="conectado" />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-neutral-500">Número conectado</span>
          <span className="text-sm font-mono text-white">{number}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-neutral-500">Última sincronización</span>
          <span className="text-sm text-neutral-300">{lastSync}</span>
        </div>
      </div>

      <Button
        onClick={onLogout}
        disabled={loggingOut}
        className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
      >
        {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Cerrar sesión de WhatsApp
      </Button>
    </div>
  )
}

function ConnectView({
  state, provider, link, number, keyword, keywordMisconfigured, copied, onCopy, onConnect, connecting, onRefresh, refreshing,
}: {
  state: string; provider: 'meta' | 'wati' | 'twilio'; link: string; number: string; keyword: string
  keywordMisconfigured: boolean
  copied: boolean; onCopy: () => void
  onConnect: () => void; connecting: boolean
  onRefresh: () => void; refreshing: boolean
}) {
  const isTwilio = provider === 'twilio'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Conectar WhatsApp</p>
        <StatusBadge state={state} />
      </div>

      {state === 'error' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300/90">
            Hubo un problema con la conexión. Vuelve a unirte al sandbox e inténtalo de nuevo.
          </p>
        </div>
      )}

      {isTwilio && keywordMisconfigured && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-300">Falta configurar el codeword del sandbox</p>
            <p>
              <code className="text-[11px] bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_TWILIO_SANDBOX_KEYWORD</code>{' '}
              no está configurado (o tiene el valor de ejemplo). Si un cliente intenta unirse ahora, Twilio
              siempre le va a mostrar <span className="text-white font-medium">&ldquo;Failed to join sandbox&rdquo;</span>,
              porque ese codeword no es real.
            </p>
            <p>
              El codeword <span className="text-white font-medium">no lo elegimos nosotros</span> — Twilio lo
              asigna por cuenta. Cópialo de{' '}
              <a href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
                target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline">
                Twilio Console → Try it out → Send a WhatsApp message
              </a>{' '}
              y ponlo tal cual en esa variable de entorno.
            </p>
          </div>
        </div>
      )}

      {isTwilio ? (
        <>
          <p className="text-sm text-neutral-400">
            Escanea el código con el teléfono que usará WhatsApp y envía el mensaje para activar el sandbox:
          </p>

          <div className="flex flex-col items-center gap-3">
            <div className={cn('rounded-2xl bg-white p-4', keywordMisconfigured && 'opacity-40 grayscale')}>
              <QRCode value={link || 'https://wa.me/'} size={168} level="M" />
            </div>
            {keywordMisconfigured ? (
              <p className="text-xs text-neutral-500 text-center max-w-[240px]">
                El código QR se activa en cuanto se configure el codeword real de Twilio (ver aviso arriba).
              </p>
            ) : (
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366] hover:underline">
                O abre WhatsApp y envía “join {keyword}”
              </a>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-neutral-500">Número de WhatsApp</p>
              <p className="text-sm font-mono text-white">{number}</p>
            </div>
            <button
              onClick={onCopy}
              className={cn(
                'h-8 w-8 rounded-lg grid place-items-center transition-colors',
                copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {/* Autodetección: el panel sondea el estado cada pocos segundos —
              en cuanto llegue el primer mensaje real, esta vista cambia sola. */}
          {!keywordMisconfigured && (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#25D366]/20 bg-[#25D366]/[0.04] px-4 py-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366]/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#25D366]" />
              </span>
              <p className="text-xs text-neutral-300">
                Esperando tu primer mensaje… en cuanto escribas <span className="text-white font-semibold">“join {keyword}”</span> y
                luego cualquier mensaje, esto se conecta solo.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2.5 text-[11px] text-blue-300/80 leading-relaxed">
            ¿No detecta la conexión automáticamente? Pulsa <span className="text-white font-semibold">Ya me uní</span> para forzarla.
            En producción, usaremos tu número de WhatsApp Business oficial para evitar costos y fricción extra.
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">
            Conecta el número oficial de WhatsApp de tu restaurante para empezar a recibir pedidos automáticamente.
            En cuanto quede activo, márcalo como conectado desde aquí.
          </p>
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2.5 text-[11px] text-amber-200/90 leading-relaxed">
            Los pedidos que inicia el cliente por WhatsApp son el flujo más rentable para FoodIX Pro — sin costo
            extra por mensaje.
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onConnect}
          disabled={connecting}
          className="flex-1 bg-[#25D366] hover:bg-[#1faa52] text-white gap-2"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isTwilio ? 'Ya me uní' : 'Marcar conectado'}
        </Button>
        <Button
          onClick={onRefresh}
          variant="outline"
          disabled={refreshing}
          className="bg-transparent border-white/15 text-neutral-300 hover:bg-white/5 gap-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>
    </div>
  )
}

function UpsellView() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <span className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-[#FACC15]/20 grid place-items-center border border-white/10">
        <Lock className="h-7 w-7 text-purple-300" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-bold text-white flex flex-col items-center gap-1.5">
          <span>WhatsApp IA está disponible<br />únicamente en FoodIX AI</span>
          <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
            Beta
          </span>
        </p>
        <p className="text-sm text-neutral-400 max-w-xs">
          Recibe pedidos por WhatsApp automáticamente: tus clientes ven el menú, arman su carrito y el pedido
          llega directo a cocina. Función en fase Beta — la seguimos puliendo.
        </p>
      </div>

      <ul className="text-left space-y-2 text-sm text-neutral-300 w-full max-w-xs mt-2">
        {[
          'Menú interactivo por WhatsApp',
          'Carrito y total en pesos (MXN)',
          'Pedidos directos al KDS / cocina',
          'Historial de conversaciones',
        ].map(f => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#25D366] shrink-0" /> {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={() => { window.location.href = '/billing' }}
        className="w-full max-w-xs mt-2 bg-gradient-to-r from-purple-600 to-[#FACC15] hover:opacity-90 text-white gap-2"
      >
        <Crown className="h-4 w-4" /> Mejorar a FoodIX AI
      </Button>
    </div>
  )
}
