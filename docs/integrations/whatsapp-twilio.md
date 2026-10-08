# WhatsApp con Twilio — RestaurOS Pro

Pedidos por WhatsApp directo a cocina, **exclusivo del Plan Pro**. El cliente
escribe al número de WhatsApp del restaurante, el bot le muestra el menú, arma el
carrito, calcula el total en MXN y, al confirmar, crea un pedido real que aparece
en el KDS/POS en tiempo real — igual que un pedido del mesero.

> Twilio convive con los otros proveedores (`meta`, `wati`). Se elige con
> `WA_PROVIDER`. La máquina de estados del bot es la misma para los tres.

---

## 1. Arquitectura

```
Cliente WhatsApp ──► Twilio ──► POST /api/whatsapp/webhook (Next.js, Node runtime)
                                   │  valida X-Twilio-Signature
                                   │  handleIncomingMessage()  ← lib/server/whatsappFlow.ts
                                   ├─ menú/carrito ──► backend PHP /public/menu
                                   ├─ sesión durable ─► backend PHP /whatsapp/session
                                   └─ confirmar ──────► backend PHP /whatsapp/order
                                                          └─ inserta pedido + estados de estación
                                                             → KDS / push a cocina
```

- **Envío** (texto/listas/botones): `lib/server/wati.ts` (agnóstico de proveedor).
  En Twilio, las listas/botones se degradan a **texto numerado** (selección por
  número o nombre), porque la ventana de sesión de 24h usa texto libre.
- **Sesiones/carritos**: persisten en el backend PHP (`wa_sessions`) para sobrevivir
  el entorno serverless de Vercel. El `Map` en memoria es solo caché de proceso.
- **Estado de conexión** por sucursal: tabla `wa_connections`.
- **Historial** de mensajes: tabla `wa_messages`.

---

## 2. Requisitos previos

1. Cuenta en [Twilio](https://console.twilio.com) con WhatsApp habilitado.
2. La sucursal debe tener **Plan Pro o Enterprise** (si no, el panel muestra upsell
   y el webhook ignora los mensajes).
3. Backend PHP desplegado con las **migraciones `25-whatsapp.sql`,
   `27-whatsapp-pending-product.sql` y `31-whatsapp-session-lifecycle.sql`**
   aplicadas.

---

## 3. Configuración paso a paso

### 3.1 Aplicar la migración del backend

Ejecuta en la base de datos del backend:

```sql
SOURCE php-backend/migrations/25-whatsapp.sql;
```

Crea `wa_connections`, `wa_sessions`, `wa_messages` y agrega `source`,
`customer_name`, `customer_phone` a `orders`.

### 3.2 Secreto de servicio (backend ↔ Next.js)

El webhook (Next.js) persiste sesiones y crea pedidos llamando al backend con el
header `X-Service-Token`. Ese valor:

- En el backend vive en `php-backend/config/database.php` → `WA_SERVICE_SECRET`.
- En Next.js es la variable `BACKEND_SERVICE_TOKEN`.

**Ambos deben ser idénticos.** Genera uno largo y aleatorio.

### 3.3 Variables de entorno (Next.js)

Copia `.env.example` a `.env.local` y rellena:

| Variable | Descripción |
|---|---|
| `WA_PROVIDER` | `twilio` |
| `WA_BRANCH_SLUG` | slug de la sucursal vinculada al número (ej. `jimmy-restaurant`) |
| `WA_WEBHOOK_TOKEN` | token de verificación del webhook |
| `TWILIO_ACCOUNT_SID` | Account SID (consola Twilio) |
| `TWILIO_AUTH_TOKEN` | Auth Token — **secreto** |
| `TWILIO_WHATSAPP_FROM` | número emisor (sandbox `+14155238886` o tu número aprobado) |
| `TWILIO_MESSAGING_SERVICE_SID` | opcional, en lugar de `FROM` |
| `TWILIO_CONTENT_SID` | opcional, plantilla aprobada (mensajes fuera de 24h) |
| `TWILIO_VALIDATE` | `true` en producción; `false` solo en local |
| `TWILIO_WEBHOOK_URL` | opcional, URL pública exacta si hay proxy |
| `BACKEND_SERVICE_TOKEN` | = `WA_SERVICE_SECRET` del backend |
| `NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER` | número sandbox para el QR del panel |
| `NEXT_PUBLIC_TWILIO_SANDBOX_KEYWORD` | palabra `join` del sandbox |
| `WHATSAPP_SESSION_TTL_MINUTES` | opcional, minutos de inactividad antes de marcar la sesión "pausada" — ya NO borra el carrito (default `30`) |
| `WHATSAPP_INACTIVITY_NUDGE_MINUTES` | opcional, minutos antes del recordatorio proactivo "¿sigues ahí?" (default `15`) |
| `CRON_SECRET` | mismo secreto que protege `/api/cron/*` — también protege `/api/whatsapp/cron/inactivity` |
| `OPENROUTER_API_KEY` | opcional — habilita el fallback IA del bot (ver §9.4) |
| `WA_AI_MODEL` | opcional, modelo de OpenRouter (default `openai/gpt-4o-mini`) |

En producción (Vercel): `vercel env add <NOMBRE>` para cada una.

### 3.4 Configurar el webhook en Twilio

En la consola de Twilio (WhatsApp Sandbox o tu Sender):

- **When a message comes in** → `https://TU-DOMINIO/api/whatsapp/webhook` · método **POST**.

Twilio firma cada request con `X-Twilio-Signature`; el webhook la valida con
`TWILIO_AUTH_TOKEN`.

---

## 4. Conectar / desconectar (panel Admin)

1. Inicia sesión como **admin** del restaurante.
2. En la barra superior, pulsa el ícono de **WhatsApp** (verde).
3. Se abre el panel lateral **"WhatsApp RestaurOS Pro"**:
   - **Sandbox**: escanea el QR con el teléfono que usará WhatsApp y envía
     `join <palabra>`. Luego pulsa **Ya me uní** para marcar el canal como conectado.
   - **Conectado**: muestra ícono de éxito, número conectado y última sincronización.
   - Botón rojo **Cerrar sesión de WhatsApp** limpia el estado de conexión.
4. Si la sucursal **no es Pro**, el panel muestra el upsell:
   _"WhatsApp IA está disponible únicamente en RestaurOS Pro"_.

> En **producción** se usa un número de WhatsApp Business aprobado por Meta/Twilio
> en lugar del sandbox; el flujo del panel es el mismo.

---

## 5. Cómo llegan los pedidos a cocina

Al confirmar el pedido por WhatsApp, el webhook llama a `POST /whatsapp/order`
(backend), que inserta el pedido con `source = 'whatsapp'` y los estados por
estación. En el KDS la card muestra el badge **📱 WhatsApp** y el nombre/teléfono
del cliente. Estado inicial: **Nuevo (pending)**. También dispara el push a cocina.

---

## 6. Chatbot WhatsApp RestaurOS — flujo conversacional

El bot (`lib/server/whatsappFlow.ts`) es una máquina de estados por chat
(`branch_slug` + teléfono). Twilio no soporta listas/botones interactivos fuera
de plantillas aprobadas, así que en Twilio las listas/botones se degradan a
**tarjetas de texto premium** (separadores `━━━`, numeración secuencial) — en
Meta Cloud API sí se envían como listas/botones nativos de WhatsApp.

### 6.1 Estados

```
idle → menu → qty → notes → cart → order_type → (table?) → name → done
```

Además, **desde cualquier estado** (comandos globales):

| El cliente escribe | El bot hace |
|---|---|
| `hola`, `menú`, `quiero ordenar`, `pedido`, `iniciar`, `buenos días/tardes/noches` | Reinicia al menú (estado `idle`) |
| `ver pedido`, `mi pedido`, `carrito`, `resumen` | Muestra el carrito actual sin perder el progreso |
| `asesor`, `humano`, `restaurante`, `ayuda`, `hablar con alguien` | Pausa el bot (`human_support`) — no vuelve a responder salvo que el cliente escriba `menú` o `volver al bot` |
| `cancelar`, `cancel`, `salir` | Borra la sesión/carrito por completo |

Dentro del carrito (`cart`) también se puede escribir `quitar 1` (o el número
de la línea) para eliminar un producto sin reiniciar el pedido.

### 6.2 Ejemplo de conversación

```
Cliente: Hola
Bot:     ━━━━━━━━━━━━━━━━━━
         🍽️ Tacos Jimmy
         ━━━━━━━━━━━━━━━━━━

         Bienvenido, Nina. Soy tu asistente de pedidos por WhatsApp.

         Aquí puedes ver el menú, armar tu pedido y mandarlo directo a
         cocina — sin llamadas ni esperas.

         Este es el menú disponible:
         [tarjetas de producto con foto + botón/CTA "Agregar" + lista numerada]

Cliente: 1
Bot:     ━━━━━━━━━━━━━━━━━━
         🍽️ RestaurOS
         ━━━━━━━━━━━━━━━━━━

         *Tacos de pastor*
         Tortilla de maíz, pastor, piña, cebolla y cilantro.

         💰 $85 MXN

         ¿Cuántas unidades deseas? (1–20, o escribe menú para ver otros platillos)

Cliente: 2
Bot:     ¿Alguna instrucción especial para este platillo? (ej. "sin cebolla")
         Escríbela, o responde *no* si no necesitas nada en especial.

Cliente: sin cebolla
Bot:     ✅ Agregado al pedido:
         1. 2x Tacos de pastor — $170
            sin cebolla
         Total: $170 MXN
         [➕ Agregar más] [✅ Confirmar pedido] [❌ Cancelar]

Cliente: confirmar
Bot:     ¿Cómo recibirás tu pedido? [🍽️ En mesa] [🛍️ Para llevar] [🛵 A domicilio]

Cliente: para llevar
Bot:     ¿A qué nombre ponemos el pedido?

Cliente: Juan
Bot:     ━━━━━━━━━━━━━━━━━━
         🍽️ RestaurOS
         ━━━━━━━━━━━━━━━━━━

         ✅ Pedido confirmado — #123

         Cliente: Juan
         Entrega: para llevar

         1. 2x Tacos de pastor — $170
            sin cebolla
         Total: $170 MXN

         Tu pedido ya está en cocina. Te avisamos en cuanto esté listo.
```

El saludo usa el **nombre real de WhatsApp del cliente** (`ProfileName` en Twilio,
`contacts[].profile.name` en Meta) cuando WhatsApp lo entrega — si no está
disponible, el saludo simplemente omite el nombre.

### 6.3 Botón "Agregar" debajo de cada foto

Cada foto de producto se manda con una llamada a la acción para agregarlo:

- **Meta Cloud API**: botón nativo `➕ Agregar` pegado a la imagen (mensaje
  interactivo con header de imagen — igual que las tarjetas con botones de
  WhatsApp Business). Al tocarlo, el número de esa foto (el mismo que usa la
  lista de texto de abajo) se procesa como si el cliente lo hubiera escrito.
- **Twilio / Wati**: WhatsApp no permite botones nativos en mensajes de sesión
  libre (24h) sin una plantilla de Content API pre-aprobada, así que la
  llamada a la acción va como texto dentro del propio caption de la foto
  (`👉 Responde *N* para agregarlo a tu pedido`) — es el máximo real
  alcanzable ahí. **El simulador de chat de la consola de Twilio no es la app
  real de WhatsApp**: para ver el resultado final (fotos + numeración)
  pruébalo desde el teléfono conectado al sandbox.

### 6.4 De dónde salen los productos

El bot **no hardcodea** productos ni categorías: consume el mismo endpoint que
usa la Carta QR pública, `GET /public/menu/{branch_slug}` (backend PHP). Si un
producto no tiene descripción, imagen o categoría, el campo simplemente se
omite del mensaje — nunca rompe el flujo.

Los **modificadores por producto** (ej. "sin cebolla") no se exponen hoy en ese
endpoint público, así que el bot usa **nota libre** en su lugar (campo real
`item_notes` en `order_items`) en vez de inventar una lista fija de opciones
que no reflejaría el producto real.

> **Fotos de producto en formato JPEG/PNG obligatorio.** Las fotos se suben
> como `.webp` (más liviano para la Carta QR), pero WhatsApp (Meta Cloud API y
> Twilio) **no acepta WebP** para mensajes de imagen fuera de stickers — el
> envío falla en silencio si se manda la URL `.webp` directa. Por eso
> `lib/server/wati.ts` reescribe automáticamente cualquier URL `.webp` a través
> de `GET /api/whatsapp/image?u=...`, que la convierte a JPEG al vuelo con
> `sharp` antes de mandarla. Si las fotos de producto siguen sin llegar,
> revisa los logs `[WA Image Proxy]` y que `NEXT_PUBLIC_APP_URL` apunte al
> dominio público real de la app.

### 6.5 Fallback con IA (OpenRouter, opcional)

Si `OPENROUTER_API_KEY` está configurada, `lib/server/whatsappAI.ts` interpreta
lenguaje libre ("dame unas alitas bbq") o preguntas fuera del flujo ("¿tienen
algo sin gluten?") usando el catálogo real como contexto — **nunca inventa
precios ni productos**. Solo se activa cuando el número/nombre exacto no
matchea (no agrega latencia al camino rápido) y tiene timeout de 3.5s (medido
en vivo: ~0.9–1.4s típico con `openai/gpt-4o-mini`) — si OpenRouter falla o
tarda, el bot se degrada en silencio al mensaje de siempre.

### 6.5.1 Latencia — qué se optimizó

- **Bienvenida, fotos y lista del menú se mandan en paralelo** (antes: tres
  round-trips HTTP secuenciales a Meta/Twilio, uno detrás de otro).
- **Fotos de producto en paralelo** entre sí (`Promise.all`), no una por una.
- **Caché de 60s del menú** por sucursal (proceso "caliente") — evita volver
  a pedirlo al backend PHP en cada mensaje del mismo chat.
- **Timeout de 8s** en toda llamada saliente a Meta/Twilio/Wati (`wati.ts`):
  si el proveedor se cuelga, el bot no se queda esperando indefinidamente.
- **Typing indicator nativo** (§6.6) cubre la espera real mientras el bot
  arma la respuesta, en vez de dejar el chat en silencio.

### 6.6 Indicador de "escribiendo…"

En cuanto llega un mensaje, el bot activa el indicador nativo de "escribiendo…"
de WhatsApp (`lib/server/wati.ts` → `sendTypingIndicator`) antes de procesar
nada — así el cliente ve feedback inmediato mientras el bot arma la respuesta
(fetch del menú, fallback IA, conversión/envío de fotos, etc.), en vez de un
chat en silencio por unos segundos.

- **Meta Cloud API**: `POST /messages` con `status: "read"` + `typing_indicator`,
  usando el `message_id` (wamid) del mensaje entrante.
- **Twilio**: Typing Indicators API (`POST https://messaging.twilio.com/v3/Indicators/Typing.json`),
  usando el `MessageSid` del mensaje entrante.
- Ambos se apagan solos a los 25s o en cuanto se manda la respuesta — no hace
  falta "apagarlos" a mano.
- **Wati**: no tiene una API pública documentada de typing indicator — no-op
  (proveedor secundario, no usado en el demo).

### 6.7 Seguridad y abuso

Además de la validación de firma de Twilio (§8), el webhook aplica un
**rate limit básico por teléfono**: máximo 20 mensajes/minuto por número
(ventana deslizante en memoria de proceso); los mensajes de más se ignoran en
silencio y quedan en el log `[WA Webhook]`/`[WA Twilio]`.

### 6.8 Recuperación de sesión — el pedido nunca se pierde

Antes, si el cliente tardaba más de `WHATSAPP_SESSION_TTL_MINUTES` en
responder, la sesión se descartaba en silencio y el siguiente mensaje volvía
a arrancar de cero (carrito vacío). Ahora el TTL **ya no borra nada** — solo
marca la sesión como "pausada" (`lib/server/whatsappSession.ts` →
`isSessionPaused`). Cuando el cliente vuelve:

```
Cliente: (escribe después de 40 min de silencio, con 2 tacos en el carrito)
Bot:     👋 Bienvenido de nuevo.

         Veo que dejaste un pedido en progreso:

         🧾 Pedido actual:
         1. 2x Tacos de pastor — $170
         Total: $170 MXN

         ¿Deseas continuar con tu pedido o cancelarlo?
         [➡️ Continuar pedido] [❌ Cancelar pedido] [📋 Ver menú]
```

- **Continuar pedido** → retoma el carrito tal cual (mismo resumen +
  botones de siempre).
- **Cancelar pedido** → mismo camino que el comando global `cancelar`.
- **Ver menú** → reabre el catálogo **sin vaciar el carrito** (para agregar
  algo más antes de confirmar).
- Cualquier otra respuesta repite las 3 opciones — no se reprocesa como
  input normal del flujo, para no confundir el parser de producto.

### 6.9 Recordatorio proactivo de inactividad ("¿sigues ahí?")

El bot es 100% reactivo a webhooks — no hay proceso en segundo plano
esperando. Para avisar proactivamente a un cliente que dejó un pedido a
medias, `GET /api/whatsapp/cron/inactivity` (protegido con `CRON_SECRET`,
mismo patrón que `/api/cron/subscription-check`) revisa sesiones con más de
`WHATSAPP_INACTIVITY_NUDGE_MINUTES` sin actividad y les manda un único
recordatorio:

> ⏳ *¿Sigues ahí?*
> Tu pedido sigue guardado, no se ha perdido.
> Responde: 1) Continuar mi pedido  2) Cancelarlo

El aviso se manda **una sola vez** por pausa (no se repite en cada corrida
del cron) y **no resetea** el reloj de inactividad del cliente.

**Disparo del cron**: el proyecto está en **Vercel Hobby**, que solo permite
crons nativos de 1 vez al día — insuficiente para revisar cada 5-10 min. En
vez de tocar `vercel.json`, configura un cron externo gratuito (ej.
[cron-job.org](https://cron-job.org)) que llame:

```
GET https://TU-DOMINIO/api/whatsapp/cron/inactivity
Header: Authorization: Bearer <CRON_SECRET>
Frecuencia: cada 5-10 min
```

Si más adelante se sube a Vercel Pro, se puede mover a un cron nativo en
`vercel.json` con el mismo secreto.

---

## 7. Solución de errores

| Síntoma | Causa probable | Solución |
|---|---|---|
| `403 Invalid signature` en el webhook | `TWILIO_AUTH_TOKEN` incorrecto o URL distinta a la firmada | Verifica el token; usa `TWILIO_WEBHOOK_URL` si hay proxy; o `TWILIO_VALIDATE=false` en local |
| El bot no responde | Credenciales Twilio incompletas | Revisa `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` (logs `[WA Twilio]`) |
| El carrito se "reinicia" entre mensajes | `BACKEND_SERVICE_TOKEN` no coincide con `WA_SERVICE_SECRET` o falta la migración 25 | Igualar secretos y aplicar la migración |
| El pedido final solo trae el último producto (los anteriores "desaparecen") | Falta la migración `27-whatsapp-pending-product.sql` — el producto en espera de cantidad/notas no se persiste y se pierde entre mensajes si caen en instancias serverless distintas | Aplicar la migración 27 |
| `plan_not_pro` | La sucursal no es Pro/Enterprise | Cambiar el plan en Billing CRM → modal de la sucursal |
| El pedido no aparece en cocina | Migración 25 no aplicada o sin usuarios en la sucursal | Aplicar migración; la sucursal debe tener al menos un usuario activo |
| Menú vacío | Sin productos disponibles | Publica productos disponibles en el catálogo de la sucursal |

---

## 8. Seguridad

- El **Auth Token nunca va en el frontend** ni en el repositorio: solo en `.env.local`
  / variables del host. Si se expone, **rótalo** en Twilio (Account → API keys & tokens).
- El webhook **valida la firma** de Twilio (`X-Twilio-Signature`).
- Las rutas de servicio del backend exigen `X-Service-Token` (`WA_SERVICE_SECRET`).
- Multi-tenant: cada pedido/sesión se ata a su `branch_id`; el gating Pro se valida
  en el panel, en la ruta de envío manual y en el backend.

## 9. Endpoints

**Next.js**
- `GET|POST /api/whatsapp/webhook` — verificación y mensajes entrantes (Twilio/Meta/Wati).
- `POST /api/whatsapp/send` — envío manual desde el Admin (Pro-gated).
- `GET /api/whatsapp/cron/inactivity` — recordatorio "¿sigues ahí?" (§6.9, `CRON_SECRET`).

**Backend PHP** (`/whatsapp/*`)
- `GET /whatsapp/status` · `POST /whatsapp/connect` · `POST /whatsapp/logout` (JWT admin).
- `GET|POST /whatsapp/session` · `POST /whatsapp/message` · `POST /whatsapp/order`
  (servicio, header `X-Service-Token`).
- `GET /whatsapp/inactive-sessions` · `POST /whatsapp/notify-inactive` (servicio,
  usados por el cron de inactividad, §6.9).
