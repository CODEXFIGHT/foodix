/**
 * @fileoverview Contador de visitantes en tiempo real vía localStorage broadcast
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useEffect, useState } from 'react';
import { useVisitorCounter } from '@/hooks/useVisitorCounter';

/** Versión inline para el Topbar — no flota, no estorba. */
export function VisitorCounter() {
  const { count } = useVisitorCounter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count === null) return null;

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
      </span>
      <span className="tabular-nums font-medium">{count.toLocaleString('es-MX')}</span>
      <span>visitas</span>
    </span>
  );
}
