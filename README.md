<div align="center">

<img src="public/brand/foodix-icon.svg" width="96" height="96" alt="FoodIX" />

# FoodIX

### El sistema operativo de tu restaurante

Punto de venta en la nube — POS, KDS, caja, inventario y carta digital — para
restaurantes, taquerías y cafeterías. **Sin instalación, desde cualquier navegador.**
Construido con **Next.js 15** y un backend **PHP 8 + MySQL** en producción.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087EA4?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?style=flat-square&logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com)
[![License](https://img.shields.io/badge/license-Proprietary-D1400F?style=flat-square)](#)

<br/>

**[Características](#qué-es-foodix) · [Stack](#stack-tecnológico) · [Paleta de colores](#paleta-de-colores) · [Arquitectura](#arquitectura) · [API](#endpoints-del-api) · [Instalación](#instalación-y-desarrollo-local)**

<br/>

<!-- Brand strip — FoodIX Paprika -->
![](https://placehold.co/680x8/D1400F/D1400F.png)

</div>

---

## ¿Qué es FoodIX?

FoodIX es una plataforma web de gestión integral (POS + operación) que reemplaza los sistemas tradicionales de comandas en papel y terminales costosas. Es un servicio en la nube (SaaS) por suscripción mensual y funciona desde cualquier navegador, en tabletas, celulares o computadoras, sin instalación.

**FoodIX es una plataforma web de gestión integral (POS + operación) que reemplaza los sistemas tradicionales de comandas en papel y terminales costosas. Es un servicio en la nube (SaaS) por suscripción mensual y funciona desde cualquier navegador, en tabletas, celulares o computadoras, sin instalación.**

**Características principales:**
- 🧾 Gestión de pedidos con flujo de 3 pasos (mesa, para llevar, domicilio)
- 💳 Cobro con formas de pago múltiples, cuenta dividida, propina y descuento (**IVA incluido** en precios)
- 🍔 Menú completo: hasta **5 fotos por platillo**, descripción, ingredientes, alérgenos y etiquetas destacadas, con **generación de descripción e ingredientes por IA** y **vista previa en vivo** de la tarjeta
- 🧩 Modificadores de productos (términos, extras, tamaños)
- 🪑 Control de mesas en tiempo real
- 📅 Reservaciones y 🛵 domicilios con repartidores
- 🍳 Kitchen Display System (KDS) con estaciones caliente y fría
- 💵 Caja y turnos (apertura/cierre, cortes X/Z, arqueo, movimientos)
- 📦 Inventario y compras (insumos, recetas/escandallos, mermas, proveedores)
- 🤝 Clientes y lealtad (CRM con monedero y puntos)
- 🏷️ **Promociones, combos, cupones y lealtad** (exclusivo Pro/AI/MultiSucursal): descuentos automáticos por día/horario/categoría/producto, combos a precio fijo (repreciados y expandidos a sus productos reales para cocina e inventario), cupones canjeables y recompensas de lealtad por teléfono — todo se aplica solo al cobrar, con auditoría visible en el pedido y el ticket
- 🍽️ Carta digital pública por sucursal (`/carta/{slug}`): vista vertical por secciones, búsqueda en tiempo real, filtros, dirección de la sucursal, visor de platillos a pantalla completa y carrito conectado al menú real
- 📱 **Carta QR** compartible desde el sistema (código QR + enlace + botón compartir), disponible para **admin y mesero**
- 💬 **WhatsApp con IA** (exclusivo **Plan AI y MultiSucursal**): pedidos automáticos por WhatsApp tipo checkout de food-delivery — catálogo priorizado (Recomendados → Más vendidos → categorías) paginado de 10 en 10, **varios platillos y cantidades en un solo mensaje** (parser determinista + fallback de IA), cero preguntas de fricción (tipo de entrega automático por sucursal, alias de cliente automático), idempotencia contra reintentos de webhook y doble envío
- 🎨 Logotipo personalizado por sucursal (se muestra en el login del equipo)
- 📊 Reportes de ventas con exportación CSV
- 🖨️ Impresión de tickets/comandas y cajón de dinero (USB/Bluetooth/red)
- 💼 Suscripciones SaaS: pago con tarjeta (Stripe) y transferencia SPEI
- 🔐 Autenticación JWT **por usuario** con control de dispositivos
- 👑 Panel Super Admin multi-sucursal con administración de suscripciones
- 📡 **Device Center**: monitoreo en tiempo real de los dispositivos conectados por establecimiento (kioskos, pantallas de cocina, tablets, cajas, lectores, POS-8360, impresoras), con estado online/idle/offline/error, heartbeat, alertas y registro manual de periféricos

**Cambios recientes en la interfaz:**
- 🎨 **Paleta Paprika**: el color de marca pasa de naranja brillante a rojo-paprika `#D1400F` (hover `#B03508`, dark `#E04410`), más apetitoso y con contraste AA sobre blanco; aplica a botones, inputs, foco, sidebar activo e íconos de marca.
- 🔤 **Tipografía renovada FoodIX**: Plus Jakarta Sans (títulos) + Inter (cuerpo), sin serif; tokens `--font-plus-jakarta-sans` y `--font-inter` cargados en layout.tsx y mapeados en tailwind.config.ts. Marca unificada como FoodIX en todo el producto, landing y assets.
- 🔤 **Planes renombrados**: Starter / Pro / AI / MultiSucursal (antes Trial/Basic/Pro/Enterprise), con `licenseForPlan()`/`requirePlanFeature()` como fuente única de verdad de límites y funciones por plan, y `FeatureLock` en el frontend para las funciones gateadas (Promociones, Inventario, WhatsApp)
- 💬 **Rediseño del bot de WhatsApp**: multi-ítem por mensaje, catálogo priorizado y paginado, cero preguntas de fricción (ver arriba) — ahora exclusivo del **Plan AI**
- 🏷️ **Ejecución real de Promociones/Combos/Cupones/Lealtad**: antes solo existía el CRUD; ahora se aplican automáticamente al cobrar, tanto en POS como en pedidos por WhatsApp, con selector de combos en **Nuevo Pedido** y desglose auditable en el detalle del pedido y el ticket
- 🧾 **Pedidos**: cancelar un pedido activo directo desde la lista (con confirmación, sin entrar al detalle); búsqueda por QR/folio en el Historial de tickets con validaciones, aviso de carga y mensaje de error si el folio no existe
- 🪑 Fix de condición de carrera: dos dispositivos ya no pueden crear cada uno su propia comanda para la misma mesa (bloqueo de fila + rechazo `409` con redirección a la orden existente)
- 🧾 POS (Mesero/Admin): tocar la tarjeta/foto de un producto lo agrega al instante, incluso con modificadores configurados — el modal de modificadores se abre aparte con el botón **"Personalizar"**, sin bloquear el alta rápida
- 🧮 El resumen del pedido en pantalla (Mesero y Admin) ya no desglosa el IVA por separado (sigue incluido en el precio); el ticket impreso mantiene el desglose para contabilidad
- Landing pública renovada con enfoque comercial para desktop y móvil
- Toggle de tema claro/oscuro en la página principal
- Showcase de producto con iconografía consistente para módulos clave
- Nueva sección premium de operación real con imagen POS, copy comercial, testimonios y animaciones ligeras de reveal/parallax
- Inicio de sesión sin sugerencias de autocompletado del navegador en usuario y contraseña (privacidad en dispositivos compartidos)
- Carta pública responsive renovada: navegación vertical optimizada, slider dinámico de categorías y controles adaptados a mobile y desktop
- Buscador contextual: el mismo input se reposiciona debajo del navbar de categorías al activar el FAB durante el scroll; incluye debounce y búsqueda tolerante a acentos
- Visor de platillos con zoom in/out, arrastre de imagen ampliada, controles accesibles y microanimaciones al agregar productos
- Header público con dirección completa del restaurante y ticker automático para direcciones largas, adaptado a mobile y desktop

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 15 (App Router) | Framework principal |
| React | 19 | UI |
| TypeScript | Strict | Tipado estático |
| Tailwind CSS | v3 | Estilos |
| Zustand | v5 | Estado global (auth + UI) |
| TanStack Query | v5 | Fetching y caché de datos del API |
| shadcn/ui + Radix | — | Componentes UI |
| React Hook Form | v7 | Formularios |
| Zod | v4 | Validación de esquemas |
| Recharts | v3 | Gráficas de ventas |
| date-fns | v4 (es locale) | Fechas en español |
| react-dropzone | — | Arrastrar y soltar imágenes (menú y logotipo) |
| Swiper | 12.2.0 | Galerías y navegación horizontal en componentes compatibles |
| react-qr-code | — | QR de la carta pública por sucursal |
| next-themes | — | Modo oscuro/claro |
| Sonner | — | Notificaciones toast |
| Lucide React | — | Iconografía UI |

### Backend
| Tecnología | Uso |
|-----------|-----|
| PHP 8.1+ | API REST pura (sin frameworks) |
| MySQL 8 | Base de datos principal |
| JWT (HS256) | Autenticación stateless |
| PDO | Acceso seguro a la base de datos |

**API URL:** `https://tallercheck.mx/foodix/api/`

---

## Paleta de colores

El sistema de diseño de FoodIX se basa en **design tokens** (CSS variables en
HSL) con tema **claro** y **oscuro**, expuestos a Tailwind en
[`tailwind.config.ts`](tailwind.config.ts) y definidos en
[`app/globals.css`](app/globals.css). El color de marca es **FoodIX Paprika**
(`#D1400F`), acompañado de una base cálida _stone/off-white_.

### Marca · FoodIX Paprika

| | Color | Hex | Uso |
|---|-------|-----|-----|
| ![](https://placehold.co/18x18/D1400F/D1400F.png) | **Paprika 500** _(primary)_ | `#D1400F` | Color principal, CTAs, foco, sidebar activo |
| ![](https://placehold.co/18x18/B03508/B03508.png) | Paprika 600 _(hover)_ | `#B03508` | Hover de botones de marca |
| ![](https://placehold.co/18x18/F5A623/F5A623.png) | Amber _(brand accent)_ | `#F5A623` | Acentos, gradientes, badges destacados |
| ![](https://placehold.co/18x18/FA6005/FA6005.png) | Paprika _(dark primary)_ | `#E04410` | Primary en tema oscuro |

```css
brand: { DEFAULT: "#D1400F", hover: "#B03508", accent: "#F5A623" }
```

### Tema claro

| | Token | Hex | HSL | Uso |
|---|-------|-----|-----|-----|
| ![](https://placehold.co/18x18/F7F4F0/F7F4F0.png) | `--background` | `#F7F4F0` | `40 25% 97%` | Fondo cálido off-white |
| ![](https://placehold.co/18x18/1C1917/1C1917.png) | `--foreground` | `#1C1917` | `20 14% 11%` | Texto principal (stone-900) |
| ![](https://placehold.co/18x18/FFFFFF/FFFFFF.png) | `--card` / `--popover` | `#FFFFFF` | `0 0% 100%` | Superficies, tarjetas, menús |
| ![](https://placehold.co/18x18/D1400F/D1400F.png) | `--primary` / `--ring` | `#D1400F` | `15 87% 44%` | Acción principal y anillo de foco |
| ![](https://placehold.co/18x18/ECE7E2/ECE7E2.png) | `--secondary` / `--muted` | `#ECE7E2` | `30 10% 92%` | Fondos secundarios y atenuados |
| ![](https://placehold.co/18x18/867E79/867E79.png) | `--muted-foreground` | `#867E79` | `25 5% 50%` | Texto secundario (stone-500) |
| ![](https://placehold.co/18x18/F4A425/F4A425.png) | `--accent` | `#F4A425` | `37 90% 55%` | Acento ámbar |
| ![](https://placehold.co/18x18/EF4444/EF4444.png) | `--destructive` | `#EF4444` | `0 84% 60%` | Errores y acciones destructivas |
| ![](https://placehold.co/18x18/E7E2DC/E7E2DC.png) | `--border` / `--input` | `#E7E2DC` | `30 10% 90%` | Bordes y campos (stone-200) |

### Tema oscuro

| | Token | Hex | HSL | Uso |
|---|-------|-----|-----|-----|
| ![](https://placehold.co/18x18/0F0F0F/0F0F0F.png) | `--background` | `#0F0F0F` | `0 0% 6%` | Fondo casi negro |
| ![](https://placehold.co/18x18/F5F3F0/F5F3F0.png) | `--foreground` | `#F5F3F0` | `30 10% 96%` | Texto principal |
| ![](https://placehold.co/18x18/1A1A1A/1A1A1A.png) | `--card` / `--popover` | `#1A1A1A` | `0 0% 10%` | Superficies elevadas |
| ![](https://placehold.co/18x18/FA6005/FA6005.png) | `--primary` / `--ring` | `#E04410` | `15 87% 47%` | Acción principal (más brillante) |
| ![](https://placehold.co/18x18/292929/292929.png) | `--secondary` / `--muted` | `#292929` | `0 0% 16%` | Fondos secundarios y atenuados |
| ![](https://placehold.co/18x18/938B84/938B84.png) | `--muted-foreground` | `#938B84` | `25 5% 55%` | Texto secundario |
| ![](https://placehold.co/18x18/F4A425/F4A425.png) | `--accent` | `#F4A425` | `37 90% 55%` | Acento ámbar |
| ![](https://placehold.co/18x18/DC3C3C/DC3C3C.png) | `--destructive` | `#DC3C3C` | `0 70% 55%` | Errores y acciones destructivas |
| ![](https://placehold.co/18x18/2E2E2E/2E2E2E.png) | `--border` / `--input` | `#2E2E2E` | `0 0% 18%` | Bordes y campos |

### Sidebar (siempre oscuro)

La barra lateral mantiene una identidad oscura fija en ambos temas.

| | Token | Hex | Uso |
|---|-------|-----|-----|
| ![](https://placehold.co/18x18/1C1917/1C1917.png) | `--sidebar-bg` _(claro)_ | `#1C1917` | Fondo de la sidebar en tema claro |
| ![](https://placehold.co/18x18/111111/111111.png) | `--sidebar-bg` _(oscuro)_ | `#111111` | Fondo de la sidebar en tema oscuro |
| ![](https://placehold.co/18x18/E7E5E4/E7E5E4.png) | `--sidebar-text` | `#E7E5E4` | Texto e iconos de la sidebar |
| ![](https://placehold.co/18x18/D1400F/D1400F.png) | `--sidebar-active` | `#D1400F` | Ítem de navegación activo |

### Acentos de estaciones KDS y carta digital

Glows usados en la carta digital y para diferenciar las estaciones de cocina.

| | Color | Hex | Uso |
|---|-------|-----|-----|
| ![](https://placehold.co/18x18/F97316/F97316.png) | 🔥 Caliente — Orange 500 | `#F97316` | Glow de estación caliente / platillos calientes |
| ![](https://placehold.co/18x18/EF4444/EF4444.png) | 🔥 Caliente — Red 500 | `#EF4444` | Realce de calor |
| ![](https://placehold.co/18x18/38BDF8/38BDF8.png) | 🧊 Fría — Sky 400 | `#38BDF8` | Glow de estación fría / bar |
| ![](https://placehold.co/18x18/3B82F6/3B82F6.png) | 🧊 Fría — Blue 500 | `#3B82F6` | Realce de frío |

### Tokens de forma y tipografía

| Token | Valor | Notas |
|-------|-------|-------|
| `--radius` | `0.75rem` | Radio base; deriva `lg` / `md - 2px` / `sm - 4px` |
| `font-sans` | Inter | Texto de interfaz (`--font-inter`) |
| `font-heading` | Plus Jakarta Sans + Inter | Títulos (`--font-plus-jakarta-sans`, fallback `--font-inter`) |
| `font-body` | Inter | Cuerpo (`--font-inter`)

> Los valores de origen viven en HSL dentro de `:root`, `.dark` y `.theme-light`
> (esta última fuerza tokens claros en pantallas de marca como login/PIN). Los
> hex de esta tabla son la conversión de referencia para diseño y documentación.

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 15 — Vercel)                 │
│                                                  │
│  ┌─────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Auth Store │  │  TanStack  │  │  Zustand │  │
│  │  (Zustand)  │  │   Query    │  │  Config  │  │
│  │  JWT+Device │  │  (API data)│  │ (UI pref)│  │
│  └─────────────┘  └────────────┘  └──────────┘  │
└────────────────────────┬────────────────────────┘
                         │ HTTPS / JWT Bearer
┌────────────────────────▼────────────────────────┐
│  Backend PHP (tallercheck.mx)                   │
│                                                  │
│  index.php (router) → routes/*.php              │
│  config/{database, jwt, cors, auth}.php         │
│                                                  │
│  MySQL 8: branches, users, categories,          │
│  products, product_images, modifiers, tables,   │
│  orders, order_items, order_item_station_status,│
│  cash_sessions, inventory, recipes, suppliers,  │
│  purchases, customers, drivers, reservations,   │
│  devices, subscriptions, subscription_payments, │
│  subscription_audit_log, bank_transfer_config,  │
│  revoked_tokens, promotions, combos,            │
│  combo_items, coupons, loyalty_rules,           │
│  order_discounts_applied, wa_connections,       │
│  wa_sessions, wa_messages, wa_order_dedup       │
└─────────────────────────────────────────────────┘
```

> El módulo de suscripciones (Stripe + SPEI) se documenta a detalle en
> [`docs/SUBSCRIPTIONS.md`](docs/SUBSCRIPTIONS.md). Las migraciones SQL viven en
> `php-backend/migrations/` y se corren en orden (01 → 34 al día de hoy), más
> `kds-migration.sql` para las estaciones de cocina. Arquitectura completa,
> stack y diagramas: [`docs/STACK.md`](docs/STACK.md).

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `superadmin` | Panel global: sucursales, administración SaaS (suscripciones/pagos), dispositivos, **Device Center** (monitoreo en tiempo real), usuarios |
| `admin` | Dashboard, pedidos, mesas, reservas, domicilios, menú, modificadores, caja, inventario, clientes, promociones/combos/lealtad, ventas, ajustes, WhatsApp y Mi Suscripción |
| `mesero` | Pedidos, mesas, reservas, domicilios, clientes, caja y Carta QR (propia sucursal) |
| `cocina` | Pantalla KDS (caliente, fría o ambas según `station`) |

---

## Modo Demo

Prueba gratuita de **30 minutos** para que nuevos suscriptores exploren el sistema **sin registrarse y sin tocar datos reales**. Vive en `app/demo/` y `components/demo/`, totalmente aislado del dominio real (no consulta el backend ni el `authStore`).

**Cómo se entra**

- Desde `/demo`: tarjetas premium **Admin / Mesero / Cocina** → modal informativo → "Comenzar prueba".
- Desde el login real `/login`: si se escriben las credenciales reservadas **`admin`**, **`mesero`** o **`cocina`**, el botón muta a "Entrar al demo" y redirige al rol correspondiente **sin autenticar contra el backend**. No pide contraseña.

**Cómo funciona**

| Aspecto | Detalle |
|---------|---------|
| Restaurante | **Restaurante Demo La Naranja** (3 platillos, 2 bebidas, 3 mesas, pedidos simulados) |
| Sesión | Por pestaña en `sessionStorage` (`isDemo`, `demoRole`, `demoStartedAt`, `demoExpiresAt`, `demoRestaurantName`) |
| Datos | `localStorage` con namespace `foodix_demo_*`; **nunca** se mezclan con datos reales |
| Tiempo real | Sincronización entre pestañas vía `BroadcastChannel` + evento `storage` (Mesero ⇄ Cocina ⇄ Admin) |
| Contador | Badge "Demo: 29:45 restantes" en el topbar; al llegar a 00:00 cierra sesión, limpia datos y vuelve a `/demo` |
| Limpieza | En logout, expiración, sesión vencida al cargar, o al cerrar la pestaña (sessionStorage) |
| Acciones sensibles | Bloqueadas con aviso "Esta acción está deshabilitada en el modo demo" (`DemoModeGuard`) |
| UI/UX | Mismo chrome del dashboard real (sidebar, topbar, nav móvil) replicado en `components/demo/shell/` |

> El modo demo es independiente del login productivo: el formulario real de usuario/contraseña/PIN sigue intacto y las credenciales demo nunca llegan al backend.

---

## Estructura del proyecto

```
├── app/
│   ├── (auth)/login/              # Inicio de sesión
│   ├── (dashboard)/               # Layout con sidebar (autenticado)
│   │   ├── page.tsx               # Dashboard admin
│   │   ├── orders/                # Listado + nuevo pedido + detalle
│   │   ├── tables/                # Gestión de mesas
│   │   ├── reservations/          # Reservaciones
│   │   ├── deliveries/            # Domicilios y repartidores
│   │   ├── menu/                  # Carta y menú con upload de imágenes
│   │   ├── carta-digital/         # Carta QR: código QR + enlace compartible (admin/mesero)
│   │   ├── modifiers/             # Modificadores de productos
│   │   ├── cash/                  # Caja y turnos (cortes X/Z, arqueo)
│   │   ├── inventory/             # Inventario, recetas, proveedores, compras
│   │   ├── customers/             # CRM: clientes, monedero y lealtad
│   │   ├── promotions/            # Promociones, combos, cupones y lealtad (Pro/AI/MultiSucursal)
│   │   ├── sales/                 # Reportes y exportación
│   │   ├── billing/               # Mi Suscripción (Stripe + SPEI)
│   │   ├── settings/              # Configuración de sucursal + logotipo
│   │   ├── categories/            # Gestión de categorías
│   │   └── kitchen/               # Vista unificada KDS (filtro Todas/Caliente/Fría)
│   ├── (kitchen-station)/         # Layout fullscreen para tabletas
│   │   └── kitchen/
│   │       ├── hot/page.tsx       # 🔥 Estación Caliente — /kitchen/hot
│   │       └── cold/page.tsx      # 🧊 Estación Fría/Bar — /kitchen/cold
│   ├── superadmin/                # Panel Super Admin
│   │   ├── branches/              # Gestión de sucursales (pestaña Monitoreo por sucursal)
│   │   ├── devices/               # Aprobación de dispositivos
│   │   ├── device-center/         # Monitoreo de dispositivos conectados en tiempo real
│   │   └── subscriptions/         # Administración SaaS (métricas, pagos, acciones)
│   ├── demo/                      # Modo demo (prueba gratis 30 min, sin backend)
│   │   ├── admin/  waiter/  kitchen/  menu/  # Paneles demo por rol
│   │   └── page.tsx               # Acceso demo (tarjetas + modal)
│   ├── carta/                     # Carta digital pública
│   │   ├── [slug]/                # Carta real por sucursal (datos de la API)
│   │   ├── CategorySlider.tsx    # Categorías horizontales dinámicas
│   │   └── CartaItemViewer.tsx   # Detalle, zoom y carrito
│   ├── landing/                   # Landing pública y secciones comerciales
│   │   ├── page.tsx               # Página principal de marketing
│   │   └── RestaurosRealExperienceSection.tsx # Sección premium con POS real y testimonios
│   ├── manual/                    # Manual de usuario
│   ├── privacidad/                # Aviso de privacidad
│   ├── terminos/                  # Términos y condiciones
│   └── cookies/                   # Política de cookies
│
├── components/
│   ├── kitchen/                   # Componentes KDS (StationPanel, etc.)
│   ├── layout/                    # Sidebar, Topbar, MobileNav, RouteGuard
│   ├── shared/                    # Guards, DevHiveFooter, KPICard, etc.
│   ├── orders/                    # OrderCard, ProductPicker, OrderSummary
│   ├── demo/                      # UI del modo demo (cards, modal, timer, guard)
│   │   └── shell/                 # Chrome demo: Sidebar, Topbar, MobileNav, Brand
│   └── ui/                        # shadcn/ui components
│
├── lib/
│   ├── demo/                      # Lógica demo: sesión 30 min, seed, store, realtime
│   ├── api/
│   │   ├── client.ts              # fetch wrapper con JWT + 401 handler
│   │   └── queries/
│   │       ├── index.ts           # Todos los hooks TanStack Query
│   │       └── useStationOrders.ts # Hooks para KDS stations
│   ├── stores/
│   │   ├── authStore.ts           # JWT, user, subscription, deviceUid
│   │   └── configStore.ts         # UI preferences (localStorage)
│   ├── types/index.ts             # Interfaces TypeScript (snake_case)
│   ├── deviceId.ts                # SHA-256 fingerprinting
│   ├── devices/                   # Device Center: tipos, constantes/umbrales, estado, registry
│   └── validators/schemas.ts      # Zod schemas
│
├── hooks/
│   ├── useBarcodeScanner.ts       # HID barcode scanner support
│   ├── useWakeLock.ts             # Screen wake lock para tabletas
│   ├── useDeviceHeartbeat.ts      # Heartbeat de monitoreo por módulo (Device Center)
│   └── useStationSound.ts         # Web Audio API para cocina
│
└── php-backend/                   # Backend PHP listo para subir al servidor
    ├── index.php                  # Router principal
    ├── schema.sql                 # Schema completo MySQL
    ├── kds-migration.sql          # Migración KDS (ALTER + CREATE)
    ├── migrations/                # Migraciones incrementales (…, 32-plan-rename, 34-promotions-execution)
    ├── config/                    # database, jwt, cors, auth
    └── routes/                    # auth, orders, products, stations, device_monitor, promotions, whatsapp, ...
```

---

## Variables de entorno

**Frontend** (`.env.local`) — opcionales salvo el API:

```env
NEXT_PUBLIC_API_URL=https://tallercheck.mx/foodix/api
NEXT_PUBLIC_APP_URL=https://foodix.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…   # solo si se usa Stripe.js

# Asistente de IA del menú — SOLO servidor (sin prefijo NEXT_PUBLIC, nunca se
# expone al cliente). Configúrala también en el entorno del host en producción.
OPENROUTER_API_KEY=sk-or-…
```

**Backend** (Stripe, en `php-backend/config/stripe.php` o como variables del host):

```env
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_ID_MONTHLY_RESTAUROS=price_…
APP_URL=https://foodix.app
```

Mientras las llaves de Stripe sean placeholders, el pago con tarjeta responde `503`
y solo opera el flujo de transferencia SPEI. Ver [`docs/SUBSCRIPTIONS.md`](docs/SUBSCRIPTIONS.md).

**WhatsApp · Twilio (solo Plan AI y MultiSucursal)** — pedidos por WhatsApp directo a cocina, con
autodetección de conexión (sin clic manual), catálogo priorizado/paginado igual al de la Carta QR, y
soporte de multi-ítem por mensaje:

```env
WA_PROVIDER=twilio
WA_BRANCH_SLUG=jimmy-restaurant
WA_WEBHOOK_TOKEN=…
TWILIO_ACCOUNT_SID=ACxxxx…
TWILIO_AUTH_TOKEN=…            # secreto — si se expone, ROTAR en Twilio
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_VALIDATE=true          # valida X-Twilio-Signature (false solo en local)
BACKEND_SERVICE_TOKEN=…       # debe coincidir con WA_SERVICE_SECRET (backend PHP)
NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER=+14155238886
NEXT_PUBLIC_TWILIO_SANDBOX_KEYWORD=join-tu-palabra
```

Guía completa de configuración, conexión/desconexión y solución de errores:
[`docs/integrations/whatsapp-twilio.md`](docs/integrations/whatsapp-twilio.md).
Plantilla de todas las variables: [`.env.example`](.env.example).

---

## Instalación y desarrollo local

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd foodix

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El sistema se conecta al API de producción en `https://tallercheck.mx/foodix/api/`.

### Comandos disponibles

```bash
npm run dev          # Servidor de desarrollo (hot reload)
npm run build        # Build de producción
npm run start        # Servidor de producción local
npm run lint         # ESLint
npm run test         # Vitest (una sola pasada)
npm run test:watch   # Vitest en modo watch
```

---

## Configuración del backend PHP

> Los archivos PHP están en `php-backend/`. Ver instrucciones detalladas dentro de esa carpeta.

### Pasos rápidos para subir al servidor

```bash
# 1. Crear la base de datos y ejecutar el schema
mysql -u usuario -p < php-backend/schema.sql

# 2. Aplicar migraciones en orden (KDS + módulos 01–17)
mysql -u usuario -p foodix < php-backend/kds-migration.sql
for f in $(ls php-backend/migrations/*.sql | sort); do mysql -u usuario -p foodix < "$f"; done
# 05-saas-billing crea suscripciones/pagos; 06 usernames; 07 índices;
# 09 ingredientes; 10 galería de imágenes, alérgenos y badge;
# 17-connected-devices crea connected_devices + device_events (Device Center)

# 3. Editar credenciales
nano php-backend/config/database.php
# Cambiar: DB_USER, DB_PASS, JWT_SECRET, UPLOAD_URL
# IMPORTANTE: UPLOAD_URL debe apuntar a la MISMA carpeta donde se escribe,
# p.ej. https://tallercheck.mx/foodix/api/uploads/products/
nano php-backend/config/stripe.php       # llaves de Stripe (opcional)

# 4. Subir archivos al servidor en /foodix/api/
# 5. Crear carpeta de uploads con permisos (dentro de /api/)
mkdir -p /foodix/api/uploads/products
chmod 755 /foodix/api/uploads/products
```

---

## Endpoints del API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Login con **username** + password + device_uid |
| GET | `/auth/me` | JWT | Sesión actual + suscripción |
| POST | `/auth/logout` | JWT | Revocar token |
| GET | `/public/menu/{slug}` | — | Carta pública de la sucursal (categorías + productos) |
| GET | `/public/branch-logo/{username}` | — | Logo de la sucursal del usuario (para el login) |
| GET | `/branches` | superadmin | Listar sucursales |
| POST | `/branches/{id}/logo` | admin/superadmin | Subir/quitar logotipo de la sucursal |
| GET | `/products?branch_id=` | JWT | Productos con filtros (incluye `images[]`) |
| POST | `/products` | admin | Crear producto (multipart) |
| PATCH | `/products/{id}` | admin | Editar producto (POST + `_method=PATCH`) |
| POST | `/products/{id}/images` | admin | Subir imágenes a la galería (hasta 5) |
| DELETE | `/products/{id}/images/{imgId}` | admin | Quitar una imagen de la galería |
| GET | `/orders?branch_id=` | JWT | Listar pedidos |
| POST | `/orders` | JWT | Crear pedido |
| PATCH | `/orders/{id}/status` | JWT | Actualizar estado |
| GET | `/stations/{station}/orders` | JWT | KDS: órdenes por estación |
| PATCH | `/stations/{station}/items/{id}` | JWT | KDS: marcar ítem listo |
| GET | `/sales/summary` | admin | Resumen de ventas |
| GET | `/sales/daily?days=30` | admin | Ventas diarias |
| GET·POST | `/promotions` | JWT | Listar/crear promociones automáticas (día/horario/categoría/producto) |
| PATCH·DELETE | `/promotions/{id}` | admin | Editar/eliminar promoción |
| GET·POST | `/promotions/combos` | JWT | Listar/crear combos (bundle a precio fijo) |
| GET·POST | `/promotions/coupons` | JWT | Listar/crear cupones canjeables |
| GET·POST | `/promotions/loyalty` | JWT | Listar/crear reglas de lealtad ("cada N compras, premio") |
| PATCH | `/devices/{id}/approve` | admin | Aprobar/rechazar dispositivo |
| POST | `/device-monitor/heartbeat` | JWT/kiosko | Registrar/actualizar dispositivo conectado (heartbeat) |
| GET | `/device-monitor?branch_id=` | admin/superadmin | Listar dispositivos conectados (estado en vivo) |
| POST | `/device-monitor/peripheral` | admin/superadmin | Alta manual de periférico |
| PATCH | `/device-monitor/{id}` · `/{id}/status` | admin/superadmin | Renombrar/cambiar tipo · cambiar estado |
| GET·POST | `/device-monitor/{id}/events` | admin/superadmin | Historial de eventos del dispositivo |
| DELETE | `/device-monitor/{id}` | admin/superadmin | Eliminar dispositivo/periférico |
| GET | `/subscription/{branch_id}` | admin | Info de suscripción |
| GET | `/superadmin/subscriptions` | superadmin | Lista global + métricas SaaS |
| GET | `/superadmin/subscriptions/{branchId}` | superadmin | Detalle (pagos + auditoría) |
| POST | `/superadmin/subscriptions/{branchId}/{suspend\|reactivate\|cancel\|terminate}` | superadmin | Acciones de estado |
| POST | `/superadmin/bank-transfers/{paymentId}/{approve\|reject}` | superadmin | Revisar transferencia |
| GET | `/billing/me` | admin | Mi suscripción + pagos + datos SPEI |
| POST | `/billing/bank-transfer-intent` | admin | Generar referencia SPEI |
| POST | `/billing/bank-transfer-submit` | admin | Reportar transferencia |
| POST | `/billing/create-checkout-session` | admin | Stripe Checkout (tarjeta) |
| POST | `/billing/create-portal-session` | admin | Stripe Billing Portal |
| POST | `/webhooks/stripe` | firma | Webhook de Stripe (sincroniza estado) |

> Detalle del módulo de suscripciones en [`docs/SUBSCRIPTIONS.md`](docs/SUBSCRIPTIONS.md).

### Rutas internas (Next.js Route Handlers)

Ejecutadas en el servidor de Next.js; mantienen claves y proveedores fuera del cliente.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ai/product-content` | Genera descripción e ingredientes de un platillo con IA. La clave (`OPENROUTER_API_KEY`) y el proveedor viven solo en el servidor. |
| GET | `/api/apk` | Detecta la última versión publicada del APK Android y redirige a su descarga. |

---

## Funcionalidades del KDS (Kitchen Display System)

FoodIX incluye un sistema de pantallas de cocina por estaciones:

- **`/kitchen/hot`** — Estación Caliente: tacos, hamburguesas, pizzas, entradas
- **`/kitchen/cold`** — Estación Fría/Bar: bebidas, postres, ensaladas
- **`/kitchen`** — Vista unificada con filtro **Todas / Caliente / Fría**: combina las órdenes de ambas estaciones en una sola pantalla, agrupadas por mesa

Las tres pantallas comparten el mismo diseño KDS (fondo oscuro, comandas en tarjetas blancas, acciones touch _Comenzar preparación → Marcar listo → Marcar entregado_). En la vista unificada cada platillo muestra su icono de estación (🔥/🧊) y el filtro superior permite ver solo Caliente, solo Fría o Todas.

Las páginas de estación se abren en pantalla completa automáticamente y activan el **Wake Lock** para que la tableta no se apague durante el servicio.

La clasificación de ítems a cada estación se configura por categoría en la sección **Carta / Menú**, con posibilidad de override a nivel de producto.

---

## Seguridad

- Contraseñas con **bcrypt** (cost=12)
- Tokens **JWT HS256** con vigencia de 24 horas
- **Revocación de tokens** en logout (tabla `revoked_tokens`)
- **Control de dispositivos**: los dispositivos de meseros y cocina quedan pendientes hasta ser aprobados; el del administrador se auto-aprueba en su primer acceso
- **Rate limiting** en login: máximo 5 intentos por IP por minuto
- **Autocompletado deshabilitado** (`autoComplete="off"`) en los campos de usuario y contraseña del login para evitar exponer credenciales guardadas en dispositivos compartidos
- Upload de imágenes con validación de **MIME type** y re-codificación con GD (elimina metadatos EXIF)
- PDO con **prepared statements** en todas las consultas SQL
- **CORS** configurado para whitelist de orígenes conocidos

---

## Páginas legales y documentación

| Página | URL |
|--------|-----|
| Manual de usuario | `/manual` |
| Aviso de privacidad | `/privacidad` |
| Términos y condiciones | `/terminos` |
| Política de cookies | `/cookies` |

---

## Documentación

📚 **Centro de documentación completo: [`docs/`](docs/README.md)** — manuales por rol, FAQ, arquitectura, API y más.

| Área | Documento |
|------|-----------|
| Índice general | [`docs/README.md`](docs/README.md) |
| Manual de usuario | [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) |
| Guías por rol | [Admin](docs/ADMIN_GUIDE.md) · [SuperAdmin](docs/SUPERADMIN_GUIDE.md) · [Mesero](docs/WAITER_GUIDE.md) · [Cocina](docs/KITCHEN_GUIDE.md) · [Caja](docs/CASHIER_GUIDE.md) |
| Ayuda | [FAQ](docs/FAQ.md) · [Solución de problemas](docs/TROUBLESHOOTING.md) |
| Técnica | [Stack completo + diagramas](docs/STACK.md) · [Arquitectura](docs/ARCHITECTURE.md) · [Instalación](docs/INSTALLATION.md) · [Despliegue](docs/DEPLOYMENT.md) · [API](docs/API.md) |
| Negocio | [Licencias](docs/LICENSE_SYSTEM.md) · [Billing CRM](docs/BILLING.md) · [Changelog](docs/CHANGELOG.md) |

> Dentro de la app, el **Centro de Ayuda** está en `/help`. Suscripciones (heredado): [`docs/SUBSCRIPTIONS.md`](docs/SUBSCRIPTIONS.md) · despliegue: [`docs/DEPLOY-CHECKLIST.md`](docs/DEPLOY-CHECKLIST.md).

---

## Soporte

- 📧 Soporte técnico: [foodix@atomicmail.io](mailto:foodix@atomicmail.io)
- 📧 Privacidad: [foodix@atomicmail.io](mailto:foodix@atomicmail.io)
- 📖 Manual de usuario: [foodix.app/manual](https://foodix.app/manual)

---

<p align="center">
  <img src="https://i.ibb.co/j9vRcWRb/logo-img1.png" alt="CodexFight" width="64" /><br/>
  <strong>CodexFight</strong> · 2026 · Todos los derechos reservados
</p>
