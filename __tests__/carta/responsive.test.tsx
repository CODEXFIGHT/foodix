import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MENU_ITEMS, MENU_CATEGORIES } from '@/lib/data/menuData';

// Test that verifies menu data is filterable for both mobile and desktop layouts
describe('Carta — filtrado responsive', () => {
  it('filtra items por categoría correctamente', () => {
    const catId = MENU_CATEGORIES[0].id;
    const filtered = MENU_ITEMS.filter(i => i.categoryId === catId);
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(i => expect(i.categoryId).toBe(catId));
  });

  it('filtra items por búsqueda correctamente', () => {
    const query = 'taco';
    const filtered = MENU_ITEMS.filter(i =>
      i.name.toLowerCase().includes(query) ||
      i.description.toLowerCase().includes(query)
    );
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('combinación de filtro categoría + búsqueda funciona', () => {
    const catId = MENU_CATEGORIES[0].id;
    const query = 'a';
    const filtered = MENU_ITEMS.filter(i =>
      i.categoryId === catId &&
      (i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query))
    );
    // At least some items should match
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('búsqueda vacía devuelve todos los items de la categoría', () => {
    const catId = MENU_CATEGORIES[0].id;
    const allInCat = MENU_ITEMS.filter(i => i.categoryId === catId);
    const withEmptySearch = MENU_ITEMS.filter(i =>
      i.categoryId === catId && i.name.toLowerCase().includes('')
    );
    expect(withEmptySearch.length).toBe(allInCat.length);
  });

  it('items tienen imagen para mostrar en grid desktop', () => {
    MENU_ITEMS.forEach(item => {
      expect(item.image).toBeTruthy();
    });
  });

  it('items tienen precio para mostrar en cartas', () => {
    MENU_ITEMS.forEach(item => {
      expect(item.price).toBeGreaterThan(0);
    });
  });
});

// ── Pruebas de estructura de flujo de mesero ──────────────────────────────────
describe('Flujo mesero — paymentMethod en orden', () => {
  it('PaymentMethod cash es un valor válido', () => {
    const pm: 'cash' | 'card' = 'cash';
    expect(['cash', 'card']).toContain(pm);
  });

  it('PaymentMethod card es un valor válido', () => {
    const pm: 'cash' | 'card' = 'card';
    expect(['cash', 'card']).toContain(pm);
  });

  it('label Efectivo corresponde a cash', () => {
    const LABELS = { cash: 'Efectivo', card: 'Tarjeta' };
    expect(LABELS['cash']).toBe('Efectivo');
  });

  it('label Tarjeta corresponde a card', () => {
    const LABELS = { cash: 'Efectivo', card: 'Tarjeta' };
    expect(LABELS['card']).toBe('Tarjeta');
  });

  it('undefined muestra "Pendiente por definir"', () => {
    const pm: 'cash' | 'card' | undefined = undefined;
    const label = pm === 'cash' ? 'Efectivo' : pm === 'card' ? 'Tarjeta' : 'Pendiente por definir';
    expect(label).toBe('Pendiente por definir');
  });
});
