'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, Loader2, RefreshCw, Repeat, Wallet } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { decimal, formatDate } from '@/lib/format';
import { usePermission } from '@/modules/shared/auth/company-context';
import { SALE_PERMISSIONS } from '@/modules/sale/permissions';
import type { SaleDto } from '@/modules/sale/serializers/sale.serializer';
import { SaleRenewDialog } from '@/modules/sale/ui/components/SaleRenewDialog';
import { reportRoutes } from '@/modules/report/routes';
import type { ExpirationSummaryDto, ReportMeta } from '@/modules/report/serializers/report.serializer';
import type { ExpirationStatusFilter } from '@/modules/report/validation/expirations-report.schema';
import { ReportFilterActions } from './ReportFilterActions';
import { ReportSummaryCard } from './ReportSummaryCard';

export type ExpirationFilters = {
  days: number;
  status: ExpirationStatusFilter;
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  agentId?: string;
};

type Option = { id: string; name: string };

type Props = {
  companyId: string;
  searched: boolean;
  sales: SaleDto[];
  summary: ExpirationSummaryDto;
  services: Option[];
  agents: Option[];
  meta: ReportMeta;
  filters: ExpirationFilters;
};

function remainingLabel(days: number): string {
  if (days === 0) return 'Hoy';
  if (days < 0) return `Vencida hace ${Math.abs(days)} d`;
  return `En ${days} d`;
}

export function ExpirationReport({ companyId, searched, sales, summary, services, agents, meta, filters: initial }: Props) {
  const router = useRouter();
  const { can } = usePermission();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ExpirationFilters>(initial);
  const [renewSale, setRenewSale] = useState<SaleDto | null>(null);

  const currentUrl = reportRoutes.expirations(companyId, { ...initial, searched: 1 });
  const search = () => startTransition(() => router.push(reportRoutes.expirations(companyId, { ...filters, searched: 1 })));
  const clear = () => startTransition(() => router.push(reportRoutes.expirations(companyId)));
  const canRenew = can(SALE_PERMISSIONS.RENEW);

  return (
    <PageShell title="Reporte de Vencimientos" subtitle="Ventas próximas a vencer y vencidas sin renovar">
      {searched && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportSummaryCard icon={CalendarClock} iconClassName="text-warn" title="Por vencer" value={summary.expiringCount} sub={`${decimal(summary.expiringAmount)} en juego`} />
          <ReportSummaryCard icon={AlertTriangle} iconClassName="text-bad" valueClassName="text-bad" title="Vencidas" value={summary.expiredCount} sub="sin renovar" />
          <ReportSummaryCard icon={Wallet} valueClassName="text-bad" title="Por cobrar" value={decimal(summary.expiredAmount)} sub="Base de vencidas" />
          <ReportSummaryCard icon={Repeat} iconClassName="text-ok" valueClassName="text-ok" title="Tasa de renovación" value={`${summary.renewalRate.toFixed(1)}%`} sub="Renovadas ÷ vencidas" />
        </div>
      )}

      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <SearchableSelect
              id="filter-status"
              options={[
                { value: 'expiring', label: 'Por vencer' },
                { value: 'expired', label: 'Vencidas' },
                { value: 'all', label: 'Todas' },
              ]}
              value={filters.status}
              onChange={(v) => v && setFilters({ ...filters, status: v as ExpirationStatusFilter })}
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-days">Próximos días</Label>
            <SearchableSelect
              id="filter-days"
              options={[
                { value: '7', label: '7 días' },
                { value: '15', label: '15 días' },
                { value: '30', label: '30 días' },
              ]}
              value={String(filters.days)}
              onChange={(v) => v && setFilters({ ...filters, days: Number(v) })}
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-service">Servicio</Label>
            <SearchableSelect
              id="filter-service"
              options={[{ value: 'all', label: 'Todos' }, ...services.map((s) => ({ value: s.id, label: s.name }))]}
              value={filters.serviceId ?? 'all'}
              onChange={(v) => setFilters({ ...filters, serviceId: !v || v === 'all' ? undefined : v })}
              placeholder="Todos"
              searchPlaceholder="Buscar servicio..."
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-agent">Agente</Label>
            <SearchableSelect
              id="filter-agent"
              options={[{ value: 'all', label: 'Todos' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
              value={filters.agentId ?? 'all'}
              onChange={(v) => setFilters({ ...filters, agentId: !v || v === 'all' ? undefined : v })}
              placeholder="Todos"
              searchPlaceholder="Buscar vendedor..."
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Desde (vencimiento)</Label>
            <Input id="filter-date-from" type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Hasta (vencimiento)</Label>
            <Input id="filter-date-to" type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })} />
          </div>
        </div>
        <ReportFilterActions pending={pending} onSearch={search} onClear={clear} />
      </div>

      <Card className="relative overflow-hidden rounded-2xl py-0">
        {pending && (
          <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="whitespace-nowrap">Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio / Plan</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="whitespace-nowrap">Vencimiento</TableHead>
              <TableHead className="whitespace-nowrap">Restantes</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => {
              const isExpired = sale.status === 'expired';
              const isUrgent = sale.status === 'active' && sale.daysUntilExpiration >= 0 && sale.daysUntilExpiration <= 3;
              return (
                <TableRow
                  key={sale.id}
                  className={isExpired ? 'bg-bad-soft/40 hover:bg-bad-soft/60' : isUrgent ? 'bg-warn-soft/60 hover:bg-warn-soft' : undefined}
                >
                  <TableCell className="font-semibold whitespace-nowrap tabular-nums">{sale.code}</TableCell>
                  <TableCell>{sale.client?.name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.service?.name ?? '—'}</div>
                    <div className="text-muted-foreground text-xs">{sale.plan?.name ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold whitespace-nowrap tabular-nums">{decimal(sale.price)}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <div className="flex items-center gap-2">
                      {formatDate(sale.endDate)}
                      {sale.isInGracePeriod && (
                        <span className="bg-warn-soft text-warn inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold">Gracia</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap tabular-nums ${
                      sale.daysUntilExpiration < 0 ? 'text-bad font-semibold' : isUrgent ? 'text-warn font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {remainingLabel(sale.daysUntilExpiration)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sale.agent?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={!sale.canBeRenewed || !canRenew} onClick={() => setRenewSale(sale)}>
                      <RefreshCw className="mr-1.5 size-3.5" />
                      Renovar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {sales.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-muted-foreground p-12 text-center text-sm">
                  {searched
                    ? 'Sin vencimientos para los filtros seleccionados.'
                    : 'Aplica los filtros y presiona Buscar para ver los vencimientos.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {sales.length > 0 && (
          <div className="text-muted-foreground border-t px-5 py-3.5 text-[13px] font-semibold">
            {sales.length} de {meta.total} venta{meta.total !== 1 ? 's' : ''}
          </div>
        )}
      </Card>

      <SaleRenewDialog companyId={companyId} sale={renewSale} onClose={() => setRenewSale(null)} returnTo={currentUrl} />
    </PageShell>
  );
}
