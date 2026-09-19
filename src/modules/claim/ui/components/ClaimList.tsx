'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, MessageSquareWarning, MoreHorizontal, Pencil, Plus, Search } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { CLAIM_CHANNELS, CLAIM_STATUSES, type ClaimChannel, type ClaimStatus } from '@/modules/claim/models/claim.model';
import { CLAIM_PERMISSIONS } from '@/modules/claim/permissions';
import { claimRoutes } from '@/modules/claim/routes';
import type { ClaimListItemDto } from '@/modules/claim/serializers/claim.serializer';
import { updateStatusClaimAction } from '@/app/[companyId]/claims/actions';
import { CLAIM_CHANNEL_LABELS, CLAIM_STATUS_LABELS, claimStatusPill } from '../labels';
import type { ClaimFilters, ClaimMeta } from '../types/Claim';

const COLUMNS = 'lg:grid-cols-[0.9fr_2.2fr_1fr_1fr_1fr_0.7fr]';
const ALL = 'all';

type Props = {
  companyId: string;
  claims: ClaimListItemDto[];
  meta: ClaimMeta;
  filters: ClaimFilters;
};

export function ClaimList({ companyId, claims: items, meta, filters: initialFilters }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ClaimFilters>(initialFilters);

  const search = () => router.push(claimRoutes.index(companyId, filters));
  const clear = () => {
    setFilters({});
    router.push(claimRoutes.index(companyId));
  };
  const goToShow = (id: string) => router.push(claimRoutes.show(companyId, id));

  /** Acción rápida: sólo envía el estado, así las notas de resolución guardadas no se tocan. */
  const changeStatus = (id: string, status: ClaimStatus) =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set('status', status);
      const result = await updateStatusClaimAction(companyId, id, 'list', initialActionState, formData);
      if (result?.status === 'error') toast.error(result.message ?? 'No se pudo cambiar el estado.');
    });

  return (
    <PageShell
      title="Reclamos"
      subtitle={`${meta.total} reclamo${meta.total !== 1 ? 's' : ''} registrado${meta.total !== 1 ? 's' : ''}`}
      actions={
        can(CLAIM_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(claimRoutes.create(companyId))}
          >
            <Plus />
            Nuevo reclamo
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-q">Buscar</Label>
            <Input
              id="filter-q"
              value={filters.q ?? ''}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Código, asunto o descripción..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: ALL, label: 'Todos' },
                ...CLAIM_STATUSES.map((status) => ({ value: status, label: CLAIM_STATUS_LABELS[status] })),
              ]}
              value={filters.status ?? ALL}
              onChange={(value) =>
                setFilters({ ...filters, status: !value || value === ALL ? undefined : (value as ClaimStatus) })
              }
              placeholder="Todos"
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-channel">Canal</Label>
            <SearchableSelect
              id="filter-channel"
              options={[
                { value: ALL, label: 'Todos' },
                ...CLAIM_CHANNELS.map((channel) => ({ value: channel, label: CLAIM_CHANNEL_LABELS[channel] })),
              ]}
              value={filters.channel ?? ALL}
              onChange={(value) =>
                setFilters({ ...filters, channel: !value || value === ALL ? undefined : (value as ClaimChannel) })
              }
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
          <ListGridHeadCell>Canal</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Fecha</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {items.map((claim) => (
            <ListGridRow key={claim.id} columns={COLUMNS} onClick={() => goToShow(claim.id)}>
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{claim.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border">
                  <MessageSquareWarning className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{claim.client?.name ?? '—'}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{claim.subject}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13.5px] font-semibold">{CLAIM_CHANNEL_LABELS[claim.channel]}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={claimStatusPill(claim.status)}>{CLAIM_STATUS_LABELS[claim.status]}</StatusPill>
              </div>
              <div className="hidden lg:block">
                <span className="text-muted-foreground text-[13.5px] tabular-nums">{formatDate(claim.createdAt)}</span>
              </div>
              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => goToShow(claim.id)}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {!claim.isClosed && can(CLAIM_PERMISSIONS.UPDATE) && (
                      <DropdownMenuItem onSelect={() => router.push(claimRoutes.edit(companyId, claim.id))}>
                        <Pencil className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {!claim.isClosed &&
                      can(CLAIM_PERMISSIONS.UPDATE_STATUS) &&
                      CLAIM_STATUSES.filter((status) => status !== claim.status).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          disabled={pending}
                          onSelect={() => changeStatus(claim.id, status)}
                        >
                          Marcar como {CLAIM_STATUS_LABELS[status].toLowerCase()}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {items.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={items.length} total={meta.total} noun="reclamo">
          <ListPagination meta={meta} href={(query) => claimRoutes.index(companyId, query)} />
        </ListFooter>
      </ListGrid>
    </PageShell>
  );
}
