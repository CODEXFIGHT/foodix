/**
 * FoodIX — Sistema de gestión para restaurantes
 * Cliente del alta autoservicio (prueba gratuita de 14 días).
 *
 * El "handle" del registro (`signup_token`) es un identificador opaco que solo
 * sirve para retomar ESTE formulario; no autentica nada dentro de la app y no
 * decide nada sobre el trial: las fechas y la elegibilidad las calcula el
 * backend. Se guarda en sessionStorage únicamente para que el usuario pueda
 * recargar la página sin perder el avance.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { apiRequest } from '@/lib/api/client'
import { getDeviceUid } from '@/lib/deviceId'

const SIGNUP_TOKEN_KEY = 'restauros_signup_token'

export type SignupStep = 'verify_email' | 'verify_phone' | 'activate' | 'review' | 'rejected' | 'done'

export interface SignupState {
  status: 'pending_verification' | 'verified' | 'activated' | 'review' | 'rejected'
  next_step: SignupStep
  email_masked: string
  phone_masked: string | null
  email_verified: boolean
  phone_verified: boolean
  business_name: string
  first_name: string
  signup_token?: string
}

export interface TrialActivation {
  activated: true
  username: string
  business_name: string
  branch_slug: string
  trial: {
    status: string
    trial_started_at: string | null
    trial_ends_at: string | null
    days_remaining: number | null
    trial_days: number
  }
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  business_name: string
  email: string
  phone: string
  password: string
  password_confirm: string
  accept_terms: boolean
  accept_privacy: boolean
  marketing_opt_in?: boolean
}

export function readSignupToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SIGNUP_TOKEN_KEY)
}

export function storeSignupToken(token: string | undefined | null): void {
  if (typeof window === 'undefined' || !token) return
  window.sessionStorage.setItem(SIGNUP_TOKEN_KEY, token)
}

export function clearSignupToken(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(SIGNUP_TOKEN_KEY)
}

export async function registerAccount(payload: RegisterPayload): Promise<SignupState> {
  const device_uid = await getDeviceUid().catch(() => '')

  const data = await apiRequest<SignupState>('/signup/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ ...payload, device_uid }),
  })
  storeSignupToken(data.signup_token)
  return data
}

export async function fetchSignupState(token: string): Promise<SignupState> {
  return apiRequest<SignupState>(`/signup/status?token=${encodeURIComponent(token)}`, { auth: false })
}

export async function verifyEmailToken(token: string): Promise<SignupState> {
  const data = await apiRequest<SignupState>('/signup/verify-email', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ token }),
  })
  storeSignupToken(data.signup_token)
  return data
}

export async function resendVerificationEmail(signupToken: string): Promise<void> {
  await apiRequest('/signup/resend-email', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ signup_token: signupToken }),
  })
}

/**
 * Pide el código de verificación de 6 dígitos. El canal es SIEMPRE el correo
 * electrónico ya confirmado (el sistema no envía SMS ni WhatsApp); `phone`
 * permite corregir el número antes de confirmarlo.
 */
export async function sendPhoneCode(
  signupToken: string,
  phone?: string,
): Promise<{ channel: 'email'; phone_masked: string; email_masked: string; expires_in: number }> {
  return apiRequest('/signup/send-phone-code', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ signup_token: signupToken, ...(phone ? { phone } : {}) }),
  })
}

export async function verifyPhoneCode(signupToken: string, code: string): Promise<SignupState> {
  return apiRequest<SignupState>('/signup/verify-phone', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ signup_token: signupToken, code }),
  })
}

export async function activateTrial(
  signupToken: string,
  business_name: string,
  address?: string,
): Promise<TrialActivation> {
  return apiRequest<TrialActivation>('/signup/activate', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ signup_token: signupToken, business_name, address }),
  })
}
