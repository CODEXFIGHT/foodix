import fs from 'node:fs/promises'

const BASE_URL = 'http://127.0.0.1:3100'
const CDP_HTTP = 'http://127.0.0.1:9222'
const OUT_DIR = '/home/jimmylopez/Documentos/DEVHIVE_PROJECTS/restaurosapp/public/assets/screenshots'

class CDPPage {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.events = new Map()
    this.open = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve)
      this.ws.addEventListener('error', reject)
    })
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString())
      if (message.id) {
        const handlers = this.pending.get(message.id)
        if (!handlers) return
        this.pending.delete(message.id)
        if (message.error) handlers.reject(new Error(message.error.message))
        else handlers.resolve(message.result)
        return
      }
      const listeners = this.events.get(message.method)
      if (!listeners) return
      for (const listener of listeners) listener(message.params)
    })
  }

  async send(method, params = {}) {
    await this.open
    const id = ++this.id
    const payload = JSON.stringify({ id, method, params })
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.ws.send(payload)
    return result
  }

  on(method, handler) {
    const listeners = this.events.get(method) ?? []
    listeners.push(handler)
    this.events.set(method, listeners)
    return () => {
      const next = (this.events.get(method) ?? []).filter((item) => item !== handler)
      this.events.set(method, next)
    }
  }

  once(method) {
    return new Promise((resolve) => {
      const off = this.on(method, (params) => {
        off()
        resolve(params)
      })
    })
  }

  async close() {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.close()
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createTarget() {
  const response = await fetch(`${CDP_HTTP}/json/new?about:blank`, { method: 'PUT' })
  if (!response.ok) throw new Error(`No pude crear target CDP: ${response.status}`)
  const json = await response.json()
  return new CDPPage(json.webSocketDebuggerUrl)
}

async function preparePage(page, viewport) {
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('DOM.enable')
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale ?? 2,
    mobile: viewport.mobile ?? false,
  })
  if (viewport.mobile) {
    await page.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
    })
  }
}

async function navigate(page, path) {
  const loaded = page.once('Page.loadEventFired')
  await page.send('Page.navigate', { url: `${BASE_URL}${path}` })
  await loaded
  await sleep(1800)
}

async function waitFor(page, expression, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const result = await page.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    })
    if (result.result.value) return
    await sleep(200)
  }
  throw new Error(`Timeout esperando: ${expression}`)
}

async function cleanChrome(page) {
  await page.send('Runtime.evaluate', {
    expression: `(() => {
      try { localStorage.setItem('restauros_demo_toast_min', '1') } catch {}
      for (const el of [...document.querySelectorAll('*')]) {
        const text = (el.textContent || '').trim()
        if (!text) continue
        const style = window.getComputedStyle(el)
        const isDemoToast = text.includes('Modo demo') || text.includes('Estás usando FoodIX en modo demo')
        if (isDemoToast && style.position === 'fixed') {
          el.style.display = 'none'
        }
      }
      return true
    })()`,
    returnByValue: true,
  })
}

async function clickText(page, selector, text) {
  const expression = `(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find((node) => (node.textContent || '').includes(${JSON.stringify(text)}))
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  })()`
  const result = await page.send('Runtime.evaluate', { expression, returnByValue: true })
  if (!result.result.value) throw new Error(`No encontré ${selector} con texto ${text}`)
  const { x, y } = result.result.value
  await page.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  })
  await page.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  })
  await sleep(700)
}

async function capture(page, outputName) {
  const shot = await page.send('Page.captureScreenshot', { format: 'png' })
  await fs.writeFile(`${OUT_DIR}/${outputName}`, Buffer.from(shot.data, 'base64'))
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const desktop = { width: 1600, height: 1000, mobile: false, scale: 2 }
  const kitchen = { width: 1440, height: 960, mobile: false, scale: 2 }
  const mobile = { width: 430, height: 932, mobile: true, scale: 3 }

  const admin = await createTarget()
  try {
    await preparePage(admin, desktop)
    await navigate(admin, '/demo/admin')
    await waitFor(admin, `document.body.innerText.includes("Panel de administración")`)
    await cleanChrome(admin)
    await capture(admin, 'admin-dashboard-desktop.png')
    await clickText(admin, 'button[role="tab"]', 'Menú')
    await capture(admin, 'admin-menu-desktop.png')
    await clickText(admin, 'button[role="tab"]', 'Mesas')
    await capture(admin, 'admin-tables-desktop.png')
    await clickText(admin, 'button[role="tab"]', 'Órdenes')
    await capture(admin, 'admin-orders-desktop.png')
  } finally {
    await admin.close()
  }

  const waiterDesktop = await createTarget()
  try {
    await preparePage(waiterDesktop, desktop)
    await navigate(waiterDesktop, '/demo/waiter')
    await waitFor(waiterDesktop, `document.body.innerText.includes("Mesa 1")`)
    await cleanChrome(waiterDesktop)
    await clickText(waiterDesktop, 'button', 'Mesa 1')
    await waitFor(waiterDesktop, `document.body.innerText.includes("Orden actual")`)
    await capture(waiterDesktop, 'waiter-order-desktop.png')
  } finally {
    await waiterDesktop.close()
  }

  const waiterMobile = await createTarget()
  try {
    await preparePage(waiterMobile, mobile)
    await navigate(waiterMobile, '/demo/waiter')
    await waitFor(waiterMobile, `document.body.innerText.includes("Mesa 1")`)
    await cleanChrome(waiterMobile)
    await clickText(waiterMobile, 'button', 'Mesa 1')
    await waitFor(waiterMobile, `document.body.innerText.includes("Platillos")`)
    await capture(waiterMobile, 'waiter-order-mobile.png')
    await clickText(waiterMobile, 'button', 'Orden actual')
    await capture(waiterMobile, 'waiter-ticket-mobile.png')
  } finally {
    await waiterMobile.close()
  }

  const menuMobile = await createTarget()
  try {
    await preparePage(menuMobile, mobile)
    await navigate(menuMobile, '/demo/menu')
    await waitFor(menuMobile, `document.body.innerText.includes("Restaurante Demo La Naranja")`)
    await cleanChrome(menuMobile)
    await capture(menuMobile, 'menu-qr-mobile.png')
  } finally {
    await menuMobile.close()
  }

  const kitchenPage = await createTarget()
  try {
    await preparePage(kitchenPage, kitchen)
    await navigate(kitchenPage, '/demo/kitchen')
    await waitFor(kitchenPage, `document.body.innerText.includes("comanda(s) activa(s)")`)
    await cleanChrome(kitchenPage)
    await capture(kitchenPage, 'kitchen-kds-tablet.png')
  } finally {
    await kitchenPage.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
