'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { FeatureLock } from '@/components/shared/FeatureLock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InsumosTab } from '@/components/inventory/InsumosTab'
import { RecetasTab } from '@/components/inventory/RecetasTab'
import { ProveedoresTab } from '@/components/inventory/ProveedoresTab'
import { ComprasTab } from '@/components/inventory/ComprasTab'
import { TransferenciasTab } from '@/components/inventory/TransferenciasTab'

export default function InventoryPage() {
  const user = useAuthStore(s => s.user)
  const branchId = user?.branch_id ?? null

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-8 text-muted-foreground">Sin acceso</div>
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title="Inventario" description="Insumos, recetas, proveedores, compras y transferencias" />

      <FeatureLock feature="inventory" featureLabel="Inventario" planSugerido="pro">
        <Tabs defaultValue="insumos">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="recetas">Recetas</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
            <TabsTrigger value="transferencias">Transferencias</TabsTrigger>
          </TabsList>
          <TabsContent value="insumos" className="mt-4"><InsumosTab branchId={branchId} /></TabsContent>
          <TabsContent value="recetas" className="mt-4"><RecetasTab branchId={branchId} /></TabsContent>
          <TabsContent value="proveedores" className="mt-4"><ProveedoresTab branchId={branchId} /></TabsContent>
          <TabsContent value="compras" className="mt-4"><ComprasTab branchId={branchId} /></TabsContent>
          <TabsContent value="transferencias" className="mt-4"><TransferenciasTab branchId={branchId} /></TabsContent>
        </Tabs>
      </FeatureLock>
    </div>
  )
}
