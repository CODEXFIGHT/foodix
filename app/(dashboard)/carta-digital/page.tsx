/**
 * @fileoverview Página de carta digital integrada en el dashboard
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Share2, ExternalLink, Smartphone, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProducts, useCategories } from '@/lib/api/queries';
import { Icons8Image } from '@/components/shared/Icons8Image';
import { ICONS8 } from '@/lib/constants/icons';
import { PushNotificationToggle } from '@/components/settings/PushNotificationToggle';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  mesero: 'Mesero',
  cocina: 'Cocina',
  superadmin: 'Superadmin',
};

export default function CartaDigitalPage() {
  const user = useAuthStore(s => s.user);
  const branch = useAuthStore(s => s.branch);
  const slug = branch?.slug ?? '';
  const branchId = branch?.id ?? null;

  const { data: products } = useProducts(branchId);
  const { data: categories } = useCategories(branchId);

  const [cartaUrl, setCartaUrl] = useState('');

  // La carta real de la sucursal vive en /carta/{slug}.
  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      setCartaUrl(`${window.location.origin}/carta/${slug}`);
    }
  }, [slug]);

  const handleShare = async () => {
    if (!cartaUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Carta Digital · FoodIX',
          text: 'Escanea el código QR o abre el enlace para ver nuestra carta digital interactiva.',
          url: cartaUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      window.open(cartaUrl, '_blank', 'noopener,noreferrer');
      toast.info('Tu navegador no permite compartir desde aquí. Abrimos la carta en una nueva pestaña.');
    }
  };

  const totalProducts = products?.length ?? 0;
  const totalCategories = categories?.length ?? 0;
  const totalPromos = (products ?? []).filter(p => p.badge === 'Promo').length;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <PageHeader
        title="Carta Digital"
        description="Comparte el menú con tus clientes mediante código QR o enlace directo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

        {/* ── QR Card ── */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up">
          {/* orange header */}
          <div className="bg-[#FACC15] px-5 py-4 text-stone-950 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Icons8Image src={ICONS8.carta} alt="Menú por categorías" size={34} />
            </div>
            <p className="font-bold text-lg leading-tight">Código QR</p>
            <p className="text-white/80 text-xs mt-0.5">
              Muestra este código al comensal para que acceda a la carta
            </p>
          </div>

          {/* QR + URL */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white">
            <div className="p-4 rounded-2xl border-2 border-stone-100 shadow-inner bg-white">
              {cartaUrl ? (
                <QRCode
                  value={cartaUrl}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#1C1917"
                  level="M"
                  style={{ display: 'block' }}
                />
              ) : (
                <div className="h-[200px] w-[200px] bg-stone-100 rounded animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-2 w-full max-w-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl">
              <BookOpen className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
              <span className="text-xs text-stone-600 truncate font-mono">{cartaUrl || 'Generando enlace…'}</span>
            </div>
          </div>
        </div>

        {/* ── Actions + Info ── */}
        <div className="flex flex-col gap-4 animate-fade-in-up delay-100">
          {/* instruction card */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Smartphone className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-0.5">
                Instrucción para el comensal
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                &quot;Escanea el código QR con la cámara de tu teléfono o abre el enlace para consultar nuestra carta digital interactiva.&quot;
              </p>
            </div>
          </div>

          {/* action buttons */}
          <div className="grid grid-cols-1 gap-2.5">
            <Button
              onClick={handleShare}
              variant="outline"
              className="h-11 gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartir carta
            </Button>

            <Button asChild variant="brand" className="h-11 gap-2">
              <a href={cartaUrl || '#'} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir carta en nueva pestaña
              </a>
            </Button>
          </div>

          <PushNotificationToggle
            label={ROLE_LABEL[user?.role ?? ''] ?? 'Este rol'}
            compact
            context={{ userId: user?.id, role: user?.role, branchId }}
          />

          {/* mini stats */}
          <div className="grid grid-cols-3 gap-2.5 mt-auto">
            {[
              { icon: ICONS8.cartaCategories, value: totalCategories, label: 'Categorías' },
              { icon: ICONS8.cartaDishes,     value: totalProducts,   label: 'Platillos' },
              { icon: ICONS8.cartaPromos,     value: totalPromos,      label: 'Promos activas' },
            ].map(({ icon, value, label }) => (
              <div
                key={label}
                className="bg-card border rounded-xl p-3 text-center"
              >
                <Icons8Image src={icon} alt={label} size={28} className="mx-auto mb-1" />
                <p className="text-lg font-extrabold text-stone-800 leading-none dark:text-white">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
