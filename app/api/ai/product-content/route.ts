/**
 * RestaurOS — Generación asistida de contenido de producto (servidor).
 *
 * Recibe el nombre (y categoría) de un platillo y devuelve una descripción
 * apetitosa y una lista de ingredientes. La clave y el proveedor de IA viven
 * SOLO en el servidor: el cliente nunca los ve.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'

interface Body {
  name?: string
  category?: string
}

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'La asistencia de IA no está disponible.' }, { status: 503 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Escribe primero el nombre del platillo.' }, { status: 400 })
  }
  const category = (body.category ?? '').trim()

  const system =
    'Eres un asistente para menús de restaurantes en México. Devuelves SIEMPRE un objeto JSON ' +
    'válido con dos claves: "description" (string) e "ingredients" (array de strings). ' +
    'La descripción es apetitosa, clara y breve (máximo 2 frases, sin precio). ' +
    'Los ingredientes son los típicos del platillo, en español, nombres cortos (3 a 8). ' +
    'No inventes alérgenos ni datos nutricionales.'

  const user = category
    ? `Platillo: "${name}". Categoría: "${category}".`
    : `Platillo: "${name}".`

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo generar el contenido.' }, { status: 502 })
    }

    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? '{}'

    let parsed: { description?: string; ingredients?: string[] | string } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      // El modelo a veces envuelve el JSON; intentamos extraerlo.
      const match = content.match(/\{[\s\S]*\}/)
      if (match) { try { parsed = JSON.parse(match[0]) } catch { /* ignore */ } }
    }

    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map(i => String(i).trim()).filter(Boolean).join('\n')
      : typeof parsed.ingredients === 'string'
        ? parsed.ingredients.trim()
        : ''

    return NextResponse.json({ description, ingredients })
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el contenido.' }, { status: 502 })
  }
}
