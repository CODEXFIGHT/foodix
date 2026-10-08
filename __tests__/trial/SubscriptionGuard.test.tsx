/**
 * RestaurOS — Control de acceso por trial en el cliente.
 *
 * Comprueba que la UI refleje lo que el backend autoriza: durante la prueba se
 * ve la app con su aviso; al terminar, los módulos operativos se sustituyen por
 * la pantalla de fin de prueba, dejando accesible /billing para contratar.
 *
 * OJO: esto es la capa visual. El bloqueo REAL vive en el backend
 * (subscriptionOperable / requireAuth) y se prueba en run-trial-tests.php.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SubscriptionStatus, User } from '@/lib/types'

let mockState: { user: User | null; subscription: SubscriptionStatus | null; logout: () => void }
let mockPathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}))

import { SubscriptionGuard } from '@/components/shared/SubscriptionGuard'

const admin: User = {
  id: 1, name: 'Carlos', username: 'carlos', role: 'admin', branch_id: 1,
} as User

function trialSub(over: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
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

beforeEach(() => {
  mockPathname = '/'
  mockState = { user: admin, subscription: trialSub(), logout: vi.fn() }
  window.sessionStorage.clear()
})

describe('SubscriptionGuard · prueba vigente', () => {
  it('deja usar la app con el trial activo', () => {
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.getByText('Panel operativo')).toBeInTheDocument()
    expect(screen.queryByText(/Tu prueba gratuita ha terminado/)).not.toBeInTheDocument()
  })

  it('no muestra aviso durante la primera semana', () => {
    mockState.subscription = trialSub({ days_remaining: 12 })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('avisa cuando quedan 3 días', () => {
    mockState.subscription = trialSub({ days_remaining: 3 })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.getByRole('status')).toHaveTextContent('Te quedan 3 días de prueba gratuita')
    expect(screen.getByText('Panel operativo')).toBeInTheDocument()
  })

  it('el último día el aviso ya no se puede descartar', () => {
    mockState.subscription = trialSub({ days_remaining: 0 })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.getByRole('status')).toHaveTextContent('Hoy es el último día')
    expect(screen.queryByLabelText('Descartar aviso de prueba gratuita')).not.toBeInTheDocument()
  })

  it('no molesta a meseros ni cocina con el aviso de contratar', () => {
    mockState.user = { ...admin, role: 'mesero' } as User
    mockState.subscription = trialSub({ days_remaining: 2 })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Panel operativo')).toBeInTheDocument()
  })
})

describe('SubscriptionGuard · prueba terminada', () => {
  const expired = () => trialSub({ status: 'expired', trial_status: 'trial_expired', days_remaining: -1 })

  it('sustituye los módulos operativos por la pantalla de fin de prueba', () => {
    mockState.subscription = expired()
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)

    expect(screen.queryByText('Panel operativo')).not.toBeInTheDocument()
    expect(screen.getByText('Tu prueba gratuita ha terminado')).toBeInTheDocument()
    expect(screen.getByText(/Tus datos permanecen seguros/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver planes/ })).toHaveAttribute('href', '/billing')
  })

  it('deja entrar a /billing para poder contratar', () => {
    mockState.subscription = expired()
    mockPathname = '/billing'
    render(<SubscriptionGuard><p>Elegir plan</p></SubscriptionGuard>)
    expect(screen.getByText('Elegir plan')).toBeInTheDocument()
  })

  it('a un empleado le explica que debe avisar al administrador', () => {
    mockState.user = { ...admin, role: 'cocina' } as User
    mockState.subscription = expired()
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)

    expect(screen.getByText('Tu prueba gratuita ha terminado')).toBeInTheDocument()
    expect(screen.getByText(/Pídele al administrador/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver planes/ })).not.toBeInTheDocument()
  })

  it('el superadmin nunca queda bloqueado por el trial de una sucursal', () => {
    mockState.user = { ...admin, role: 'superadmin' } as User
    mockState.subscription = expired()
    render(<SubscriptionGuard><p>Panel global</p></SubscriptionGuard>)
    expect(screen.getByText('Panel global')).toBeInTheDocument()
  })
})

describe('SubscriptionGuard · planes de pago', () => {
  it('un plan activo no muestra nada del trial', () => {
    mockState.subscription = trialSub({
      plan: 'pro', status: 'active', is_trial: false, trial_status: 'converted', days_remaining: 25,
    })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.getByText('Panel operativo')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('una suscripción de pago vencida usa el bloqueo genérico, no el del trial', () => {
    mockState.subscription = trialSub({
      plan: 'pro', status: 'expired', is_trial: false, trial_status: 'not_trial', days_remaining: -3,
    })
    render(<SubscriptionGuard><p>Panel operativo</p></SubscriptionGuard>)
    expect(screen.getByText('Suscripción Inactiva')).toBeInTheDocument()
    expect(screen.queryByText('Tu prueba gratuita ha terminado')).not.toBeInTheDocument()
  })
})
