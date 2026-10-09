'use client'

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Camera, ImagePlus, Upload, Trash2 } from 'lucide-react'
import { useBranch, useUploadBranchLogo, useRemoveBranchLogo } from '@/lib/api/queries'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

const ACCENT = '#FACC15'

type Variant = 'light' | 'dark'

const styles: Record<Variant, {
  preview: string
  dropzoneIdle: string
  hint: string
  helper: string
  spinnerBg: string
  btn: string
}> = {
  light: {
    preview: 'border bg-muted',
    dropzoneIdle: 'border-border',
    hint: 'text-muted-foreground',
    helper: 'text-muted-foreground',
    spinnerBg: 'bg-white/60',
    btn: 'border border-input bg-background text-foreground hover:bg-accent/10',
  },
  dark: {
    preview: 'border border-white/10 bg-white/5',
    dropzoneIdle: 'border-white/15',
    hint: 'text-neutral-400',
    helper: 'text-neutral-400',
    spinnerBg: 'bg-black/60',
    btn: 'border border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white',
  },
}

/**
 * Subida de logotipo de sucursal reutilizable.
 * - Desktop: arrastrar y soltar (drag & drop).
 * - Móvil: botones para cámara o galería.
 * Funciona en el dashboard (tema claro) y en el panel global (tema oscuro).
 */
export function BranchLogoUploader({
  branchId,
  variant = 'light',
  helperText = 'El logo aparecerá en la pantalla de inicio de sesión del equipo de esta sucursal.',
}: {
  branchId: number
  variant?: Variant
  helperText?: string
}) {
  const s = styles[variant]
  const { data: branch } = useBranch(branchId)
  const uploadLogo = useUploadBranchLogo()
  const removeLogo = useRemoveBranchLogo()

  const [preview, setPreview] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const currentLogo = preview ?? branch?.logo_url ?? null

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecciona una imagen'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo no puede superar 2MB'); return }
    setPreview(URL.createObjectURL(file))
    try {
      await uploadLogo.mutateAsync({ branchId, file })
      toast.success('Logotipo actualizado')
      setPreview(null)
    } catch {
      toast.error('No se pudo subir el logotipo')
      setPreview(null)
    }
  }, [branchId, uploadLogo])

  const onDrop = useCallback((files: File[]) => handleFile(files[0]), [handleFile])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
    noClick: true,
  })

  const handleRemove = async () => {
    try {
      await removeLogo.mutateAsync({ branchId })
      setPreview(null)
      toast.success('Logotipo eliminado')
    } catch {
      toast.error('No se pudo eliminar el logotipo')
    }
  }

  const busy = uploadLogo.isPending || removeLogo.isPending

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      {/* Vista previa */}
      <div className={cn(
        'relative w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0',
        s.preview,
      )}>
        {currentLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentLogo} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <Icons8Image src={ICONS8.restaurantDefault} alt="Sin logo" size={56} />
        )}
        {busy && (
          <div className={cn('absolute inset-0 flex items-center justify-center', s.spinnerBg)}>
            <div className="animate-spin h-5 w-5 border-2 rounded-full"
              style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Zona de carga */}
      <div className="flex-1 w-full">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />

        <div {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-4 transition-colors',
            isDragActive ? 'bg-[#FACC15]/5 border-[#EAB308]' : s.dropzoneIdle,
          )}>
          <input {...getInputProps()} />
          <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
            <span className={cn('hidden sm:flex items-center gap-2 text-sm', s.hint)}>
              <Upload className="h-4 w-4" />
              {isDragActive ? 'Suelta el logo…' : 'Arrastra tu logo aquí o'}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" size="sm" className={cn('flex-1 sm:flex-none', s.btn)}
                disabled={busy} onClick={() => cameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1.5" /> Cámara
              </Button>
              <Button type="button" size="sm" className={cn('flex-1 sm:flex-none', s.btn)}
                disabled={busy} onClick={() => galleryRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-1.5" /> Galería
              </Button>
            </div>
          </div>
          <p className={cn('text-xs mt-2 text-center', s.helper)}>
            JPG, PNG o WebP · máx. 2MB · recomendado cuadrado (512×512px)
          </p>
        </div>

        {branch?.logo_url && (
          <button type="button" onClick={handleRemove} disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Quitar logotipo (usar ícono por defecto)
          </button>
        )}
        {helperText && (
          <p className={cn('text-xs mt-2', s.helper)}>{helperText}</p>
        )}
      </div>
    </div>
  )
}
