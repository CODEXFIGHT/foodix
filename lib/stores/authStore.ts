'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Store de autenticación: sesión, usuario, dispositivo y suscripción.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { create } from 'zustand'
import { apiRequest, setUnauthorizedHandler, ApiError } from '@/lib/api/client'
import { getDeviceUid, getDeviceType, getDeviceName } from '@/lib/deviceId'
import type { User, SubscriptionStatus, LoginResult, Branch } from '@/lib/types'

const TOKEN_KEY = 'restauros_token'

/** Marca de la sucursal (logo + nombre) que devuelve /auth/login y /auth/me. */
export type BranchBrand = Pick<Branch, 'id' | 'name' | 'slug' | 'logo_url'>

interface AuthState {
  token: string | null
  user: User | null
  subscription: SubscriptionStatus | null
  branch: BranchBrand | null
  deviceUid: string | null
  isAuthenticated: boolean
  hasHydrated: boolean

  login: (username: string, password: string) => Promise<LoginResult>
  pinLogin: (userId: number, pin: string, branchId: number) => Promise<LoginResult>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  updateUser: (user: User) => void
}

interface LoginApiResponse {
  token: string
  user: User
  subscription: SubscriptionStatus
  branch: BranchBrand | null
}

interface MeApiResponse {
  user: User
  subscription: SubscriptionStatus
  branch: BranchBrand | null
}

export const useAuthStore = create<AuthState>((set, get) => {
  setUnauthorizedHandler(() => {
    get().logout()
  })

  return {
    token: null,
    user: null,
    subscription: null,
    branch: null,
    deviceUid: null,
    isAuthenticated: false,
    hasHydrated: false,

    login: async (username, password) => {
      // Se calcula fuera del try para que esté disponible también en el catch
      // (p. ej. al mostrar el ID en la pantalla de dispositivo pendiente).
      const deviceUid = await getDeviceUid()

      try {
        const deviceType = getDeviceType()
        const deviceName = getDeviceName()

        const data = await apiRequest<LoginApiResponse>('/auth/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({
            username,
            password,
            device_uid: deviceUid,
            device_type: deviceType,
            device_name: deviceName,
          }),
        })

        localStorage.setItem(TOKEN_KEY, data.token)
        if (data.user.branch_id) localStorage.setItem('restauros_branch_id', String(data.user.branch_id))

        set({
          token: data.token,
          user: data.user,
          subscription: data.subscription,
          branch: data.branch ?? null,
          deviceUid,
          isAuthenticated: true,
        })

        return { success: true }
      } catch (err: unknown) {
        const apiErr = err as { status?: number; data?: { error?: string; message?: string; expires_at?: string } }

        if (apiErr?.status === 403) {
          const errorCode = apiErr.data?.error
          const message = apiErr.data?.message ?? 'Acceso denegado'

          if (errorCode === 'subscription_inactive') {
            return { success: false, error: 'subscription_inactive', message, data: apiErr.data }
          }
          if (errorCode === 'device_rejected') {
            return { success: false, error: 'device_rejected', message }
          }
          return { success: false, error: (errorCode as any) ?? 'forbidden', message }
        }

        if (apiErr?.status === 401) {
          return { success: false, error: 'invalid_credentials', message: 'Usuario o contraseña incorrectos' }
        }

        return { success: false, error: 'unknown', message: 'Error al conectar con el servidor' }
      }
    },

    pinLogin: async (userId, pin, branchId) => {
      const deviceUid = await getDeviceUid()
      try {
        const data = await apiRequest<LoginApiResponse>('/auth/pin-login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({
            user_id: userId,
            pin,
            branch_id: branchId,
            device_uid: deviceUid,
            device_type: getDeviceType(),
            device_name: getDeviceName(),
          }),
        })

        localStorage.setItem(TOKEN_KEY, data.token)
        if (data.user.branch_id) localStorage.setItem('restauros_branch_id', String(data.user.branch_id))

        set({
          token: data.token,
          user: data.user,
          subscription: data.subscription,
          branch: data.branch ?? null,
          deviceUid,
          isAuthenticated: true,
        })
        return { success: true }
      } catch (err: unknown) {
        const apiErr = err as { status?: number; data?: { error?: string; message?: string; attempts_left?: number } }
        if (apiErr?.status === 429) {
          return { success: false, error: 'pin_locked', message: apiErr.data?.message ?? 'PIN bloqueado temporalmente' }
        }
        if (apiErr?.status === 403) {
          const errorCode = apiErr.data?.error ?? 'device_rejected'
          const message = apiErr.data?.message ?? 'Dispositivo no autorizado'
          return { success: false, error: errorCode as any, message }
        }
        if (apiErr?.status === 401) {
          const left = apiErr.data?.attempts_left
          return { success: false, error: 'invalid_pin', message: left != null ? `PIN incorrecto · ${left} intento(s)` : 'PIN incorrecto' }
        }
        return { success: false, error: 'unknown', message: 'Error al conectar con el servidor' }
      }
    },

    logout: async () => {
      const token = get().token
      if (token) {
        apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
      }
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('restauros_device_uid')
      set({
        token: null,
        user: null,
        subscription: null,
        branch: null,
        deviceUid: null,
        isAuthenticated: false,
      })
    },

    checkSession: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

      if (!token) {
        set({ hasHydrated: true, isAuthenticated: false })
        return
      }

      try {
        set({ token })
        const data = await apiRequest<MeApiResponse>('/auth/me')
        const deviceUid = typeof window !== 'undefined'
          ? localStorage.getItem('restauros_device_uid')
          : null

        set({
          user: data.user,
          subscription: data.subscription,
          branch: data.branch ?? null,
          deviceUid,
          isAuthenticated: true,
          hasHydrated: true,
        })
      } catch (err) {
        // Solo se cierra la sesión cuando el token es inválido/revocado (401):
        // p.ej. el superadmin suspendió/canceló la suscripción y el backend
        // invalidó el token. Los fallos de red o de servidor NO cierran la
        // sesión: se conserva hasta que el usuario la cierre o el token se anule.
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
          set({
            token: null,
            user: null,
            subscription: null,
            branch: null,
            isAuthenticated: false,
            hasHydrated: true,
          })
        } else {
          set({ hasHydrated: true })
        }
      }
    },

    updateUser: (user) => set({ user }),
  }
})
