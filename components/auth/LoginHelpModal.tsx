'use client'

/**
 * FoodIX — Ayuda express en el login.
 * Modal ligero con lo más urgente para alguien que aún no puede entrar:
 * problemas comunes de acceso, un resumen de qué es FoodIX y contacto
 * directo de soporte. El Centro de Ayuda completo (/help) vive dentro del
 * sistema, ya autenticado.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button,
} from '@heroui/react'
import { KeyRound, Fingerprint, WifiOff, Smartphone, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { SUPPORT } from '@/lib/constants/appInfo'

interface LoginIssue {
  icon: React.ElementType
  title: string
  desc: string
}

const LOGIN_ISSUES: LoginIssue[] = [
  {
    icon: KeyRound,
    title: 'Olvidé mi usuario o contraseña',
    desc: 'Solo un administrador de tu sucursal puede restablecerla, desde Usuarios → editar usuario. FoodIX no tiene recuperación automática por correo.',
  },
  {
    icon: Fingerprint,
    title: 'Soy mesero o cocina y no entro con contraseña',
    desc: 'El personal de piso y cocina no usa usuario/contraseña: accede con su nombre y PIN de 4 dígitos desde la pantalla de Acceso Rápido.',
  },
  {
    icon: Smartphone,
    title: 'Dice "Dispositivo pendiente de aprobación"',
    desc: 'Tu celular, tableta o computadora debe estar aprobado por el administrador antes de aparecer en la lista de personal. Pídele que lo apruebe en Dispositivos.',
  },
  {
    icon: WifiOff,
    title: 'No carga o se queda cargando',
    desc: 'Revisa tu conexión a internet y recarga la página. Si tu suscripción no está activa, el sistema te lo indicará al iniciar sesión.',
  },
]

export function LoginHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      scrollBehavior="inside"
      classNames={{ base: 'mx-4' }}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-lg font-bold font-heading">Ayuda express</span>
              <span className="text-sm font-normal text-muted-foreground">
                Resolvemos lo más común antes de que escribas a soporte.
              </span>
            </ModalHeader>

            <ModalBody className="pb-2">
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
                  No puedo iniciar sesión
                </h3>
                <div className="space-y-3">
                  {LOGIN_ISSUES.map((issue) => (
                    <div key={issue.title} className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#FACC15]/10 text-yellow-700 dark:text-yellow-400 grid place-items-center shrink-0">
                        <issue.icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-tight">{issue.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{issue.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2 rounded-xl bg-stone-100 dark:bg-stone-900/40 p-4 mt-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> ¿Cómo funciona FoodIX?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Es el sistema operativo de tu restaurante: pedidos, mesas, cocina en tiempo real,
                  caja, inventario, clientes y carta digital con QR, todo desde el navegador — sin
                  instalar nada. Cada rol (admin, mesero, cocina) ve solo lo que necesita para trabajar.
                </p>
              </section>

              <section className="space-y-2 pt-1 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
                  ¿Sigue sin funcionar?
                </h3>
                <div className="flex flex-col gap-2">
                  <a
                    href={`mailto:${SUPPORT.email}`}
                    className="flex items-center gap-2 text-sm hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" /> {SUPPORT.email}
                  </a>
                  <a
                    href={`https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" /> {SUPPORT.whatsapp}
                  </a>
                </div>
              </section>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={close}>
                Entendido
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
