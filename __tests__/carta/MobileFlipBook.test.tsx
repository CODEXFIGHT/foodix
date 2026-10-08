import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('swiper/swiper.css', () => ({}));
vi.mock('swiper/modules', () => ({ Pagination: {}, A11y: {} }));
vi.mock('swiper/react', () => ({
  Swiper: ({ children, onSwiper }: { children: React.ReactNode; onSwiper?: (s: unknown) => void }) => {
    if (onSwiper) onSwiper({ slideTo: vi.fn(), activeIndex: 0 });
    return <div data-testid="swiper">{children}</div>;
  },
  SwiperSlide: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="swiper-slide">{children}</div>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/lib/data/menuData', () => {
  const items = [
    { id: 'i1', name: 'Tacos al Pastor', description: 'Desc 1', price: 89, image: '/i1.jpg', images: ['/i1.jpg'], categoryId: 'cat-tacos', ingredients: [], allergens: [], tags: [], prepTime: 10, calories: 300, serves: 1, spiceLevel: 1 as const },
    { id: 'i2', name: 'Guacamole', description: 'Desc 2', price: 65, image: '/i2.jpg', images: ['/i2.jpg'], categoryId: 'cat-entradas', ingredients: [], allergens: [], tags: [], prepTime: 5, calories: 150, serves: 2, spiceLevel: 0 as const },
    { id: 'i3', name: 'Café Americano', description: 'Desc 3', price: 35, image: '/i3.jpg', images: ['/i3.jpg'], categoryId: 'cat-bebidas', ingredients: [], allergens: [], tags: [], prepTime: 3, calories: 10, serves: 1, spiceLevel: 0 as const },
  ];
  const categories = [
    { id: 'cat-tacos', name: 'Tacos', emoji: '🌮', icon: '' },
    { id: 'cat-entradas', name: 'Entradas', emoji: '🥗', icon: '' },
    { id: 'cat-bebidas', name: 'Bebidas', emoji: '🥤', icon: '' },
  ];
  return {
    MENU_ITEMS: items,
    MENU_CATEGORIES: categories,
    MENU_HERO_IMAGE: '/hero.jpg',
    BADGE_CONFIG: { Popular: { label: 'Popular', bg: 'bg-orange-100 text-orange-700' } },
  };
});

import { MobileFlipBook } from '@/app/carta/MobileFlipBook';

describe('MobileFlipBook — renderizado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza el componente Swiper', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    expect(screen.getByTestId('swiper')).toBeInTheDocument();
  });

  it('renderiza slides', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    expect(screen.getAllByTestId('swiper-slide').length).toBeGreaterThan(0);
  });

  it('muestra productos del menú', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    expect(screen.getByText('Tacos al Pastor')).toBeInTheDocument();
  });

  it('muestra precio de producto', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    expect(screen.getByText('$89')).toBeInTheDocument();
  });

  it('llama onItemClick al hacer click en "Ver más"', () => {
    const onItemClick = vi.fn();
    render(<MobileFlipBook selectedCat={null} onItemClick={onItemClick} />);
    const verMasBtns = screen.getAllByText('Ver más');
    fireEvent.click(verMasBtns[0]);
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tacos al Pastor' }));
  });

  it('muestra botones de navegación Prev/Next', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
  });

  it('muestra indicador de página (formato X / Y)', () => {
    render(<MobileFlipBook selectedCat={null} onItemClick={vi.fn()} />);
    // Page counter format: "X / Y"
    expect(screen.getByText(/\d+ \/ \d+/)).toBeInTheDocument();
  });

  it('filtra items cuando selectedCat no es null', () => {
    render(<MobileFlipBook selectedCat="cat-bebidas" onItemClick={vi.fn()} />);
    expect(screen.getByText('Café Americano')).toBeInTheDocument();
  });
});
