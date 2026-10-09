/**
 * GET /api/whatsapp/image?u=<url> — convierte una foto de producto (.webp) a
 * JPEG al vuelo para poder mandarla como media de WhatsApp.
 *
 * Por qué existe: las fotos de producto se suben como .webp (más liviano para
 * la Carta QR), pero WhatsApp (Meta Cloud API y Twilio) solo acepta JPEG/PNG
 * para mensajes de imagen — WebP no está soportado fuera de stickers. Sin este
 * proxy, `MediaUrl`/`image.link` apuntando a un .webp hace que el mensaje de
 * imagen falle en silencio (nunca llega al cliente, sin error visible).
 *
 * Solo reenvía imágenes del propio backend de FoodIX (mismo host que
 * `BACKEND_BASE_URL`) — evita que esta ruta se use como proxy abierto para
 * bajar cualquier URL arbitraria (SSRF).
 */

import sharp from 'sharp'

export const runtime = 'nodejs'

function backendHost(): string {
  try {
    return new URL(process.env.BACKEND_BASE_URL ?? 'https://tallercheck.mx/restauros/api/index.php').hostname
  } catch {
    return 'tallercheck.mx'
  }
}

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get('u') ?? ''

  let parsed: URL
  try {
    parsed = new URL(src)
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (parsed.hostname !== backendHost()) {
    return Response.json({ error: 'forbidden_host' }, { status: 403 })
  }

  try {
    const res = await fetch(parsed.toString())
    if (!res.ok) return Response.json({ error: 'source_unavailable' }, { status: 502 })

    const input = Buffer.from(await res.arrayBuffer())
    const jpeg = await sharp(input).jpeg({ quality: 82 }).toBuffer()

    return new Response(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        // Las fotos de producto casi no cambian de URL (hash del archivo) —
        // cachear agresivo evita reconvertir en cada pedido de WhatsApp.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    console.error('[WA Image Proxy] error al convertir imagen:', err)
    return Response.json({ error: 'conversion_failed' }, { status: 502 })
  }
}
