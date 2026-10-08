/**
 * @fileoverview Proveedor de tema claro/oscuro basado en next-themes
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
