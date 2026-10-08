# Changelog

Historial de versiones de **RestaurOS**. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/) y versionado semántico.

> Versión actual: **1.0.0-beta.117** · 2026-07-10
> [← Volver al índice de documentación](README.md)

## Próxima actualización — Carta Digital

### Mejorado
- **Menos clics para cerrar un pedido**: el detalle de pedido pedía marcar
  en preparación → listo → entregado → completar, uno por uno, antes de
  poder cobrar (aunque agregar productos y cobrar ya no dependían de esos
  pasos). Ahora hay un solo botón "Completar pedido" que cierra el ticket
  directo desde cualquier estado activo. El seguimiento fino por estación
  (KDS) sigue funcionando igual, por ítem, para quien lo use.
- **Menos toques también en KDS**: cada platillo pedía "Comenzar
  preparación" y luego, aparte, "Marcar listo" — dos toques y dos idas al
  servidor por platillo. El backend de estaciones nunca exigió esa cadena
  (acepta pasar a "listo" directo), así que ahora es un solo botón "Marcar
  listo" por platillo pendiente. Aplica a las tres pantallas de cocina
  (unificada, estación caliente, estación fría), que comparten el mismo
  componente de tarjeta.

### Corregido
- **"Marcar entregado" en KDS no se guardaba en ningún lado**: era estado
  local del navegador (`useState`), literalmente comentado en el código como
  "simulación" — se perdía al recargar la pantalla y no se sincronizaba
  entre dispositivos (dos tablets viendo la misma estación no se enteraban
  entre sí). Peor aún: la orden podía **desaparecer del tablero de cocina
  antes de que alguien alcanzara a marcarla como entregada** — en cuanto
  todos los ítems de una estación llegaban a "listo", la consulta que arma
  el tablero dejaba de incluir esa orden (no había ninguna condición que
  contemplara "listo, esperando entrega"), así que se perdía de la pantalla
  en el siguiente sondeo (~2s) sin que cocina pudiera confirmarlo. Ahora
  "entregado" es un estado real y persistente
  (`order_item_station_status.status = 'delivered'`), la orden permanece
  visible en el KDS mientras tenga algo en "listo" sin entregar, y el
  estado se sincroniza entre todas las pantallas de cocina abiertas
  (migración `40-station-item-delivered.sql`).

### Añadido
- Base de datos e API de **Inventario avanzado (Fase 1)**: catálogo de unidades
  de medida, almacenes por sucursal (`inventory-warehouses`), existencia por
  almacén y kardex ampliado (tipos: devolución, transferencia, producción,
  consumo interno, cortesía, inicial, conteo, corrección). Aditivo y
  retrocompatible — el POS sigue usando `inventory_items.stock` sin cambios
  (migración `35-inventory-warehouses-units.sql`).
- **Inventario avanzado (Fase 2)**: costeo real de recetas (`GET
  /recipes/{id}/cost` → costo total, % food cost, margen), merma estimada por
  insumo (`waste_percent`, se suma a lo consumido en cada venta), y reversión
  de inventario en cancelaciones — antes una cancelación (de ítem o de pedido
  completo) nunca regresaba el insumo al stock. Ahora: si el ítem no se había
  preparado, el insumo se devuelve íntegro (movimiento `return`); si ya se
  preparó, se documenta como merma en el kardex sin reingresar a stock
  (movimiento `waste`). La reversión es idempotente (`order_items
  .inventory_reverted_at`) — un reintento de red no revierte dos veces
  (migración `36-recipe-costing-waste.sql`).
- **Inventario avanzado (Fase 3)**: recepción **parcial** de compras — antes
  `POST /purchases/{id}/receive` era todo-o-nada; ahora acepta `{items:
  [{id, received_quantity}]}` y acumula lo recibido por línea
  (`purchase_order_items.received_quantity`), dejando la orden en
  `partially_received` hasta completarse. Nuevo módulo de **transferencias
  entre almacenes** (`inventory-transfers`): descuenta el almacén origen y
  solo da de alta en el destino al confirmar la recepción — una transferencia
  cancelada nunca movió stock (migración
  `37-purchases-partial-transfers.sql`).
- **UI de Inventario conectada** a las Fases 1-3: pestaña Recetas muestra
  costeo real (food cost %, margen) y captura de merma por insumo; pestaña
  Compras tiene diálogo de recepción parcial por línea; nueva pestaña
  **Transferencias** para mover insumos entre almacenes de una sucursal.
- **Centro de Pedidos omnicanal (Fase 4)**: la columna `orders.source`
  (canal de origen) ya existía desde WhatsApp, pero `GET /orders` nunca la
  devolvía y `POST /orders` nunca la fijaba explícitamente — todo pedido de
  POS o Mesero quedaba indistinguible bajo el default `'pos'`. Ahora
  `orders/new` declara el canal real (`mesero` vs `pos`), la API lo expone y
  filtra por `?source=`, y la pantalla "Pedidos" (que ya funcionaba como
  centro unificado por canal — no se creó una pantalla nueva) muestra badge
  de canal por pedido y un filtro de canal cuando hay más de uno presente.
  Reutiliza el mismo `source` que ya alimentaba "Ventas por canal" en
  reportes, ahora consistente extremo a extremo.
- **Delivery propio (Fase 5)**: el módulo de Domicilios ya existía y
  funcionaba (asignar repartidor, cambiar estado); se le agregó lo que
  faltaba para operarlo de verdad: **zonas de entrega** (costo, pedido
  mínimo, tiempo estimado — nuevo botón "Zonas" en Domicilios), **estado y
  vehículo de repartidor** (disponible / en ruta / fuera de servicio, con
  conteo de pedidos activos por repartidor), y una **bitácora de entrega**
  (`order_delivery_events`) que registra cada cambio de estado/asignación
  con quién y cuándo — antes solo existía el estado actual, sin historial
  (migración `38-delivery-zones-tracking.sql`).
- **CRM/Fidelización/Opiniones (Fase 6)**: el CRM de clientes ya existía
  (monedero, puntos, búsqueda), pero `points`/`wallet_balance` eran saldos
  mutables sin historial. Ahora cada acreditación de puntos (al cerrar
  cuenta) y cada movimiento de monedero (pago o ajuste manual) deja un
  renglón en `customer_ledger_entries` — nunca se sobrescribe, solo se
  agrega (mismo patrón que el kardex de inventario); nuevo botón
  "Historial" por cliente. Se centralizó la lógica duplicada de
  `handlePayOrder`/`handlePaySplit` en `applyCustomerLoyalty()`. Nueva
  **segmentación** calculada al vuelo (VIP / Nuevo / Frecuente / Inactivo /
  Regular, según visitas/gasto/`last_order_at`) con filtro en la pantalla de
  Clientes. Nuevo módulo de **Opiniones** (`/reviews`): captura calificación
  de comida/servicio/entrega y comentario, con promedio por sucursal
  (migración `39-crm-loyalty-ledger-reviews.sql`). No se implementó envío
  automático de encuestas — no existe un flujo público de pedido para
  disparar eso sin fabricar infraestructura de mensajería no solicitada.
- **Dashboards e insights (Fase 7)**: `GET /sales/insights` ya existía
  completo en el backend (ticket promedio, % cancelación, tiempo de
  preparación, top/bottom 5 productos, ventas por canal, ventas por hora)
  pero **ningún componente del frontend lo consumía** — cero líneas de
  código lo llamaban. Se agregó `useSalesInsights()` y una sección nueva en
  "Ventas" que lo muestra completo, incluyendo "Ventas por canal" (cierra el
  círculo con la Fase 4: mismo `source` que ahora se registra bien en cada
  pedido). No se tocó backend ni se corrió migración — era 100% wiring de
  frontend a un endpoint que ya funcionaba.
- Buscador contextual reutilizado: aparece debajo del navbar de categorías al
  activar el FAB y se oculta al volver al inicio.
- Visor de productos con zoom in/out, arrastre de imagen ampliada y nuevas
  microanimaciones para imagen, información, precio y acciones.
- Dirección completa de la sucursal con ticker automático para textos largos.

### Mejorado
- Vista vertical responsive como experiencia única y consistente.
- Filtros por categoría sincronizados con la URL y búsqueda tolerante a acentos.
- Adaptación del header, navbar y controles para mobile, tablet y desktop.

### Retirado
- Vista flipbook horizontal; se conserva el catálogo vertical para reducir
  complejidad y mantener una navegación uniforme.

---

## [1.0.0-beta.84] — 2026-06-25

### Añadido
- **Caja obligatoria por turno (usuario + POS):** el cobro de pedidos exige una caja abierta. Nuevos componentes `CashGuard`, `CashStatusBadge` y `OpenCashModal`; guardia de servidor `php-backend/config/cash_guard.php` y migración `23-cash-session-pos.sql` (sesión de caja ligada a POS).
- **Billing CRM (rediseño de Suscripciones):** calendario híbrido de pagos, pagos adelantados por meses, periodo de gracia configurable y panel de cobranza en `/superadmin/subscriptions`. Migración `24-billing-crm.sql` y `components/superadmin/billing/`.
- **Flujo de precio variable y por kilogramo** en la toma de pedidos.
- **Centro de Ayuda** dentro de la app (`/help`): buscador de FAQ, primeros pasos, atajos, estado del sistema (versión, API, licencia) y contacto de soporte.
- **Documentación profesional** completa en `docs/`: manuales por rol, FAQ, troubleshooting, arquitectura, instalación, despliegue, API, sistema de licencias y billing.
- Fuente única de información de app en `lib/constants/appInfo.ts` (versión, fecha, soporte).

### Cambiado
- Login rediseñado: iconos flat monocromos tintados al naranja de marca; campos de usuario, contraseña e ingreso.
- Sidebar de superadmin con iconos outline.
- Búsqueda de la carta en seminegrita.

### Corregido
- Ajustes de sincronización de estado de suscripción al iniciar sesión.

---

## Versiones previas

Las builds beta anteriores (`1.0.0-beta.x`) introdujeron de forma incremental:

- **POS y pedidos:** mesas, toma de pedidos, modificadores, envío a cocina.
- **KDS (cocina):** pantalla en tiempo real con estaciones Caliente/Frío.
- **Carta digital QR** pública por sucursal (`/carta/[slug]`).
- **Inventario:** insumos, recetas, proveedores y compras.
- **Clientes y reservaciones.**
- **Reportes y ventas.**
- **Suscripciones y licencias** (Stripe + SPEI), aprobación de dispositivos.
- **Panel superadmin:** sucursales, leads, dispositivos, device-center.

> Para el detalle técnico de cada cambio, consulta el historial de commits del repositorio.
