'use client'

import { useState } from 'react'
import { Icons8Image } from '@/components/shared/Icons8Image'
import { ICONS8 } from '@/lib/constants/icons'
import { cn } from '@/lib/utils/cn'

/**
 * Avatar de una sucursal: muestra su logotipo si lo tiene; si no (o si la
 * imagen falla al cargar), cae al ícono de tienda por defecto.
 */
export function BranchAvatar({
  logoUrl,
  name,
  size = 36,
  className,
}: {
  logoUrl?: string | null
  name?: string
  size?: number
  className?: string
}) {
  const [error, setError] = useState(false)
  const showLogo = Boolean(logoUrl) && !error

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 flex-shrink-0',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={name ?? 'Logo'}
          width={size}
          height={size}
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icons8Image src={ICONS8.branch} alt={name ?? 'Sucursal'} size={Math.round(size * 0.6)} className="opacity-70" />
      )}
    </span>
  )
}
