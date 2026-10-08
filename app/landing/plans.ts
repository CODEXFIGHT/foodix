/**
 * Planes públicos de RestaurOS — fuente única usada por la landing y el checkout.
 * Los montos están en MXN (pesos enteros). El checkout los convierte a centavos.
 */
export type PlanId = 'starter' | 'pro' | 'ai' | 'multisucursal'

export interface PlanHighlight {
  /** Emoji o ícono corto */
  icon: string
  title: string
  desc: string
}

export interface LandingPlan {
  id: PlanId
  name: string
  price: number // MXN / mes (precio promocional vigente)
  originalPrice?: number // precio de lista, se muestra tachado (promo)
  perBranch?: number // costo extra por cada sucursal ADICIONAL
  tagline: string
  featured: boolean
  /** Las funciones de WhatsApp + AI del plan aún no están disponibles (se muestra "Próximamente") */
  comingSoon?: boolean
  /** false = todavía no se puede contratar: el CTA se muestra deshabilitado */
  available?: boolean
  features: string[]
  /** Texto largo para el modal "ver más info" */
  summary: string
  /** Cómo funciona y extras del plan, para el modal de detalles */
  highlights: PlanHighlight[]
}

export const PLANS: LandingPlan[] = [
  {
    id: 'starter',
    name: 'FoodIX Starter',
    price: 350,
    originalPrice: 499,
    tagline: 'Digitaliza tu restaurante desde el primer día',
    featured: false,
    features: [
      'POS básico',
      'Productos y categorías',
      'Ventas del día',
      'Corte de caja básico',
      'Carta QR simple',
      'Soporte incluido en la suscripción',
    ],
    summary:
      'El punto de partida perfecto para restaurantes pequeños: deja el papel, toma pedidos, cobra con caja básica y comparte tu menú digital con un QR.',
    highlights: [
      { icon: '🧾', title: 'POS básico', desc: 'Toma pedidos y cobra sin papel, sin errores.' },
      { icon: '📦', title: 'Productos y categorías', desc: 'Organiza tu menú por categorías con precios claros.' },
      { icon: '📊', title: 'Ventas del día', desc: 'Ve cuánto llevas vendido en tiempo real.' },
      { icon: '💵', title: 'Corte de caja básico', desc: 'Apertura/cierre de turno y resumen al final del día.' },
      { icon: '📱', title: 'Carta QR simple', desc: 'Tu menú en un QR que cualquier comensal puede escanear.' },
    ],
  },
  {
    id: 'pro',
    name: 'FoodIX Pro',
    price: 700,
    originalPrice: 999,
    perBranch: 100,
    tagline: 'Para restaurantes con operación más activa',
    featured: true,
    features: [
      'Todo lo del plan Starter, y además:',
      '🤖 Asistente Sol IA para Admin, Mesero y Cocina',
      'Mesas y mapa interactivo',
      'Cocina / KDS en tiempo real',
      'Carta QR premium',
      'Reportes avanzados',
      'Modificadores de productos',
      'Roles: Admin, Mesero, Cocina',
      'Notificaciones internas',
    ],
    summary:
      'El sistema completo para restaurantes con movimiento: Asistente Sol IA por rol (Admin, Mesero, Cocina), control de mesas, KDS en tiempo real y carta QR premium.',
    highlights: [
      { icon: '🤖', title: 'Asistente Sol IA por rol', desc: 'Sugerencias de venta, alertas de cocina e inventario adaptadas a Admin, Mesero y Cocina.' },
      { icon: '🪑', title: 'Mesas', desc: 'Control de mesas ocupadas, libres y cuenta pedida.' },
      { icon: '🔥', title: 'Cocina KDS en tiempo real', desc: 'Cada platillo llega al instante a la pantalla de cocina. Menos gritos, más velocidad.' },
      { icon: '📱', title: 'Carta QR premium', desc: 'Fotos, etiquetas de recomendado/nuevo y modificadores en tu menú digital.' },
      { icon: '🎛️', title: 'Modificadores de productos', desc: 'Términos, extras y variantes configurables por platillo.' },
      { icon: '📊', title: 'Reportes avanzados', desc: 'Ventas por categoría, mesero y horas pico.' },
      { icon: '🔔', title: 'Notificaciones internas', desc: 'Tu equipo se entera al instante de cada pedido nuevo.' },
    ],
  },
  {
    id: 'ai',
    name: 'FoodIX AI',
    price: 1100,
    originalPrice: 1499,
    perBranch: 150,
    tagline: 'Vende directo por WhatsApp, sin comisiones',
    featured: false,
    comingSoon: true,
    available: false,
    features: [
      'Todo lo del plan Pro, y además:',
      '💬 WhatsApp AI Waiter: pedidos automáticos (Próximamente)',
      '🤖 Recomendaciones inteligentes para subir tu ticket promedio',
      'Confirmación de pedido y número de orden',
      'Alias y teléfono del cliente',
      'Envío directo a cocina',
      'Notificación al admin por cada pedido',
      'Analítica de clientes',
    ],
    summary:
      'Mientras tú cocinas, RestaurOS toma pedidos por WhatsApp y los manda directo a cocina: el cliente ve el menú, arma su carrito con ayuda del asistente y confirma — sin comisiones por pedido propio.',
    highlights: [
      { icon: '💬', title: 'WhatsApp AI Waiter (Próximamente)', desc: 'Tu asistente virtual atiende, recomienda y confirma pedidos por WhatsApp las 24 horas.' },
      { icon: '🤖', title: 'Recomendaciones inteligentes', desc: 'Sugiere combos y bebidas automáticamente para subir el ticket promedio.' },
      { icon: '🔢', title: 'Número de orden y alias', desc: 'El cliente recibe un número de pedido y usa un alias para recoger — sin pedir su nombre completo.' },
      { icon: '👨‍🍳', title: 'Directo a cocina', desc: 'El pedido de WhatsApp llega al KDS igual que uno de mesa, en tiempo real.' },
      { icon: '📈', title: 'Analítica de clientes', desc: 'Ve qué tanto te compra cada cliente y detecta a los que dejaron de pedir.' },
    ],
  },
  {
    id: 'multisucursal',
    name: 'FoodIX MultiSucursal',
    price: 1900,
    originalPrice: 2499,
    perBranch: 200,
    tagline: 'Controla todas tus sucursales desde un solo lugar',
    featured: false,
    comingSoon: true,
    features: [
      'Todo lo del plan AI, y además:',
      'Dashboard centralizado',
      'Comparativo de ventas por sucursal',
      'Usuarios y roles por sucursal',
      'Reportes consolidados',
      'Configuración remota',
      'Soporte prioritario',
    ],
    summary:
      'Para cadenas y franquicias: administra todas tus sucursales desde un solo dashboard, compara su desempeño y mantén reportes consolidados con soporte prioritario.',
    highlights: [
      { icon: '🏪', title: 'Dashboard centralizado', desc: 'Ve todas tus sucursales desde un solo lugar.' },
      { icon: '📊', title: 'Comparativo por sucursal', desc: 'Ventas, ticket promedio y horas pico lado a lado.' },
      { icon: '👥', title: 'Usuarios y roles por sucursal', desc: 'Cada sucursal con su propio equipo y permisos.' },
      { icon: '⚙️', title: 'Configuración remota', desc: 'Ajusta menú, precios y promociones sin ir sucursal por sucursal.' },
      { icon: '🛟', title: 'Soporte prioritario', desc: 'Atención preferente para cadenas en crecimiento.' },
    ],
  },
]

/** Fallback: el plan destacado (y contratable), no una posición fija del array. */
export const getPlan = (id: string | null | undefined): LandingPlan =>
  PLANS.find(p => p.id === id) ?? PLANS.find(p => p.featured && p.available !== false) ?? PLANS[0]

export const formatPlanPrice = (mxn: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(mxn)

/** Porcentaje de descuento de la promo (0 si no hay precio de lista). */
export const planDiscountPct = (plan: LandingPlan) =>
  plan.originalPrice && plan.originalPrice > plan.price
    ? Math.round((1 - plan.price / plan.originalPrice) * 100)
    : 0
