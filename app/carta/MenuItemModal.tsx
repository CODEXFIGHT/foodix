/**
 * @fileoverview Modal de detalle de platillo con carrusel, ingredientes y agregado al carrito
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Clock, Flame, Users, Leaf, Share2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { BADGE_CONFIG, ALLERGEN_CONFIG, type MenuItem } from '@/lib/data/menuData';
import { useCartStore } from '@/lib/stores/cartStore';

const SPICE_CONFIG = [
  { label: 'Sin picante', color: 'text-stone-500 bg-stone-100',  dots: 0 },
  { label: 'Suave',       color: 'text-green-700 bg-green-50',   dots: 1 },
  { label: 'Medio',       color: 'text-amber-700 bg-amber-50',   dots: 2 },
  { label: 'Picante',     color: 'text-red-700 bg-red-50',       dots: 3 },
];

const SLIDE_INTERVAL = 3200;

// ── Carousel ─────────────────────────────────────────────────────────────────

function Carousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx]           = useState(0);
  const [errors, setErrors]     = useState<Set<number>>(new Set());
  const [paused, setPaused]     = useState(false);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (paused || images.length < 2) return;
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, images.length, next]);

  const handleError = (i: number) => setErrors(prev => new Set([...prev, i]));

  return (
    <div
      className="relative h-72 sm:h-80 lg:h-96 overflow-hidden bg-stone-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* slide strip */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {images.map((src, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0 relative overflow-hidden">
            {errors.has(i) ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
                <span className="text-6xl">🍽️</span>
              </div>
            ) : (
              <>
                {/* Fondo borroso de la misma imagen: rellena el espacio sin recortar el platillo */}
                <Image
                  src={src}
                  alt=""
                  aria-hidden
                  fill
                  className="object-cover scale-110 blur-2xl opacity-40"
                  unoptimized
                />
                {/* Imagen completa con un ligero zoom para apreciar el detalle */}
                <Image
                  src={src}
                  alt={`${alt} ${i + 1}`}
                  fill
                  className="object-contain scale-105"
                  onError={() => handleError(i)}
                  unoptimized
                  priority={i === 0}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* prev / next */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Imagen anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Imagen siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* dot indicators */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Imagen ${i + 1}`}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── MenuItemModal ─────────────────────────────────────────────────────────────

export function MenuItemModal({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  const addItem = useCartStore(s => s.addItem);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handler);
    };
  }, [item, onClose]);

  if (!item) return null;

  const badge  = item.badge ? BADGE_CONFIG[item.badge] : null;
  const spice  = SPICE_CONFIG[item.spiceLevel];

  const handleAddToCart = () => {
    addItem(
      { productId: item.id, productName: item.name, image: item.image, unitPrice: item.price },
      qty,
    );
    toast.success(`${item.name} agregado`, {
      description: `${qty} × $${item.price} = $${(item.price * qty).toFixed(2)} MXN`,
      duration: 2500,
    });
    onClose();
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/carta` : 'https://restauros.app/carta';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `${item.description} — $${item.price} MXN`,
          url,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* panel */}
      <div
        className="relative w-full sm:w-[560px] max-h-[92vh] flex flex-col bg-[#FAFAF8] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-modal-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Bottom-sheet handle bar (mobile only) ── */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>
        {/* ── Carousel ── */}
        <div className="relative flex-shrink-0">
          <Carousel images={item.images.length > 0 ? item.images : [item.image]} alt={item.name} />

          {/* close btn */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* badge */}
          {badge && (
            <span
              className={cn(
                'absolute top-3 left-3 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm',
                badge.bg
              )}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Title + price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900 leading-tight">{item.name}</h2>
              <p className="text-sm text-stone-500 mt-1 leading-relaxed">{item.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold text-yellow-700 dark:text-yellow-400 leading-none">${item.price}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">MXN</p>
            </div>
          </div>

          {/* Stat chips (solo los que tienen valor) */}
          {(item.prepTime > 0 || item.calories > 0 || item.serves > 0) && (
            <>
              <div className="flex flex-wrap gap-2">
                {item.prepTime > 0 && <StatChip icon={<Clock className="h-3.5 w-3.5" />} label={`${item.prepTime} min`} title="Tiempo de preparación" />}
                {item.calories > 0 && <StatChip icon={<Flame className="h-3.5 w-3.5" />} label={`${item.calories} kcal`} title="Calorías por porción" />}
                {item.serves > 0 && <StatChip icon={<Users className="h-3.5 w-3.5" />} label={`${item.serves} ${item.serves === 1 ? 'persona' : 'personas'}`} title="Porciones" />}
              </div>
              <Divider />
            </>
          )}

          {/* Spice level */}
          {item.spiceLevel > 0 && (
            <>
              <Section title="Nivel de picante">
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border', spice.color, 'border-current/20')}>
                    {'🌶️'.repeat(item.spiceLevel) || '—'} {spice.label}
                  </span>
                </div>
              </Section>
              <Divider />
            </>
          )}

          {/* Ingredients */}
          {item.ingredients.length > 0 && (
            <>
              <Section title="Ingredientes">
                <div className="flex flex-wrap gap-1.5">
                  {item.ingredients.map(ing => (
                    <span
                      key={ing}
                      className="px-2.5 py-1 bg-stone-100 text-stone-700 text-xs rounded-full border border-stone-200 font-medium"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </Section>
              <Divider />
            </>
          )}

          {/* Allergens */}
          {item.allergens.length > 0 && (
            <>
              <Section title="Alérgenos">
                <div className="flex flex-wrap gap-1.5">
                  {item.allergens.map(a => {
                    const cfg = ALLERGEN_CONFIG[a];
                    return (
                      <span
                        key={a}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                          cfg ? cfg.className : 'bg-stone-100 text-stone-600 border-stone-200'
                        )}
                      >
                        {cfg?.emoji} {a}
                      </span>
                    );
                  })}
                </div>
              </Section>
              <Divider />
            </>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <Section title="Etiquetas">
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200 font-medium"
                  >
                    <Leaf className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Bottom padding for safe area */}
          <div className="h-2" />
        </div>

        {/* ── Footer: qty stepper + add to cart ── */}
        <div
          className="shrink-0 border-t border-stone-100 bg-[#FAFAF8] px-5 pt-3 pb-5 space-y-3"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {/* qty stepper */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-semibold uppercase tracking-wide">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-[#EAB308] hover:text-yellow-700 dark:hover:text-yellow-400 disabled:opacity-30 active:scale-90 transition-all"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xl font-extrabold text-stone-900 w-6 text-center">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(20, q + 1))}
                disabled={qty >= 20}
                className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-[#EAB308] hover:text-yellow-700 dark:hover:text-yellow-400 disabled:opacity-30 active:scale-90 transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* actions */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              aria-label="Compartir"
              className="w-11 h-11 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 active:scale-95 transition-all shrink-0"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleAddToCart}
              className="flex-1 h-11 rounded-xl bg-[#FACC15] text-stone-950 text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#EAB308] active:scale-[0.98] transition-all shadow-md shadow-[#FACC15]/25"
            >
              <ShoppingCart className="h-4 w-4" />
              Agregar · ${(item.price * qty).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatChip({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div title={title} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-700 shadow-sm">
      <span className="text-yellow-700">{icon}</span>
      {label}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-stone-100" />;
}
