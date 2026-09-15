'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Eye, MoreHorizontal, NotebookPen, Plus, Search, X } from 'lucide-react';
import { StatusPill } from '@/components/status-pill';
import {
  ListFooter,
  ListGrid,
  ListGridBody,
  ListGridHeadCell,
  ListGridHeader,
  ListGridRow,
  PageShell,
} from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import type { ActionState } from '@/modules/shared/actions/action-state';
import { MANUAL_TRANSACTION_PERMISSIONS } from '@/modules/manual-transaction/permissions';
import { manualTransactionRoutes } from '@/modules/manual-transaction/routes';
import {
  approveManualTransactionAction,
  cancelManualTransactionAction,
} from '@/app/[companyId]/manual-transactions/actions';
import type { ManualTransactionListItemDto } from '@/modules/manual-transaction/serializers/manual-transaction.serializer';
import { MANUAL_TRANSACTION_STATUS_LABELS, formatAmount, manualTransactionStatusPill } from '../labels';
import type { ManualTransactionFilters, ManualTransactionMeta } from '../types/ManualTransaction';

const COLUMNS = 'lg:grid-cols-[1fr_1fr_1.1fr_1.7fr_0.7fr_1fr_0.7fr]';

type Props = {
  companyId: string;
  manualTransactions: ManualTransactionListItemDto[];
  meta: ManualTransactionMeta;
  filters: ManualTransactionFilters;
};

export function ManualTransactionList({ companyId, manualTransactions: items, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ManualTransactionFilters>(initialFilters);

  const search = () => router.push(manualTransactionRoutes.index(companyId, filters));
  const clear = () => {
    setFilters({});
    router.push(manualTransactionRoutes.index(companyId));
  };
  const goToShow = (id: string) => router.push(manualTransactionRoutes.show(companyId, id));

  const resolve = (id: string, action: (companyId: string, id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(companyId, id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  return (
    <PageShell
      title="Transacciones manuales"
      subtitle={`${meta.total} transacción${meta.total !== 1 ? 'es' : ''} registrada${meta.total !== 1 ? 's' : ''}`}
      actions={
        can(MANUAL_TRANSACTION_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(manualTransactionRoutes.create(companyId))}
          >
            <Plus />
            Nueva transacción
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-code">Código</Label>
            <Input
              id="filter-code"
              value={filters.code ?? ''}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="MTX..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Desde</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Hasta</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={search}>
            <Search className="mr-2 size-4" />
            Buscar
          </Button>
          <Button variant="outline" onClick={clear}>
            Limpiar
          </Button>
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Código</ListGridHeadCell>
          <ListGridHeadCell>Fecha</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Descripción</ListGridHeadCell>
          <ListGridHeadCell>Líneas</ListGridHeadCell>
          <ListGridHeadCell align="right">Total</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {items.map((item) => (
            <ListGridRow key={item.id} columns={COLUMNS} onClick={() => goToShow(item.id)}>
              <div className="flex items-center gap-3 lg:block">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border lg:hidden">
                  <NotebookPen className="size-5" />
                </span>
                <span className="text-muted-foreground font-semibold tabular-nums">{item.code}</span>
              </div>
              <div className="hidden tabular-nums lg:block">{formatDate(item.date)}</div>
              <div className="hidden lg:block">
                <StatusPill kind={manualTransactionStatusPill(item.status)}>
                  {MANUAL_TRANSACTION_STATUS_LABELS[item.status]}
                </StatusPill>
              </div>
              <div className="text-muted-foreground hidden truncate lg:block">{item.description ?? '—'}</div>
              <div className="hidden tabular-nums lg:block">{item.lineCount}</div>
              <div className="hidden text-right font-bold tabular-nums lg:block">{formatAmount(item.total, item.currency)}</div>
              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => goToShow(item.id)}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {item.canBeApproved && can(MANUAL_TRANSACTION_PERMISSIONS.APPROVE) && (
                      <DropdownMenuItem disabled={pending} onSelect={() => resolve(item.id, approveManualTransactionAction)}>
                        <Check className="mr-2 size-4" />
                        Aprobar
                      </DropdownMenuItem>
                    )}
                    {item.canBeCancelled && can(MANUAL_TRANSACTION_PERMISSIONS.CANCEL) && (
                      <DropdownMenuItem disabled={pending} onSelect={() => resolve(item.id, cancelManualTransactionAction)}>
                        <X className="mr-2 size-4" />
                        Cancelar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {items.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin transacciones manuales registradas.</div>
          )}
        </ListGridBody>
        <ListFooter shown={items.length} total={meta.total} noun="transacción" nounPlural="transacciones" />
      </ListGrid>
    </PageShell>
  );
}
