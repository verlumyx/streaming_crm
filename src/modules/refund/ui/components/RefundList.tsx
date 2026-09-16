'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Eye, MoreHorizontal, Pencil, Plus, Search, Undo2, X } from 'lucide-react';
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
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { money } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import type { ActionState } from '@/modules/shared/actions/action-state';
import { REFUND_STATUSES } from '@/modules/refund/models/refund.model';
import { REFUND_PERMISSIONS } from '@/modules/refund/permissions';
import { refundRoutes } from '@/modules/refund/routes';
import type { RefundListItemDto } from '@/modules/refund/serializers/refund.serializer';
import { approveRefundAction, rejectRefundAction } from '@/app/[companyId]/refunds/actions';
import { REFUND_STATUS_LABELS, refundStatusPill } from '../labels';
import type { RefundFilters, RefundMeta } from '../types/Refund';

const COLUMNS = 'lg:grid-cols-[0.9fr_2fr_1fr_1fr_1.1fr_0.7fr]';
const ALL = 'all';

type Props = {
  companyId: string;
  refunds: RefundListItemDto[];
  meta: RefundMeta;
  filters: RefundFilters;
};

export function RefundList({ companyId, refunds: items, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<RefundFilters>(initialFilters);

  const search = () => router.push(refundRoutes.index(companyId, filters));
  const clear = () => {
    setFilters({});
    router.push(refundRoutes.index(companyId));
  };
  const goToShow = (id: string) => router.push(refundRoutes.show(companyId, id));

  const resolve = (id: string, action: (companyId: string, id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(companyId, id);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo completar la acción.');
    });

  return (
    <PageShell
      title="Reembolsos"
      subtitle={`${meta.total} reembolso${meta.total !== 1 ? 's' : ''} registrado${meta.total !== 1 ? 's' : ''}`}
      actions={
        can(REFUND_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(refundRoutes.create(companyId))}
          >
            <Plus />
            Nuevo reembolso
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="filter-q">Buscar</Label>
            <Input
              id="filter-q"
              value={filters.q ?? ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Código o razón..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: ALL, label: 'Todos' },
                ...REFUND_STATUSES.map((status) => ({ value: status, label: REFUND_STATUS_LABELS[status] })),
              ]}
              value={filters.status ?? ALL}
              onChange={(value) => setFilters({ ...filters, status: !value || value === ALL ? undefined : value })}
              placeholder="Todos"
              emptyText="Sin resultados"
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
          <ListGridHeadCell>Cliente</ListGridHeadCell>
          <ListGridHeadCell>Venta</ListGridHeadCell>
          <ListGridHeadCell>Monto</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {items.map((refund) => (
            <ListGridRow key={refund.id} columns={COLUMNS} onClick={() => goToShow(refund.id)}>
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{refund.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border">
                  <Undo2 className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{refund.client?.name ?? '—'}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{refund.reason ?? '—'}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13.5px] font-semibold tabular-nums">{refund.sale?.code ?? '—'}</span>
              </div>
              <div className="hidden lg:block">
                <span className="font-bold tabular-nums">{money(refund.amount)}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={refundStatusPill(refund.status)}>{REFUND_STATUS_LABELS[refund.status]}</StatusPill>
              </div>
              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => goToShow(refund.id)}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {refund.isPending && can(REFUND_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(refundRoutes.show(companyId, refund.id, { edit: 1 }))}>
                        <Pencil className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {refund.isPending && can(REFUND_PERMISSIONS.APPROVE) && (
                      <DropdownMenuItem disabled={pending} onSelect={() => resolve(refund.id, approveRefundAction)}>
                        <Check className="mr-2 size-4" />
                        Aprobar
                      </DropdownMenuItem>
                    )}
                    {refund.isPending && can(REFUND_PERMISSIONS.REJECT) && (
                      <DropdownMenuItem disabled={pending} onSelect={() => resolve(refund.id, rejectRefundAction)}>
                        <X className="mr-2 size-4" />
                        Rechazar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {items.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={items.length} total={meta.total} noun="reembolso">
          <ListPagination meta={meta} href={(query) => refundRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
