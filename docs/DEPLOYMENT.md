# Despliegue (producción) — RestaurOS

Cómo publicar RestaurOS. El **frontend** va en **Vercel**; el **backend PHP + MySQL** en hosting propio.

> Ver también el [checklist heredado](DEPLOY-CHECKLIST.md).

## 1. Frontend en Vercel

1. Conecta el repositorio a Vercel.
2. Framework: **Next.js** (autodetectado).
3. Configura las **variables de entorno** (las mismas de [Instalación](INSTALLATION.md#variables-de-entorno-frontend-envlocal)) en *Project Settings → Environment Variables*.
4. Deploy (preview en cada PR, producción al promover).

### Crons (Vercel)
- `/api/cron/subscription-check` se ejecuta a diario y llama al backend (`/subscription-cron`) con `Authorization: Bearer <CRON_SECRET>`.
- Verifica la programación en `vercel.json` / configuración del proyecto.

## 2. Backend PHP

1. Crea la base de datos y ejecuta `schema.sql`.
2. Aplica **todas** las migraciones en orden (`01 → 24` + `kds-migration.sql`).
3. Edita `php-backend/config/database.php`:
   - `DB_USER`, `DB_PASS`, `JWT_SECRET`, `PUSH_INTERNAL_SECRET`.
   - `UPLOAD_URL`: debe apuntar a la **misma** carpeta donde se escribe (ej. `https://tudominio.mx/restauros/api/uploads/products/`).
4. Configura `php-backend/config/stripe.php` (claves Stripe + `STRIPE_WEBHOOK_SECRET`) si usarás tarjeta.
5. Sube los archivos a `/restauros/api/` (o tu ruta) y crea la carpeta `uploads/` con permisos de escritura.
6. Apunta el frontend a la API (`/backend` → rewrite hacia el host PHP en `next.config.mjs`).

### Webhooks de Stripe
- Endpoint: `https://tudominio.mx/restauros/api/webhooks/stripe` (o `.../index.php/webhooks/stripe` sin mod_rewrite).
- Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
- Copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET`.

## 3. Checklist de release

- [ ] Migraciones aplicadas (incluidas `23` y `24`).
- [ ] Variables de entorno en Vercel y en el host PHP.
- [ ] `PUSH_INTERNAL_SECRET` idéntico en frontend y backend.
- [ ] `CRON_SECRET` configurado y cron activo.
- [ ] Stripe en modo correcto (test/live) y webhook verificado.
- [ ] Carpeta `uploads/` con permisos.
- [ ] Prueba: login, abrir caja, pedido, cobro, corte; alta de cliente y pago en SuperAdmin.
- [ ] `npm run build` sin errores.

## 4. Respaldos
Programa respaldos de MySQL en el hosting (diarios). La restauración se hace desde el panel del hosting o por CLI (`mysql < backup.sql`). Mantén copias de `uploads/`.

## 5. Tras desplegar
- Revisa el **Centro de Ayuda** (`/help` → Estado del sistema) para confirmar que la API responde.
- Verifica el cron de suscripciones al día siguiente (estados actualizados, sin falsos suspendidos).

📖 Relacionado: [Instalación](INSTALLATION.md) · [Arquitectura](ARCHITECTURE.md) · [Billing](BILLING.md)
