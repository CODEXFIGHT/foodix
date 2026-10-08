import type { Metadata } from 'next'
import Link from 'next/link'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'Política de Cookies — FoodIX',
}

export default function CookiesPage() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-stone-50">
      <header className="bg-[#1C1917] text-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-lg bg-[#E85D04] text-white font-bold flex items-center justify-center font-heading flex-shrink-0 shadow-sm border border-stone-100/10"
              style={{ width: 28, height: 28, fontSize: `${28 * 0.55}px` }}
            >
              R
            </div>
            <Link href="/" className="inline-block font-bold animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
              Restaur<span className="text-[#E85D04]">OS</span><sup className="text-[0.55em] align-super">©</sup>
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-300 text-sm truncate">Política de Cookies</span>
          </div>
          <Link href="/login" className="text-sm bg-[#E85D04] hover:bg-[#C44D00] px-4 py-1.5 rounded-lg font-medium transition-colors shrink-0">
            Ir al sistema →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-stone-900 mb-2">Política de Cookies</h1>
          <p className="text-stone-500 text-sm mb-8">Última actualización: Junio 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-stone-700">

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">¿Qué son las cookies?</h2>
              <p>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en su
                dispositivo cuando los visita. Se utilizan ampliamente para hacer que los sitios
                web funcionen de manera más eficiente, así como para proporcionar información
                a los propietarios del sitio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">¿Qué almacena FoodIX?</h2>
              <p>
                FoodIX utiliza principalmente <strong>almacenamiento local (localStorage)</strong> del
                navegador, no cookies en sentido tradicional. A continuación se detalla qué información
                se almacena en su dispositivo:
              </p>

              <div className="mt-4 space-y-3">
                {[
                  {
                    name: 'foodix_token',
                    type: 'localStorage',
                    purpose: 'Token de autenticación JWT. Necesario para mantener su sesión iniciada sin tener que ingresar su contraseña cada vez.',
                    duration: 'Se elimina al cerrar sesión o después de 24 horas',
                    essential: true,
                  },
                  {
                    name: 'foodix_device_uid',
                    type: 'localStorage',
                    purpose: 'Identificador único de su dispositivo. Permite al sistema recordar que este dispositivo ha sido aprobado para acceder al sistema.',
                    duration: 'Permanente hasta que el usuario lo elimine manualmente',
                    essential: true,
                  },
                  {
                    name: 'foodix_branch_id',
                    type: 'localStorage',
                    purpose: 'Identificador de la sucursal activa. Permite cargar los datos correctos del negocio tras iniciar sesión.',
                    duration: 'Se actualiza al iniciar sesión; se elimina al cerrar sesión',
                    essential: true,
                  },
                  {
                    name: 'foodix_device_name',
                    type: 'localStorage',
                    purpose: 'Nombre amigable que el usuario asigna a este dispositivo (p. ej. "Caja 1"). Se muestra en el panel de dispositivos y en los tickets.',
                    duration: 'Permanente hasta que el usuario lo cambie o elimine',
                    essential: false,
                  },
                  {
                    name: 'foodix_config',
                    type: 'localStorage',
                    purpose: 'Preferencias de configuración de la interfaz (nombre del negocio, dirección, teléfono, pie y logo del ticket, moneda). Permite personalizar la experiencia sin consultar el servidor.',
                    duration: 'Permanente hasta que el usuario lo elimine',
                    essential: false,
                  },
                  {
                    name: 'foodix_printer',
                    type: 'localStorage',
                    purpose: 'Configuración de la impresora térmica (modo de impresión, ancho de papel 58/80 mm y conexión). Se guarda solo en este dispositivo.',
                    duration: 'Permanente hasta que el usuario lo elimine',
                    essential: false,
                  },
                  {
                    name: 'foodix_cart',
                    type: 'localStorage',
                    purpose: 'Carrito temporal para la carta digital pública. Guarda los artículos seleccionados antes de enviar el pedido.',
                    duration: 'Se limpia al enviar el pedido',
                    essential: false,
                  },
                ].map(item => (
                  <div key={item.name} className="border rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="bg-stone-100 px-2 py-0.5 rounded text-xs font-mono text-stone-800">
                        {item.name}
                      </code>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {item.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.essential ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                        {item.essential ? 'Esencial' : 'Funcional'}
                      </span>
                    </div>
                    <p className="text-stone-600">{item.purpose}</p>
                    <p className="text-stone-400 text-xs"><strong>Duración:</strong> {item.duration}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Cookies de terceros</h2>
              <p>
                FoodIX utiliza imágenes externas del servicio <strong>Icons8</strong> (img.icons8.com)
                para la interfaz gráfica. Este servicio puede establecer sus propias cookies o registrar
                las solicitudes de imagen. Recomendamos revisar la{' '}
                <a href="https://icons8.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#E85D04]">
                  política de privacidad de Icons8
                </a>.
              </p>
              <p className="mt-2">
                Durante la contratación de una suscripción, el pago se realiza a través de{' '}
                <strong>Stripe</strong>, que puede establecer sus propias cookies necesarias para
                procesar el cobro de forma segura. Consulte la{' '}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#E85D04]">
                  política de privacidad de Stripe
                </a>.
              </p>
              <p className="mt-2">
                Si el usuario habilita las <strong>notificaciones push</strong>, el navegador genera una
                suscripción (con claves técnicas) que se almacena en nuestro servidor únicamente para
                enviar avisos operativos. El usuario puede revocarlas en cualquier momento desde los
                ajustes del navegador o del sistema.
              </p>
              <p className="mt-2">
                FoodIX <strong>no utiliza</strong> cookies de seguimiento publicitario, redes sociales
                ni servicios de analítica de terceros (como Google Analytics).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Control de almacenamiento</h2>
              <p>
                Puede gestionar o eliminar el almacenamiento local desde las herramientas de
                desarrollo de su navegador:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li><strong>Chrome:</strong> F12 → Application → Local Storage → foodix*</li>
                <li><strong>Firefox:</strong> F12 → Storage → Local Storage</li>
                <li><strong>Safari:</strong> Develop → Web Inspector → Storage</li>
              </ul>
              <p className="mt-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-xs">
                ⚠ Eliminar <code>foodix_token</code> cerrará su sesión inmediatamente.
                Eliminar <code>foodix_device_uid</code> requerirá que el administrador apruebe
                nuevamente su dispositivo.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Base legal</h2>
              <p>
                El almacenamiento local esencial (token y device_uid) se basa en el <strong>interés
                legítimo</strong> y en la <strong>necesidad contractual</strong> para la prestación del
                servicio. Sin estos datos, el sistema no puede funcionar correctamente.
              </p>
              <p className="mt-2">
                El almacenamiento funcional (config, cart) se basa en el <strong>consentimiento implícito</strong>
                del usuario al usar el sistema.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Contacto</h2>
              <p>
                Para cualquier pregunta sobre nuestra política de cookies, escríbenos a{' '}
                <a href="mailto:foodix@atomicmail.io" className="text-[#E85D04]">foodix@atomicmail.io</a>.
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 flex justify-center gap-6 text-sm text-stone-400">
          <Link href="/privacidad" className="hover:text-stone-700">Aviso de Privacidad</Link>
          <Link href="/terminos" className="hover:text-stone-700">Términos y Condiciones</Link>
          <Link href="/manual" className="hover:text-stone-700">Manual de usuario</Link>
        </div>
      </main>
    </div>
    </PageTransition>
  )
}
