#!/usr/bin/env node
/**
 * FoodIX — Agente local de impresión
 * --------------------------------------
 * Mini servidor HTTP que corre en la PC de caja y hace de puente entre el
 * navegador (app en Vercel/HTTPS) y la impresora de red (socket crudo 9100).
 *
 * ¿Por qué existe? El backend PHP está hospedado fuera de la red del
 * restaurante, así que no puede alcanzar una impresora con IP local
 * (192.168.x.x). Y el navegador no puede abrir sockets TCP. Este agente sí:
 * vive en la misma LAN que la impresora y recibe los bytes ESC/POS por HTTP.
 *
 * Los navegadores permiten fetch desde una página HTTPS hacia http://127.0.0.1
 * (localhost se considera origen seguro), por eso funciona sin contenido mixto.
 *
 * Sin dependencias: solo módulos nativos de Node (http, net).
 *
 * Uso:   node agent.js
 * Env:   PORT=9110  HOST=127.0.0.1  ALLOWED_ORIGIN=*
 */
'use strict'

const http = require('http')
const net = require('net')

const PORT = Number(process.env.PORT) || 9110
const HOST = process.env.HOST || '127.0.0.1'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'
const VERSION = '1.0.0'
const CONNECT_TIMEOUT_MS = 5000

function setCors(res, origin) {
  // Si ALLOWED_ORIGIN es '*' reflejamos el origin para permitir credenciales
  // futuras; si está fijado, solo ese origen.
  const allow = ALLOWED_ORIGIN === '*' ? origin || '*' : ALLOWED_ORIGIN
  res.setHeader('Access-Control-Allow-Origin', allow)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

// Envía un buffer de bytes a la impresora por TCP (RAW/JetDirect 9100).
function sendToPrinter(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false

    const done = (err) => {
      if (settled) return
      settled = true
      socket.destroy()
      err ? reject(err) : resolve(buffer.length)
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS)
    socket.once('timeout', () => done(new Error('Tiempo de espera agotado')))
    socket.once('error', (err) => done(err))

    socket.connect(port, ip, () => {
      socket.write(buffer, (err) => {
        if (err) return done(err)
        // Pequeño margen para que la impresora drene el buffer antes de cerrar.
        setTimeout(() => done(null), 150)
      })
    })
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 5 * 1024 * 1024) {
        reject(new Error('Cuerpo demasiado grande'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  setCors(res, origin)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = (req.url || '/').split('?')[0]

  // Salud / descubrimiento — usado por el botón "Probar agente" en la app.
  if (req.method === 'GET' && (url === '/health' || url === '/')) {
    return json(res, 200, { ok: true, app: 'FoodIX Print Agent', version: VERSION })
  }

  // Impresión / pulso al cajón (ambos son bytes ESC/POS).
  if (req.method === 'POST' && url === '/print') {
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw || '{}')
      const ip = String(body.ip || '').trim()
      const port = Number(body.port) || 9100
      const dataB64 = String(body.data || '')

      if (!ip || !dataB64) {
        return json(res, 422, { ok: false, message: 'Se requieren ip y data (base64)' })
      }

      const buffer = Buffer.from(dataB64, 'base64')
      if (buffer.length === 0) {
        return json(res, 422, { ok: false, message: 'data vacío o base64 inválido' })
      }

      const bytes = await sendToPrinter(ip, port, buffer)
      console.log(`[print] ${ip}:${port} ← ${bytes} bytes OK`)
      return json(res, 200, { ok: true, bytes })
    } catch (err) {
      console.error('[print] error:', err.message)
      return json(res, 502, { ok: false, message: err.message })
    }
  }

  json(res, 404, { ok: false, message: 'Ruta no encontrada' })
})

server.listen(PORT, HOST, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  FoodIX — Agente de impresión local')
  console.log(`  Escuchando en  http://${HOST}:${PORT}`)
  console.log(`  Salud:         http://${HOST}:${PORT}/health`)
  console.log('  Deja esta ventana abierta mientras uses la caja.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✗ El puerto ${PORT} ya está en uso. ¿Ya hay un agente corriendo?`)
  } else {
    console.error('\n✗ Error del servidor:', err.message)
  }
  process.exit(1)
})
