'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { FeatureLock } from '@/components/shared/FeatureLock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CombosTab } from '@/components/promotions/CombosTab'
import { PromotionsTab } from '@/components/promotions/PromotionsTab'
import { CouponsTab } from '@/components/promotions/CouponsTab'
import { LoyaltyTab } from '@/components/promotions/LoyaltyTab'

export default function PromotionsPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-8 text-muted-foreground">Sin acceso</div>
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader title="Promociones" description="Combos, descuentos, cupones y lealtad para vender más" />

      <FeatureLock feature="promotions" featureLabel="Promociones y combos" planSugerido="pro">
        <Tabs defaultValue="combos">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="combos">Combos</TabsTrigger>
            <TabsTrigger value="promociones">Promociones</TabsTrigger>
            <TabsTrigger value="cupones">Cupones</TabsTrigger>
            <TabsTrigger value="lealtad">Lealtad</TabsTrigger>
          </TabsList>
          <TabsContent value="combos" className="mt-4"><CombosTab branchId={branchId} /></TabsContent>
          <TabsContent value="promociones" className="mt-4"><PromotionsTab branchId={branchId} /></TabsContent>
          <TabsContent value="cupones" className="mt-4"><CouponsTab branchId={branchId} /></TabsContent>
          <TabsContent value="lealtad" className="mt-4"><LoyaltyTab branchId={branchId} /></TabsContent>
        </Tabs>
      </FeatureLock>
    </div>
  )
}
