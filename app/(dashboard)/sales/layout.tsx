import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ventas',
  description: 'Reportes de ventas, gráficas e historial de ingresos.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
