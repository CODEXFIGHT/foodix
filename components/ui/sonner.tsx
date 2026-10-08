/**
 * @fileoverview Configuración del sistema de notificaciones toast (shadcn/ui + sonner)
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      expand
      closeButton
      gap={8}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card ' +
            'group-[.toaster]:text-card-foreground ' +
            'group-[.toaster]:border-border ' +
            'group-[.toaster]:shadow-xl group-[.toaster]:shadow-stone-200/20 dark:group-[.toaster]:shadow-none ' +
            'group-[.toaster]:rounded-2xl group-[.toaster]:text-sm group-[.toast]:p-4 ' +
            'group-[.toast]:items-start group-[.toast]:gap-3.5 group-[.toast]:relative',
          title:       'group-[.toast]:font-bold group-[.toast]:text-foreground group-[.toast]:text-[15px]',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:leading-relaxed',
          actionButton:
            'group-[.toast]:bg-brand group-[.toast]:text-white group-[.toast]:rounded-lg font-semibold active:scale-[0.98] transition-transform',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg font-semibold',
          closeButton:
            'group-[.toast]:border-none group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground group-[.toast]:absolute group-[.toast]:top-3.5 group-[.toast]:right-3.5 transition-colors',
          error:
            'group-[.toaster]:border-rose-500/30 dark:group-[.toaster]:border-rose-500/20 text-rose-500',
          success:
            'group-[.toaster]:border-emerald-500/30 dark:group-[.toaster]:border-emerald-500/20 text-emerald-500',
          warning:
            'group-[.toaster]:border-amber-500/30 dark:group-[.toaster]:border-amber-500/20 text-amber-500',
          info:
            'group-[.toaster]:border-blue-500/30 dark:group-[.toaster]:border-blue-500/20 text-blue-500',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
