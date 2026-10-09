'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Botón flotante de micrófono para comanda por voz (feature-flag
 * NEXT_PUBLIC_ENABLE_VOICE_ORDERS). Captura con Web Speech API; si el
 * navegador no la soporta, se avisa en vez de bloquear la pantalla — no hay
 * endpoint de transcripción de audio crudo definido en el backend todavía,
 * así que no se intenta ese fallback aquí.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useParseVoz } from '@/lib/api/queries/useMesero'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import type { VoiceParseResult } from '@/lib/types'

interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface VoiceOrderButtonProps {
  mesaId: number
  onResolved: (result: VoiceParseResult) => void
}

export function VoiceOrderButton({ mesaId, onResolved }: VoiceOrderButtonProps) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)
  const parseVoz = useParseVoz()
  const haptic = useHapticFeedback()

  const enabled = process.env.NEXT_PUBLIC_ENABLE_VOICE_ORDERS === 'true'

  const handleTranscript = useCallback((transcript: string) => {
    if (!transcript.trim()) return
    parseVoz.mutate({ transcript, mesaId }, {
      onSuccess: onResolved,
      onError: () => toast.error('No se pudo interpretar el pedido por voz'),
    })
  }, [parseVoz, mesaId, onResolved])

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      toast.error('Este navegador no soporta comandos por voz')
      return
    }
    haptic()
    const recognition = new Ctor()
    recognition.lang = 'es-MX'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      handleTranscript(transcript)
    }
    recognition.onerror = () => {
      toast.error('No se entendió el audio, intenta de nuevo')
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!enabled) return null

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={parseVoz.isPending}
      aria-label={listening ? 'Detener dictado de pedido' : 'Dictar pedido por voz'}
      className={cn(
        'fixed bottom-24 right-3 z-40 grid h-14 w-14 place-items-center rounded-full border shadow-lg transition-all active:scale-95',
        listening
          ? 'animate-pulse border-red-500 bg-red-500 text-white'
          : 'border-[#D1400F]/30 bg-white text-[#D1400F] dark:bg-stone-950',
        parseVoz.isPending && 'opacity-70',
      )}
    >
      {parseVoz.isPending ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : listening ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </button>
  )
}
