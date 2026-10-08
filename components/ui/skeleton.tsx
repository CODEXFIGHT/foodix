/**
 * @fileoverview Componente de skeleton loader para estados de carga (shadcn/ui)
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { cn } from '@/lib/utils/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
