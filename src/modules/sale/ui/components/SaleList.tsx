'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Eye, MoreHorizontal, Plus, RefreshCw, RotateCcw, Search, ShoppingCart } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clp, formatDate } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import type { SaleStatus } from '@/modules/sale/models/sale.model';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import { saleRoutes } from '@/modules/sale/routes';
import { SALE_STATUS_LABELS, saleStatusPill } from '@/modules/sale/ui/sale-labels';
import type {
  SaleAgentOptionDto,
  SaleClientOptionDto,
  SaleDto,
  SaleServiceOptionDto,
} from '@/modules/sale/serializers/sale.serializer';
import type { SaleFilters, SaleMeta } from '../types/Sale';
import { SaleCancelDialog } from './SaleCancelDialog';
import { SaleRenewDialog } from './SaleRenewDialog';

const COLUMNS = 'lg:grid-cols-[0.9fr_2fr_1.2fr_1fr_1fr_0.9fr_0.7fr]';
const EXPIRING_SOON_DAYS = 7;
const ALL = 'all';
const STATUSES = Object.keys(SALE_STATUS_LABELS) as SaleStatus[];

type Props = {
  companyId: string;
  sales: SaleDto[];
  meta: SaleMeta;
  filters: SaleFilters;
  clients: SaleClientOptionDto[];
  services: SaleServiceOptionDto[];
  agents: SaleAgentOptionDto[];
};

export function SaleList({ companyId, sales, meta, filters: initialFilters, clients, services, agents }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [filters, setFilters] = useState<SaleFilters>(initialFilters);
  const [renewSale, setRenewSale] = useState<SaleDto | null>(null);
  const [cancelSale, setCancelSale] = useState<SaleDto | null>(null);

  const setFilter = (key: keyof SaleFilters, value: string | undefined) =>
    setFilters((prev) => ({ ...prev, [key]: value === ALL ? undefined : value }));

  const applyFilters = (next: SaleFilters = filters) => router.push(saleRoutes.index(companyId, next));

  const clearFilters = () => {
    setFilters({});
    router.push(saleRoutes.index(companyId));
  };

  const selects: Array<{ key: 'status' | 'clientId' | 'serviceId' | 'agentId'; label: string; options: { value: string; label: string }[] }> = [
    { key: 'status', label: 'Estado', options: STATUSES.map((s) => ({ value: s, label: SALE_STATUS_LABELS[s] })) },
    { key: 'clientId', label: 'Cliente', options: clients.map((c) => ({ value: c.id, label: c.name })) },
    { key: 'serviceId', label: 'Servicio', options: services.map((s) => ({ value: s.id, label: s.name })) },
    { key: 'agentId', label: 'Agente', options: agents.map((a) => ({ value: a.id, label: a.name })) },
  ];

  return (
    <PageShell
      title="Ventas"
      subtitle={`${meta.total} venta${meta.total !== 1 ? 's' : ''} registrada${meta.total !== 1 ? 's' : ''}`}
      actions={
        can(SALE_PERMISSIONS.CREATE) && (
          <Button
            className="h-10 rounded-[11px] px-4 font-semibold shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
            onClick={() => router.push(saleRoutes.create(companyId))}
          >
            <Plus />
            Nueva venta
          </Button>
        )
      }
    >
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-code">Código</Label>
            <Input
              id="filter-code"
              placeholder="Buscar por código..."
              value={filters.code ?? ''}
              onChange={(e) => setFilter('code', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          {selects.map(({ key, label, options }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`filter-${key}`}>{label}</Label>
              <Select value={(filters[key] as string | undefined) ?? ALL} onValueChange={(value) => setFilter(key, value)}>
                <SelectTrigger id={`filter-${key}`} className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Inicio desde</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilter('dateFrom', e.target.value || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Inicio hasta</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilter('dateTo', e.target.value || undefined)}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium">
              <Checkbox
                checked={Boolean(filters.expiringSoon)}
                onCheckedChange={(checked) =>
                  setFilter('expiringSoon', checked === true ? String(EXPIRING_SOON_DAYS) : undefined)
                }
              />
              Por vencer ({EXPIRING_SOON_DAYS} días)
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => applyFilters()}>
            <Search className="mr-2 size-4" />
            Buscar
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      <ListGrid>
        <ListGridHeader columns={COLUMNS}>
          <ListGridHeadCell>Código</ListGridHeadCell>
          <ListGridHeadCell>Cliente</ListGridHeadCell>
          <ListGridHeadCell>Servicio</ListGridHeadCell>
          <ListGridHeadCell>Estado</ListGridHeadCell>
          <ListGridHeadCell>Vence</ListGridHeadCell>
          <ListGridHeadCell>Precio</ListGridHeadCell>
          <ListGridHeadCell align="right">Acciones</ListGridHeadCell>
        </ListGridHeader>
        <ListGridBody>
          {sales.map((sale) => (
            <ListGridRow key={sale.id} columns={COLUMNS} onClick={() => router.push(saleRoutes.show(companyId, sale.id))}>
              <div className="hidden lg:block">
                <span className="text-muted-foreground font-semibold tabular-nums">{sale.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-[11px] border">
                  <ShoppingCart className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{sale.client?.name ?? '—'}</span>
                  <span className="text-muted-foreground truncate text-[12.5px]">{sale.plan?.name ?? '—'}</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <span className="text-[13.5px] font-semibold">{sale.service?.name ?? '—'}</span>
              </div>
              <div className="hidden lg:block">
                <StatusPill kind={saleStatusPill(sale.status)}>{SALE_STATUS_LABELS[sale.status]}</StatusPill>
              </div>
              <div className="hidden lg:block">
                <span className="font-semibold tabular-nums">{formatDate(sale.endDate)}</span>
              </div>
              <div className="hidden lg:block">
                <span className="font-bold tabular-nums">{clp(sale.price)}</span>
              </div>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="bg-card rounded-[10px]" aria-label="Opciones">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(saleRoutes.show(companyId, sale.id))}>
                      <Eye className="mr-2 size-4" />
                      Ver
                    </DropdownMenuItem>
                    {sale.canBeRenewed && can(SALE_PERMISSIONS.RENEW) && (
                      <DropdownMenuItem onSelect={() => setRenewSale(sale)}>
                        <RefreshCw className="mr-2 size-4" />
                        Renovar
                      </DropdownMenuItem>
                    )}
                    {sale.canBeReactivated && can(SALE_PERMISSIONS.REACTIVATE) && (
                      <DropdownMenuItem onSelect={() => router.push(saleRoutes.show(companyId, sale.id))}>
                        <RotateCcw className="mr-2 size-4" />
                        Reactivar
                      </DropdownMenuItem>
                    )}
                    {sale.status !== 'cancelled' && can(SALE_PERMISSIONS.CANCEL) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setCancelSale(sale)}>
                          <Ban className="mr-2 size-4" />
                          Expulsar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ListGridRow>
          ))}
          {sales.length === 0 && (
            <div className="text-muted-foreground p-12 text-center text-sm">Sin resultados para tu búsqueda.</div>
          )}
        </ListGridBody>
        <ListFooter shown={sales.length} total={meta.total} noun="venta" />
      </ListGrid>

      <SaleRenewDialog companyId={companyId} sale={renewSale} onClose={() => setRenewSale(null)} />
      <SaleCancelDialog companyId={companyId} sale={cancelSale} onClose={() => setCancelSale(null)} />
    </PageShell>
  );
}
