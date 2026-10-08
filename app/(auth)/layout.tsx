import type { Metadata } from 'next';
import { PageTransition } from '@/components/shared/PageTransition';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu panel de gestión FoodIX con tus credenciales.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Las pantallas de acceso son de marca y están diseñadas en tema claro.
  // Forzamos los tokens claros para que se vean bien aunque el usuario tenga
  // activado el tema oscuro (evita texto claro sobre fondos claros).
  return (
    <div className="theme-light bg-background min-h-screen">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
