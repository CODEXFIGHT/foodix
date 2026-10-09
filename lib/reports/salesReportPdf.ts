/**
 * FoodIX — Generador de reporte de ventas en PDF.
 *
 * Produce un PDF profesional (A4) con encabezado de marca FoodIX, resumen de
 * KPIs, ventas por categoría, ingresos diarios y el detalle de pedidos del
 * período, con pie de página "DevHive Software" y numeración en todas las hojas.
 *
 * Las fechas/horas se formatean SIEMPRE en America/Mexico_City para ser
 * consistentes con la zona horaria del backend (UTC-06:00).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const BRAND: [number, number, number] = [209,64,15]   // #D1400F
const INK:   [number, number, number] = [28, 25, 23]   // #1C1917
const MUTED: [number, number, number] = [120, 113, 108] // stone-500

export interface ReportPeriod { revenue: number; order_count: number }

export interface SalesReportOrder {
  id: number
  table_name: string
  items: { quantity: number }[]
  subtotal: number
  tax: number
  total: number
  status: string
  payment_status?: string
  payment_method?: string | null
  waiter_name?: string | null
  created_at: string
}

export interface SalesReportInput {
  businessName: string
  slogan?: string
  from: string
  to: string
  summary?: { today: ReportPeriod; week: ReportPeriod; month: ReportPeriod }
  byCategory: { category_name: string; revenue: number; percentage: number }[]
  daily: { date: string; revenue: number; order_count: number }[]
  orders: SalesReportOrder[]
}

function money(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  // iso 'yyyy-MM-dd' → '01 jun 2026' en CDMX (se interpreta como fecha local).
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(dt)
}

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function nowCdmx(): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date())
}

/** Dibuja un cuadro de KPI con etiqueta arriba y valor abajo. */
function kpiBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, accent = false) {
  doc.setDrawColor(230, 226, 222)
  doc.setFillColor(accent ? BRAND[0] : 250, accent ? BRAND[1] : 250, accent ? BRAND[2] : 249)
  doc.roundedRect(x, y, w, 16, 1.5, 1.5, 'FD')
  doc.setFontSize(7)
  doc.setTextColor(...(accent ? [255, 235, 220] as [number, number, number] : MUTED))
  doc.setFont('helvetica', 'normal')
  doc.text(label.toUpperCase(), x + 3, y + 5)
  doc.setFontSize(12)
  doc.setTextColor(...(accent ? [255, 255, 255] as [number, number, number] : INK))
  doc.setFont('helvetica', 'bold')
  doc.text(value, x + 3, y + 12)
}

export function generateSalesReportPdf(data: SalesReportInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  // ── Encabezado de marca (todas las páginas) ──────────────────────────────
  const drawHeader = () => {
    // Logo FoodIX: equivalente vectorial del asset /public/brand/foodix-r-orange.svg.
    doc.setFillColor(...BRAND)
    doc.roundedRect(margin, 12, 9, 9, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('R', margin + 4.5, 18.4, { align: 'center' })

    doc.setTextColor(...INK)
    doc.setFontSize(15)
    doc.text('FoodIX', margin + 12, 16.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Sistema POS para restaurantes', margin + 12, 20.5)

    // Línea divisoria naranja.
    doc.setDrawColor(...BRAND)
    doc.setLineWidth(0.6)
    doc.line(margin, 24, pageW - margin, 24)
    doc.setLineWidth(0.2)
  }

  // ── Pie de página (todas las páginas) ────────────────────────────────────
  const drawFooter = () => {
    const y = 287
    doc.setDrawColor(230, 226, 222)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text('FoodIX', margin, y + 4)
    doc.text('DevHive Software 2026 - Todos los derechos reservados.', pageW / 2, y + 4, { align: 'center' })
  }

  // ── Página 1: encabezado + datos del reporte ─────────────────────────────
  drawHeader()

  let y = 32
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Reporte de ventas', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const sameDay = data.from === data.to
  doc.text(sameDay ? `Ventas del día: ${fmtDate(data.from)}` : `Periodo: ${fmtDate(data.from)} al ${fmtDate(data.to)}`, margin, y)
  doc.text(`Generado: ${nowCdmx()} (CDMX)`, pageW - margin, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(data.businessName || 'FoodIX', margin, y)
  y += 7

  // ── Resumen del período (calculado de los pedidos) ───────────────────────
  const totalRevenue = data.orders.reduce((s, o) => s + o.total, 0)
  const totalSubtotal = data.orders.reduce((s, o) => s + o.subtotal, 0)
  const totalTax = data.orders.reduce((s, o) => s + o.tax, 0)
  const count = data.orders.length
  const avgTicket = count > 0 ? totalRevenue / count : 0
  const byPayment = new Map<string, number>()
  const byWaiter = new Map<string, number>()
  data.orders.forEach(o => {
    byPayment.set(o.payment_method || 'No disponible', (byPayment.get(o.payment_method || 'No disponible') ?? 0) + o.total)
    if (o.waiter_name) byWaiter.set(o.waiter_name, (byWaiter.get(o.waiter_name) ?? 0) + o.total)
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text('Resumen del período', margin, y)
  y += 3

  const gap = 4
  const boxW = (pageW - margin * 2 - gap * 2) / 3
  kpiBox(doc, margin, y, boxW, 'Ingresos totales', money(totalRevenue), true)
  kpiBox(doc, margin + boxW + gap, y, boxW, 'Pedidos', String(count))
  kpiBox(doc, margin + (boxW + gap) * 2, y, boxW, 'Ticket promedio', money(avgTicket))
  y += 16 + gap
  kpiBox(doc, margin, y, boxW, 'Subtotal', money(totalSubtotal))
  kpiBox(doc, margin + boxW + gap, y, boxW, 'IVA', money(totalTax))
  if (data.summary) {
    kpiBox(doc, margin + (boxW + gap) * 2, y, boxW, 'Hoy', money(data.summary.today.revenue))
  }
  y += 16 + 6

  const tableOpts = {
    margin: { top: 28, bottom: 14, left: margin, right: margin },
    headStyles: { fillColor: INK, textColor: [255, 255, 255] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const },
    bodyStyles: { fontSize: 8, textColor: INK },
    alternateRowStyles: { fillColor: [248, 247, 246] as [number, number, number] },
    styles: { cellPadding: 1.6, lineColor: [235, 232, 229] as [number, number, number], lineWidth: 0.1 },
    didDrawPage: () => { drawHeader(); drawFooter() },
  }

  if (byPayment.size > 0) {
    if (y > 238) { doc.addPage(); y = 32 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text('Métodos de pago', margin, y)
    autoTable(doc, {
      ...tableOpts,
      startY: y + 2,
      head: [['Método', 'Total']],
      body: Array.from(byPayment.entries()).map(([method, total]) => [method, money(total)]),
      columnStyles: { 1: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  if (byWaiter.size > 0) {
    if (y > 238) { doc.addPage(); y = 32 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text('Ventas por mesero', margin, y)
    autoTable(doc, {
      ...tableOpts,
      startY: y + 2,
      head: [['Mesero', 'Total vendido']],
      body: Array.from(byWaiter.entries()).map(([waiter, total]) => [waiter, money(total)]),
      columnStyles: { 1: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ── Ventas por categoría ─────────────────────────────────────────────────
  if (data.byCategory.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text('Ventas por categoría', margin, y)
    autoTable(doc, {
      ...tableOpts,
      startY: y + 2,
      head: [['Categoría', 'Ingresos', '% del total']],
      body: data.byCategory.map(c => [c.category_name, money(c.revenue), `${c.percentage.toFixed(1)}%`]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ── Ingresos diarios ─────────────────────────────────────────────────────
  if (data.daily.length > 0) {
    if (y > 250) { doc.addPage(); y = 32 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text('Ingresos diarios', margin, y)
    autoTable(doc, {
      ...tableOpts,
      startY: y + 2,
      head: [['Fecha', 'Pedidos', 'Ingresos']],
      body: data.daily.map(d => [fmtDate(d.date), String(d.order_count), money(d.revenue)]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ── Detalle de pedidos del período ───────────────────────────────────────
  if (y > 250) { doc.addPage(); y = 32 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(`Detalle de pedidos (${count})`, margin, y)
  autoTable(doc, {
    ...tableOpts,
    startY: y + 2,
    head: [['Fecha/hora', 'Folio', 'Mesa', 'Mesero', 'Método de pago', 'Total']],
    body: data.orders.map(o => [
      fmtDateTime(o.created_at),
      `#${o.id}`,
      o.table_name || '—',
      o.waiter_name || '—',
      o.payment_method || 'No disponible',
      money(o.total),
    ]),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    foot: [[
      { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      money(totalRevenue),
    ]],
    footStyles: { fillColor: [245, 243, 241] as [number, number, number], textColor: INK, fontStyle: 'bold' as const, fontSize: 8 },
  })

  // ── Numeración "Página i de N" (segunda pasada) ──────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text(`Página ${i} de ${pages}`, pageW - margin, 291, { align: 'right' })
  }

  doc.save(`reporte_ventas_${data.from}_${data.to}.pdf`)
}
