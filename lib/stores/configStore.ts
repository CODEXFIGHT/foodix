'use client'

/**
 * FoodIX — Sistema de gestión para restaurantes
 * Store de configuración del negocio (impuestos, moneda, etc.).
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessConfig } from '@/lib/types'

const DEFAULT_CONFIG: BusinessConfig = {
  businessName: 'Mi Restaurante',
  slogan: 'Tu restaurante, en orden',
  currency: 'MXN',
  taxRate: 16,
  address: '',
  phone: '',
  footer: '¡Gracias por su compra!',
  ticketLogo: null,
}

interface ConfigStore {
  config: BusinessConfig
  setConfig: (updates: Partial<BusinessConfig>) => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      setConfig: (updates) =>
        set((s) => ({ config: { ...s.config, ...updates } })),
    }),
    {
      name: 'restauros_config',
    },
  ),
)
