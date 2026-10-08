/**
 * RestaurOS — Lógica de presentación de la prueba gratuita.
 *
 * Cubre las reglas que decide el FRONT (copy, urgencia, formato) y las
 * validaciones del formulario de alta. Las reglas de negocio del trial
 * (14 días, antiabuso, expiración) se prueban contra la base de datos real en
 * php-backend/tests/run-trial-tests.php.
 */
import { describe, it, expect } from 'vitest'
import {
  TRIAL_DAYS, TRIAL_PERKS_LINE, daysUntil, trialDaysLabel, trialDateShort, trialUrgency,
} from '@/lib/constants/trial'
import { registerSchema, otpSchema } from '@/lib/validators/schemas'
import { isTrialExpired, isTrialing, trialDaysRemaining } from '@/components/shared/TrialStatus'
import type { SubscriptionStatus } from '@/lib/types'

function sub(over: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
  return {
    plan: 'trial',
    status: 'trial',
    starts_at: '2026-08-01 10:00:00',
    expires_at: '2026-08-15 10:00:00',
    max_devices: 2,
    active_devices_count: 1,
    is_trial: true,
    trial_status: 'trialing',
    trial_started_at: '2026-08-01 10:00:00',
    trial_ends_at: '2026-08-15 10:00:00',
    trial_days: 14,
    days_remaining: 12,
    ...over,
  }
}

describe('Copy del trial', () => {
  it('promete 14 días de forma consistente', () => {
    expect(TRIAL_DAYS).toBe(14)
    expect(TRIAL_PERKS_LINE).toBe('14 días gratis · Acceso completo · Sin tarjeta')
  })

  it('describe los días restantes en lenguaje humano', () => {
    expect(trialDaysLabel(12)).toBe('12 días restantes')
    expect(trialDaysLabel(1)).toBe('1 día restante')
    expect(trialDaysLabel(0)).toBe('Último día de prueba')
    expect(trialDaysLabel(-2)).toBe('Prueba finalizada')
    expect(trialDaysLabel(null)).toBe('Prueba gratuita')
  })

  it('formatea fechas del backend (con espacio en vez de T)', () => {
    expect(trialDateShort('2026-09-03 10:30:00')).toBe('03/09/2026')
    expect(trialDateShort(null)).toBe('—')
    expect(trialDateShort('no-es-fecha')).toBe('—')
  })
})

describe('Urgencia del aviso', () => {
  it('no molesta durante la primera semana', () => {
    expect(trialUrgency(14)).toBe('none')
    expect(trialUrgency(8)).toBe('none')
  })

  it('crece conforme se acerca el final', () => {
    expect(trialUrgency(7)).toBe('info')
    expect(trialUrgency(4)).toBe('info')
    expect(trialUrgency(3)).toBe('warning')
    expect(trialUrgency(2)).toBe('warning')
    expect(trialUrgency(1)).toBe('critical')
    expect(trialUrgency(0)).toBe('critical')
  })
})

describe('Estado del trial en la sesión', () => {
  it('usa los días que envía el servidor, no un cálculo propio', () => {
    // La fecha de fin ya pasó, pero el servidor dice que quedan 5 días:
    // manda el servidor (aquí es donde un reloj adelantado del cliente fallaría).
    expect(trialDaysRemaining(sub({ trial_ends_at: '2020-01-01 00:00:00', days_remaining: 5 }))).toBe(5)
  })

  it('solo recalcula localmente si el backend no mandó los días', () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    const s = sub({ days_remaining: undefined, trial_ends_at: `${future} 12:00:00` })
    expect(trialDaysRemaining(s)).toBe(3)
  })

  it('reconoce una prueba vigente', () => {
    expect(isTrialing(sub())).toBe(true)
    expect(isTrialExpired(sub())).toBe(false)
  })

  it('reconoce una prueba terminada', () => {
    const expired = sub({ status: 'expired', trial_status: 'trial_expired', days_remaining: -1 })
    expect(isTrialExpired(expired)).toBe(true)
    expect(isTrialing(expired)).toBe(false)
  })

  it('no confunde un plan de pago con una prueba', () => {
    const paid = sub({ plan: 'pro', status: 'active', is_trial: false, trial_status: 'converted' })
    expect(isTrialing(paid)).toBe(false)
    expect(isTrialExpired(paid)).toBe(false)
  })

  it('sin suscripción no hay trial', () => {
    expect(isTrialing(null)).toBe(false)
    expect(isTrialExpired(null)).toBe(false)
    expect(trialDaysRemaining(null)).toBeNull()
  })
})

describe('daysUntil', () => {
  it('devuelve null ante fechas inválidas o vacías', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('')).toBeNull()
    expect(daysUntil('bla')).toBeNull()
  })
})

describe('Validación del formulario de alta', () => {
  const valid = {
    first_name: 'Carlos',
    last_name: 'López',
    business_name: 'Taquería El Buen Sabor',
    email: 'Carlos@Example.com',
    phone: '773 409 0058',
    password: 'RestaurOS2026',
    password_confirm: 'RestaurOS2026',
    accept_terms: true as const,
    accept_privacy: true as const,
  }

  it('acepta un alta correcta y normaliza el correo a minúsculas', () => {
    const r = registerSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('carlos@example.com')
  })

  it('exige contraseñas iguales', () => {
    const r = registerSchema.safeParse({ ...valid, password_confirm: 'Otra12345' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path.includes('password_confirm'))).toBe(true)
  })

  it('exige letras y números en la contraseña', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'solotexto', password_confirm: 'solotexto' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, password: '12345678', password_confirm: '12345678' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, password: 'corta1', password_confirm: 'corta1' }).success).toBe(false)
  })

  it('exige aceptar términos y privacidad (no basta con uno)', () => {
    expect(registerSchema.safeParse({ ...valid, accept_terms: false }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, accept_privacy: false }).success).toBe(false)
  })

  it('rechaza correos y teléfonos inválidos', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'no-es-correo' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, phone: 'no-es-tel' }).success).toBe(false)
  })

  it('acepta teléfonos con lada internacional y separadores', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '+52 (773) 409-0058' }).success).toBe(true)
  })

  it('el código OTP son exactamente 6 dígitos', () => {
    expect(otpSchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(otpSchema.safeParse({ code: '12345' }).success).toBe(false)
    expect(otpSchema.safeParse({ code: '12345a' }).success).toBe(false)
  })
})
