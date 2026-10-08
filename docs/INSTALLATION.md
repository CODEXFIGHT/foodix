# Instalación (desarrollo local) — FoodIX

Cómo levantar FoodIX en tu máquina para desarrollar.

## Requisitos

- **Node.js 20+** y npm.
- **PHP 8.1+** y **MySQL 8** (para el backend, si vas a probar la API real).
- Git.

## 1. Frontend (Next.js)

```bash
# 1) Clonar
git clone <repo-url> foodix
cd foodix

# 2) Instalar dependencias
npm install

# 3) Variables de entorno
cp .env.local.example .env.local   # si existe; si no, crea .env.local

# 4) Levantar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:3000`.

### Variables de entorno (frontend `.env.local`)

| Variable | Descripción |
|----------|-------------|
| `OPENROUTER_API_KEY` | Clave del asistente de IA del menú (solo servidor). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID (Web Push). |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID (solo servidor). |
| `VAPID_SUBJECT` | `mailto:` o URL de contacto del remitente. |
| `PUSH_INTERNAL_SECRET` | Secreto compartido PHP → `/api/push/*`. Debe coincidir con el backend. |
| `CRON_SECRET` | Secreto del cron de Vercel (`/api/cron/subscription-check`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe (pago con tarjeta embebido). |

> La **secret key** de Stripe nunca se expone al frontend; vive en el backend.

## 2. Backend (PHP + MySQL)

```bash
# 1) Crear la base y cargar el schema
mysql -u root -p < php-backend/schema.sql

# 2) Aplicar migraciones EN ORDEN (01 → 24) + kds-migration.sql
#    Cada archivo en php-backend/migrations/ se ejecuta una sola vez.
for f in php-backend/migrations/*.sql; do mysql -u root -p tallerch_foodix < "$f"; done

# 3) Configurar credenciales
#    Edita php-backend/config/database.php (DB_USER, DB_PASS, JWT_SECRET, UPLOAD_URL, PUSH_INTERNAL_SECRET)
#    Edita php-backend/config/stripe.php (claves de Stripe) si usarás tarjeta.

# 4) Servir el backend (ejemplo con el server embebido de PHP)
php -S 127.0.0.1:8080 -t php-backend
```

> El frontend llama a `/backend/*`. En desarrollo, configura un proxy/rewrite hacia tu PHP (ver `next.config.mjs`) o ajusta `BASE_URL` en `lib/api/client.ts`.

### Migraciones clave

| Migración | Aporta |
|-----------|--------|
| `schema.sql` | Tablas base (branches, users, subscriptions, orders…) |
| `02-cash-sessions.sql` | Caja y movimientos |
| `05-saas-billing.sql` | Suscripciones, pagos, auditoría, SPEI |
| `23-cash-session-pos.sql` | Caja por **usuario + POS** |
| `24-billing-crm.sql` | Meses cubiertos, **calendario**, gracia |
| `35-inventory-warehouses-units.sql` | Almacenes por sucursal, catálogo de unidades, kardex ampliado |
| `36-recipe-costing-waste.sql` | Costeo de recetas, merma estimada, reversión idempotente de inventario |
| `37-purchases-partial-transfers.sql` | Recepción parcial de compras, transferencias entre almacenes |
| `38-delivery-zones-tracking.sql` | Zonas de entrega, estado/vehículo de repartidores, bitácora de entrega |
| `39-crm-loyalty-ledger-reviews.sql` | Ledger de puntos/monedero, segmentación de clientes, opiniones |
| `40-station-item-delivered.sql` | Estado "entregado" persistente por platillo en el KDS |

> Lista completa en `php-backend/migrations/`. Correr **en orden**.

**Migraciones 35-40 pendientes** (Inventario avanzado + Delivery + CRM/Fidelización + KDS): usa
`php-backend/migrations/run-pending.sh` en vez de correrlas a mano — valida
que existan los 3 archivos, pide confirmación antes de tocar la base, y
soporta `--dry-run` para ver qué haría sin credenciales:

```bash
# Ver qué se aplicaría, sin conectar a la base:
./php-backend/migrations/run-pending.sh --dry-run

# Aplicar de verdad (pide confirmación):
DB_HOST=localhost DB_NAME=tallerch_foodix DB_USER=tu_usuario DB_PASS='tu_password' \
  ./php-backend/migrations/run-pending.sh
```

Las tres migraciones son idempotentes — correr el script dos veces no duplica nada.

## 3. Comandos disponibles

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |
| `npm run test` | Tests (Vitest) |
| `npm run test:watch` | Tests en watch |

## Verificación rápida

1. `npm run dev` levanta sin errores.
2. La página de login carga.
3. Con el backend arriba, inicia sesión con un usuario semilla (`schema.sql` incluye usuarios de ejemplo).

📖 Siguiente: [Despliegue](DEPLOYMENT.md) · [Arquitectura](ARCHITECTURE.md)
