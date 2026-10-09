# Manual de Usuario — FoodIX

Guía completa, en lenguaje sencillo, para operar tu restaurante con FoodIX desde el primer día.

> ¿Buscas algo específico? Usa el **Centro de Ayuda** (`/help`) dentro de la app o el [FAQ](FAQ.md).

## Índice

1. [Primer inicio de sesión](#1-primer-inicio-de-sesión)
2. [Configurar tu negocio](#2-configurar-tu-negocio)
3. [Usuarios del equipo](#3-usuarios-del-equipo)
4. [Crear tu carta](#4-crear-tu-carta-categorías-productos-y-modificadores)
5. [Mesas](#5-mesas)
6. [Abrir caja / iniciar turno](#6-abrir-caja--iniciar-turno)
7. [Tomar un pedido](#7-tomar-un-pedido)
8. [Enviar a cocina](#8-enviar-a-cocina)
9. [Cobrar y cerrar mesa](#9-cobrar-y-cerrar-mesa)
10. [Cerrar caja (corte)](#10-cerrar-caja-corte-del-día)
11. [Inventario](#11-inventario)
12. [Clientes](#12-clientes)
13. [Promociones, combos y lealtad](#13-promociones-combos-y-lealtad)
14. [Reportes y ventas](#14-reportes-y-ventas)
15. [Carta digital QR](#15-carta-digital-qr)
16. [Usar la carta como cliente](#16-usar-la-carta-como-cliente)
17. [WhatsApp (Plan AI)](#17-whatsapp-plan-ai)
18. [Suscripción](#18-suscripción)
19. [Configuraciones](#19-configuraciones)

---

## 1. Primer inicio de sesión

1. Abre FoodIX en tu navegador o en la app de tablet/POS.
2. Escribe tu **usuario** y **contraseña** (te los da el administrador).
3. Pulsa **Ingresar**.

> ![Pantalla de login](SCREENSHOTS/login.png)
> *Captura pendiente: `docs/SCREENSHOTS/login.png` — pantalla de inicio de sesión.*

La primera vez, el dispositivo queda **registrado**. Un administrador puede aprobarlo o bloquearlo desde **Dispositivos**.

Según tu rol verás un menú distinto:

- **Admin** → Dashboard completo.
- **Mesero** → Pedidos, Mesas, Caja.
- **Cocina** → Pantalla KDS.

---

## 2. Configurar tu negocio

> Solo **Admin**. Menú lateral → **Ajustes**.

En **Ajustes** defines la identidad y reglas de tu restaurante:

- Nombre, logo y datos de contacto.
- Impuestos (IVA): activarlo o no, y la tasa. *El IVA va incluido en el precio; es solo desglose informativo.*
- Impresión de tickets.
- Preferencias de cocina y estaciones.
- **Pedidos por WhatsApp** (si tu plan incluye la función): tipo de entrega por defecto, Pickup o A domicilio — ver [sección 16](#16-whatsapp-plan-ai).

> ![Configuraciones](SCREENSHOTS/settings.png)
> *Captura pendiente: `docs/SCREENSHOTS/settings.png`.*

---

## 3. Usuarios del equipo

> Solo **Admin**. Menú → **Usuarios**.

1. Pulsa **Nuevo usuario**.
2. Captura **nombre**, **rol** (mesero / cocina / admin) y credenciales.
3. Para **cocina**, asigna la estación: **Caliente**, **Fría** o ambas.
4. Guarda.

> Cada persona debe tener su propio usuario: así el corte de caja y la auditoría saben **quién** hizo cada acción.

---

## 4. Crear tu carta (categorías, productos y modificadores)

> Solo **Admin**. Menú → **Carta / Menú**.

### Categorías
1. Entra a **Categorías**.
2. **Nueva categoría** (ej. *Entradas*, *Bebidas*, *Postres*).
3. Ordénalas como quieres que aparezcan.

### Productos
1. Entra a **Productos** → **Nuevo producto**.
2. Captura nombre, categoría, **precio** e imagen.
3. Elige el **tipo de precio**:
   - **Fijo**: precio cerrado.
   - **Abierto**: se captura al vender.
   - **Por kilogramo**: peso × precio/kg (se confirma antes de cobrar).
4. Guarda.

> ![Productos](SCREENSHOTS/products.png)
> *Captura pendiente: `docs/SCREENSHOTS/products.png`.*

### Modificadores
> Menú → **Modificadores**.

Son opciones que cambian un producto (ej. *Término de la carne*, *Extra queso*, *Sin cebolla*). Crea grupos de modificadores y asígnalos a los productos que correspondan.

---

## 5. Mesas

> **Admin** y **Mesero**. Menú → **Mesas**.

1. Da de alta tus mesas (número y zona).
2. El color indica el estado: **libre**, **ocupada**.
3. Al abrir una mesa, se crea un pedido asociado.

> ![Mesas](SCREENSHOTS/tables.png) — disponible: `public/assets/screenshots/admin-tables-desktop.png`

---

## 6. Abrir caja / iniciar turno

> **Obligatorio antes de cobrar.** Menú → **Caja**.

FoodIX exige una **caja abierta** (turno) para cobrar, registrar pagos o mover efectivo. Sin caja, esas acciones se bloquean con un aviso.

1. Entra a **Caja**.
2. Pulsa **Abrir caja**.
3. Captura el **monto inicial** (fondo de caja) y, si quieres, una nota.
4. Pulsa **Iniciar turno**.

Verás un indicador **"Caja abierta"** con la hora y tu POS.

> ![Caja](SCREENSHOTS/cash.png)
> *Captura pendiente: `docs/SCREENSHOTS/cash.png`.*

📖 Detalle completo en la [Guía de Caja](CASHIER_GUIDE.md).

---

## 7. Tomar un pedido

> **Admin** y **Mesero**. Menú → **Pedidos** o desde una **Mesa**.

1. Elige la **mesa** (o *Para llevar* / *Domicilio*).
2. Agrega productos tocándolos; ajusta cantidades. Si hay **combos** activos (ver [sección 13](#13-promociones-combos-y-lealtad)), aparecen en su propia franja arriba del catálogo — un toque agrega el combo completo.
3. Aplica **modificadores** si el producto lo pide.
4. Para productos **por kilo** o **precio abierto**, captura el valor.
5. Agrega **notas** (ej. *sin picante*) si hace falta.

El total se calcula solo, ya con cualquier **promoción automática** aplicada (ver sección 13). Puedes aplicar un **descuento** manual si tu rol lo permite.

> ![Pedidos](SCREENSHOTS/orders.png) — disponible: `public/assets/screenshots/admin-orders-desktop.png`

**Cancelar un pedido rápido:** en la lista de **Pedidos**, cada tarjeta de un pedido activo tiene un botón para cancelarlo directo (con confirmación), sin entrar al detalle.

**Buscar un ticket:** en **Pedidos → Historial**, la consulta por QR o folio valida el dato, muestra un aviso mientras busca, y si el ticket no existe o el folio es inválido te lo dice con un mensaje claro — nunca te deja en una pantalla en blanco.

---

## 8. Enviar a cocina

1. Con el pedido listo, pulsa **Enviar a cocina**.
2. El pedido aparece en la pantalla **KDS** de la estación correspondiente (Caliente/Frío) en **tiempo real**.

📖 Ver [Guía de Cocina](KITCHEN_GUIDE.md).

---

## 9. Cobrar y cerrar mesa

> Requiere **caja abierta**.

1. Abre el pedido y pulsa **Cobrar**.
2. Elige el **método de pago**: efectivo, tarjeta, transferencia, monedero u otro.
3. Para efectivo, captura lo recibido: el sistema calcula el **cambio**.
4. Puedes **dividir la cuenta** (por productos, personas o monto).
5. Confirma. La mesa se libera y el pedido queda **pagado**.

> El cobro se liga automáticamente a tu **turno de caja** para que el corte cuadre.

---

## 10. Cerrar caja (corte del día)

> Menú → **Caja** → **Cerrar caja (Corte Z)**.

1. El sistema muestra el **efectivo esperado** (fondo + ventas en efectivo + entradas − salidas).
2. Captura el **efectivo contado** en caja.
3. FoodIX calcula la **diferencia**.
4. Confirma: el turno se cierra.

Después de cerrar, **no podrás cobrar** hasta abrir un nuevo turno.

📖 Detalle en la [Guía de Caja](CASHIER_GUIDE.md).

---

## 11. Inventario

> Solo **Admin**. Menú → **Inventario**.

- Da de alta insumos y existencias.
- Asocia **recetas/ingredientes** a los productos: al vender, el stock se descuenta.
- Revisa alertas de bajo inventario.

> ![Inventario](SCREENSHOTS/inventory.png)
> *Captura pendiente: `docs/SCREENSHOTS/inventory.png`.*

---

## 12. Clientes

> **Admin** y **Mesero**. Menú → **Clientes**.

- Registra clientes (nombre, contacto).
- Acumulan **puntos**, **visitas** y **monedero** según sus compras.
- Útil para lealtad y pagos con saldo.

---

## 13. Promociones, combos y lealtad

> Solo **Admin**. Menú → **Promociones**. Requiere **Plan Pro, AI o MultiSucursal**.

Cuatro pestañas en una sola pantalla — a diferencia de un descuento manual, **se aplican solas al cobrar**:

- **Promociones** — descuento automático (% o monto fijo) a todo el pedido, una categoría o un producto. Puede limitarse a días de la semana y horario (ej. "2x1 en bebidas, martes de 13:00 a 17:00"). Si aplican varias a la vez, se suman todas sin pasar del subtotal.
- **Combos** — paquete de productos a precio fijo (ej. "Combo Familiar — $199"). Se agrega desde su propia franja en **Nuevo Pedido**; cocina sigue viendo los platillos reales en su estación de siempre e inventario descuenta la receta normal — el combo solo cambia el precio final.
- **Cupones** — código canjeable (% o monto fijo) con límite de usos y fecha de vencimiento; se captura al confirmar el pedido.
- **Lealtad** — reglas "cada N compras, un premio" (producto gratis o descuento). Se cuenta por el teléfono del cliente en los últimos 90 días y se repite solo cada vez que se cumple el múltiplo.

> El desglose de qué promoción/cupón/lealtad se aplicó (y por cuánto) se ve en el **detalle del pedido** y en el **ticket impreso** — nunca es solo un número de descuento sin explicación.

---

## 14. Reportes y ventas

> Solo **Admin**. Menú → **Ventas**.

- Ventas del día, por método de pago, productos más vendidos.
- Los reportes de caja se basan en el **turno** (no solo en la fecha), para no mezclar cortes ni POS.

---

## 15. Carta digital QR

> Menú → **Carta QR**.

Genera un **código QR** que tus clientes escanean para ver la carta desde su teléfono, con fotos y categorías. Ideal para mesas sin menú impreso.

> ![Carta QR](SCREENSHOTS/menu-qr.png) — disponible: `public/assets/screenshots/menu-qr-mobile.png`

---

## 16. Usar la carta como cliente

Al abrir el enlace de la sucursal (`/carta/{slug}`), el cliente puede consultar
la carta sin iniciar sesión.

### Explorar la carta

La carta utiliza una vista vertical desplazable por secciones, optimizada para
consultar rápidamente el menú en teléfonos, tabletas y computadoras. El slider
de categorías permite saltar entre secciones sin recargar la página.

### Buscar y filtrar

1. Desplázate hacia abajo para mostrar el botón flotante de búsqueda.
2. Toca el botón para mostrar el mismo campo debajo de las categorías y busca
   un platillo o ingrediente.
3. Toca nuevamente el botón para ocultar el campo. Al volver al inicio, el
   campo y el botón flotante se ocultan porque el buscador principal ya está
   visible.
4. Usa **Todos** o una categoría para combinar el filtro con la búsqueda. La
   URL conserva la categoría activa para compartirla (`?categoria=bebidas`).

### Ver detalles, zoom y pedir

- Toca la tarjeta o la imagen para abrir el visor del platillo.
- Usa las flechas o desliza para cambiar de producto.
- Toca la imagen o el botón de zoom para ampliar; arrastra la imagen ampliada
  y usa el botón de alejar para regresar al tamaño normal.
- Ajusta la cantidad y pulsa **Agregar al pedido**. El carrito conserva los
  productos aunque se cambie de categoría.
- Si una imagen no está disponible, se muestra un reemplazo visual y el
  producto continúa siendo consultable.

La dirección completa y el teléfono de la sucursal aparecen en el encabezado.
Las direcciones largas se desplazan automáticamente sin ocultar su contenido.

---

## 17. WhatsApp (Plan AI)

> Solo **Admin**. Menú → ícono de WhatsApp. Requiere **Plan AI o MultiSucursal**.

FoodIX recibe pedidos automáticos por WhatsApp con un flujo pensado para ser rápido y sin fricción:

1. Conecta tu WhatsApp escaneando el QR de activación; el sistema **detecta la conexión sola** en cuanto llega el primer mensaje real.
2. El cliente ve el catálogo priorizado (Recomendados → Más vendidos → categorías) en bloques de 10, con "*ver más*" para avanzar.
3. Puede pedir **varios platillos en un solo mensaje** con cantidades (ej. "2 tacos, 1 agua y 3 quesadillas") — el bot arma el carrito solo.
4. **Ya no pregunta** tipo de entrega ni nombre del cliente: el tipo de entrega sale de tu ajuste por sucursal (**Ajustes → Pedidos por WhatsApp**, Pickup o A domicilio); si es A domicilio, pide **solo la dirección** antes de confirmar.
5. Al confirmar, el pedido llega directo a **cocina/KDS** con la etiqueta 📱 WhatsApp, con el número de pedido en la confirmación.

> El menú que ve el cliente por WhatsApp es el mismo de tu Carta QR — se actualiza solo cuando editas tu carta.

---

## 18. Suscripción

> Solo **Admin**. Menú → **Mi Suscripción**.

- Consulta el **estado** de tu plan (Starter, Pro, AI o MultiSucursal) y la fecha de **renovación**.
- Paga con **tarjeta** (Stripe) o reporta tu **transferencia / SPEI** subiendo el comprobante.
- Si vencen los días, entras en **periodo de gracia** antes de suspenderse.

📖 Detalle en [Facturación](BILLING.md).

---

## 19. Configuraciones

En **Ajustes** controlas impuestos, impresión, estaciones de cocina, número de POS, tipo de entrega por defecto de WhatsApp y preferencias visuales (tema claro/oscuro).

---

¿Algo no funciona como esperas? Revisa [Solución de Problemas](TROUBLESHOOTING.md) o el [FAQ](FAQ.md).
