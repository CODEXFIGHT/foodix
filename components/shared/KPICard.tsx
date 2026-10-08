/**
 * @fileoverview Tarjeta de indicador clave de rendimiento (KPI) — HeroUI
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { ReactNode } from 'react';
import { Card, CardBody } from '@heroui/react';
import { cn } from '@/lib/utils/cn';
import { Icons8Image } from '@/components/shared/Icons8Image';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  iconSrc?: string;
  iconAlt?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
  iconBg?: string;
  borderColor?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, subtitle, icon, iconSrc, iconAlt, trend, className, iconBg, borderColor, onClick }: KPICardProps) {
  return (
    <Card
      isPressable={!!onClick}
      onPress={onClick}
      shadow="sm"
      className={cn('border border-transparent transition-shadow hover:shadow-md', borderColor, className)}
    >
      <CardBody className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {/* Un "pop" sutil cada vez que el valor cambia, en vez de parpadear de golpe
                (misma animación que usan los precios de la carta). key={value} fuerza el
                remount para que la animación se repita en cada actualización. Es CSS puro
                (sin Framer Motion) para no arriesgar mismatches de hidratación en SSR. */}
            <p key={value} className="mt-2 text-3xl font-bold font-heading tracking-tight tabular-nums animate-price-pop">
              {value}
            </p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p className={cn('mt-2 text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-xl transition-transform duration-200 hover:scale-105', iconBg ?? 'bg-primary/10')}>
            {iconSrc ? (
              <Icons8Image src={iconSrc} alt={iconAlt ?? title} size={40} />
            ) : (
              icon
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
