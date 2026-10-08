'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Marca de la sucursal: muestra el logotipo subido por el restaurante y, si no
 * hay logo (o falla la carga), cae al ícono de FoodIX. Se usa en el sidebar,
 * el topbar móvil y las pantallas de cocina. Bien adaptado a desktop y móvil.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/authStore'

interface BrandLogoProps {
  /** Tamaño del logo en px (cuadrado). */
  size?: number
  /** Mostrar el nombre de la sucursal junto al logo. */
  showName?: boolean
  className?: string
  nameClassName?: string
  /** Invierte el ícono FoodIX de respaldo para fondos oscuros. */
  invertFallback?: boolean
  /** Ignora el logo/nombre de la sucursal y siempre muestra la marca oficial FoodIX. */
  forceFoodIX?: boolean
}

export function BrandLogo({
  size = 32,
  showName = false,
  className,
  nameClassName,
  invertFallback = false,
  forceFoodIX = false,
}: BrandLogoProps) {
  const branch = useAuthStore(s => s.branch)
  const [error, setError] = useState(false)
  const hasLogo = !forceFoodIX && Boolean(branch?.logo_url) && !error

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {hasLogo ? (
        <Image
          src={branch!.logo_url!}
          alt={branch?.name ?? 'Logo'}
          width={size}
          height={size}
          unoptimized
          onError={() => setError(true)}
          className="rounded-lg object-contain flex-shrink-0 bg-white/5"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-lg bg-[#E85D04] text-white font-bold flex items-center justify-center font-heading flex-shrink-0 shadow-sm border border-stone-100/10"
          style={{ width: size, height: size, fontSize: `${size * 0.55}px` }}
        >
          R
        </div>
      )}

      {showName && (
        <span className={cn('relative inline-block font-bold tracking-tight truncate', nameClassName)}>
          {forceFoodIX || !branch?.name ? (
            <span className="inline-block animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
              Restaur<span className="text-[#E85D04]">OS</span><sup className="text-[0.55em] align-super">©</sup>
            </span>
          ) : branch.name}
        </span>
      )}
    </div>
  )
}
