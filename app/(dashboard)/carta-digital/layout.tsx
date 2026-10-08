import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carta Digital',
  description: 'Panel QR y enlace para compartir la carta digital del restaurante.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
