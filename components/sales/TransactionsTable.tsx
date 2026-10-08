/**
 * @fileoverview Tabla paginada del historial de transacciones
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useState } from 'react';
import { Order } from '@/lib/types';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionsTableProps {
  orders: Order[];
  pageSize?: number;
}

export function TransactionsTable({ orders, pageSize = 10 }: TransactionsTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(orders.length / pageSize);
  const paginated = orders.slice(page * pageSize, (page + 1) * pageSize);

  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-8">Sin transacciones en el rango seleccionado.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Artículos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell className="text-sm">{order.table_name}</TableCell>
                <TableCell className="text-sm">{order.items.reduce((s, i) => s + i.quantity, 0)} pzas</TableCell>
                <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                <TableCell><OrderStatusBadge status={order.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {paginated.map(order => (
          <div key={order.id} className="border rounded-lg p-3 text-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-xs font-semibold">{order.id}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{order.table_name}</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            <p className="mt-1 font-bold text-[#E85D04]">{formatCurrency(order.total)}</p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page + 1} de {totalPages} ({orders.length} resultados)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
