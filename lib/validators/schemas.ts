/**
 * FoodIX — Sistema de gestión para restaurantes
 * Esquemas de validación Zod para formularios y payloads.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Usuario requerido')
    .max(60, 'Usuario demasiado largo'),
  password: z.string().min(1, 'Contraseña requerida'),
})

/**
 * Alta autoservicio (prueba gratuita de 14 días). Espejo de las validaciones
 * del backend en php-backend/routes/signup.php — el servidor vuelve a validar
 * TODO: esto solo mejora la experiencia, nunca sustituye la comprobación real.
 */
export const registerSchema = z
  .object({
    first_name: z.string().trim().min(2, 'Escribe tu nombre').max(60, 'Nombre demasiado largo'),
    last_name: z.string().trim().min(2, 'Escribe tus apellidos').max(60, 'Apellidos demasiado largos'),
    business_name: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre de tu restaurante')
      .max(100, 'Nombre demasiado largo'),
    email: z.string().trim().toLowerCase().email('Escribe un correo válido').max(150),
    phone: z
      .string()
      .trim()
      .min(10, 'Escribe tu teléfono a 10 dígitos')
      .max(20, 'Teléfono demasiado largo')
      .regex(/^[\d\s()+-]+$/, 'El teléfono solo admite números'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(100, 'Contraseña demasiado larga')
      .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'Debe incluir al menos una letra')
      .regex(/\d/, 'Debe incluir al menos un número'),
    password_confirm: z.string().min(1, 'Confirma tu contraseña'),
    accept_terms: z.literal(true, { message: 'Debes aceptar los términos y condiciones' }),
    accept_privacy: z.literal(true, { message: 'Debes aceptar el aviso de privacidad' }),
    marketing_opt_in: z.boolean().optional(),
  })
  .refine(d => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

/** Código de verificación del teléfono: 6 dígitos. */
export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'El código son 6 dígitos'),
})

export const productSchema = z.object({
  name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(150),
  description: z.string().max(500).optional(),
  ingredients: z.string().max(2000).optional(),
  allergens: z.string().max(255).optional(),
  badge: z.enum(['', 'Nuevo', 'Popular', 'Recomendado', 'Especialidad', 'Promo']).optional(),
  price: z.number({ message: 'Precio requerido' }).nonnegative('El precio no puede ser negativo'),
  price_type: z.enum(['fixed', 'open', 'kg', 'variable']).optional(),
  price_per_kg: z.number().nonnegative().optional(),
  station: z.enum(['hot', 'cold']),
  barcode: z.string().max(100).optional(),
  // '' = usar la estación de la categoría; hot/cold/both = forzar
  station_override: z.enum(['', 'hot', 'cold', 'both']).optional(),
  available: z.boolean(),
  sort_order: z.number().int().min(0).optional(),
  modifiers: z.array(z.string()).optional(),
})

export const categorySchema = z.object({
  name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido'),
  station: z.enum(['hot', 'cold', 'both']).optional(),
  menu_group: z.enum(['alimento', 'bebida']).optional(),
})

export const orderItemSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  subtotal: z.number().positive(),
})

export const orderSchema = z.object({
  table_id: z.number().nullable(),
  table_name: z.string(),
  items: z.array(orderItemSchema).min(1, 'Al menos un producto requerido'),
  notes: z.string().max(300).optional(),
})

export const branchSchema = z.object({
  name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  // Cuenta de administrador del cliente (se crea junto con la sucursal)
  admin_name: z.string().min(2, 'Nombre del admin requerido').max(100),
  admin_username: z.string().min(3, 'Mínimo 3 caracteres').max(60).regex(/^[a-zA-Z0-9_.-]+$/, 'Letras, números, . _ -'),
  admin_email: z.string().email('Email inválido'),
  admin_password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const subscriptionSchema = z.object({
  plan: z.enum(['trial', 'starter', 'pro', 'ai', 'multisucursal']),
  status: z.enum(['active', 'expired', 'suspended', 'cancelled']),
  expires_at: z.string(),
  max_devices: z.number().int().min(1),
})

export const contactLeadSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre').max(120, 'Nombre demasiado largo'),
  whatsapp: z
    .string()
    .trim()
    .min(8, 'Ingresa un WhatsApp válido')
    .max(40, 'Número demasiado largo')
    .regex(/^[0-9+()\s-]+$/, 'Solo números y + ( ) - '),
  message: z.string().trim().min(10, 'Cuéntanos un poco más (mín. 10 caracteres)').max(2000, 'Mensaje demasiado largo'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type OrderInput = z.infer<typeof orderSchema>
export type BranchInput = z.infer<typeof branchSchema>
export type SubscriptionInput = z.infer<typeof subscriptionSchema>
export type ContactLeadInput = z.infer<typeof contactLeadSchema>
