'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { usePinUsers, type PinUser } from '@/lib/api/queries'
import { PinPad } from '@/components/shared/PinPad'
import { APP_VERSION } from '@/lib/constants/version'

export default function PinLoginPage() {
  const router = useRouter()
  const pinLogin = useAuthStore(s => s.pinLogin)

  const [branchId, setBranchId] = useState<number | null>(null)
  const [selected, setSelected] = useState<PinUser | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const b = typeof window !== 'undefined' ? localStorage.getItem('restauros_branch_id') : null
    setBranchId(b ? Number(b) : null)
  }, [])

  const { data: users, isLoading, isError } = usePinUsers(branchId)

  const submit = useCallback(async (fullPin: string) => {
    if (!selected || !branchId) return
    setBusy(true)
    setPinError('')
    const res = await pinLogin(selected.id, fullPin, branchId)
    if (res.success) {
      setPinSuccess(true)
      setBusy(false)
      successTimeoutRef.current = setTimeout(() => {
        router.replace('/')
      }, 1500)
    } else {
      setBusy(false)
      toast.error(res.message ?? 'No se pudo entrar')
      setPin('')
      setPinError(res.message ?? 'PIN incorrecto.')
      if (res.error === 'pin_locked') setSelected(null)
    }
  }, [selected, branchId, pinLogin, router])

  // Auto-submit when PIN is complete (4 digits)
  useEffect(() => {
    if (pin.length === 4 && !busy && !pinSuccess) {
      submit(pin)
    }
  }, [pin, busy, pinSuccess, submit])

  const handlePinChange = (val: string) => {
    setPin(val)
    if (pinError) setPinError('')
  }

  const handleSelectUser = (u: PinUser) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
    setSelected(u)
    setPin('')
    setPinError('')
    setPinSuccess(false)
  }

  const handleDeselectUser = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
    setSelected(null)
    setPin('')
    setPinError('')
    setPinSuccess(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  // Sin sucursal recordada: debe hacer login tradicional primero.
  if (branchId === null) {
    return (
      <Centered>
        <p className="text-center text-muted-foreground">
          Este dispositivo aún no tiene una sucursal vinculada. Inicia sesión con usuario y contraseña una vez.
        </p>
        <Link href="/login" className="text-[#D1400F] font-semibold mt-4">Ir al login</Link>
      </Centered>
    )
  }

  if (isError) {
    return (
      <Centered>
        <p className="text-center text-muted-foreground">
          Dispositivo no autorizado para acceso por PIN. Aprueba el dispositivo o usa el login normal.
        </p>
        <Link href="/login" className="text-[#D1400F] font-semibold mt-4">Ir al login</Link>
      </Centered>
    )
  }

  return (
    <Centered>
      {!selected ? (
        <div key="user-select" className="w-full max-w-md sm:max-w-lg animate-fade-in-up">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-1">Acceso rápido</h1>
          <p className="text-center text-muted-foreground text-sm mb-6">Selecciona tu usuario</p>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Cargando…</p>
          ) : users && users.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {users.map(u => (
                <button key={u.id} onClick={() => handleSelectUser(u)}
                  className="h-20 sm:h-24 rounded-2xl border bg-card hover:border-[#D1400F] flex flex-col items-center justify-center gap-1 transition-colors active:scale-95">
                  <span className="font-semibold sm:text-lg">{u.name}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground capitalize">{u.role}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Ningún usuario tiene PIN configurado. Configúralo en Usuarios.
            </p>
          )}
          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Usar usuario y contraseña
            </Link>
          </div>
        </div>
      ) : (
        <div
          key={selected.id}
          className="w-full max-w-xs sm:max-w-sm md:max-w-md rounded-3xl border bg-card shadow-lg p-6 sm:p-8 animate-keypad-in animate-fade-in"
        >
          <button onClick={handleDeselectUser}
            className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Cambiar usuario
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-center">{selected.name}</h1>
          <p className="text-center text-muted-foreground text-sm mb-5">Ingresa tu PIN</p>

          <PinPad
            value={pin}
            onChange={handlePinChange}
            maxLength={4}
            error={pinError}
            loading={busy}
            success={pinSuccess}
          />

          {pinError && (
            <p className="text-red-400 text-xs mt-3 text-center font-medium animate-shake">{pinError}</p>
          )}

          {busy && (
            <p className="text-[#D1400F] text-xs mt-3 text-center font-semibold animate-pulse">Verificando PIN...</p>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground/60 mt-8">{APP_VERSION}</p>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {children}
    </div>
  )
}
