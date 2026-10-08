# Prueba gratuita de 14 días · alta autoservicio

Registro público de nuevos clientes con verificación de identidad, creación
automática del restaurante (workspace) y activación de una prueba de **14 días
con acceso completo, sin tarjeta**.

Todo corre en el backend PHP + MySQL existente (hosting compartido). No se
agregó ningún proveedor externo nuevo ni dependencias de Composer.

---

## 1. Flujo

```
Landing / Login
   ↓  "Comenzar prueba gratis"
/register            POST /signup/register        → crea `signups`, manda correo
   ↓
Correo               POST /signup/verify-email    → token de un solo uso, 60 min
   ↓
Código               POST /signup/send-phone-code → código de 6 dígitos POR CORREO, 10 min
                     POST /signup/verify-phone    → confirma el teléfono capturado
   ↓
Tu restaurante       POST /signup/activate        → sucursal + admin + trial (1 transacción)
   ↓
Dashboard con acceso completo durante 14 días
```

El trial **solo** empieza en `/signup/activate`, es decir cuando el correo y el
teléfono están verificados y el workspace queda creado. Abrir `/register` no
inicia nada.

## 2. Modelo de datos

El trial pertenece a la **sucursal** (`branches`), nunca al usuario, y vive en
la tabla `subscriptions` que ya usaba el producto:

| Campo | Significado |
|---|---|
| `subscriptions.plan = 'trial'`, `status = 'trial'` | prueba vigente |
| `subscriptions.trial_started_at` / `trial_ends_at` | fechas inmutables, calculadas con `NOW()` de MySQL |
| `subscriptions.trial_days` | 14 (`TRIAL_DAYS` en PHP y en `lib/constants/trial.ts`) |
| `subscriptions.trial_seq = 1` + `UNIQUE(branch_id, trial_seq)` | **un solo trial por sucursal**, garantizado por la base de datos |
| `subscriptions.converted_at` | marca la conversión a un plan de pago |
| `branches.trial_used_at` | marca histórica: esa sucursal ya consumió su prueba |

Tablas nuevas (migración `41-trial-signup.sql`):

- `signups` — altas en curso (antes de existir la sucursal)
- `signup_verifications` — tokens de correo (hash, un solo uso, con caducidad)
- `signup_otp_codes` — códigos del teléfono (hash, intentos, caducidad)
- `trial_identities` — identidades que ya consumieron un trial
- `trial_attempts` — bitácora de decisiones (`TRIAL_GRANTED/REJECTED/REVIEW/EXPIRED/CONVERTED`)
- `trial_rate_limits` — contadores de rate limiting por ventana
- `trial_admin_audit` — extensiones de prueba hechas por el superadmin

### Aplicar la migración

```bash
mysql -h HOST -u USUARIO -p BASE < php-backend/migrations/41-trial-signup.sql
```

Es idempotente (comprueba `INFORMATION_SCHEMA` antes de cada `ALTER`), así que
se puede volver a ejecutar sin romper nada.

## 3. Qué señales se almacenan y para qué (privacidad)

El sistema antiabuso **nunca guarda en claro** el correo, el teléfono, el
dispositivo ni la IP en sus tablas: solo un `HMAC-SHA256` con pepper del
servidor (`TRIAL_HASH_SECRET`). Sirven para comparar, no para reconstruir.

| Señal | Cómo se guarda | Finalidad | ¿Bloquea? |
|---|---|---|---|
| Correo (forma canónica: sin `+alias`, sin puntos en Gmail) | HMAC | evitar un segundo trial con el mismo buzón | Sí |
| Teléfono capturado (E.164, confirmado con código por correo) | HMAC | identidad del negocio | Sí |
| Dispositivo (`ros_did`: cookie HttpOnly generada por el servidor + `device_uid` de la app) | HMAC | detectar altas repetidas desde el mismo equipo | **No por sí solo** (+40 de riesgo) |
| IP | HMAC | velocidad de registro | **Nunca por sí sola** (una plaza, oficina o red móvil comparte IP) |
| Método de pago | fingerprint del proveedor (si algún día se exige tarjeta) | identidad fuerte | Sí |

No se usa fingerprinting de canvas, audio, fuentes, WebGL ni hardware.

### Riesgo

`php-backend/config/trial_risk.php` calcula un puntaje simple:

- `< 30` **LOW** → trial automático
- `30–59` **MEDIUM** → trial automático, marcado para revisión
- `60–99` **HIGH** → no se activa solo; queda en revisión manual
- `>= 100` **BLOCK** → no elegible

El cliente **nunca** ve el puntaje ni la regla que se disparó: siempre recibe el
mismo mensaje genérico de no elegibilidad.

## 4. Envío de correos (canal único, sin costo por mensaje)

**No se envían SMS ni mensajes de WhatsApp.** Todo el alta —el enlace de
verificación y el código de 6 dígitos— viaja por **correo electrónico**.

Configuración en `php-backend/config/secrets.local.php` (ver el `.example`):
basta con las cinco variables `SMTP_*`.

`config/smtp_mailer.php` es un cliente SMTP escrito en PHP puro (sin Composer,
sin PHPMailer) con `STARTTLS` y `AUTH LOGIN`. Usa una cuenta de correo del
propio dominio, incluida en el hosting: **costo $0 por mensaje**. Si no hay SMTP
configurado, cae automáticamente a `mail()`, que es lo que el sistema ya usaba
para los leads.

Las plantillas viven en `config/trial_notify.php`:

| Función | Correo |
|---|---|
| `sendVerificationEmail()` | enlace para confirmar la cuenta (60 min, un solo uso) |
| `sendVerificationCodeEmail()` | **código de 6 dígitos** en recuadro punteado (10 min) |
| `sendTrialStartedEmail()` | bienvenida con fechas de inicio y fin |
| `sendTrialReminderEmail()` | recordatorio a 7, 3 y 1 días |
| `sendTrialExpiredEmail()` | fin de la prueba + CTA a planes |

Están construidas con tablas y estilos en línea (lo único que renderiza bien en
Gmail, Outlook y Apple Mail), el logo es HTML+CSS —no una imagen— para que se
vea aunque el cliente bloquee las imágenes, y todas comparten cabecera de marca
y pie con **DevHive Software**, la fecha de envío y los enlaces legales.

Los códigos y los tokens **nunca** se escriben en los logs ni se devuelven por la API.

> Nota sobre el teléfono: se sigue capturando y sigue contando como señal
> antiabuso (un mismo número no obtiene un segundo trial), pero al confirmarse
> con un código enviado al correo, **no prueba la posesión de esa línea**. Es una
> señal algo más débil que un SMS; el resto de capas (correo canónico,
> dispositivo, IP, velocidad y rate limiting) compensan.

## 5. Rate limiting

`php-backend/config/rate_limit.php` (ventana fija sobre MySQL, porque en hosting
compartido no hay Redis). Devuelve `429` con `Retry-After`:

| Ámbito | Límite |
|---|---|
| `register_ip` / `register_ip_day` | 8/hora · 20/día |
| `register_device` | 5/día |
| `otp_phone` / `otp_phone_day` | 5/hora · 10/día (envíos de código) |
| `otp_ip` | 15/hora |
| `otp_verify` | 10/hora (y 5 intentos por código) |
| `email_resend` | 5/hora |
| `activate_ip` | 10/hora |

## 6. Fin de la prueba

El cron diario (`POST /subscription-cron`, invocado desde
`/api/cron/subscription-check`) pasa las pruebas vencidas a `status = 'expired'`
**sin periodo de gracia y sin suspender la sucursal**:

- **No se borra nada**: pedidos, productos, menús, empleados, clientes,
  configuración e imágenes siguen intactos.
- El usuario **puede iniciar sesión** (solo `terminated` bloquea el acceso).
- `SubscriptionGuard` muestra "Tu prueba gratuita ha terminado" y deja pasar a
  `/billing` para elegir plan.

También envía avisos por correo a 7, 3 y 1 días del final, y al expirar.

## 7. Panel del superadmin

`/superadmin/trials`: iniciados, activos, expirados, convertidos, bloqueados y
tasa de conversión; búsqueda por restaurante, dueño, correo o teléfono; filtros
y acción **Extender prueba** (+3 / +7 / +14 días o fecha exacta), que exige rol
superadmin y queda auditada en `trial_admin_audit` con fecha previa, nueva,
autor y motivo.

## 8. Medición del embudo

No se agregó ninguna plataforma de analítica. El embudo se puede medir
directamente contra la base de datos:

```sql
-- signup → verificación → trial
SELECT COUNT(*) AS registros,
       SUM(email_verified_at IS NOT NULL) AS correo_verificado,
       SUM(phone_verified_at IS NOT NULL) AS telefono_verificado,
       SUM(status = 'activated')          AS trials_activados
FROM signups;

-- trial → pago
SELECT COUNT(*) AS trials, SUM(converted_at IS NOT NULL) AS convertidos
FROM subscriptions WHERE trial_seq = 1;
```

## 9. Pruebas

```bash
# Backend: 20 pruebas de integración contra una base MySQL real
php php-backend/tests/run-trial-tests.php     # ROS_DB_USER / ROS_DB_PASS / ROS_DB_NAME

# Frontend
npx vitest run __tests__/trial
```

Para probar el alta completa en local, con el backend PHP y la base de pruebas:

```bash
npm run backend:serve      # PHP en 127.0.0.1:8787
npm run dev:local-backend  # Next apuntando a ese backend (BACKEND_ORIGIN)
```
