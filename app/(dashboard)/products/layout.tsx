import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Productos',
  description: 'Catálogo de productos y gestión del menú.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
