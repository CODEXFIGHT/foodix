import { describe, it, expect } from 'vitest';
import { MENU_ITEMS, MENU_CATEGORIES, type MenuItem } from '@/lib/data/menuData';

describe('menuData — estructura', () => {
  it('exporta un array de items', () => {
    expect(Array.isArray(MENU_ITEMS)).toBe(true);
    expect(MENU_ITEMS.length).toBeGreaterThan(0);
  });

  it('exporta categorías', () => {
    expect(Array.isArray(MENU_CATEGORIES)).toBe(true);
    expect(MENU_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('cada item tiene los campos obligatorios', () => {
    MENU_ITEMS.forEach((item: MenuItem) => {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(typeof item.price).toBe('number');
      expect(item.price).toBeGreaterThan(0);
      expect(item.categoryId).toBeTruthy();
      expect(Array.isArray(item.images)).toBe(true);
      expect(Array.isArray(item.ingredients)).toBe(true);
      expect(Array.isArray(item.allergens)).toBe(true);
      expect(Array.isArray(item.tags)).toBe(true);
      expect(typeof item.prepTime).toBe('number');
      expect(typeof item.calories).toBe('number');
      expect(typeof item.serves).toBe('number');
    });
  });

  it('spiceLevel es 0-3', () => {
    MENU_ITEMS.forEach((item: MenuItem) => {
      expect([0, 1, 2, 3]).toContain(item.spiceLevel);
    });
  });

  it('cada item pertenece a una categoría válida', () => {
    const catIds = new Set(MENU_CATEGORIES.map(c => c.id));
    MENU_ITEMS.forEach((item: MenuItem) => {
      expect(catIds.has(item.categoryId)).toBe(true);
    });
  });

  it('IDs de items son únicos', () => {
    const ids = MENU_ITEMS.map(i => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('categorías tienen id, name, emoji', () => {
    MENU_CATEGORIES.forEach(cat => {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.emoji).toBeTruthy();
    });
  });

  it('se puede filtrar por categoría', () => {
    const firstCatId = MENU_CATEGORIES[0].id;
    const filtered = MENU_ITEMS.filter(i => i.categoryId === firstCatId);
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(i => expect(i.categoryId).toBe(firstCatId));
  });

  it('se puede filtrar por búsqueda de texto', () => {
    const query = 'a';
    const filtered = MENU_ITEMS.filter(i =>
      i.name.toLowerCase().includes(query) ||
      i.description.toLowerCase().includes(query)
    );
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('imágenes de item no están vacías', () => {
    MENU_ITEMS.forEach((item: MenuItem) => {
      expect(item.image).toBeTruthy();
    });
  });
});
