'use client'

/**
 * FoodIX — Vista previa del ticket térmico (Super Admin)
 * Reproduce fielmente lo que se enviaría a una impresora térmica POS (58/80 mm)
 * usando las MISMAS funciones de maquetado que el generador ESC/POS real
 * (twoCol, divider, money, orderTypeLabel). Permite ver el ticket de venta y la
 * comanda de cocina en sus distintas variantes SIN necesidad de una impresora
 * física, tal y como saldrían impresos en papel.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useMemo, useState, useRef, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Building2, CheckCircle2, Flame, ImageIcon, QrCode as QrIcon, Search, Snowflake } from 'lucide-react'
import { AdminHeading, SectionLabel, Surface, FilterChip } from '@/components/superadmin/ui'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BranchAvatar } from '@/components/superadmin/BranchAvatar'
import { useBranches } from '@/lib/api/queries'
import { cn } from '@/lib/utils/cn'
import {
  twoCol, divider, money, orderTypeLabel, paperColumns,
  type PaperWidth, type ReceiptData, type ReceiptLine, type KitchenTicketData,
} from '@/lib/printing/escpos'
import {
  PRODUCT_NAME, VENDOR_NAME, PRODUCT_URL,
} from '@/lib/constants/version'
import { buildTicketUrl } from '@/lib/printing/ticketLink'
import type { Branch } from '@/lib/types'

// ── Datos de muestra (representan un pedido real) ───────────────────────────
const SAMPLE_LINES: ReceiptLine[] = [
  { qty: 2, name: 'Tostada de camarón', total: 90, modifiers: ['Extra limón'], notes: 'Sin cebolla' },
  { qty: 1, name: 'Aguachile de camarón', total: 120 },
  { qty: 1, name: 'Michelada clásica', total: 65, modifiers: ['Chamoy', 'Extra picante'] },
]
const SAMPLE_TOTAL = SAMPLE_LINES.reduce((s, i) => s + i.total, 0)

type Ticket = 'sale' | 'kitchen'
type OrderType = 'dine_in' | 'takeaway' | 'delivery'
type Station = 'hot' | 'cold'

export default function TicketPreviewPage() {
  const { data: branches = [], isLoading: loadingBranches } = useBranches()
  const [ticket, setTicket] = useState<Ticket>('sale')
  const [paper, setPaper] = useState<PaperWidth>(80)
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [station, setStation] = useState<Station>('hot')
  const [paid, setPaid] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showQr, setShowQr] = useState(true)

  const [businessName, setBusinessName] = useState('MARISCOS Y MICHELADAS ALEJANDRO')
  const [address, setAddress] = useState('Av. Hidalgo 123, Centro')
  const [phone, setPhone] = useState('462 213 34 18')
  const [footer, setFooter] = useState('¡Gracias por su preferencia!')
  const [branchQuery, setBranchQuery] = useState('')
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([])

  useEffect(() => {
    if (branches.length > 0 && selectedBranchIds.length === 0) {
      setSelectedBranchIds([branches[0].id])
    }
  }, [branches, selectedBranchIds.length])

  const visibleBranches = useMemo(() => {
    const q = branchQuery.trim().toLowerCase()
    if (!q) return branches
    return branches.filter(branch =>
      branch.name.toLowerCase().includes(q) ||
      branch.slug.toLowerCase().includes(q) ||
      (branch.phone ?? '').toLowerCase().includes(q),
    )
  }, [branches, branchQuery])

  const selectedBranches = useMemo(
    () => branches.filter(branch => selectedBranchIds.includes(branch.id)),
    [branches, selectedBranchIds],
  )

  const toggleBranch = (branchId: number) => {
    setSelectedBranchIds(prev =>
      prev.includes(branchId)
        ? prev.length === 1 ? prev : prev.filter(id => id !== branchId)
        : [...prev, branchId],
    )
  }

  const saleData: ReceiptData = useMemo(() => {
    const ticketNumber = '000123'
    const createdAt = '20/06/2026 14:32'
    const data: ReceiptData = {
      businessName,
      address: address || undefined,
      phone: phone || undefined,
      footer: footer || undefined,
      logo: undefined,
      orderId: 1042,
      ticketNumber,
      tableName: 'Mesa 5',
      orderType,
      createdAt,
      lines: SAMPLE_LINES,
      subtotal: SAMPLE_TOTAL,
      tax: 0,
      taxRate: 0,
      total: SAMPLE_TOTAL,
      currency: '$',
      branchName: businessName,
      deviceName: 'Caja 1 · POS-80',
      userName: 'Juan Pérez',
      paid,
      paymentMethods: ['Efectivo'],
    }
    // QR = enlace a la página pública del recibo (igual que en producción).
    return { ...data, qr: showQr ? buildTicketUrl(data) : undefined }
  }, [businessName, address, phone, footer, showQr, orderType, paid])

  const kitchenData: KitchenTicketData = useMemo(
    () => ({
      businessName,
      stationLabel: station === 'hot' ? 'COCINA CALIENTE' : 'COCINA FRÍA / BARRA',
      orderRef: orderType === 'dine_in' ? 'Mesa 5' : `${orderTypeLabel(orderType)} #1042`,
      waiter: 'Juan Pérez',
      time: '14:32',
      items: SAMPLE_LINES.map(l => ({ qty: l.qty, name: l.name, modifiers: l.modifiers, notes: l.notes })),
    }),
    [businessName, station, orderType],
  )

  const focusedBranch = selectedBranches[0]
  const focusedSaleData = focusedBranch
    ? branchReceiptData({
      branch: focusedBranch,
      fallback: { businessName, address, phone, footer },
      showLogo,
      showQr,
      paid,
      orderType,
    })
    : saleData
  const focusedKitchenData = focusedBranch
    ? branchKitchenData(focusedBranch, { businessName }, station, orderType)
    : kitchenData

  return (
    <div className="space-y-6">
      <AdminHeading
        title="Multitickets por sucursal"
        description="Selecciona una o varias sucursales y valida cómo saldrían sus tickets de venta y comandas en impresoras térmicas POS de 58/80 mm."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Controles ───────────────────────────────────────────────── */}
        <div className="space-y-5">
          <Surface className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Sucursales</SectionLabel>
              <span className="text-[11px] font-semibold text-neutral-500">{selectedBranches.length} seleccionada(s)</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={branchQuery}
                onChange={e => setBranchQuery(e.target.value)}
                placeholder="Buscar sucursal..."
                className="bg-transparent border-white/10 pl-9 text-white"
              />
            </div>
            <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {loadingBranches ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)
              ) : visibleBranches.length === 0 ? (
                <div className="rounded-xl border border-white/10 p-4 text-center text-sm text-neutral-500">
                  Sin sucursales encontradas.
                </div>
              ) : (
                visibleBranches.map(branch => {
                  const active = selectedBranchIds.includes(branch.id)
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => toggleBranch(branch.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        active ? 'border-[#E85D04] bg-[#E85D04]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]',
                      )}
                    >
                      <BranchAvatar logoUrl={branch.logo_url} name={branch.name} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{branch.name}</span>
                        <span className="block truncate text-xs text-neutral-500">/{branch.slug}</span>
                      </span>
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#E85D04]" />}
                    </button>
                  )
                })
              )}
            </div>
          </Surface>

          <Surface className="p-4 space-y-4">
            <div className="space-y-2">
              <SectionLabel>Tipo de ticket</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={ticket === 'sale'} onClick={() => setTicket('sale')}>Ticket de venta</FilterChip>
                <FilterChip active={ticket === 'kitchen'} onClick={() => setTicket('kitchen')}>Comanda de cocina</FilterChip>
              </div>
            </div>

            <div className="space-y-2">
              <SectionLabel>Ancho de papel</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={paper === 58} onClick={() => setPaper(58)}>58 mm</FilterChip>
                <FilterChip active={paper === 80} onClick={() => setPaper(80)}>80 mm</FilterChip>
              </div>
            </div>

            <div className="space-y-2">
              <SectionLabel>Tipo de pedido</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={orderType === 'dine_in'} onClick={() => setOrderType('dine_in')}>Mesa</FilterChip>
                <FilterChip active={orderType === 'takeaway'} onClick={() => setOrderType('takeaway')}>Para llevar</FilterChip>
                <FilterChip active={orderType === 'delivery'} onClick={() => setOrderType('delivery')}>Domicilio</FilterChip>
              </div>
            </div>

            {ticket === 'sale' ? (
              <div className="space-y-2">
                <SectionLabel>Estado de pago</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={!paid} onClick={() => setPaid(false)}>Pendiente</FilterChip>
                  <FilterChip active={paid} onClick={() => setPaid(true)}>Cobrado</FilterChip>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <SectionLabel>Estación</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={station === 'hot'} onClick={() => setStation('hot')}>
                    <Flame className="h-3.5 w-3.5" /> Caliente
                  </FilterChip>
                  <FilterChip active={station === 'cold'} onClick={() => setStation('cold')}>
                    <Snowflake className="h-3.5 w-3.5" /> Fría / Barra
                  </FilterChip>
                </div>
              </div>
            )}

            {ticket === 'sale' && (
              <div className="space-y-2">
                <SectionLabel>Elementos</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={showLogo} onClick={() => setShowLogo(v => !v)}>
                    <ImageIcon className="h-3.5 w-3.5" /> Logo {showLogo ? 'sí' : 'no'}
                  </FilterChip>
                  <FilterChip active={showQr} onClick={() => setShowQr(v => !v)}>
                    <QrIcon className="h-3.5 w-3.5" /> QR {showQr ? 'sí' : 'no'}
                  </FilterChip>
                </div>
              </div>
            )}
          </Surface>

          <Surface className="p-4 space-y-3">
            <SectionLabel>Datos de respaldo</SectionLabel>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Nombre del negocio</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
                className="bg-transparent border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Dirección</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)}
                className="bg-transparent border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)}
                className="bg-transparent border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-neutral-400 text-xs">Pie de página</Label>
              <Input value={footer} onChange={e => setFooter(e.target.value)}
                className="bg-transparent border-white/10 text-white" />
            </div>
            <p className="text-[11px] text-neutral-600 leading-snug">
              Cada sucursal seleccionada usa su nombre, dirección, teléfono y el logo real cargado por
              el usuario. Estos datos se usan únicamente como respaldo si una sucursal no tiene información completa.
            </p>
          </Surface>
        </div>

        {/* ── Vista previa (papel térmico) ────────────────────────────── */}
        <div className="space-y-5">
          <FocusedPreview
            paper={paper}
            ticket={ticket}
            saleData={focusedSaleData}
            kitchenData={focusedKitchenData}
            branchName={focusedBranch?.name}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>Multitickets por sucursal</SectionLabel>
              <span className="text-xs text-neutral-500">Venta 80/58 mm + comandas caliente/fría</span>
            </div>

            {selectedBranches.length === 0 ? (
              <Surface className="p-8 text-center text-sm text-neutral-500">
                Selecciona al menos una sucursal para mostrar sus tickets térmicos.
              </Surface>
            ) : (
              selectedBranches.map(branch => (
                <BranchTicketSet
                  key={branch.id}
                  branch={branch}
                  fallback={{ businessName, address, phone, footer }}
                  showLogo={showLogo}
                  showQr={showQr}
                  paid={paid}
                  orderType={orderType}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function branchLogo(branch: Branch, enabled: boolean): string | undefined {
  if (!enabled) return undefined
  return branch.logo_url || undefined
}

function branchReceiptData({
  branch,
  fallback,
  showLogo,
  showQr,
  paid,
  orderType,
}: {
  branch: Branch
  fallback: { businessName: string; address: string; phone: string; footer: string }
  showLogo: boolean
  showQr: boolean
  paid: boolean
  orderType: OrderType
}): ReceiptData {
  const businessName = branch.name || fallback.businessName
  const ticketNumber = String(100000 + branch.id).slice(-6)
  const createdAt = '20/06/2026 14:32'
  const data: ReceiptData = {
    businessName,
    address: branch.address || fallback.address || undefined,
    phone: branch.phone || fallback.phone || undefined,
    footer: fallback.footer || undefined,
    logo: branchLogo(branch, showLogo),
    orderId: 1000 + branch.id,
    ticketNumber,
    tableName: 'Mesa 5',
    orderType,
    createdAt,
    lines: SAMPLE_LINES,
    subtotal: SAMPLE_TOTAL,
    tax: 0,
    taxRate: 0,
    total: SAMPLE_TOTAL,
    currency: '$',
    branchName: businessName,
    deviceName: `Caja 1 · ${branch.slug}`,
    userName: 'Juan Pérez',
    paid,
    paymentMethods: ['Efectivo'],
  }
  return { ...data, qr: showQr ? buildTicketUrl(data) : undefined }
}

function branchKitchenData(
  branch: Branch,
  fallback: { businessName: string },
  station: Station,
  orderType: OrderType,
): KitchenTicketData {
  const businessName = branch.name || fallback.businessName
  return {
    businessName,
    stationLabel: station === 'hot' ? 'COCINA CALIENTE' : 'COCINA FRÍA / BARRA',
    orderRef: orderType === 'dine_in' ? 'Mesa 5' : `${orderTypeLabel(orderType)} #${1000 + branch.id}`,
    waiter: 'Juan Pérez',
    time: '14:32',
    items: SAMPLE_LINES.map(l => ({ qty: l.qty, name: l.name, modifiers: l.modifiers, notes: l.notes })),
  }
}

function FocusedPreview({
  paper,
  ticket,
  saleData,
  kitchenData,
  branchName,
}: {
  paper: PaperWidth
  ticket: Ticket
  saleData: ReceiptData
  kitchenData: KitchenTicketData
  branchName?: string
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Vista enfocada{branchName ? ` · ${branchName}` : ''} · Papel {paper} mm · {paperColumns(paper)} columnas
      </div>
      <div className="w-full overflow-x-auto rounded-2xl bg-neutral-200/90 p-6 sm:p-10 flex justify-center">
        <ThermalPaper paper={paper}>
          {ticket === 'sale'
            ? <SaleReceipt data={saleData} paper={paper} />
            : <KitchenReceipt data={kitchenData} paper={paper} />}
        </ThermalPaper>
      </div>
    </div>
  )
}

function BranchTicketSet({
  branch,
  fallback,
  showLogo,
  showQr,
  paid,
  orderType,
}: {
  branch: Branch
  fallback: { businessName: string; address: string; phone: string; footer: string }
  showLogo: boolean
  showQr: boolean
  paid: boolean
  orderType: OrderType
}) {
  const sale = branchReceiptData({ branch, fallback, showLogo, showQr, paid, orderType })
  const hot = branchKitchenData(branch, fallback, 'hot', orderType)
  const cold = branchKitchenData(branch, fallback, 'cold', orderType)

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <BranchAvatar logoUrl={branch.logo_url} name={branch.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{branch.name}</p>
          <p className="truncate text-xs text-neutral-500">
            {branch.address || `/${branch.slug}`}{branch.phone ? ` · ${branch.phone}` : ''}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-400">
          <Building2 className="h-3.5 w-3.5" />
          {branch.slug}
        </span>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-2">
        <TicketPreviewCard title="Ticket venta · 80 mm" paper={80}>
          <SaleReceipt data={sale} paper={80} />
        </TicketPreviewCard>
        <TicketPreviewCard title="Ticket venta · 58 mm" paper={58}>
          <SaleReceipt data={sale} paper={58} />
        </TicketPreviewCard>
        <TicketPreviewCard title="Comanda caliente · 80 mm" paper={80}>
          <KitchenReceipt data={hot} paper={80} />
        </TicketPreviewCard>
        <TicketPreviewCard title="Comanda fría/barra · 58 mm" paper={58}>
          <KitchenReceipt data={cold} paper={58} />
        </TicketPreviewCard>
      </div>
    </Surface>
  )
}

function TicketPreviewCard({ title, paper, children }: { title: string; paper: PaperWidth; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-xs font-semibold text-neutral-300">{title}</p>
        <span className="text-[11px] text-neutral-500">{paperColumns(paper)} col.</span>
      </div>
      <div className="max-h-[520px] overflow-auto bg-neutral-200/90 p-4 scrollbar-thin">
        <div className="flex justify-center">
          <ThermalPaper paper={paper}>{children}</ThermalPaper>
        </div>
      </div>
    </div>
  )
}

// ── Papel térmico con borde dentado de corte ────────────────────────────────
function ThermalPaper({ paper, children }: { paper: PaperWidth; children: React.ReactNode }) {
  // El ancho en mm reproduce la proporción real del rollo térmico.
  return (
    <div
      className="relative bg-white text-black shadow-xl"
      style={{ width: `${paper}mm`, fontFamily: "'Courier New', ui-monospace, monospace" }}
    >
      <div className="px-[3mm] py-[4mm]">{children}</div>
      {/* Borde dentado inferior simulando el corte del papel */}
      <div
        className="h-2 w-full bg-neutral-200/90"
        style={{
          WebkitMask: 'radial-gradient(0.9mm at 50% 0, transparent 98%, #000) 0 0/2.4mm 100% repeat-x',
          mask: 'radial-gradient(0.9mm at 50% 0, transparent 98%, #000) 0 0/2.4mm 100% repeat-x',
        }}
      />
    </div>
  )
}

// ── Primitivas de renderizado fieles al ESC/POS ─────────────────────────────
type LineProps = { children: React.ReactNode; className?: string; style?: React.CSSProperties }
function C({ children, className, style }: LineProps) {
  // Línea centrada (envuelve si excede el ancho, como el modo navegador).
  return <div className={cn('text-center leading-snug break-words', className)} style={style}>{children}</div>
}
function Pre({ children, className, style }: LineProps) {
  // Línea monoespaciada de ancho fijo (columnas exactas como la impresora).
  return <div className={cn('whitespace-pre leading-snug', className)} style={style}>{children}</div>
}
function Dashed({ width }: { width: number }) {
  return <Pre className="text-black/80">{divider(width)}</Pre>
}

// Representa el "doble alto" del ESC/POS: estira verticalmente el glifo sin
// alterar el ancho (las columnas siguen cabiendo en el papel). El margen
// reserva el espacio extra para que las líneas altas no se encimen.
const TALL: React.CSSProperties = { transform: 'scaleY(1.9)', transformOrigin: 'center' }

// Ancho de carácter de Courier New (~0.6em) con un pequeño margen de holgura.
const MONO_RATIO = 0.62

// Calcula el tamaño de fuente monoespaciada para que `cols` columnas quepan
// EXACTAS en el ancho real del papel. Así los renglones (conceptos, divisores,
// total) nunca se salen de rango sin importar el ancho de papel o del contenedor.
function useMonoFit(cols: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(10)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setSize(w / (cols * MONO_RATIO))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols])
  return { ref, size }
}

// ── Ticket de venta ─────────────────────────────────────────────────────────
function SaleReceipt({ data, paper }: { data: ReceiptData; paper: PaperWidth }) {
  const width = paperColumns(paper)
  const cur = data.currency ?? '$'
  const { ref, size } = useMonoFit(width)

  return (
    <div ref={ref} style={{ fontSize: size }}>
      {data.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logo} alt="logo"
          className="mx-auto mb-1.5 h-[90px] w-[90px] object-contain grayscale contrast-150" />
      )}
      <C className="font-bold tracking-tight" style={{ fontSize: size * 1.9, lineHeight: 1.15 }}>
        {data.businessName}
      </C>
      {data.slogan && <C style={{ fontSize: size }}>{data.slogan}</C>}
      {data.address && <C style={{ fontSize: size }}>{data.address}</C>}
      {data.phone && <C style={{ fontSize: size }}>Tel: {data.phone}</C>}

      <Dashed width={width} />
      {data.branchName && <Pre>{`Sucursal: ${data.branchName}`}</Pre>}
      {data.deviceName && <Pre>{`Dispositivo: ${data.deviceName}`}</Pre>}
      {data.userName && <Pre>{`Atendió: ${data.userName}`}</Pre>}
      <Pre>{`Folio: #${data.ticketNumber ?? data.orderId}`}</Pre>
      <Pre>{`Fecha: ${data.createdAt}`}</Pre>
      {orderTypeLabel(data.orderType) === 'Mesa'
        ? (data.tableName && <Pre>{`Mesa: ${data.tableName}`}</Pre>)
        : <Pre>{`Tipo: ${orderTypeLabel(data.orderType)}`}</Pre>}
      <Dashed width={width} />

      {data.lines.map((item, idx) => (
        <div key={idx} className="mb-1">
          <Pre className="font-bold my-[5px]" style={TALL}>
            {twoCol(`${item.qty}x ${item.name}`, money(item.total, cur), width)}
          </Pre>
          {(item.modifiers ?? []).map((m, i) => <Pre key={i} className="text-black/70 my-[4px]" style={TALL}>{`  + ${m}`}</Pre>)}
          {item.notes && <Pre className="text-black/70 my-[4px]" style={TALL}>{`  * ${item.notes}`}</Pre>}
        </div>
      ))}
      <Dashed width={width} />

      <Pre className="font-bold" style={{ fontSize: size * 2, lineHeight: 1.2 }}>
        {twoCol('TOTAL', money(data.total, cur), Math.floor(width / 2))}
      </Pre>

      {data.paid && (
        <div className="mt-3">
          <C className="font-bold my-[5px]" style={TALL}>*** TICKET COBRADO ***</C>
          {data.paymentMethods && data.paymentMethods.length > 0 && (
            <C>{`Pago: ${data.paymentMethods.join(', ')}`}</C>
          )}
        </div>
      )}

      <C className="font-bold my-[7px]" style={TALL}>{data.footer ?? 'Gracias por su preferencia'}</C>

      {data.qr && (
        <div className="mt-3 flex justify-center">
          {/* Nivel L + zona de silencio amplia → QR menos saturado y fácil de escanear. */}
          <div className="bg-white p-2.5">
            <QRCode value={data.qr} size={paper === 80 ? 132 : 104} level="L" />
          </div>
        </div>
      )}

      {/* Pie de marca (igual que brandFooter en ESC/POS) */}
      <div className="mt-3">
        <Dashed width={width} />
        <C className="font-bold">{PRODUCT_NAME}</C>
        <C>{`Powered by ${VENDOR_NAME}`}</C>
        <C>{PRODUCT_URL}</C>
      </div>
    </div>
  )
}

// ── Comanda de cocina ───────────────────────────────────────────────────────
function KitchenReceipt({ data, paper }: { data: KitchenTicketData; paper: PaperWidth }) {
  const width = paperColumns(paper)
  const { ref, size } = useMonoFit(width)
  return (
    <div ref={ref} style={{ fontSize: size }}>
      <C className="font-bold">{`${PRODUCT_NAME} Kitchen`}</C>
      <C className="font-bold">{data.businessName}</C>
      <C className="font-bold" style={{ fontSize: size * 1.6, lineHeight: 1.2 }}>{data.stationLabel}</C>
      {data.banner && (
        <C className="font-bold" style={{ fontSize: size * 1.9, lineHeight: 1.2 }}>{`** ${data.banner} **`}</C>
      )}

      <Dashed width={width} />
      <Pre className="font-bold" style={{ fontSize: size * 1.5, lineHeight: 1.2 }}>{data.orderRef}</Pre>
      {data.waiter && <Pre>{`Mesero: ${data.waiter}`}</Pre>}
      <Pre>{`Hora: ${data.time}`}</Pre>
      <Dashed width={width} />

      {data.items.map((item, idx) => (
        <div key={idx} className="mb-1.5">
          {/* doble alto (scaleY) en vez de fuente grande: el nombre no se sale del papel */}
          <Pre className="font-bold my-[4px]" style={{ ...TALL }}>{`${item.qty}x ${item.name}`}</Pre>
          {(item.modifiers ?? []).map((m, i) => <Pre key={i} className="text-black/70 my-[4px]" style={TALL}>{`  - ${m}`}</Pre>)}
          {item.notes && <Pre className="text-black/70 my-[4px]" style={TALL}>{`  Nota: ${item.notes}`}</Pre>}
        </div>
      ))}
      <Dashed width={width} />
    </div>
  )
}
