import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { decimal, formatDate } from '@/lib/format';
import type { TransactionCatalog } from '@/modules/transaction/models/transaction.model';
import type { TransactionDto } from '@/modules/transaction/serializers/transaction.serializer';

type Props = {
  movements: TransactionDto[];
  total: number;
  catalog: TransactionCatalog;
  searched: boolean;
  pending: boolean;
  emptyText: string;
  signed?: boolean;
};

/** Ledger rows shared by the Movimientos and Ingresos y gastos reports. */
export function LedgerTable({ movements, total, catalog, searched, pending, emptyText, signed = false }: Props) {
  const categoryLabel = (v: string) => catalog.categories.find((c) => c.value === v)?.label ?? v;
  const typeLabel = (v: string) => catalog.types.find((t) => t.value === v)?.label ?? v;

  return (
    <Card className="relative overflow-hidden rounded-2xl py-0">
      {pending && (
        <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="whitespace-nowrap">Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Método de pago</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-semibold whitespace-nowrap tabular-nums">{formatDate(m.date)}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                    m.type === 'income' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'
                  }`}
                >
                  {typeLabel(m.type)}
                </span>
              </TableCell>
              <TableCell>{categoryLabel(m.category)}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">{m.description || '—'}</TableCell>
              <TableCell>{m.paymentMethod || '—'}</TableCell>
              <TableCell className="text-muted-foreground">{m.reference ?? '—'}</TableCell>
              <TableCell
                className={`text-right font-bold whitespace-nowrap tabular-nums ${
                  signed ? (m.type === 'income' ? 'text-ok' : 'text-bad') : ''
                }`}
              >
                {signed ? (m.type === 'income' ? '+' : '−') : ''}
                {decimal(m.amount)} {m.currency}
              </TableCell>
            </TableRow>
          ))}
          {movements.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="text-muted-foreground p-12 text-center text-sm">
                {searched ? emptyText : 'Aplica los filtros y presiona Buscar para ver los movimientos.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {searched && movements.length > 0 && (
        <div className="text-muted-foreground border-t px-5 py-3.5 text-[13px] font-semibold">
          {movements.length} de {total} movimiento{total !== 1 ? 's' : ''}
        </div>
      )}
    </Card>
  );
}
