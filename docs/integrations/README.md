# Checkout de la landing — Pagos y provisión de cuentas

Flujo de alta de clientes desde la landing pública (`/landing` → `/landing/checkout`).
Todo queda **inerte y seguro** hasta configurar las variables de entorno: producción
no se ve afectada mientras falten.

## Arquitectura

```
Visitante  →  /landing/checkout  →  elige plan + método
   │
   ├─ Tarjeta  → POST /api/checkout (crea PaymentIntent)
   │              → Stripe Payment Element → pago
   │              → Stripe envía webhook → POST /api/stripe/webhook
   │              → provisionAccount() → POST {BACKEND_PROVISION_URL} (event=payment.succeeded)
   │              → tu backend crea la cuenta + envía accesos
   │
   └─ SPEI     → POST /api/spei-intent (CLABE + referencia)
                  → visitante transfiere y reporta → POST /api/spei-report
                  → provisionAccount() → POST {BACKEND_PROVISION_URL} (event=spei.reported, pending_review)
                  → admin verifica el depósito en el banco y activa la cuenta
```

## Archivos (frontend, este repo)

| Archivo | Rol |
|---|---|
| `app/landing/plans.ts` | Catálogo de planes (Lite $250 / Pro $499). Fuente única. |
| `app/landing/checkout/` | Página de checkout responsiva (tarjeta + SPEI). |
| `app/api/checkout/route.ts` | Crea el PaymentIntent (tarjeta). Monto calculado en servidor. |
| `app/api/stripe/webhook/route.ts` | Recibe eventos de Stripe (firma verificada) y provisiona. |
| `app/api/spei-intent/route.ts` | Devuelve datos bancarios SPEI + referencia única. |
| `app/api/spei-report/route.ts` | Encola el reporte SPEI como `pending_review`. |
| `lib/server/provision.ts` | Puente único hacia el backend (contrato + secreto). |

## Backend (tu PHP, a implementar)

Ver **`provision.example.php`** — esqueleto del endpoint que recibe la provisión.
Debe: validar el Bearer token, ser idempotente por `payment_ref`, crear la cuenta
(tarjeta) o dejarla en revisión (SPEI), y enviar accesos / código de activación.

## Variables de entorno

```bash
# Stripe (tarjeta)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...          # del endpoint /api/stripe/webhook en Stripe

# SPEI manual (tu cuenta bancaria)
SPEI_BANK_NAME="BBVA"
SPEI_CLABE="012XXXXXXXXXXXXXXX"
SPEI_BENEFICIARY="DevHive Software SA de CV"
SPEI_INSTRUCTIONS="Incluye la referencia en el concepto."   # opcional

# Puente de provisión (tu backend)
BACKEND_PROVISION_URL="https://tallercheck.mx/restauros/api/index.php/billing/provision"
BACKEND_PROVISION_TOKEN="<secreto-largo-compartido>"
```

## Configurar el webhook en Stripe

1. Dashboard de Stripe → Developers → Webhooks → Add endpoint.
2. URL: `https://restauros.app/api/stripe/webhook`
3. Eventos: `payment_intent.succeeded` (y opcional `payment_intent.payment_failed`).
4. Copia el *Signing secret* (`whsec_...`) a `STRIPE_WEBHOOK_SECRET`.

## Estado sin configurar (verificado)

| Endpoint | Respuesta sin env |
|---|---|
| `POST /api/checkout` | `503 not_configured` |
| `POST /api/stripe/webhook` | `503 not_configured` |
| `POST /api/spei-intent` | `503 not_configured` |
| `POST /api/spei-report` | `202` (acepta y deja log; el visitante recibe confirmación) |

## Contrato de provisión (lo que recibe tu backend)

```json
{
  "event": "payment.succeeded | spei.reported",
  "method": "card | spei",
  "status": "paid | pending_review",
  "plan": "lite | pro",
  "email": "chef@ejemplo.mx",
  "restaurant": "Mariscos El Puerto",
  "amount": 499,
  "currency": "mxn",
  "payment_ref": "pi_... | ROS-PRO-7F3K9Q",
  "paid_at": "2026-06-02T17:20:00.000Z",
  "transfer": { "bank_transfer_date": "2026-06-02", "bank_sender_name": "Juan Pérez", "tracking_reference": "..." }
}
```
Header: `Authorization: Bearer <BACKEND_PROVISION_TOKEN>` · Respuesta esperada: `2xx`.
