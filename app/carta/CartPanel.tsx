/**
 * @fileoverview Panel deslizante del carrito de compras en la carta digital
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ClipboardList, ChevronUp, X, Minus, Plus, Send, MapPin, MessageSquare, PackageOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { useCartStore, cartTotal, cartItemCount, type CartItem } from '@/lib/stores/cartStore';

// ── CartItemRow ───────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm">
      {/* image */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
        {imgError || !item.image ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">{item.comboId ? '🥡' : '🍽️'}</span>
          </div>
        ) : (
          <Image
            src={item.image}
            alt={item.productName}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            unoptimized
            sizes="56px"
          />
        )}
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.comboId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-stone-900 shrink-0">
              <PackageOpen className="h-2.5 w-2.5" /> Paquete
            </span>
          )}
          <p className="text-sm font-bold text-stone-800 line-clamp-1">{item.productName}</p>
        </div>
        {/* Un paquete se cobra como bloque: se lista lo que trae para que el
            cliente confirme el contenido sin abrir de nuevo el detalle. */}
        {item.includes?.length ? (
          <p className="text-[11px] text-stone-400 line-clamp-2">{item.includes.join(' · ')}</p>
        ) : (
          <p className="text-[11px] text-stone-400">${item.unitPrice.toFixed(2)} c/u</p>
        )}
        <p className="text-sm font-extrabold text-yellow-700 dark:text-yellow-400">
          ${(item.unitPrice * item.quantity).toFixed(2)}
        </p>
      </div>

      {/* qty stepper */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => item.quantity === 1 ? onRemove() : onUpdateQty(item.quantity - 1)}
          className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center transition-all active:scale-90 hover:bg-red-50 hover:text-red-500"
        >
          {item.quantity === 1 ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </button>
        <span className="text-sm font-bold w-5 text-center text-stone-800">{item.quantity}</span>
        <button
          onClick={() => onUpdateQty(item.quantity + 1)}
          className="w-7 h-7 rounded-full bg-[#FACC15]/10 text-yellow-700 dark:text-yellow-400 flex items-center justify-center transition-all active:scale-90 hover:bg-[#FACC15]/20"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── CartPanel ─────────────────────────────────────────────────────────────────
export function CartPanel() {
  const { items, tableNumber, notes, setTableNumber, setNotes, removeItem, updateQty, clearCart } =
    useCartStore();
  const [isOpen, setIsOpen]   = useState(false);
  const [sending, setSending] = useState(false);

  const total = cartTotal(items);
  const count = cartItemCount(items);
  // Con paquetes en el carrito, "platillos" se queda corto (un paquete lleva
  // varios productos): se usa un sustantivo neutro.
  const unidad = items.some(i => i.comboId)
    ? (count === 1 ? 'artículo' : 'artículos')
    : (count === 1 ? 'platillo' : 'platillos');

  if (items.length === 0) return null;

  const handleSend = async () => {
    if (!tableNumber.trim()) {
      toast.error('Indica el número de tu mesa antes de enviar');
      return;
    }
    setSending(true);
    try {
      clearCart();
      setIsOpen(false);
      toast.success('¡Pedido enviado al mesero! 🎉', {
        description: `Mesa ${tableNumber.trim()} · ${count} ${unidad}`,
        duration: 5000,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* ── Collapsed pill bar ── */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 transition-all duration-300',
          isOpen ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100'
        )}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-[#FACC15] rounded-2xl flex items-center justify-between px-5 py-3.5 shadow-xl shadow-[#FACC15]/35 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ClipboardList className="h-5 w-5 text-stone-950" />
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-yellow-700 text-[9px] font-extrabold rounded-full flex items-center justify-center leading-none">
                {count > 9 ? '9+' : count}
              </span>
            </div>
            <span className="text-stone-950 font-bold text-sm">Ver mi pedido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-950 font-extrabold text-base">${total.toFixed(2)}</span>
            <ChevronUp className="h-4 w-4 text-stone-950/70" />
          </div>
        </button>
      </div>

      {/* ── Full slide-up sheet ── */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 transition-transform duration-400 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '90vh' }}
      >
        <div
          className="bg-[#FAFAF8] rounded-t-3xl shadow-2xl flex flex-col"
          style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* handle */}
          <button
            onClick={() => setIsOpen(false)}
            className="flex justify-center pt-3 pb-1 w-full touch-manipulation"
            aria-label="Cerrar pedido"
          >
            <div className="w-10 h-1 rounded-full bg-stone-300" />
          </button>

          {/* header */}
          <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">Tu pedido</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {count} {unidad} · ${total.toFixed(2)} MXN
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* items list */}
          <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ overscrollBehavior: 'contain' }}>
            <div className="space-y-2.5 pb-2">
              {items.map(item => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQty={(qty) => updateQty(item.productId, qty)}
                  onRemove={() => removeItem(item.productId)}
                />
              ))}
            </div>
          </div>

          {/* footer: table + notes + total + CTA */}
          <div className="shrink-0 border-t border-stone-100 px-5 pt-4 pb-5 space-y-3 bg-[#FAFAF8]">
            {/* table number */}
            <div className="flex items-center gap-2.5 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#CA8A04] focus-within:ring-2 focus-within:ring-[#CA8A04]/20 transition-all">
              <MapPin className="h-4 w-4 text-yellow-700 shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                placeholder="Número de mesa (ej: 5)"
                className="flex-1 text-sm text-stone-800 placeholder:text-stone-400 bg-transparent focus:outline-none"
              />
            </div>

            {/* notes */}
            <div className="flex items-start gap-2.5 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#CA8A04]/60 transition-all">
              <MessageSquare className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas, alergias o instrucciones especiales…"
                rows={2}
                className="flex-1 text-sm text-stone-800 placeholder:text-stone-400 bg-transparent focus:outline-none resize-none"
              />
            </div>

            {/* total + send */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[11px] text-stone-400 font-medium uppercase tracking-wide">Total</p>
                <p className="text-2xl font-extrabold text-yellow-700 leading-none">
                  ${total.toFixed(2)}
                  <span className="text-xs font-normal text-stone-400 ml-1">MXN</span>
                </p>
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-[#FACC15] text-stone-950 font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-[#FACC15]/30 active:scale-95 transition-all disabled:opacity-60 hover:bg-[#EAB308]"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Enviando…' : 'Enviar al mesero'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
