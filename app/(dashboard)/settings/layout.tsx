import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ajustes',
  description: 'Configuración del negocio y preferencias del sistema.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
