import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categorías',
  description: 'Gestión de categorías del menú.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
