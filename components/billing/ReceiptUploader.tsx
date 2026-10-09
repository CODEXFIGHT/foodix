'use client'

/**
 * Subida del comprobante de pago SPEI (imagen JPG/PNG/WebP o PDF). Reutilizable
 * por el dashboard "Mi Suscripción" y por el checkout de la landing.
 *
 * No conoce el endpoint: recibe una función `upload(file) => url` y reporta la
 * URL pública resultante vía `onChange`. Ofrece dos disparadores —"Subir
 * archivo" y "Tomar foto" (cámara nativa en móvil con capture)— y muestra
 * vista previa (miniatura para imagen, ficha para PDF), progreso y errores.
 */

import { useId, useRef, useState } from 'react'
import { Camera, FileText, Loader2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf'
const MAX_BYTES = 6 * 1024 * 1024

interface Props {
  value: string
  onChange: (url: string) => void
  upload: (file: File) => Promise<string>
  brand?: string
  className?: string
}

export function ReceiptUploader({ value, onChange, upload, brand = '#D1400F', className }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const id = useId()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)

  const pick = async (file: File | undefined | null) => {
    if (!file) return
    setError(null)
    const okType = /^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type)
    if (!okType) {
      setError('Formato no permitido. Usa una imagen (JPG, PNG, WebP) o un PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('El archivo no puede superar 6MB.')
      return
    }
    setUploading(true)
    try {
      const url = await upload(file)
      onChange(url)
      setName(file.name)
      setIsPdf(file.type === 'application/pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el comprobante. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const clear = () => {
    onChange('')
    setName(null)
    setIsPdf(false)
    setError(null)
    if (fileInput.current) fileInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInput}
        id={`${id}-file`}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />

      {!value ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-200 dark:border-stone-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-900 transition disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo…' : 'Subir archivo'}
          </button>
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 h-11 rounded-lg border border-stone-200 dark:border-stone-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-900 transition disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            Tomar foto
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-2.5">
          {isPdf ? (
            <span className="grid h-12 w-12 place-items-center rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shrink-0">
              <FileText className="h-5 w-5 text-stone-500 dark:text-stone-400" />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Comprobante" className="h-12 w-12 rounded-md object-cover border border-stone-200 dark:border-stone-800 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{name ?? 'Comprobante adjunto'}</p>
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: brand }}>
              Ver comprobante
            </a>
          </div>
          <button type="button" onClick={clear} className="text-stone-400 hover:text-red-500 shrink-0" title="Quitar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2">{error}</p>}
      <p className="text-[11px] text-stone-400 dark:text-stone-500">Imagen (JPG, PNG, WebP) o PDF · máx. 6MB</p>
    </div>
  )
}
