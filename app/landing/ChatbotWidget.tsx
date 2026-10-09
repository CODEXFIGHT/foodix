'use client'

/**
 * FoodIX — Widget de chat con "Sol", el asistente IA de la landing.
 * Botón flotante fixed (esquina inferior derecha) que abre un panel de chat
 * conectado a /api/ai/chat (EdenIA). Responsive: hoja completa en mobile,
 * panel flotante en desktop.
 *
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: '¡Hola! Soy Sol ☀️, el asistente de FoodIX. Puedo contarte de nuestros planes, precios y funciones. ¿En qué te ayudo?',
}

const SUGGESTIONS = ['¿Cuánto cuesta FoodIX?', '¿Qué incluye el plan Pro?', '¿Cómo funciona la carta QR?']

export function ChatbotWidget() {
  // `mounted` = el panel está en el DOM; `open` = estado visual (dispara la
  // animación de entrada/salida). Se separan para poder animar el CIERRE antes
  // de desmontar, en vez de que el panel desaparezca de golpe.
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openChat() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMounted(true)
    // Monta en estado "cerrado" y libera el estado "abierto" en el siguiente
    // frame para que la transición de entrada se reproduzca.
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
  }

  function closeChat() {
    setOpen(false)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMounted(false), 320)
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function sendMessage(text: string) {
    const content = text.trim()
    if (!content || loading) return

    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter(m => m !== WELCOME) }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) {
        setError(data?.error || 'Sol no pudo responder en este momento. Intenta de nuevo.')
        return
      }
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setError('No hay conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* ── Botón flotante ── */}
      {!mounted && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Abrir chat con Sol"
          aria-expanded={false}
          className="animate-chat-fab group fixed bottom-5 right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-[#FACC15] text-stone-950 shadow-[0_10px_30px_rgba(250,204,21,0.45)] transition-transform duration-300 hover:scale-105 hover:bg-[#EAB308] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16 dark:focus-visible:ring-offset-black"
        >
          {/* Anillo de "latido" ambiental para dar sensación de asistente vivo. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-[#FACC15] animate-pulse-ring" />
          <MessageCircle className="relative h-6 w-6 transition-transform duration-300 group-hover:rotate-6 sm:h-7 sm:w-7" />
          <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] dark:bg-black">
            ☀️
          </span>
        </button>
      )}

      {/* ── Panel de chat ── */}
      {mounted && (
        <>
          {/* Backdrop: aparece con blur suave y cierra al tocar fuera (desktop). */}
          <button
            type="button"
            aria-label="Cerrar chat"
            tabIndex={-1}
            onClick={closeChat}
            className={cn(
              'fixed inset-0 z-[74] hidden bg-stone-900/20 backdrop-blur-[2px] transition-opacity duration-300 sm:block dark:bg-black/40',
              open ? 'opacity-100' : 'opacity-0',
            )}
          />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chat con Sol, asistente de FoodIX"
          className={cn(
            'fixed inset-0 z-[75] flex flex-col bg-white origin-bottom-right will-change-transform',
            'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(600px,80vh)] sm:w-[380px] sm:rounded-3xl sm:border sm:border-stone-200 sm:shadow-[0_24px_70px_rgba(28,25,23,0.25)] dark:bg-[#0a0a0a] dark:sm:border-white/10',
            open
              ? 'opacity-100 translate-y-0 sm:scale-100'
              : 'opacity-0 translate-y-full sm:translate-y-3 sm:scale-95',
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3.5 sm:rounded-t-3xl dark:border-white/10">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-lg dark:bg-amber-500/10">
              ☀️
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-stone-900 dark:text-white">
                Sol <Sparkles className="h-3.5 w-3.5 text-yellow-700 dark:text-yellow-400" />
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">Asistente IA de FoodIX</p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Cerrar chat"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-stone-500 transition-all hover:rotate-90 hover:bg-stone-50 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'animate-chat-user rounded-br-sm bg-[#FACC15] text-stone-950 shadow-sm shadow-[#FACC15]/20'
                      : 'animate-chat-bot rounded-bl-sm bg-stone-100 text-stone-800 dark:bg-white/[0.06] dark:text-zinc-100',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex animate-chat-bot justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-3 dark:bg-white/[0.06]">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" />
                </div>
              </div>
            )}

            {error && (
              <p className="animate-chat-bot rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    style={{ animationDelay: `${140 + i * 90}ms` }}
                    className="animate-chat-chip rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-yellow-700 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-amber-500/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-stone-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl sm:pb-3 dark:border-white/10"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              rows={1}
              maxLength={1000}
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#CA8A04] focus:outline-none focus:ring-2 focus:ring-[#CA8A04]/20 dark:border-white/15 dark:bg-black dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar mensaje"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FACC15] text-stone-950 transition-all hover:scale-105 hover:bg-[#EAB308] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
        </>
      )}
    </>
  )
}
