import { NotebookPen } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { StatusPill } from '@/components/status-pill';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { manualTransactionRoutes } from '@/modules/manual-transaction/routes';
import type { ManualTransactionDto } from '@/modules/manual-transaction/serializers/manual-transaction.serializer';
import { MANUAL_TRANSACTION_STATUS_LABELS, formatAmount, manualTransactionStatusPill } from '../labels';
import type { TransactionCatalogDto } from '../types/ManualTransaction';
import { ManualTransactionResolveButtons } from './ManualTransactionResolveButtons';

type Props = {
  companyId: string;
  manualTransaction: ManualTransactionDto;
  catalog: TransactionCatalogDto;
  canApprove: boolean;
  canCancel: boolean;
};

/** Ver: header, details and lines. Server component. */
export function ManualTransactionShow({ companyId, manualTransaction: mt, catalog, canApprove, canCancel }: Props) {
  const categoryLabel = (value: string) => catalog.categories.find((c) => c.value === value)?.label ?? value;
  const typeLabel = (value: string) => catalog.types.find((t) => t.value === value)?.label ?? value;

  const details = [
    { label: 'Fecha', value: formatDate(mt.date) },
    { label: 'Registrado por', value: mt.recordedByUser?.name ?? '—' },
    { label: 'Descripción', value: mt.description ?? '—' },
    { label: 'Referencia', value: mt.reference ?? '—' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6 pb-14">
      <BackLink href={manualTransactionRoutes.index(companyId)}>Transacciones manuales</BackLink>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground grid size-12 shrink-0 place-items-center rounded-[14px] border">
            <NotebookPen className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[27px] font-extrabold tracking-tight tabular-nums">{mt.code}</h1>
              <StatusPill kind={manualTransactionStatusPill(mt.status)}>
                {MANUAL_TRANSACTION_STATUS_LABELS[mt.status]}
              </StatusPill>
            </div>
            <p className="text-muted-foreground text-[14.5px]">Total {formatAmount(mt.total, mt.currency)}</p>
          </div>
        </div>

        {mt.isPending && (
          <ManualTransactionResolveButtons
            companyId={companyId}
            id={mt.id}
            canApprove={mt.canBeApproved && canApprove}
            canCancel={mt.canBeCancelled && canCancel}
          />
        )}
      </div>

      <Card className="rounded-2xl p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-col">
              <dt className="text-muted-foreground text-[12.5px] font-semibold">{detail.label}</dt>
              <dd className="font-semibold">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="overflow-hidden rounded-2xl py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mt.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                      line.type === 'income' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'
                    }`}
                  >
                    {typeLabel(line.type)}
                  </span>
                </TableCell>
                <TableCell>{categoryLabel(line.category)}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{line.description ?? '—'}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatAmount(line.amount, mt.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {mt.notes && (
        <Card className="rounded-2xl p-6">
          <h2 className="text-muted-foreground text-[12.5px] font-semibold">Notas</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap">{mt.notes}</p>
        </Card>
      )}
    </div>
  );
}
