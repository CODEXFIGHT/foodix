const DEVICE_UID_KEY = 'restauros_device_uid'

function detectDeviceType(): 'android' | 'tablet' | 'desktop' | 'web' {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/ipad|tablet/.test(ua)) return 'tablet'
  if (/mobile/.test(ua)) return 'web'
  return 'desktop'
}

async function generateDeviceUid(): Promise<string> {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
    navigator.platform,
  ].join('|')

  const buffer = new TextEncoder().encode(raw)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getDeviceUid(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr-device'

  const existing = localStorage.getItem(DEVICE_UID_KEY)
  if (existing) return existing

  const uid = await generateDeviceUid()
  localStorage.setItem(DEVICE_UID_KEY, uid)
  return uid
}

export function getDeviceType(): 'android' | 'tablet' | 'desktop' | 'web' {
  return detectDeviceType()
}

export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Dispositivo'
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  return 'Navegador Web'
}
