# Capturas de pantalla

Carpeta de imágenes de la documentación. Las capturas **aún no se generaron automáticamente** porque requieren el servidor en marcha y una sesión autenticada con datos de demo. Abajo está la lista exacta de pantallas a capturar y su nombre de archivo.

> [← Volver al índice](../README.md)

## Cómo generarlas

1. Levanta el entorno (ver [INSTALLATION.md](../INSTALLATION.md)): `npm run dev` + backend PHP.
2. Inicia sesión con un usuario de cada rol (o usa las rutas `/demo`).
3. Captura cada pantalla a **1440×900** (escritorio) y guárdala aquí con el nombre indicado.
4. Para vistas móviles, sufijo `-mobile` (p. ej. `kitchen-mobile.png`).

## Pantallas requeridas

| Archivo | Pantalla / Ruta | Usado en |
|---------|-----------------|----------|
| `login.png` | Inicio de sesión (`/login`) | README, USER_MANUAL |
| `dashboard.png` | Panel principal (`/`) | USER_MANUAL, ADMIN_GUIDE |
| `products.png` | Productos (`/products`) | ADMIN_GUIDE |
| `inventory.png` | Inventario (`/inventory`) | ADMIN_GUIDE |
| `tables.png` | Mesas (`/tables`) | WAITER_GUIDE |
| `orders.png` | Toma de pedidos (`/orders`) | WAITER_GUIDE |
| `carta.png` | Carta digital QR (`/carta/[slug]`) | USER_MANUAL |
| `kitchen.png` | Pantalla KDS (`/kitchen`) | KITCHEN_GUIDE |
| `cashier.png` | Caja / turno (`/cash`) | CASHIER_GUIDE |
| `superadmin.png` | Panel superadmin (`/superadmin`) | SUPERADMIN_GUIDE |
| `subscriptions.png` | Suscripciones / Billing CRM (`/superadmin/subscriptions`) | BILLING, SUPERADMIN_GUIDE |
| `calendar.png` | Calendario de pagos (detalle de suscripción) | BILLING |
| `reports.png` | Reportes / ventas (`/sales`) | ADMIN_GUIDE |
| `landing.png` | Landing comercial (`/landing`) | README |
| `settings.png` | Configuraciones (`/settings`) | ADMIN_GUIDE |
| `help.png` | Centro de Ayuda (`/help`) | USER_MANUAL |

> Marcador: mientras no exista el `.png`, los documentos referencian estas rutas como pendientes de captura.
