'use client'

/**
 * FoodIX — Explicación de "¿Olvidaste tu contraseña?" en el login.
 * FoodIX no tiene recuperación automática por correo: el acceso de
 * Meseros y Cocina (PIN) y la contraseña de Administradores solo puede
 * restablecerlos el administrador o superadmin de la sucursal desde el
 * módulo Usuarios. Este modal deja eso claro antes de que el usuario
 * intente adivinar o espere un correo que nunca llegará.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button,
} from '@heroui/react'
import { ShieldCheck, UserCog, Fingerprint, Mail, MessageCircle } from 'lucide-react'
import { SUPPORT } from '@/lib/constants/appInfo'

export function ForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
              <span className="text-lg font-bold font-heading">¿Olvidaste tu contraseña?</span>
              <span className="text-sm font-normal text-muted-foreground">
                FoodIX no envía correos de recuperación — así funciona el restablecimiento.
              </span>
            </ModalHeader>

            <ModalBody className="pb-2">
              <div className="flex gap-3 rounded-xl bg-[#E85D04]/8 p-4">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E85D04]/15 text-[#E85D04] grid place-items-center">
                  <UserCog className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-tight">
                    Solo tu Administrador o Superadmin puede restablecerla
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Para Meseros y Cocina, el administrador de tu sucursal (o el superadmin) restablece tu
                    acceso desde <strong>Usuarios → editar usuario</strong> — asigna una nueva contraseña o un
                    nuevo PIN al instante. No hay recuperación automática por correo ni por SMS.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 grid place-items-center">
                  <Fingerprint className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-tight">¿Eres Mesero o Cocina?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tu acceso normal no usa contraseña, usa un <strong>PIN de 4 dígitos</strong> desde la
                    pantalla de Acceso Rápido. Si lo olvidaste, pide a tu administrador que te asigne uno nuevo.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 grid place-items-center">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-tight">¿Eres tú el Administrador o dueño?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Contacta al equipo de FoodIX para verificar tu identidad y restablecer tu acceso de forma segura.
                  </p>
                </div>
              </div>

              <section className="space-y-2 rounded-xl bg-stone-100 dark:bg-stone-900/40 p-4 mt-1 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#E85D04]">
                  Contactar soporte
                </h3>
                <div className="flex flex-col gap-2">
                  <a
                    href={`mailto:${SUPPORT.email}`}
                    className="flex items-center gap-2 text-sm hover:text-[#E85D04] transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" /> {SUPPORT.email}
                  </a>
                  <a
                    href={`https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-[#E85D04] transition-colors"
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
