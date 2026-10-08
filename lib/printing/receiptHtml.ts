import type { ReceiptData } from './escpos'

// Render del ticket como HTML para el modo "browser" (fallback universal vía
// window.print). Estilado a ancho de papel térmico (58/80mm).

function money(n: number, cur = '$'): string {
  return `${cur}${n.toFixed(2)}`
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
}

export function buildReceiptHtml(data: ReceiptData, paperWidthMm: 58 | 80): string {
  const cur = data.currency ?? '$'
  const rows = data.lines
    .map((i) => {
      const mods = (i.modifiers ?? [])
        .map((m) => `<div class="mod">+ ${esc(m)}</div>`)
        .join('')
      const note = i.notes ? `<div class="mod">* ${esc(i.notes)}</div>` : ''
      return `<tr><td>${i.qty}x ${esc(i.name)}${mods}${note}</td><td class="r">${money(i.total, cur)}</td></tr>`
    })
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket #${data.orderId}</title>
<style>
  @page { size: ${paperWidthMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: ${paperWidthMm}mm; margin: 0; padding: 3mm;
    font-family: 'Courier New', monospace; font-size: 13px; color: #000; }
  .c { text-align: center; }
  .r { text-align: right; white-space: nowrap; }
  .name { font-size: 20px; font-weight: 700; }
  .slogan { font-size: 11px; }
  .logo { max-width: 100px; max-height: 100px; object-fit: contain; margin: 0 auto 4px; display: block; filter: grayscale(100%) contrast(150%); }
  .mod { font-size: 11px; font-weight: 400; padding-left: 10px; color: #000; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; font-size: 14px; font-weight: 700; }
  .total td { font-size: 19px; font-weight: 700; padding-top: 4px; }
  .foot { margin-top: 8px; font-size: 15px; font-weight: 700; }
</style></head><body>
  ${data.logo ? `<img class="logo" src="${data.logo}" alt="logo">` : ''}
  <div class="c name">${esc(data.businessName)}</div>
  ${data.slogan ? `<div class="c slogan">${esc(data.slogan)}</div>` : ''}
  ${data.address ? `<div class="c slogan">${esc(data.address)}</div>` : ''}
  ${data.phone ? `<div class="c slogan">Tel: ${esc(data.phone)}</div>` : ''}
  <hr>
  <div>Pedido #${data.orderId} &nbsp; ${esc(data.createdAt)}</div>
  ${data.tableName ? `<div>Mesa: ${esc(data.tableName)}</div>` : ''}
  <hr>
  <table>${rows}</table>
  <hr>
  <table>
    ${(data.discountBreakdown ?? []).map(d =>
      `<tr><td>${esc(d.label)}</td><td class="r">-${money(d.amount, cur)}</td></tr>`
    ).join('')}
    <tr class="total"><td>TOTAL</td><td class="r">${money(data.total, cur)}</td></tr>
  </table>
  <div class="c foot">${esc(data.footer ?? '¡Gracias por su compra!')}</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script>
</body></html>`
}
