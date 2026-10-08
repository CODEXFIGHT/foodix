# Administración SaaS — Suscripciones, Stripe y Transferencias SPEI

Módulo para que el **dueño de FoodIX** (rol `superadmin`) administre las suscripciones
mensuales de cada sucursal, y para que cada **admin de sucursal** pague y vea su estado.

- Pago con **tarjeta** vía Stripe, en dos modos:
  - **Payment Element embebido** (recomendado): formulario dentro de *Mi Suscripción*, sin salir de FoodIX.
  - **Checkout alojado**: redirección a la página de Stripe (enlace alternativo).
  - Más **Billing Portal** (actualizar método / facturas) + **Webhooks** para sincronizar estado.
- Pago por **transferencia interbancaria SPEI** (México) con aprobación manual.
- Bloqueo/permiso de acceso automático según el estado de la suscripción.

---

## 1. Variables de entorno

### Backend PHP — `php-backend/config/stripe.php`
Reemplaza los `define(...)` (o expórtalas como variables de entorno del host, ya que el
archivo hace `getenv()` como fallback):

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…`. **Nunca** en el frontend. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del endpoint del webhook. |
| `STRIPE_PRICE_ID_MONTHLY_RESTAUROS` | `price_…` del precio mensual (MXN). |
| `APP_URL` | URL pública del frontend (para `success_url`/`cancel_url`). |

Mientras tengan el valor `…PLACEHOLDER`, el backend responde `503` en los endpoints de
tarjeta y el botón "Pagar con tarjeta" muestra el aviso correspondiente. El flujo SPEI
funciona sin Stripe.

### Frontend Next.js — `.env.local`
| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…`. **Obligatoria** para el Payment Element embebido. Si falta o es placeholder, el formulario embebido muestra un aviso y quedan disponibles SPEI y el Checkout alojado. La secret key nunca se expone al frontend. |
| `NEXT_PUBLIC_APP_URL` | URL pública del frontend. |

---

## 2. Migración de base de datos

Correr **una vez** en la base MySQL de producción (después de las migraciones 01–04):

```sql
-- php-backend/migrations/05-saas-billing.sql
```

Amplía la tabla `subscriptions` (nuevos estados + campos de billing) y crea
`subscription_payments`, `subscription_audit_log` y `bank_transfer_config`.
Edita la fila de `bank_transfer_config` con los datos bancarios reales del dueño.

---

## 3. Estados de suscripción

| Estado | Acceso | Significado |
|--------|--------|-------------|
| `active` | ✅ | Suscripción al corriente. |
| `trial` | ✅ | Periodo de prueba. |
| `past_due` | ⚠️ con banner | Vence pronto / cobro pendiente. |
| `payment_failed` | ⛔ → Mi Suscripción | Falló el cobro con tarjeta. |
| `pending_bank_transfer` | ⛔ | Esperando que el cliente transfiera. |
| `bank_transfer_review` | ⛔ | Transferencia reportada, en revisión del superadmin. |
| `suspended` | ⛔ | Suspendida manualmente. |
| `canceled` | acceso hasta fin de periodo | No renovará. |
| `terminated` | ⛔ login bloqueado | Baja definitiva (soft delete). |
| `expired` | ⛔ | Venció sin pago. |

`SUBSCRIPTION_ALLOWED` (en `lib/constants/subscription.ts`) = `active`, `trial`, `past_due`.
El `SubscriptionGuard` permite esos estados (con banner en `past_due`) y bloquea el resto
redirigiendo a `/billing`. El login PHP solo bloquea de forma dura `terminated`.

**Días restantes:** verde `>7`, amarillo `≤7`, rojo `≤0` (vencida).

---

## 4. Probar webhooks con Stripe CLI

```bash
# 1) Login y escucha, reenviando al webhook del backend
stripe login
stripe listen --forward-to https://tallercheck.mx/foodix/api/webhooks/stripe
#   (en local sin mod_rewrite: .../index.php/webhooks/stripe)

# 2) Copia el whsec_… que imprime y ponlo en STRIPE_WEBHOOK_SECRET

# 3) Disparar eventos de prueba
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

Eventos manejados: `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
`invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
La firma se verifica en `stripeVerifyWebhook()` (HMAC-SHA256, tolerancia 5 min, anti-replay).
`invoice.paid` es idempotente por `stripe_invoice_id`.

---

## 5. Probar pago con tarjeta

### Payment Element embebido (recomendado)
1. Como **admin de sucursal**, entra a **Mi Suscripción** (`/billing`).
2. "Pagar con tarjeta" → se despliega el formulario embebido. El backend
   (`POST /billing/create-subscription`) crea la suscripción `default_incomplete` y
   devuelve el `client_secret` del PaymentIntent.
3. Tarjeta de prueba `4242 4242 4242 4242`, fecha futura, CVC cualquiera → **Pagar suscripción**.
4. `stripe.confirmPayment` confirma (gestiona 3D Secure si aplica) y regresa a `/billing?checkout=success`.
5. El webhook `invoice.paid` / `subscription.updated` marca la suscripción `active`, guarda
   `stripe_customer_id`/`stripe_subscription_id`, periodos y `last_payment_at`.

**Flujo:** `StripePaymentForm` → `useCreateSubscription` → `POST /billing/create-subscription`
(crea/reutiliza Customer, `subscription` con `payment_behavior=default_incomplete`,
`expand=latest_invoice.payment_intent`) → `client_secret` → `<Elements>` + `<PaymentElement>`
→ `confirmPayment` → webhook. Requiere `@stripe/stripe-js` + `@stripe/react-stripe-js`
(ya instalados) y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### Checkout alojado (alternativa)
- Bajo el formulario hay un enlace **"o usar el Checkout alojado de Stripe"**
  (`POST /billing/create-checkout-session`) que redirige a la página de Stripe.

### Billing Portal
- "Actualizar método de pago" abre el **Billing Portal** de Stripe (`POST /billing/create-portal-session`).

---

## 6. Aprobar una transferencia SPEI (manual)

**Admin de sucursal:**
1. En `/billing` → "Pagar por transferencia".
2. Ve los datos SPEI + la **referencia única** `RESTAUROS-{branchId}-{YYYYMM}` y el monto.
3. Transfiere y luego reporta: fecha, emisor, banco, clave de rastreo (y URL de comprobante opcional).
   → el pago queda en `bank_transfer_review`.

**Superadmin:**
1. **Administración SaaS** (`/superadmin/subscriptions`) → filtro "Pend. transferencia".
2. "Ver detalle" → en el pago en revisión: **Aprobar** (activa +30 días, `payment_method=bank_transfer`)
   o **Rechazar** con motivo (vuelve a `pending_bank_transfer`).

Todas las acciones quedan registradas en `subscription_audit_log`.

---

## 7. Endpoints

**Superadmin** (`requireRole superadmin`):
```
GET  /superadmin/subscriptions
GET  /superadmin/subscriptions/{branchId}
POST /superadmin/subscriptions/{branchId}/suspend|reactivate|cancel|terminate
POST /superadmin/bank-transfers/{paymentId}/approve|reject
```
`terminate` exige `confirm_name` igual al nombre de la sucursal (soft delete, conserva pagos).

**Admin de sucursal** (`requireRole admin`, validado por `branch_id` del JWT):
```
GET  /billing/me
POST /billing/bank-transfer-intent
POST /billing/bank-transfer-submit
POST /billing/create-subscription        # Payment Element embebido (devuelve client_secret)
POST /billing/create-checkout-session    # Checkout alojado (devuelve url)
POST /billing/create-portal-session
```

**Webhook** (público, firmado):
```
POST /webhooks/stripe
```

### Seguridad
- El precio del Checkout viene **siempre** del `STRIPE_PRICE_ID_MONTHLY_RESTAUROS` del servidor.
- El monto SPEI se calcula server-side (`bank_transfer_config.amount_default` o `price_monthly`).
- Webhook verificado por firma; nunca confía en el cliente.
- No se duplican suscripciones activas de Stripe.
- Baja definitiva = soft delete; el historial financiero no se borra.
