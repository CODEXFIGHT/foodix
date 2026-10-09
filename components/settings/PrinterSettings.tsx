'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Printer, Usb, Wifi, Monitor, Power, Inbox, Bluetooth, Zap, Info } from 'lucide-react'
import { usePrinterStore, type PrinterMode } from '@/lib/stores/printerStore'
import { usePrinter } from '@/hooks/usePrinter'
import {
  isWebUsbSupported, requestUsbPrinter, pingAgent,
  isWebBluetoothSupported, requestBluetoothPrinter, getPrinterCapabilities,
} from '@/lib/printing/printer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

const MODES: { value: PrinterMode; label: string; icon: typeof Usb; hint: string; needs?: 'usb' | 'bt' }[] = [
  { value: 'auto', label: 'Automático', icon: Zap, hint: 'Usa la mejor conexión disponible' },
  { value: 'usb', label: 'USB-A / USB-C', icon: Usb, hint: 'Cable USB (Chrome/Brave/Edge)', needs: 'usb' },
  { value: 'bluetooth', label: 'Bluetooth', icon: Bluetooth, hint: 'Impresora BLE (ideal para Android)', needs: 'bt' },
  { value: 'network', label: 'Red (IP) / Ethernet', icon: Wifi, hint: 'Impresora con IP en la red' },
  { value: 'browser', label: 'Navegador', icon: Monitor, hint: 'Diálogo del sistema (AirPrint en iOS)' },
  { value: 'off', label: 'Desactivada', icon: Power, hint: 'Sin impresión automática' },
]

export function PrinterSettings() {
  const cfg = usePrinterStore((s) => s.config)
  const setConfig = usePrinterStore((s) => s.setConfig)
  const { testPrint, openDrawer } = usePrinter()
  const [linking, setLinking] = useState(false)
  const [btLinking, setBtLinking] = useState(false)
  const [pinging, setPinging] = useState(false)
  const caps = getPrinterCapabilities()

  const handlePingAgent = async () => {
    setPinging(true)
    const ok = await pingAgent(cfg.agentPort)
    setPinging(false)
    if (ok) toast.success('Agente local detectado y funcionando')
    else toast.error(`No se detecta el agente en el puerto ${cfg.agentPort}. ¿Está corriendo?`)
  }

  const handleLinkUsb = async () => {
    setLinking(true)
    try {
      const { vendorId, productId } = await requestUsbPrinter()
      setConfig({ usbVendorId: vendorId, usbProductId: productId, mode: 'usb' })
      toast.success('Impresora USB vinculada')
    } catch (err) {
      // El usuario canceló el diálogo o no hay soporte.
      if (err instanceof Error && !err.message.includes('cancel')) {
        toast.error(err.message)
      }
    } finally {
      setLinking(false)
    }
  }

  const handleLinkBluetooth = async () => {
    setBtLinking(true)
    try {
      const { id, name } = await requestBluetoothPrinter()
      setConfig({ btDeviceId: id, btDeviceName: name, mode: 'bluetooth' })
      toast.success(`Bluetooth vinculado: ${name}`)
    } catch (err) {
      if (err instanceof Error && !/cancel|user/i.test(err.message)) toast.error(err.message)
    } finally {
      setBtLinking(false)
    }
  }

  const usbLinked = cfg.usbVendorId !== null
  const btLinked = cfg.btDeviceId !== null

  const modeDisabled = (needs?: 'usb' | 'bt') =>
    (needs === 'usb' && !caps.webusb) || (needs === 'bt' && !caps.webbluetooth)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Impresora y cajón de dinero
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Aviso de capacidades del dispositivo */}
        {caps.isIOS && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              En iPhone/iPad, Apple no permite USB ni Bluetooth desde el navegador.
              Usa el modo <strong>Navegador</strong> (imprime por AirPrint) o el modo
              <strong> Red</strong> con el agente local. El lector de códigos de barras
              sí funciona (se comporta como teclado).
            </p>
          </div>
        )}

        {/* Modo de conexión */}
        <div className="space-y-2">
          <Label>Modo de conexión</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon
              const active = cfg.mode === m.value
              const disabled = modeDisabled(m.needs)
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfig({ mode: m.value })}
                  title={disabled ? 'No disponible en este dispositivo/navegador' : undefined}
                  className={cn(
                    'flex items-start gap-2 p-3 border-2 rounded-xl text-left transition-all',
                    active ? 'border-[#EAB308] bg-[#FACC15]/5' : 'hover:border-primary/40',
                    disabled && 'opacity-40 cursor-not-allowed hover:border-border',
                  )}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', active && 'text-yellow-700')} />
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{m.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Config USB */}
        {(cfg.mode === 'usb' || (cfg.mode === 'auto' && caps.webusb)) && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            {!isWebUsbSupported() ? (
              <p className="text-xs text-destructive">
                Este navegador no soporta WebUSB. Usa Chrome o Edge en la caja, o
                cambia a modo Navegador.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {usbLinked ? (
                      <span className="text-green-600 font-medium">● Impresora vinculada</span>
                    ) : (
                      <span className="text-muted-foreground">Sin impresora vinculada</span>
                    )}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleLinkUsb} disabled={linking}>
                    <Usb className="h-3.5 w-3.5 mr-1" />
                    {linking ? 'Esperando…' : usbLinked ? 'Re-vincular' : 'Vincular USB'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecciona tu impresora en el diálogo del navegador. Quedará
                  recordada para las próximas sesiones.
                </p>
              </>
            )}
          </div>
        )}

        {/* Config Bluetooth */}
        {(cfg.mode === 'bluetooth' || (cfg.mode === 'auto' && caps.webbluetooth)) && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            {!isWebBluetoothSupported() ? (
              <p className="text-xs text-destructive">
                Este navegador/dispositivo no soporta Web Bluetooth. Usa Chrome o Brave
                en Android/Windows/macOS/Linux, o cambia de modo.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {btLinked ? (
                      <span className="text-green-600 font-medium">● {cfg.btDeviceName}</span>
                    ) : (
                      <span className="text-muted-foreground">Sin impresora vinculada</span>
                    )}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleLinkBluetooth} disabled={btLinking}>
                    <Bluetooth className="h-3.5 w-3.5 mr-1" />
                    {btLinking ? 'Buscando…' : btLinked ? 'Re-vincular' : 'Vincular Bluetooth'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enciende la impresora y ponla en modo emparejar. Compatible con la
                  mayoría de impresoras térmicas ESC/POS por Bluetooth.
                </p>
              </>
            )}
          </div>
        )}

        {/* Config Red */}
        {(cfg.mode === 'network' || cfg.mode === 'auto') && (
          <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">IP de la impresora</Label>
                <Input
                  value={cfg.networkIp}
                  onChange={(e) => setConfig({ networkIp: e.target.value.trim() })}
                  placeholder="192.168.1.50"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Puerto</Label>
                <Input
                  type="number"
                  value={cfg.networkPort}
                  onChange={(e) => setConfig({ networkPort: Number(e.target.value) || 9100 })}
                  placeholder="9100"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Puerto estándar RAW: 9100.
            </p>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usar agente local</p>
                  <p className="text-xs text-muted-foreground">
                    Puente en la PC de caja (recomendado si el backend está en la nube)
                  </p>
                </div>
                <Switch
                  checked={cfg.useLocalAgent}
                  onCheckedChange={(v) => setConfig({ useLocalAgent: v })}
                />
              </div>

              {cfg.useLocalAgent && (
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Puerto del agente</Label>
                    <Input
                      type="number"
                      value={cfg.agentPort}
                      onChange={(e) => setConfig({ agentPort: Number(e.target.value) || 9110 })}
                      className="w-28"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={handlePingAgent} disabled={pinging}>
                    {pinging ? 'Probando…' : 'Probar agente'}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {cfg.useLocalAgent
                  ? 'El navegador imprime a través del agente en localhost. Ejecuta agent.js en la PC de caja.'
                  : 'Modo directo: el servidor backend debe estar en la misma red que la impresora.'}
              </p>
            </div>
          </div>
        )}

        {/* Ancho de papel */}
        <div className="space-y-1.5">
          <Label>Ancho de papel</Label>
          <Select
            value={String(cfg.paperWidth)}
            onValueChange={(v) => setConfig({ paperWidth: Number(v) as 58 | 80 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80">80 mm (estándar)</SelectItem>
              <SelectItem value="58">58 mm (compacta)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Comportamiento al cobrar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Imprimir ticket al cobrar</p>
              <p className="text-xs text-muted-foreground">Al confirmar un pedido</p>
            </div>
            <Switch
              checked={cfg.printOnSale}
              onCheckedChange={(v) => setConfig({ printOnSale: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Abrir cajón al cobrar</p>
              <p className="text-xs text-muted-foreground">Requiere USB o red</p>
            </div>
            <Switch
              checked={cfg.openDrawerOnSale}
              onCheckedChange={(v) => setConfig({ openDrawerOnSale: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Copias por ticket</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={cfg.copies}
              onChange={(e) =>
                setConfig({ copies: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })
              }
              className="w-24"
            />
          </div>
        </div>

        {/* Pruebas */}
        <div className="flex gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" onClick={testPrint} className="flex-1 mt-3">
            <Printer className="h-3.5 w-3.5 mr-1" />
            Imprimir prueba
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDrawer()}
            disabled={cfg.mode === 'off' || cfg.mode === 'browser'}
            className="flex-1 mt-3"
          >
            <Inbox className="h-3.5 w-3.5 mr-1" />
            Abrir cajón
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
