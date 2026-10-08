'use client'

/**
 * FoodIX — Tipo de entrega por defecto para el bot de WhatsApp.
 *
 * El bot de WhatsApp ya NO pregunta "¿mesa/llevar/domicilio?" — usa este
 * default por sucursal para decidirlo automáticamente. Si se elige
 * "A domicilio", el bot pide la dirección de entrega (única pregunta extra);
 * con "Pickup" el pedido se confirma sin ninguna pregunta adicional.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MessageCircle, ShoppingBag, Bike } from 'lucide-react'
import { useBranch, useUpdateBranch } from '@/lib/api/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

type OrderType = 'pickup' | 'delivery'

export function WhatsAppOrderTypeSettings({ branchId }: { branchId: number }) {
  const { data: branch } = useBranch(branchId)
  const updateBranch = useUpdateBranch()

  const [orderType, setOrderType] = useState<OrderType>('pickup')

  useEffect(() => {
    if (!branch) return
    setOrderType(branch.wa_default_order_type === 'delivery' ? 'delivery' : 'pickup')
  }, [branch])

  const save = async (next: OrderType) => {
    setOrderType(next)
    try {
      await updateBranch.mutateAsync({ id: branchId, wa_default_order_type: next })
      toast.success('Tipo de entrega de WhatsApp actualizado')
    } catch {
      toast.error('No se pudo guardar el tipo de entrega')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-[#E85D04]" />
          Pedidos por WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          El bot ya no pregunta cómo recibir el pedido — usa este tipo de entrega por defecto.
          Con “A domicilio” se le pide la dirección al cliente; con “Pickup” el pedido se confirma sin preguntas extra.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={orderType === 'pickup' ? 'default' : 'outline'}
            className={cn('flex-1', orderType === 'pickup' && 'bg-[#E85D04] hover:bg-[#C44D00]')}
            disabled={updateBranch.isPending}
            onClick={() => save('pickup')}
          >
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            Pickup
          </Button>
          <Button
            type="button"
            variant={orderType === 'delivery' ? 'default' : 'outline'}
            className={cn('flex-1', orderType === 'delivery' && 'bg-[#E85D04] hover:bg-[#C44D00]')}
            disabled={updateBranch.isPending}
            onClick={() => save('delivery')}
          >
            <Bike className="h-4 w-4 mr-1.5" />
            A domicilio
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
