/**
 * @fileoverview Creación de nuevo producto en el catálogo
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Nuevo Producto" description="Agrega un producto al menú" />
      <ProductForm />
    </div>
  );
}
