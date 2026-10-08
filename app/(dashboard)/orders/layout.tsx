import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedidos',
  description: 'Gestión de pedidos activos e historial del restaurante.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
