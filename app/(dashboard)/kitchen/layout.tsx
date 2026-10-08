import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cocina',
  description: 'Pantalla Kanban en tiempo real para el equipo de cocina.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
