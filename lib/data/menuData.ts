/**
 * @fileoverview Datos estáticos del menú completo para la carta digital
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
export type BadgeType = 'Nuevo' | 'Popular' | 'Recomendado' | 'Especialidad' | 'Promo';
export type SpiceLevel = 0 | 1 | 2 | 3;

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images: string[];       // carousel (3 imgs)
  categoryId: string;
  badge?: BadgeType;
  ingredients: string[];
  prepTime: number;       // minutes
  calories: number;       // kcal per serving
  serves: number;
  allergens: string[];
  spiceLevel: SpiceLevel;
  tags: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
  icon: string;
}

// ── Shared configs exported for modal ──────────────────────────────────────

export const BADGE_CONFIG: Record<BadgeType, { label: string; bg: string }> = {
  Popular:      { label: 'Popular',      bg: 'bg-[#E85D04] text-white' },
  Nuevo:        { label: 'Nuevo',        bg: 'bg-emerald-500 text-white' },
  Recomendado:  { label: 'Recomendado',  bg: 'bg-amber-500 text-white' },
  Especialidad: { label: 'Especialidad', bg: 'bg-purple-600 text-white' },
  Promo:        { label: '🎉 Promo',     bg: 'bg-red-500 text-white' },
};

export const ALLERGEN_CONFIG: Record<string, { emoji: string; className: string }> = {
  Gluten:     { emoji: '🌾', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Lácteos:    { emoji: '🥛', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Huevo:      { emoji: '🥚', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  Pescado:    { emoji: '🐟', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  Mariscos:   { emoji: '🦐', className: 'bg-red-50 text-red-700 border-red-200' },
  Cacahuates: { emoji: '🥜', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  Nueces:     { emoji: '🌰', className: 'bg-stone-100 text-stone-700 border-stone-300' },
  Soya:       { emoji: '🫘', className: 'bg-green-50 text-green-700 border-green-200' },
  Apio:       { emoji: '🌿', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Mostaza:    { emoji: '🌻', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  Sulfitos:   { emoji: '🍷', className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

// Nota: los datos de demo (imágenes stock de Unsplash, categorías y platillos
// de ejemplo) se retiraron. La carta real se alimenta de los productos de cada
// sucursal vía /public/menu/{slug}. Aquí solo quedan tipos y config compartida.
