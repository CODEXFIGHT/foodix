'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ShieldCheck, UtensilsCrossed, ChefHat, Lock, Unlock, Accessibility } from 'lucide-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useSetUserPin } from '@/lib/api/queries'
import { PinPad } from '@/components/shared/PinPad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AccessibilitySettingsPanel } from '@/components/settings/AccessibilitySettingsPanel'
import { cn } from '@/lib/utils/cn'
import type { User, UserRole } from '@/lib/types'

const ROLE_META: Record<string, { label: string; icon: typeof ShieldCheck; color: string }> = {
  superadmin: { label: 'Super Admin',   icon: ShieldCheck,      color: 'bg-yellow-500/15 text-yellow-600' },
  admin:      { label: 'Administrador', icon: ShieldCheck,      color: 'bg-blue-500/15 text-blue-600' },
  mesero:     { label: 'Mesero',        icon: UtensilsCrossed,  color: 'bg-emerald-500/15 text-emerald-600' },
  cocina:     { label: 'Cocina',        icon: ChefHat,          color: 'bg-orange-500/15 text-orange-600' },
}

interface UsersManagerProps {
  /** Sucursal cuyos usuarios se gestionan. */
  branchId: number | null
  /** Roles que el operador actual puede asignar al crear. */
  allowedRoles: UserRole[]
  /** Permite borrar usuarios (solo superadmin en el backend). */
  canDelete?: boolean
  /** Estética según el contexto donde se monta. */
  theme?: 'light' | 'dark'
}

type FormState = {
  name: string
  username: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
}

const emptyForm = (role: UserRole): FormState => ({
  name: '', username: '', email: '', password: '', confirmPassword: '', role,
})

export function UsersManager({ branchId, allowedRoles, canDelete = false, theme = 'light' }: UsersManagerProps) {
  const dark = theme === 'dark'
  const { data: users = [], isLoading } = useUsers(branchId)
  const create = useCreateUser()
  const update = useUpdateUser()
  const remove = useDeleteUser()

  const setPin = useSetUserPin()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(allowedRoles[0] ?? 'mesero'))
  const [pinUser, setPinUser] = useState<User | null>(null)
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [accessibilityUser, setAccessibilityUser] = useState<User | null>(null)

  const openPinModal = (u: User) => {
    setPinUser(u)
    setPinStep('enter')
    setNewPin('')
    setConfirmPin('')
    setPinError('')
    setPinSuccess(false)
  }

  const handleGoBack = () => {
    setPinStep('enter')
    setNewPin('')
    setConfirmPin('')
    setPinError('')
  }

  // Monitor dynamic digit entry for steps
  useEffect(() => {
    if (pinUser) {
      if (pinStep === 'enter' && newPin.length === 4) {
        const t = setTimeout(() => {
          setPinStep('confirm')
          setPinError('')
        }, 300)
        return () => clearTimeout(t)
      }
      if (pinStep === 'confirm' && confirmPin.length === 4) {
        if (confirmPin === newPin) {
          const save = async () => {
            try {
              await setPin.mutateAsync({ id: pinUser.id, pin: newPin })
              setPinSuccess(true)
              toast.success('PIN configurado correctamente')
              setTimeout(() => {
                setPinUser(null)
              }, 2000)
            } catch (e) {
              setPinError(e instanceof Error ? e.message : 'No se pudo guardar el PIN')
              setConfirmPin('')
            }
          }
          save()
        } else {
          setPinError('Los PIN no coinciden')
          setConfirmPin('')
        }
      }
    }
  }, [newPin, confirmPin, pinStep, pinUser, setPin])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm(allowedRoles[0] ?? 'mesero'))
    setOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({
      name: u.name,
      username: u.username ?? '',
      email: u.email,
      password: '',
      confirmPassword: '',
      role: u.role,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error('Nombre y usuario son requeridos')
      return
    }
    if (!editing && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    try {
      if (editing) {
        const payload: { id: number } & Record<string, unknown> = {
          id: editing.id,
          name: form.name,
          username: form.username,
          role: form.role,
        }
        if (form.password) payload.password = form.password
        await update.mutateAsync(payload)
      } else {
        // El backend exige email; como ya no lo pedimos en el formulario, lo
        // generamos de forma automática a partir del usuario (login).
        const safeUser = form.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
        await create.mutateAsync({
          branch_id: branchId,
          name: form.name,
          username: form.username,
          email: `${safeUser}@restauros.local`,
          password: form.password,
          role: form.role,
        })
      }
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado')
      setOpen(false)
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } }
      toast.error(apiErr?.data?.message ?? 'Error al guardar el usuario')
    }
  }

  const handleToggleActive = async (u: User) => {
    try {
      await update.mutateAsync({ id: u.id, active: !u.active })
      toast.success(u.active ? 'Usuario bloqueado' : 'Usuario desbloqueado')
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return
    try {
      await remove.mutateAsync(u.id)
      toast.success('Usuario eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={openNew}
          className={dark ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' : 'bg-[#D1400F] hover:bg-[#B03508]'}
        >
          <Plus className="h-4 w-4 mr-1" />Nuevo usuario
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className={cn('h-16 rounded-xl', dark && 'bg-slate-700')} />)}
        </div>
      ) : users.length === 0 ? (
        dark ? (
          <div className="bg-slate-800 rounded-xl border border-white/5 p-10 text-center text-slate-400 text-sm">
            Sin usuarios registrados
          </div>
        ) : (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin usuarios registrados</CardContent></Card>
        )
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const meta = ROLE_META[u.role] ?? ROLE_META.mesero
            const Icon = meta.icon
            const inactive = u.active === 0 || u.active === false
            const row = (
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('font-medium truncate', dark && 'text-white', inactive && 'line-through opacity-60')}>
                      {u.name}
                    </p>
                    <p className={cn('text-xs truncate', dark ? 'text-slate-400' : 'text-muted-foreground')}>
                      @{u.username} · {u.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className={cn('text-xs hidden sm:inline-flex', meta.color)}>{meta.label}</Badge>
                  {inactive && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
                  {u.role !== 'superadmin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleToggleActive(u)}
                      title={inactive ? 'Desbloquear' : 'Bloquear'}
                      className={cn(
                        inactive && 'border-green-500/40 text-green-600',
                        !inactive && 'border-destructive/40 text-destructive',
                        dark ? 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5' : '',
                      )}
                    >
                      {inactive ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  {u.role !== 'superadmin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => openPinModal(u)}
                      title={u.has_pin ? 'Cambiar PIN' : 'Asignar PIN'}
                      className={cn(
                        u.has_pin && 'border-[#D1400F]/40 text-[#D1400F]',
                        dark ? 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5' : '',
                      )}
                    >
                      <span className="text-xs font-bold">PIN</span>
                    </Button>
                  )}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => openEdit(u)}
                    className={dark ? 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5' : ''}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {u.role !== 'superadmin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setAccessibilityUser(u)}
                      title="Accesibilidad POS"
                      className={dark ? 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5' : ''}
                    >
                      <Accessibility className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && u.role !== 'superadmin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleDelete(u)}
                      className={cn('text-destructive', dark && 'border-white/10 bg-transparent hover:bg-red-500/10')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
            return dark ? (
              <div key={u.id} className="bg-slate-800 rounded-xl border border-white/5">{row}</div>
            ) : (
              <Card key={u.id}>{row}</Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan Pérez" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usuario (login)</Label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="juanperez"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {allowedRoles.map(r => (
                    <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editing ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repetir contraseña</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder={editing ? 'Repite la nueva contraseña' : 'Vuelve a escribir la contraseña'}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={create.isPending || update.isPending}
              className={dark ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' : 'bg-[#D1400F] hover:bg-[#B03508]'}
            >
              {create.isPending || update.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accessibilityUser !== null} onOpenChange={(o) => { if (!o) setAccessibilityUser(null) }}>
        <DialogContent className={dark ? 'bg-[#0a0a0a] border-white/10 text-white sm:max-w-2xl' : 'sm:max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>Accesibilidad POS · {accessibilityUser?.name}</DialogTitle>
          </DialogHeader>
          {accessibilityUser && (
            <AccessibilitySettingsPanel
              target={{ userId: accessibilityUser.id, role: accessibilityUser.role, branchId }}
              title="Configuración operativa del empleado"
              description="Define si este empleado trabajará en modo mobile, web desktop, tablet o kiosko. Se aplicará cuando inicie sesión en este dispositivo."
              dark={dark}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pinUser !== null} onOpenChange={(o) => { if (!o) { setPinUser(null) } }}>
        <DialogContent className="sm:max-w-sm bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-center">
              {pinSuccess ? 'Éxito' : `Configurar PIN · ${pinUser?.name}`}
            </DialogTitle>
          </DialogHeader>

          {pinSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-scale-in">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-8 w-8 animate-logo-bounce" />
              </div>
              <p className="text-emerald-400 text-sm font-semibold">PIN configurado correctamente</p>
              <p className="text-neutral-500 text-xs text-center">Este modal se cerrará automáticamente...</p>
            </div>
          ) : (
            <div className="space-y-6 py-2 overflow-hidden relative animate-keypad-in">
              <div className="relative w-full overflow-hidden min-h-[340px] transition-all duration-500 ease-in-out">
                {/* Paso 1: Ingresar Nuevo PIN */}
                <div
                  className={cn(
                    "w-full transition-all duration-500 ease-in-out transform",
                    pinStep === 'confirm'
                      ? "opacity-0 scale-95 -translate-x-12 pointer-events-none absolute top-0 left-0"
                      : "opacity-100 scale-100 translate-x-0 relative"
                  )}
                >
                  <div className="text-center mb-6">
                    <p className="text-neutral-400 text-sm">
                      Ingresa el nuevo PIN de 4 dígitos
                    </p>
                    {pinStep === 'enter' && pinError && (
                      <p className="text-red-400 text-xs mt-2 animate-shake">{pinError}</p>
                    )}
                  </div>

                  <PinPad
                    value={newPin}
                    onChange={setNewPin}
                    maxLength={4}
                    error={pinStep === 'enter' ? pinError : undefined}
                    loading={setPin.isPending}
                  />
                </div>

                {/* Paso 2: Confirmar PIN */}
                <div
                  className={cn(
                    "w-full transition-all duration-500 ease-in-out transform",
                    pinStep === 'confirm'
                      ? "opacity-100 scale-100 translate-x-0 relative"
                      : "opacity-0 scale-95 translate-x-12 pointer-events-none absolute top-0 left-0"
                  )}
                >
                  <div className="text-center mb-6">
                    <p className="text-neutral-400 text-sm">
                      Confirma tu nuevo PIN
                    </p>
                    {pinStep === 'confirm' && pinError && (
                      <p className="text-red-400 text-xs mt-2 animate-shake">{pinError}</p>
                    )}
                  </div>

                  <PinPad
                    value={confirmPin}
                    onChange={setConfirmPin}
                    maxLength={4}
                    error={pinStep === 'confirm' ? pinError : undefined}
                    loading={setPin.isPending}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                {pinStep === 'confirm' ? (
                  <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white transition-colors" onClick={handleGoBack}>
                    ← Regresar
                  </Button>
                ) : (
                  pinUser?.has_pin && (
                    <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={async () => {
                        try {
                          await setPin.mutateAsync({ id: pinUser.id, pin: null })
                          toast.success('PIN eliminado')
                          setPinUser(null)
                        } catch (e) {
                          toast.error('No se pudo quitar el PIN')
                        }
                      }}>
                      Quitar PIN
                    </Button>
                  )
                )}

                <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-white transition-colors ml-auto" onClick={() => setPinUser(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
