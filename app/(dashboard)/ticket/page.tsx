'use client'

/**
 * FoodIX — Personalización del ticket de venta
 * Editor con vista previa en vivo: el usuario configura el encabezado del
 * ticket (logotipo, nombre del restaurante, dirección y teléfono) en el panel
 * izquierdo y ve el resultado renderizado a la derecha como papel térmico.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2, Save, Printer } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfigStore } from '@/lib/stores/configStore'
import { useBranch, useUpdateBranch } from '@/lib/api/queries'
import { usePrinter } from '@/hooks/usePrinter'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const MAX_LOGO_BYTES = 500 * 1024 // 500 KB — el logo se guarda como data URL local

export default function TicketDesignPage() {
  const user      = useAuthStore(s => s.user)
  const config    = useConfigStore(s => s.config)
  const setConfig = useConfigStore(s => s.setConfig)

  const { data: branch } = useBranch(user?.branch_id ?? null)
  const updateBranch     = useUpdateBranch()

  const printer   = usePrinter()

  const fileRef = useRef<HTMLInputElement>(null)
  const [businessName, setBusinessName] = useState(config.businessName)
  const [address, setAddress]           = useState(config.address ?? '')
  const [phone, setPhone]               = useState(config.phone ?? '')
  const [footer, setFooter]             = useState(config.footer ?? '¡Gracias por su compra!')
  const [logo, setLogo]                 = useState<string | null>(config.ticketLogo ?? null)
  const [saving, setSaving]             = useState(false)
  const [testing, setTesting]           = useState(false)
  const [showPrintConfirm, setShowPrintConfirm] = useState(false)
  const [isInitialized, setIsInitialized]       = useState(false)

  useEffect(() => {
    if (branch && !isInitialized) {
      if (businessName === 'Mi Restaurante' && branch.name) {
        setBusinessName(branch.name)
      }
      if (!address && branch.address) {
        setAddress(branch.address)
      }
      if (!phone && branch.phone) {
        setPhone(branch.phone)
      }
      if (!logo && branch.logo_url) {
        setLogo(branch.logo_url)
      }
      setIsInitialized(true)
    }
  }, [branch, businessName, address, phone, logo, isInitialized])

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-8 text-muted-foreground">Sin acceso</div>
  }

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('El logo no debe superar 500 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.onerror = () => toast.error('No se pudo leer la imagen')
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (businessName.trim().length < 2) {
      toast.error('El nombre del restaurante es obligatorio')
      return
    }
    setSaving(true)
    try {
      setConfig({
        businessName: businessName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        footer: footer.trim(),
        ticketLogo: logo,
      })

      if (user?.branch_id) {
        await updateBranch.mutateAsync({
          id: user.branch_id,
          name: businessName.trim(),
          address: address.trim(),
          phone: phone.trim(),
        })
      }
      toast.success('Ticket y sucursal actualizados')
    } catch {
      toast.error('Error al guardar en el servidor')
    } finally {
      setSaving(false)
    }
  }

  // Imprime un ticket de muestra con los datos que se están editando ahora
  // (aunque no se hayan guardado todavía).
  const handleTestPrint = async () => {
    setTesting(true)
    await printer.printSample({
      businessName: businessName.trim() || 'Mi Restaurante',
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      footer: footer.trim() || undefined,
      logo: logo || undefined,
    })
    setTesting(false)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Personalizar ticket"
        description="Configura el encabezado del ticket de venta y observa la vista previa en tiempo real."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Panel de edición ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Encabezado del ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logotipo */}
            <div className="space-y-1.5">
              <Label>Logotipo</Label>
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-stone-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleLogoFile(f)
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" /> Subir logo
                  </Button>
                  {logo && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setLogo(null)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Quitar
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG o WEBP · máx. 500 KB · se imprime en la térmica</p>
                </div>
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>Nombre del restaurante</Label>
              <Input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Mi Restaurante"
                maxLength={80}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Av. Siempre Viva 123, Col. Centro"
                rows={2}
                maxLength={160}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="55 1234 5678"
                maxLength={40}
              />
            </div>

            {/* Pie de página */}
            <div className="space-y-1.5">
              <Label>Pie de página</Label>
              <Textarea
                value={footer}
                onChange={e => setFooter(e.target.value)}
                placeholder="¡Gracias por su compra!"
                rows={2}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">Mensaje que aparece al final del ticket.</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-[#FACC15] hover:bg-[#EAB308]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* ── Vista previa ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">Vista previa</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPrintConfirm(true)}
              disabled={testing}
            >
              <Printer className="mr-2 h-4 w-4" />
              {testing ? 'Imprimiendo…' : 'Prueba de impresión'}
            </Button>
          </div>
          <div className="rounded-2xl bg-stone-200/70 p-6">
            <TicketPreview logo={logo} businessName={businessName} address={address} phone={phone} footer={footer} />
          </div>
          <p className="text-xs text-muted-foreground">
            Imprime un ticket de muestra con estos datos. Si no hay impresora configurada,
            se abrirá el diálogo de impresión del navegador.
          </p>
        </div>
      </div>

      <Dialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar impresión</DialogTitle>
            <DialogDescription>
              ¿Deseas imprimir un ticket de prueba con el diseño actual?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPrintConfirm(false)}
            >
              No
            </Button>
            <Button
              type="button"
              className="bg-[#FACC15] hover:bg-[#EAB308]"
              onClick={() => {
                setShowPrintConfirm(false)
                handleTestPrint()
              }}
            >
              Sí, imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Vista previa del ticket (papel térmico 80mm) ────────────────────────────
function TicketPreview({
  logo,
  businessName,
  address,
  phone,
  footer,
}: {
  logo: string | null
  businessName: string
  address: string
  phone: string
  footer: string
}) {
  const items = [
    { qty: 2, name: 'Tacos al pastor', total: 90 },
    { qty: 1, name: 'Agua de jamaica', total: 25 },
    { qty: 1, name: 'Guacamole', total: 60 },
  ]
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const tax = Math.round(subtotal * 0.16 * 100) / 100
  const total = subtotal + tax

  return (
    <div
      className="mx-auto w-[300px] bg-white px-4 py-5 text-black shadow-lg"
      style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}
    >
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt="logo"
          className="mx-auto mb-2 h-[100px] w-[100px] object-contain grayscale contrast-150"
        />
      )}
      <div className="text-center text-lg font-bold leading-tight">
        {businessName || 'Mi Restaurante'}
      </div>
      {address && <div className="text-center text-[11px] leading-snug">{address}</div>}
      {phone && <div className="text-center text-[11px]">Tel: {phone}</div>}

      <Dashed />
      <div>Pedido #1042 &nbsp; 16/06/2026 14:30</div>
      <div>Mesa: 5</div>
      <Dashed />

      {items.map((i, idx) => (
        <div key={idx} className="flex justify-between">
          <span>{i.qty}x {i.name}</span>
          <span>${i.total.toFixed(2)}</span>
        </div>
      ))}

      <Dashed />
      <div className="flex justify-between text-[15px] font-bold"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>

      <div className="mt-3 whitespace-pre-line text-center">{footer || '¡Gracias por su compra!'}</div>
    </div>
  )
}

function Dashed() {
  return <div className="my-1.5 border-t border-dashed border-black" />
}
