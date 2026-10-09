'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Send, MessageCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { contactLeadSchema, type ContactLeadInput } from '@/lib/validators/schemas'
import { useSubmitLead } from '@/lib/api/queries'
import { cn } from '@/lib/utils/cn'

/**
 * Formulario público de contacto / cotización de la landing.
 * Envía nombre, WhatsApp y mensaje al backend (visible en el superadmin) y
 * dispara una notificación por correo a la marca.
 */
export function ContactForm() {
  const submitLead = useSubmitLead()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ContactLeadInput>({
    resolver: zodResolver(contactLeadSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: ContactLeadInput) => {
    try {
      await submitLead.mutateAsync(data)
      toast.success('¡Solicitud enviada!', {
        description: 'Te contactaremos por WhatsApp lo antes posible.',
      })
      reset()
    } catch {
      toast.error('No se pudo enviar', {
        description: 'Inténtalo de nuevo o escríbenos directamente por WhatsApp.',
      })
    }
  }

  const sending = isSubmitting || submitLead.isPending

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 items-center">
      {/* Texto */}
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-yellow-300">
          <MessageCircle className="h-3.5 w-3.5" /> Más información
        </span>
        <h2 className="mt-4 font-heading text-3xl font-extrabold text-stone-900 sm:text-4xl dark:text-white">
          Solicita tu cotización
        </h2>
        <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-zinc-300">
          Déjanos tu nombre, WhatsApp y cuéntanos sobre tu negocio. Te enviaremos una propuesta a la
          medida y resolvemos todas tus dudas.
        </p>
        {isSubmitSuccessful && !sending && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Recibimos tu mensaje. ¡Gracias!
          </p>
        )}
      </div>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8 dark:border-white/10 dark:bg-[#0a0a0a]"
      >
        <div className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              Nombre <span className="text-yellow-700 dark:text-yellow-400">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className={cn(
                'h-11 w-full rounded-xl border bg-white px-4 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:ring-2 dark:bg-black dark:text-white',
                errors.name
                  ? 'border-red-400 focus:ring-red-400/40'
                  : 'border-stone-200 focus:border-[#CA8A04] focus:ring-[#CA8A04]/30 dark:border-white/15',
              )}
              {...register('name')}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" /> {errors.name.message}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label htmlFor="contact-whatsapp" className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              WhatsApp <span className="text-yellow-700 dark:text-yellow-400">*</span>
            </label>
            <input
              id="contact-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="55 1234 5678"
              className={cn(
                'h-11 w-full rounded-xl border bg-white px-4 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:ring-2 dark:bg-black dark:text-white',
                errors.whatsapp
                  ? 'border-red-400 focus:ring-red-400/40'
                  : 'border-stone-200 focus:border-[#CA8A04] focus:ring-[#CA8A04]/30 dark:border-white/15',
              )}
              {...register('whatsapp')}
            />
            {errors.whatsapp && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" /> {errors.whatsapp.message}
              </p>
            )}
          </div>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              Mensaje <span className="text-yellow-700 dark:text-yellow-400">*</span>
            </label>
            <textarea
              id="contact-message"
              rows={4}
              placeholder="Cuéntanos sobre tu restaurante, cuántas sucursales tienes y qué necesitas…"
              className={cn(
                'w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:ring-2 dark:bg-black dark:text-white',
                errors.message
                  ? 'border-red-400 focus:ring-red-400/40'
                  : 'border-stone-200 focus:border-[#CA8A04] focus:ring-[#CA8A04]/30 dark:border-white/15',
              )}
              {...register('message')}
            />
            {errors.message && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" /> {errors.message.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] text-sm font-semibold text-stone-950 shadow-sm transition-all hover:bg-[#EAB308] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Enviar solicitud
              </>
            )}
          </button>

          <p className="text-center text-xs text-stone-400">
            Al enviar aceptas que te contactemos por WhatsApp o correo. No compartimos tus datos.
          </p>
        </div>
      </form>
    </div>
  )
}
