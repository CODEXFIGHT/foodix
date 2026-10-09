/**
 * @fileoverview Spinner de carga animado para estados de espera
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { cn } from '@/lib/utils/cn';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn(
        'animate-spin',
        size === 'sm' && 'h-4 w-4',
        size === 'md' && 'h-6 w-6',
        size === 'lg' && 'h-10 w-10',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" className="text-primary" />
    </div>
  );
}

interface AuthOverlayProps {
  message?: string;
}

export function AuthOverlay({ message = 'Cargando...' }: AuthOverlayProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-5 animate-scale-in">
        {/* pulsing ring behind logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full bg-[#D1400F]/20 animate-pulse-ring" />
          <div className="relative h-16 w-16 rounded-2xl bg-[#D1400F] flex items-center justify-center shadow-lg shadow-[#D1400F]/30">
            <span className="text-white font-bold text-2xl select-none">F</span>
            {/* spinning arc overlay */}
            <svg
              className="absolute inset-0 h-full w-full animate-spin-brand"
              viewBox="0 0 64 64"
              fill="none"
            >
              <circle
                cx="32" cy="32" r="30"
                stroke="white" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="60 130"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground tracking-wide">{message}</p>
      </div>
    </div>
  );
}
