# API REST (backend PHP)

Referencia de los endpoints del backend de RestaurOS. El backend es un router PHP plano (`php-backend/index.php`) que despacha por el **primer segmento** de la ruta a `routes/<recurso>.php`.

> [← Volver al índice](README.md) · Relacionado: [Arquitectura](ARCHITECTURE.md)

---

## Convenciones

- **Base URL:** `/<recurso>/...` (en el frontend se accede vía proxy `/backend/...`).
- **Formato:** JSON en petición y respuesta.
- **Autenticación:** JWT (`config/jwt.php`). La mayoría de endpoints requieren token; los públicos no.
- **Dispositivo:** cabecera `X-Device-Uid` para flujos ligados a un dispositivo aprobado.
- **Errores:** JSON con código HTTP (`401`, `403`, `405 Método no permitido`, `422` validación, etc.).
- **Salud:** `GET /health` responde sin autenticación (usado por el Centro de Ayuda).

---

## Recursos disponibles

Cada recurso corresponde a un archivo en `php-backend/routes/`. Despacho en `index.php`.

| Segmento | Archivo | Propósito |
|----------|---------|-----------|
| `public` | `public.php` | Datos públicos (carta QR) |
| `leads` | `leads.php` | Prospectos del landing |
| `auth` | `auth.php` | Login, PIN, sesión |
| `subscription` | `subscription.php` | Estado de suscripción de la sucursal |
| `subscription-cron` | `subscription_cron.php` | Recalculo automático (cron) |
| `superadmin` | `superadmin_subscriptions.php` | Cobranza / Billing CRM |
| `billing` | `billing.php` | Pagos, métodos |
| `webhooks` | `webhooks/stripe.php` | Webhooks de Stripe |
| `branches` | `branches.php` | Sucursales |
| `devices` / `device-monitor` | `devices.php` / `device_monitor.php` | Dispositivos y monitoreo |
| `users` | `users.php` | Usuarios y roles |
| `categories` | `categories.php` | Categorías de carta |
| `products` | `products.php` | Productos |
| `modifiers` | `modifiers.php` | Modificadores |
| `tables` | `tables.php` | Mesas |
| `orders` | `orders.php` | Pedidos |
| `sales` | `sales.php` | Ventas / reportes |
| `stations` | `stations.php` | Estaciones de cocina |
| `cash` | `cash.php` | Caja y turnos |
| `inventory` | `inventory.php` | Inventario |
| `inventory-warehouses` | `inventory_warehouses.php` | Almacenes por sucursal, existencia por almacén y catálogo de unidades (`/inventory-warehouses/units`) |
| `recipes` | `recipes.php` | Recetas (`GET /recipes/{id}/cost` → costeo, % food cost, margen) |
| `suppliers` / `purchases` | `suppliers.php` / `purchases.php` | Proveedores y compras (recepción total o parcial) |
| `inventory-transfers` | `inventory_transfers.php` | Transferencias de insumos entre almacenes de una sucursal |
| `customers` | `customers.php` | Clientes, monedero/puntos (`GET /customers/{id}/ledger` → historial) |
| `reviews` | `reviews.php` | Opiniones de clientes (calificación de comida/servicio/entrega) |
| `reservations` | `reservations.php` | Reservaciones |
| `drivers` | `drivers.php` | Repartidores (estado, vehículo, pedidos activos) |
| `delivery-zones` | `delivery_zones.php` | Zonas de entrega (costo, pedido mínimo, tiempo estimado) |
| `print` | `print.php` | Impresión de tickets |
| `push` | `push.php` | Notificaciones push |

---

## Ejemplo: autenticación (`routes/auth.php`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/login` | Inicia sesión con usuario/contraseña |
| `POST` | `/auth/check-pin` | Verifica disponibilidad/validez de PIN |
| `POST` | `/auth/pin-login` | Login por PIN (`branch_id`, `user_id`, `pin`) |
| `GET` | `/auth/pin-users?branch_id=` | Usuarios disponibles para login por PIN en un dispositivo aprobado |
| `GET` | `/auth/me` | Usuario actual + datos de suscripción |
| `POST` | `/auth/logout` | Cierra sesión |

`GET /auth/me` devuelve también la suscripción de la sucursal (estado, plan, vencimiento), construida por `buildSubscriptionData()`.

> El resto de recursos sigue el mismo patrón: una función `handle<Recurso>(array $seg, string $method)` despacha por sub-segmento y método HTTP. Consulta el archivo correspondiente en `php-backend/routes/` para el detalle de cada operación.
