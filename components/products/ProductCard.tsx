'use client'

import type { Product, Category } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'

interface ProductCardProps {
  product: Product
  category?: Category
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  isAdmin: boolean
}

export function ProductCard({ product, category, onToggle, onDelete, onEdit, isAdmin }: ProductCardProps) {
  return (
    <Card className={!product.available ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl w-12 h-12 flex items-center justify-center bg-muted rounded-xl flex-shrink-0 overflow-hidden">
            {product.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              : (product.emoji ?? '🍽️')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                {category && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.emoji} {category.name}
                  </span>
                )}
              </div>
              <p className="font-bold text-yellow-700 dark:text-yellow-400 shrink-0">{formatCurrency(product.price)}</p>
            </div>
            {product.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={product.available}
                  onCheckedChange={() => onToggle(product.id)}
                  aria-label="Disponible"
                />
                <span className="text-xs text-muted-foreground">
                  {product.available ? 'Disponible' : 'No disponible'}
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(product.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
