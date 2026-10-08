import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mesas',
  description: 'Estado y gestión de mesas del restaurante.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
