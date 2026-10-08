/**
 * @fileoverview Wrapper de Next/Image para íconos del servicio Icons8
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';
import Image from 'next/image';
import { useState } from 'react';

interface Icons8ImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icons8Image({ src, alt, size = 48, className, style }: Icons8ImageProps) {
  const [error, setError] = useState(false);
  if (error) return <span className={className} style={{ fontSize: size * 0.6, ...style }}>🍽️</span>;
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={style}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
