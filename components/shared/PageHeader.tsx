/**
 * @fileoverview Encabezado de página con título, descripción y slot de acciones
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { ReactNode } from 'react';
import React from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold font-heading tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
