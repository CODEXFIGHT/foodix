/**
 * @fileoverview Utilidad para combinar clases de Tailwind CSS con clsx y twMerge
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
