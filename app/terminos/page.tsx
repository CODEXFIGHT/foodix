import type { Metadata } from 'next'
import Link from 'next/link'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — FoodIX',
}

export default function TerminosPage() {
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
            <span className="text-stone-300 text-sm truncate">Términos y Condiciones</span>
          </div>
          <Link href="/login" className="text-sm bg-[#E85D04] hover:bg-[#C44D00] px-4 py-1.5 rounded-lg font-medium transition-colors shrink-0">
            Ir al sistema →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-stone-900 mb-2">Términos y Condiciones de Uso</h1>
          <p className="text-stone-500 text-sm mb-8">Última actualización: Junio 2026</p>

          <div className="space-y-6 text-sm leading-relaxed text-stone-700">

            <div className="bg-stone-50 border rounded-xl p-4 text-xs text-stone-500">
              Por favor, lea detenidamente estos Términos y Condiciones antes de utilizar FoodIX.
              Al acceder o usar el servicio, usted acepta quedar vinculado por estos términos.
            </div>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">1. Partes del contrato</h2>
              <p>
                El presente contrato se celebra entre <strong>CodexFight</strong> (proveedor del
                servicio FoodIX) y el <strong>Cliente</strong> (persona física o moral que contrata
                y utiliza el sistema). Cada usuario registrado en el sistema también queda sujeto a
                estos términos en lo que respecta al uso personal del sistema.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">2. Descripción del servicio</h2>
              <p>
                FoodIX es un sistema de punto de venta (POS) en línea diseñado para la gestión de
                restaurantes y negocios de alimentos. El servicio incluye, según el plan contratado:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Módulo de pedidos, gestión de mesas y tipos de pedido (mesa, para llevar y domicilio)</li>
                <li>Pantalla de cocina (KDS) con estaciones caliente y fría</li>
                <li>Gestión de carta y menú con carga de imágenes y precios fijos, abiertos o por peso (kg)</li>
                <li>Carta digital pública por sucursal y modificadores de productos</li>
                <li>Impresión de tickets en impresoras térmicas (ESC/POS) y vista previa del ticket</li>
                <li>Acceso rápido por PIN para el personal y control de acceso por dispositivo</li>
                <li>Gestión de clientes, reservaciones, repartidores e inventario/compras</li>
                <li>Corte de caja, reportes de ventas y análisis básico</li>
                <li>Notificaciones push de operación (nuevos pedidos y alertas)</li>
                <li>Panel de administración multi-sucursal</li>
                <li>Soporte por correo electrónico</li>
              </ul>
              <p className="mt-2 text-xs text-stone-500">
                Las funcionalidades pueden variar y evolucionar con el tiempo según el plan contratado y
                las actualizaciones del producto.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">3. Registro y cuentas de usuario</h2>
              <p>
                El Cliente es responsable de mantener la confidencialidad de las credenciales de acceso
                (usuario, contraseña y PIN de acceso rápido) de todos los usuarios de su sucursal. Las
                contraseñas y los PIN se almacenan siempre cifrados y nunca en texto plano. FoodIX no
                será responsable por pérdidas derivadas del uso no autorizado de cuentas por descuido en
                el manejo de dichas credenciales.
              </p>
              <p className="mt-2">
                El Cliente se compromete a proporcionar información veraz y actualizada al momento
                del registro. Cualquier información falsa puede resultar en la cancelación del servicio.
              </p>
              <p className="mt-2">
                El sistema de <strong>aprobación de dispositivos</strong> es una medida de seguridad.
                El Cliente es responsable de aprobar o rechazar los dispositivos que intenten acceder
                a su sucursal.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">4. Suscripción y pagos</h2>
              <p>
                El acceso a FoodIX requiere una suscripción activa. Los planes disponibles son:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li><strong>Prueba gratuita:</strong> período de prueba de 14 días, sin tarjeta, disponible
                  una sola vez por negocio o cliente elegible. FoodIX aplica mecanismos de validación
                  de identidad para proteger el uso adecuado del servicio.</li>
                <li><strong>Starter, Pro, AI y MultiSucursal:</strong> planes de pago con diferentes límites de dispositivos y funcionalidades</li>
              </ul>
              <p className="mt-2">
                Al terminar el período de prueba, o una vez vencida la suscripción, el acceso a los
                módulos operativos quedará restringido hasta contratar o renovar un plan. Los datos del
                cliente NO se eliminan: se conservan durante 12 meses adicionales y siguen disponibles
                al reactivar el servicio.
              </p>
              <p className="mt-2">
                Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA cuando aplica.
                El Cliente acepta los precios vigentes al momento de la contratación.
              </p>
              <p className="mt-2">
                Los pagos de suscripción se procesan a través de la pasarela <strong>Stripe</strong>.
                FoodIX no almacena números de tarjeta ni datos financieros sensibles; dicha
                información es tratada directamente por el procesador de pagos bajo el estándar PCI-DSS.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">5. Uso aceptable</h2>
              <p>El Cliente se compromete a utilizar FoodIX únicamente para fines legítimos. Queda prohibido:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Intentar vulnerar la seguridad del sistema o de otros usuarios</li>
                <li>Usar el sistema para actividades ilícitas o fraudulentas</li>
                <li>Reproducir, vender o sublicenciar el software sin autorización expresa</li>
                <li>Realizar ingeniería inversa del sistema</li>
                <li>Sobrecargar intencionalmente los servidores del servicio</li>
                <li>Compartir credenciales de acceso con personas no autorizadas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">6. Propiedad intelectual</h2>
              <p>
                Todo el código fuente, diseño, interfaces, logotipos y contenido de FoodIX son
                propiedad exclusiva de CodexFight y están protegidos por las leyes de propiedad
                intelectual aplicables. El Cliente recibe únicamente una licencia de uso no exclusiva
                y no transferible durante la vigencia de su suscripción.
              </p>
              <p className="mt-2">
                Los datos del negocio del Cliente (pedidos, menú, ventas) son propiedad del Cliente.
                FoodIX no reclamará derechos sobre dichos datos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">7. Protección de datos y seguridad</h2>
              <p>
                FoodIX aplica medidas de seguridad para proteger la información: cifrado de
                contraseñas y PIN con bcrypt, comunicaciones por HTTPS/TLS, autenticación con tokens de
                vigencia limitada, control de acceso por rol y por dispositivo aprobado, límite de
                intentos de inicio de sesión, consultas parametrizadas contra inyección de SQL y
                validación/optimización de las imágenes cargadas. El detalle completo se describe en el{' '}
                <a href="/privacidad" className="text-[#E85D04]">Aviso de Privacidad</a>.
              </p>
              <p className="mt-2">
                Cuando el Cliente capture datos personales de sus propios comensales o destinatarios
                (clientes frecuentes, reservaciones, entregas a domicilio), el Cliente será el
                responsable de dichos datos y FoodIX actuará como encargado del tratamiento. El
                Cliente se obliga a recabar y tratar esa información conforme a la legislación aplicable
                y a contar con las bases legales necesarias.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">8. Disponibilidad del servicio</h2>
              <p>
                FoodIX procura mantener una disponibilidad del servicio del 99% mensual, excluyendo
                mantenimientos programados. Sin embargo, no garantizamos disponibilidad ininterrumpida.
                No seremos responsables por interrupciones causadas por:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Fallas en la conexión a internet del Cliente</li>
                <li>Mantenimientos de emergencia</li>
                <li>Causas de fuerza mayor</li>
                <li>Fallas en proveedores de infraestructura externos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">9. Limitación de responsabilidad</h2>
              <p>
                En la máxima medida permitida por la ley, CodexFight no será responsable por:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Pérdidas de datos causadas por mal uso del sistema por parte del Cliente</li>
                <li>Daños indirectos, incidentales o consecuentes derivados del uso del servicio</li>
                <li>Pérdidas de ingresos del negocio atribuibles a interrupciones del servicio</li>
                <li>Decisiones de negocio tomadas con base en la información del sistema</li>
              </ul>
              <p className="mt-2">
                La responsabilidad máxima de CodexFight se limitará al monto pagado por el
                Cliente en los 3 meses previos al evento que originó el reclamo.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">10. Terminación del servicio</h2>
              <p>
                Cualquiera de las partes puede terminar el contrato en cualquier momento. CodexFight
                Software se reserva el derecho de suspender o cancelar el servicio sin previo aviso
                en caso de violación de estos términos.
              </p>
              <p className="mt-2">
                Tras la terminación, el Cliente tendrá 30 días para solicitar la exportación de sus
                datos antes de que sean eliminados definitivamente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">11. Modificaciones a los términos</h2>
              <p>
                CodexFight se reserva el derecho de modificar estos Términos y Condiciones en
                cualquier momento. Los cambios materiales serán notificados con al menos 15 días de
                anticipación. El uso continuado del servicio después de la notificación implica la
                aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">12. Ley aplicable y jurisdicción</h2>
              <p>
                Estos Términos y Condiciones se rigen por las leyes de los Estados Unidos Mexicanos.
                Cualquier controversia derivada del presente contrato se someterá a la jurisdicción
                de los tribunales competentes de la Ciudad de México, renunciando las partes a
                cualquier otro fuero que pudiera corresponderles.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">13. Contacto</h2>
              <p>
                Para cualquier consulta sobre estos términos, contáctenos en:
              </p>
              <ul className="list-none ml-4 space-y-1 mt-2">
                <li>📧 <a href="mailto:restauros@atomicmail.io" className="text-[#E85D04]">restauros@atomicmail.io</a></li>
                <li>🌐 <a href="/manual" className="text-[#E85D04]">Manual de usuario</a></li>
              </ul>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 flex justify-center gap-6 text-sm text-stone-400">
          <Link href="/privacidad" className="hover:text-stone-700">Aviso de Privacidad</Link>
          <Link href="/cookies" className="hover:text-stone-700">Política de Cookies</Link>
          <Link href="/manual" className="hover:text-stone-700">Manual de usuario</Link>
        </div>
      </main>
    </div>
    </PageTransition>
  )
}
