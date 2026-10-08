import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/whatsapp/webhook/route'
import { handleIncomingMessage } from '@/lib/server/whatsappFlow'
import { resolveBranchByNumber, checkBranchPlanPro } from '@/lib/server/whatsappSession'

// Mock de handleIncomingMessage
vi.mock('@/lib/server/whatsappFlow', () => ({
  handleIncomingMessage: vi.fn(() => Promise.resolve()),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('WhatsApp Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.WA_PROVIDER = 'twilio'
    process.env.WA_WEBHOOK_TOKEN = 'test_webhook_token'
    process.env.WA_BRANCH_SLUG = 'tacos-jimmy'
    process.env.BACKEND_SERVICE_TOKEN = 'service_token_123'
    process.env.TWILIO_VALIDATE = 'false' // desactivado para pruebas
  })

  describe('GET - Verificación de Webhook', () => {
    it('verifica Meta con hub.verify_token correcto', async () => {
      process.env.WA_PROVIDER = 'meta'
      const req = new Request('http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test_webhook_token&hub.challenge=12345')
      const res = await GET(req)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('12345')
    })

    it('rechaza Meta con hub.verify_token incorrecto', async () => {
      process.env.WA_PROVIDER = 'meta'
      const req = new Request('http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=12345')
      const res = await GET(req)
      expect(res.status).toBe(403)
    })
  })

  describe('POST - Twilio Webhook (Plan Pro Gating)', () => {
    it('procesa y acepta mensajes de Twilio si la sucursal es PLAN PRO', async () => {
      // Mock de /whatsapp/resolve para retornar plan_pro: true
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ branch_slug: 'tacos-jimmy', plan_pro: true }),
      })

      const body = new URLSearchParams()
      body.append('From', 'whatsapp:+5215512345678')
      body.append('To', 'whatsapp:+14155238886')
      body.append('Body', 'hola')

      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      // Verificar que se procesó el flujo
      expect(handleIncomingMessage).toHaveBeenCalledWith('5215512345678', 'hola', 'tacos-jimmy')
    })

    it('ignora mensajes de Twilio si la sucursal NO tiene Plan Pro', async () => {
      // Mock de /whatsapp/resolve para retornar plan_pro: false
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ branch_slug: 'tacos-jimmy', plan_pro: false }),
      })

      const body = new URLSearchParams()
      body.append('From', 'whatsapp:+5215512345678')
      body.append('To', 'whatsapp:+14155238886')
      body.append('Body', 'hola')

      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      // No debe procesar el flujo
      expect(handleIncomingMessage).not.toHaveBeenCalled()
    })

    it('utiliza fallback BRANCH_SLUG y valida su Plan Pro si no hay mapeo de sucursal', async () => {
      // 1. Mock de /whatsapp/resolve para número destino -> retorna branch_slug: null
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ branch_slug: null }),
      })
      // 2. Mock de /whatsapp/resolve para fallback por slug -> retorna plan_pro: true
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ branch_slug: 'tacos-jimmy', plan_pro: true }),
      })

      const body = new URLSearchParams()
      body.append('From', 'whatsapp:+5215512345678')
      body.append('To', 'whatsapp:+14155238886')
      body.append('Body', 'menu')

      const req = new Request('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(handleIncomingMessage).toHaveBeenCalledWith('5215512345678', 'menu', 'tacos-jimmy')
    })
  })
})
