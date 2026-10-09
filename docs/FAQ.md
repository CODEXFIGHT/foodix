# Preguntas Frecuentes (FAQ) — FoodIX

Respuestas rápidas y sencillas. ¿No encuentras tu duda? Abre el **Centro de Ayuda** (`/help`) o revisa [Solución de Problemas](TROUBLESHOOTING.md).

## Acceso y cuenta

**No puedo iniciar sesión.**
Verifica usuario y contraseña. Confirma que tu dispositivo esté **aprobado** (lo hace el admin en *Dispositivos*). Si la sesión expiró, vuelve a entrar.

**Olvidé mi contraseña.**
Pide a un **admin** de tu sucursal que la restablezca en *Usuarios → editar usuario*. El superadmin puede hacerlo para cualquier sucursal.

**¿Cómo cambio mi contraseña?**
Un admin la actualiza desde *Usuarios*. (No hay autoservicio de cambio aún.)

**¿Cómo agrego usuarios?**
Admin → *Usuarios* → **Nuevo usuario**: nombre, rol (mesero/cocina/admin) y credenciales.

## Caja

**No puedo abrir caja.**
Ve a *Caja → Abrir caja*, captura el monto inicial y confirma. Si dice *"Ya hay una caja abierta en este POS"*, cierra el turno anterior primero.

**No puedo cobrar / registrar pagos.**
El cobro exige una **caja abierta**. Si ves el aviso, pulsa **Abrir caja ahora** e inicia turno.

**No puedo cerrar caja.**
Necesitas la caja abierta y capturar el efectivo contado. Tras cerrar no podrás cobrar hasta abrir un nuevo turno.

## Pedidos y cocina

**No aparecen pedidos / no llegan a cocina.**
Revisa la conexión a internet y que el pedido se haya **enviado a cocina**. La pantalla KDS es en tiempo real; recárgala si quedó en segundo plano.

**No imprime los tickets.**
Verifica impresora encendida, con papel y emparejada. En *Ajustes → Impresión* confirma el dispositivo y que el agente de impresión esté activo.

**Pedidos duplicados.**
Suele pasar por doble toque o reintento tras un corte de red. Cancela el duplicado (puede requerir admin si está en preparación).

## Suscripción y licencias *(superadmin / admin)*

**¿Cómo suspendo una licencia?**
SuperAdmin → cliente → *Acciones* → **Suspender**. Bloquea el acceso conservando los datos.

**¿Cómo reactivo un restaurante?**
SuperAdmin → cliente → **Reactivar**, o simplemente **registra un pago**: reactiva automáticamente.

**¿Cómo registro pagos adelantados?**
SuperAdmin → cliente → *Calendario* → **Registrar pago** → elige varios **meses a cubrir**. El sistema marca esos meses y avanza el vencimiento.

**¿Cómo actualizo mi plan?**
El cambio de plan lo realiza el SuperAdmin desde el detalle de la sucursal.

**¿Qué pasa si vence mi suscripción?**
Entras en **periodo de gracia** (configurable, por defecto 5 días) con acceso. Pasada la gracia, la cuenta se **suspende** hasta registrar un nuevo pago.

## Configuración

**¿Cómo agrego un POS?**
El número de POS por establecimiento lo define el **superadmin**. Cada dispositivo se aprueba en *Dispositivos*.

**¿Cómo configuro la impresora?**
En *Ajustes → Impresión*. El equipo debe tener el agente de impresión activo.

**¿Cómo configuro la cocina?**
En *Ajustes* defines estaciones; en *Usuarios* asignas a cada cocinero su estación (Caliente/Frío).

**¿Cómo agrego modificadores?**
Admin → *Modificadores*: crea grupos (término, extras…) y asígnalos a los productos.

## Conexión y errores

**¿Qué hago si falla el internet?**
FoodIX requiere conexión. Espera a que vuelva: al reconectar, las pantallas operativas se actualizan solas. Evita cobrar sin conexión.

**La aplicación se congeló.**
Recarga la página (F5) o reinicia la app. Si persiste, cierra sesión y vuelve a entrar.

**Aparece un error.**
Anota qué hacías y el mensaje, recarga, y si continúa contacta a soporte desde el [Centro de Ayuda](../app/(dashboard)/help/page.tsx).

**¿Cómo restauro un respaldo?**
Los respaldos de base de datos los gestiona el equipo técnico/hosting. Contacta a soporte; ver [Despliegue](DEPLOYMENT.md).

---

📖 Más detalle: [Solución de Problemas](TROUBLESHOOTING.md) · [Manual de Usuario](USER_MANUAL.md) · Guías por rol en el [índice](README.md).
