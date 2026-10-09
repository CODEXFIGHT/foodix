import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageTransition } from '@/components/shared/PageTransition'

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — FoodIX',
}

export default function PrivacidadPage() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-stone-50">
      <header className="bg-[#1C1917] text-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/brand/foodix-icon.svg"
              alt="FoodIX"
              width={28}
              height={28}
              unoptimized
              className="rounded-lg flex-shrink-0 shadow-sm"
            />
            <Link href="/" className="inline-block font-bold animate__animated animate__pulse animate__infinite [--animate-duration:2.4s]">
              Food<span className="text-yellow-700 dark:text-yellow-400">IX</span><sup className="text-[0.55em] align-super">©</sup>
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-stone-300 text-sm truncate">Aviso de Privacidad</span>
          </div>
          <Link href="/login" className="text-sm bg-[#FACC15] hover:bg-[#EAB308] px-4 py-1.5 rounded-lg font-medium transition-colors shrink-0">
            Ir al sistema →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-stone-900 mb-2">Aviso de Privacidad</h1>
          <p className="text-stone-500 text-sm mb-8">Última actualización: Junio 2026</p>

          <div className="prose prose-stone max-w-none text-stone-700 space-y-6 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">1. Responsable del tratamiento</h2>
              <p>
                <strong>CodexFight</strong> (en adelante &quot;FoodIX&quot;, &quot;nosotros&quot; o &quot;la empresa&quot;),
                con domicilio en México, es el responsable del uso y protección de sus datos personales
                en términos de la Ley Federal de Protección de Datos Personales en Posesión de los
                Particulares (LFPDPPP) y su Reglamento.
              </p>
              <p>Contacto de privacidad: <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400">restauros@atomicmail.io</a></p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">2. Doble rol en el tratamiento de datos</h2>
              <p>
                FoodIX actúa bajo dos roles según el tipo de dato:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>
                  <strong>Como responsable:</strong> respecto a los datos de la cuenta del Cliente
                  (titular del restaurante) y de los usuarios que él da de alta (administradores,
                  meseros, cocina).
                </li>
                <li>
                  <strong>Como encargado (procesador):</strong> respecto a los datos personales que el
                  Cliente captura sobre sus propios comensales o destinatarios (por ejemplo, datos de
                  clientes frecuentes, reservaciones o entregas a domicilio). En estos casos, el Cliente
                  es el responsable de dichos datos y FoodIX los trata únicamente por instrucción suya
                  y para operar el servicio.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">3. Datos personales que recabamos</h2>

              <p><strong>3.1 Datos de la cuenta y del personal:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Nombre completo y nombre de usuario</li>
                <li>Correo electrónico</li>
                <li>Número de teléfono (opcional)</li>
                <li>Rol y estación de trabajo (mesero, cocina, administrador)</li>
                <li>Contraseña (almacenada siempre cifrada, nunca en texto plano)</li>
                <li>PIN de acceso rápido (almacenado siempre cifrado, nunca en texto plano)</li>
              </ul>

              <p className="mt-3"><strong>3.2 Datos del negocio:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Nombre del restaurante o establecimiento, dirección y teléfono</li>
                <li>Logotipo e imágenes de productos del menú</li>
                <li>Comprobantes de compras y gastos que el Cliente decida cargar</li>
              </ul>

              <p className="mt-3"><strong>3.3 Datos de comensales y destinatarios (tratados por cuenta del Cliente):</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Nombre, teléfono, correo y dirección de clientes frecuentes (directorio del negocio)</li>
                <li>Datos de reservaciones (nombre, teléfono, número de personas, fecha)</li>
                <li>Datos para entregas a domicilio y, en su caso, de repartidores (nombre y teléfono)</li>
              </ul>

              <p className="mt-3"><strong>3.4 Datos técnicos y de uso:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Identificador único de dispositivo (huella del navegador / device UID)</li>
                <li>Tipo de dispositivo, navegador y sistema operativo (user agent)</li>
                <li>Dirección IP y registros de acceso y actividad dentro del sistema</li>
                <li>Suscripciones de notificaciones push (si el usuario las habilita)</li>
              </ul>

              <p className="mt-3"><strong>3.5 Datos operativos:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Pedidos, ventas, menú, productos, categorías y modificadores</li>
                <li>Inventario, compras, proveedores y recetas</li>
                <li>Cortes de caja y movimientos de efectivo</li>
              </ul>

              <p className="mt-3"><strong>3.6 Datos de pago de la suscripción:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Los cobros de suscripción se procesan a través de la pasarela <strong>Stripe</strong>.
                  FoodIX <strong>no almacena</strong> números de tarjeta ni datos financieros sensibles;
                  estos son tratados directamente por el procesador de pagos bajo el estándar PCI-DSS.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">4. Finalidades del tratamiento</h2>
              <p><strong>Finalidades primarias (necesarias para la prestación del servicio):</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Gestión de cuentas, autenticación por contraseña y por PIN</li>
                <li>Operación del sistema POS (pedidos, mesas, cocina/KDS, caja e impresión de tickets)</li>
                <li>Control de acceso por rol y por dispositivo aprobado</li>
                <li>Gestión de clientes frecuentes, reservaciones y entregas del negocio</li>
                <li>Generación de reportes, estadísticas e inventario del negocio</li>
                <li>Notificaciones push operativas (nuevos pedidos, alertas)</li>
                <li>Soporte técnico, gestión de suscripción y facturación</li>
                <li>
                  Verificación de identidad al crear una cuenta (confirmación del correo electrónico
                  y del número telefónico) y prevención de abuso de la prueba gratuita
                </li>
              </ul>

              <p className="mt-3"><strong>Verificación de identidad y prueba gratuita:</strong></p>
              <p className="mt-1">
                Para que la prueba gratuita de 14 días esté disponible una vez por negocio o cliente
                elegible, al registrarse conservamos <strong>valores cifrados de forma irreversible</strong>
                {' '}(funciones hash con clave del servidor) del correo electrónico, el número telefónico,
                un identificador de dispositivo generado por nosotros y la dirección IP del registro.
                Estos valores <strong>no permiten reconstruir el dato original</strong>: únicamente sirven
                para comparar si una identidad ya utilizó una prueba gratuita, y nunca se comparten con
                terceros. No utilizamos técnicas invasivas de identificación de dispositivos (canvas,
                audio, fuentes instaladas o características de hardware).
              </p>
              <p className="mt-2"><strong>Finalidades secundarias (requieren consentimiento):</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Envío de comunicaciones comerciales y novedades del producto</li>
                <li>Análisis agregado y anónimo de uso para mejora del sistema</li>
              </ul>
              <p className="mt-2">
                Si no desea que sus datos sean tratados para las finalidades secundarias, puede
                manifestarlo enviando un correo a <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400">restauros@atomicmail.io</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">5. Transferencias y encargados</h2>
              <p>
                Sus datos no serán transferidos a terceros sin su consentimiento, salvo en los casos
                permitidos por la LFPDPPP. Para operar, nos apoyamos en proveedores que actúan como
                encargados bajo acuerdos de confidencialidad y tratamiento de datos:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Proveedores de infraestructura tecnológica (servidores y bases de datos)</li>
                <li><strong>Stripe</strong>, para el procesamiento de pagos de suscripción</li>
                <li>Servicios de envío de notificaciones push (Web Push) de los navegadores</li>
                <li>Autoridades competentes, cuando exista requerimiento legal</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">6. Derechos ARCO</h2>
              <p>
                Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> (derechos ARCO)
                al tratamiento de sus datos personales. Para ejercer estos derechos:
              </p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Envíe un correo a <a href="mailto:restauros@atomicmail.io" className="text-yellow-700 dark:text-yellow-400">restauros@atomicmail.io</a></li>
                <li>Con el asunto: &quot;Ejercicio de Derechos ARCO&quot;</li>
                <li>Indique el derecho que desea ejercer y los datos afectados</li>
                <li>Adjunte copia de identificación oficial vigente</li>
              </ol>
              <p className="mt-2">
                Daremos respuesta a su solicitud en un plazo máximo de <strong>20 días hábiles</strong>.
                Si los datos corresponden a comensales o destinatarios capturados por un restaurante,
                canalizaremos la solicitud al Cliente responsable de dichos datos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">7. Medidas de seguridad</h2>
              <p>
                Implementamos medidas técnicas, administrativas y físicas para proteger su información
                frente a accesos no autorizados, pérdida, alteración o divulgación:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Contraseñas y PIN cifrados</strong> con el algoritmo bcrypt (factor de costo 12). Nunca se guardan ni se muestran en texto plano.</li>
                <li><strong>Bloqueo por intentos fallidos:</strong> el acceso por PIN se bloquea temporalmente tras varios intentos incorrectos.</li>
                <li><strong>Límite de intentos de inicio de sesión</strong> por dirección IP para mitigar ataques de fuerza bruta.</li>
                <li><strong>Comunicaciones cifradas</strong> de extremo a extremo mediante HTTPS/TLS.</li>
                <li><strong>Autenticación con tokens JWT</strong> firmados (HMAC-SHA256), con vigencia limitada (24 horas) y lista de revocación al cerrar sesión.</li>
                <li><strong>Control de acceso por rol</strong> (administrador, mesero, cocina) y <strong>por dispositivo</strong> con aprobación manual del administrador.</li>
                <li><strong>Consultas parametrizadas</strong> en la base de datos para prevenir inyección de SQL.</li>
                <li><strong>Validación y reprocesamiento de imágenes:</strong> se verifica el tipo real del archivo, se limita su tamaño, se reconvierten a formato WebP optimizado y se almacenan con nombres aleatorios.</li>
                <li><strong>Registros de auditoría</strong> de accesos y de actividad de dispositivos.</li>
              </ul>
              <p className="mt-2 text-xs text-stone-500">
                Ninguna medida de seguridad es infalible; sin embargo, trabajamos continuamente para
                mantener y mejorar la protección de su información.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">8. Retención de datos</h2>
              <p>
                Conservamos sus datos durante la vigencia de su suscripción y por un período adicional
                de <strong>12 meses</strong> después de la terminación del servicio, para cumplir con
                obligaciones legales y resolver posibles disputas. Transcurrido ese período, los datos
                serán eliminados de forma segura.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">9. Datos de menores</h2>
              <p>
                FoodIX es una herramienta profesional dirigida a negocios y no está destinada a
                menores de edad. No recabamos de forma consciente datos personales de menores.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-2">10. Cambios al aviso de privacidad</h2>
              <p>
                Nos reservamos el derecho de modificar este aviso. Cualquier cambio será notificado
                a través del sistema o por correo electrónico con al menos 15 días de anticipación.
              </p>
            </section>

            <div className="bg-stone-50 rounded-xl p-4 mt-8 text-xs text-stone-500">
              Este aviso de privacidad fue elaborado de conformidad con la Ley Federal de Protección
              de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento,
              publicados en el Diario Oficial de la Federación.
            </div>
          </div>
        </div>

        <div className="text-center mt-8 flex justify-center gap-6 text-sm text-stone-400">
          <Link href="/terminos" className="hover:text-stone-700">Términos y Condiciones</Link>
          <Link href="/cookies" className="hover:text-stone-700">Política de Cookies</Link>
          <Link href="/manual" className="hover:text-stone-700">Manual de usuario</Link>
        </div>
      </main>
    </div>
    </PageTransition>
  )
}
