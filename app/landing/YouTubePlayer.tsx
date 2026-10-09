'use client'

/**
 * Reproductor de YouTube con UI propia para la landing.
 *
 * - Se reproduce solo cuando la sección está a la vista y se pausa al salir
 *   (IntersectionObserver) o al cambiar de pestaña (visibilitychange), para no
 *   dejar el video sonando/gastando datos fuera de pantalla.
 * - Controles propios (play/pausa, barra de progreso, tiempo, silencio,
 *   pantalla completa) sobre el iframe, con `controls: 0` de YouTube.
 * - Móvil (Android/iOS): arranca en silencio + `playsinline`, que es lo único
 *   que los navegadores permiten autoreproducir; hay un botón visible para
 *   activar el sonido. Los controles se muestran al tocar y se ocultan solos.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/* ─── Carga única del script de la IFrame API ─── */
type YouTubeApi = typeof window & { YT?: any; onYouTubeIframeAPIReady?: () => void }
let apiPromise: Promise<any> | null = null

function loadYouTubeApi(): Promise<any> {
  const w = window as YouTubeApi
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise(resolve => {
    const previous = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(w.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })
  return apiPromise
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const userPausedRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  const [shouldLoad, setShouldLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [muted, setMuted] = useState(true)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [fallback, setFallback] = useState(false)

  /* Monta el iframe solo cuando la sección se acerca al viewport. */
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setShouldLoad(true)
          io.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    setCanFullscreen(typeof document !== 'undefined' && !!document.fullscreenEnabled)
  }, [])

  /* Red caída, bloqueador de scripts…: si la API no responde, caemos al embed
     clásico con los controles nativos para no dejar la sección muerta. */
  useEffect(() => {
    if (!shouldLoad || ready) return
    const id = window.setTimeout(() => setFallback(true), 8000)
    return () => window.clearTimeout(id)
  }, [shouldLoad, ready])

  /* Crea el player. El nodo del iframe lo gestionamos nosotros (no React): la
     API sustituye el div que le pasamos, así que se lo damos creado a mano. */
  useEffect(() => {
    if (!shouldLoad) return
    let cancelled = false
    const mount = mountRef.current

    loadYouTubeApi().then(YT => {
      if (cancelled || !mount) return
      const host = document.createElement('div')
      host.className = 'h-full w-full'
      mount.appendChild(host)

      playerRef.current = new YT.Player(host, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          mute: 1,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return
            e.target.mute()
            setDuration(e.target.getDuration() || 0)
            setReady(true)
          },
          onStateChange: (e: any) => {
            if (cancelled) return
            const state = e.data
            setBuffering(state === YT.PlayerState.BUFFERING)
            if (state === YT.PlayerState.PLAYING) {
              setPlaying(true)
              setDuration(e.target.getDuration() || 0)
            } else if (state === YT.PlayerState.PAUSED) {
              setPlaying(false)
            } else if (state === YT.PlayerState.ENDED) {
              // Vuelve a empezar si seguimos en la sección (bucle de vitrina).
              setPlaying(false)
              setCurrent(0)
              e.target.seekTo(0, true)
              if (!userPausedRef.current) e.target.playVideo()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      try { playerRef.current?.destroy?.() } catch { /* el iframe ya no existe */ }
      playerRef.current = null
      if (mount) mount.innerHTML = ''
    }
  }, [shouldLoad, videoId])

  /* Progreso */
  useEffect(() => {
    if (!ready || !playing) return
    const id = window.setInterval(() => {
      const p = playerRef.current
      if (!p?.getCurrentTime) return
      if (!scrubbing) setCurrent(p.getCurrentTime() || 0)
      const d = p.getDuration?.() || 0
      if (d) setDuration(d)
    }, 250)
    return () => window.clearInterval(id)
  }, [ready, playing, scrubbing])

  /* Reproduce al entrar en pantalla, pausa al salir. */
  useEffect(() => {
    if (!ready) return
    const el = wrapperRef.current
    if (!el) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      ([entry]) => {
        const player = playerRef.current
        if (!player) return
        if (entry.intersectionRatio >= 0.45) {
          if (!userPausedRef.current && !reduceMotion) player.playVideo?.()
        } else {
          player.pauseVideo?.()
          // Si el usuario se fue del todo, al volver arranca solo otra vez.
          if (entry.intersectionRatio === 0) userPausedRef.current = false
        }
      },
      { threshold: [0, 0.45, 0.9] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ready])

  /* Pausa si la pestaña deja de estar visible. */
  useEffect(() => {
    if (!ready) return
    const onVisibility = () => {
      if (document.hidden) playerRef.current?.pauseVideo?.()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [ready])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  /* Los controles se esconden solos mientras se reproduce. */
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800)
  }, [])

  useEffect(() => {
    if (!playing) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      setControlsVisible(true)
      return
    }
    revealControls()
    return () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current) }
  }, [playing, revealControls])

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (playing) {
      userPausedRef.current = true
      p.pauseVideo()
    } else {
      userPausedRef.current = false
      p.playVideo()
    }
    revealControls()
  }, [playing, revealControls])

  const toggleMute = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (p.isMuted()) {
      p.unMute()
      p.setVolume(80)
      setMuted(false)
    } else {
      p.mute()
      setMuted(true)
    }
    revealControls()
  }, [revealControls])

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.()
  }, [])

  const seekTo = useCallback((seconds: number) => {
    setCurrent(seconds)
    playerRef.current?.seekTo?.(seconds, true)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Solo atajos cuando el foco está en el contenedor: si no, los botones y la
    // barra de progreso recibirían la tecla dos veces.
    if (e.target !== e.currentTarget) return
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay() }
    else if (e.key === 'm') { e.preventDefault(); toggleMute() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seekTo(Math.min(duration, current + 5)) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seekTo(Math.max(0, current - 5)) }
    else if (e.key === 'f' && canFullscreen) { e.preventDefault(); toggleFullscreen() }
  }

  if (fallback) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-stone-200 bg-black shadow-xl shadow-stone-300/40 dark:border-white/10 dark:shadow-black/40">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1`}
          title={title}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0
  const iconBtn =
    'grid place-items-center rounded-full text-white/90 transition-all hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

  return (
    <div
      ref={wrapperRef}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title}
      className={cn(
        'group relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black shadow-xl shadow-stone-300/40 outline-none',
        'border border-stone-200 focus-visible:ring-2 focus-visible:ring-[#D1400F] focus-visible:ring-offset-2',
        'dark:border-white/10 dark:shadow-black/40 dark:focus-visible:ring-offset-black',
        isFullscreen && 'rounded-none border-0',
      )}
    >
      {/* Póster mientras carga la API */}
      {!ready && (
        /* eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube, no pasa por el optimizador */
        <img
          src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* El iframe de YouTube (sin controles nativos) */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />

      {/* Capa de clic: toca el centro para pausar/reproducir */}
      <button
        type="button"
        onClick={togglePlay}
        onTouchStart={revealControls}
        aria-label={playing ? 'Pausar video' : 'Reproducir video'}
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
      />

      {/* Botón grande central */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 grid place-items-center transition-all duration-300',
          playing && !buffering ? 'scale-90 opacity-0' : 'scale-100 opacity-100',
        )}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#D1400F]/95 text-white shadow-[0_10px_40px_rgba(209,64,15,0.45)] backdrop-blur-sm sm:h-20 sm:w-20">
          {buffering
            ? <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" />
            : <Play className="ml-1 h-7 w-7 fill-white sm:h-9 sm:w-9" />}
        </span>
      </div>

      {/* Aviso de sonido: el autoplay solo se permite en silencio */}
      {ready && muted && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md transition-all hover:bg-black/80 active:scale-95 sm:text-xs"
        >
          <VolumeX className="h-3.5 w-3.5" />
          Activar sonido
        </button>
      )}

      {/* Barra de controles */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-10 transition-all duration-300 sm:px-4 sm:pb-4',
          controlsVisible || !playing ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          disabled={!ready || !duration}
          onChange={e => { setScrubbing(true); setCurrent(Number(e.target.value)) }}
          onPointerUp={e => { setScrubbing(false); seekTo(Number((e.target as HTMLInputElement).value)) }}
          onKeyUp={e => { setScrubbing(false); seekTo(Number((e.target as HTMLInputElement).value)) }}
          aria-label="Progreso del video"
          className={cn(
            'h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-white/70',
            '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md',
            '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
          )}
          style={{ background: `linear-gradient(to right, #D1400F ${pct}%, rgba(255,255,255,0.28) ${pct}%)` }}
        />

        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} className={cn(iconBtn, 'h-9 w-9 shrink-0')}>
            {playing ? <Pause className="h-[18px] w-[18px] fill-current" /> : <Play className="h-[18px] w-[18px] fill-current" />}
          </button>

          <button type="button" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className={cn(iconBtn, 'h-9 w-9 shrink-0')}>
            {muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
          </button>

          <span className="ml-0.5 font-mono text-[11px] tabular-nums text-white/90 sm:text-xs">
            {formatTime(current)} <span className="text-white/45">/ {formatTime(duration)}</span>
          </span>

          <span className="ml-auto hidden text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:inline">
            FoodIX
          </span>

          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className={cn(iconBtn, 'h-9 w-9 shrink-0 sm:ml-2')}
            >
              {isFullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
