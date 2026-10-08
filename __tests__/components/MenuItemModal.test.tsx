import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItemModal } from '@/app/carta/MenuItemModal';
import type { MenuItem } from '@/lib/data/menuData';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn() }),
}));

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_ITEM: MenuItem = {
  id: 'item-1',
  name: 'Tacos al Pastor',
  description: 'Deliciosos tacos con carne de cerdo marinada',
  price: 89,
  image: '/images/tacos.jpg',
  images: ['/images/tacos.jpg', '/images/tacos2.jpg'],
  categoryId: 'cat-tacos',
  badge: 'Popular',
  ingredients: ['Carne de cerdo', 'Piña', 'Cilantro', 'Cebolla'],
  prepTime: 15,
  calories: 420,
  serves: 1,
  allergens: ['Gluten'],
  spiceLevel: 2,
  tags: ['sin lactosa'],
};

describe('MenuItemModal — renderizado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no renderiza cuando item es null', () => {
    const { container } = render(<MenuItemModal item={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el nombre del platillo', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('Tacos al Pastor')).toBeInTheDocument();
  });

  it('muestra el precio', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('$89')).toBeInTheDocument();
  });

  it('muestra la descripción', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText(/Deliciosos tacos/)).toBeInTheDocument();
  });

  it('muestra el tiempo de preparación', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('muestra las calorías', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('420 kcal')).toBeInTheDocument();
  });

  it('muestra las porciones', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('1 persona')).toBeInTheDocument();
  });

  it('muestra los ingredientes', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('Carne de cerdo')).toBeInTheDocument();
    expect(screen.getByText('Piña')).toBeInTheDocument();
  });

  it('muestra alérgenos', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText(/Gluten/)).toBeInTheDocument();
  });

  it('muestra nivel de picante', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText(/Nivel de picante/i)).toBeInTheDocument();
  });

  it('muestra tags', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('sin lactosa')).toBeInTheDocument();
  });

  it('llama onClose al presionar Cerrar', () => {
    const onClose = vi.fn();
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('llama onClose al presionar Escape', () => {
    const onClose = vi.fn();
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('llama onClose al hacer click en el backdrop', () => {
    const onClose = vi.fn();
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={onClose} />);
    const backdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra badge Popular', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('muestra botón Compartir platillo', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    expect(screen.getByText('Compartir platillo')).toBeInTheDocument();
  });

  it('carrusel muestra la imagen del platillo', () => {
    render(<MenuItemModal item={SAMPLE_ITEM} onClose={vi.fn()} />);
    const imgs = screen.getAllByRole('img');
    const itemImg = imgs.find(img => img.getAttribute('src') === '/images/tacos.jpg');
    expect(itemImg).toBeDefined();
  });
});
