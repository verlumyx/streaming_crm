'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Award, BarChart3, Layers, Loader2, Users } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { decimal } from '@/lib/format';
import { reportRoutes } from '@/modules/report/routes';
import type { ServicePlanGroup } from '@/modules/report/validation/service-plan-report.schema';
import type { ReportMeta, ServicePlanRowDto, ServicePlanSummaryDto } from '@/modules/report/serializers/report.serializer';
import { ReportFilterActions } from './ReportFilterActions';
import { ReportSummaryCard } from './ReportSummaryCard';

export type ServicePlanFilters = {
  dateFrom: string;
  dateTo: string;
  groupBy: ServicePlanGroup;
  capacity?: string;
  serviceId?: string;
  status?: string;
};

type Props = {
  companyId: string;
  searched: boolean;
  rows: ServicePlanRowDto[];
  summary: ServicePlanSummaryDto;
  meta: ReportMeta;
  filters: ServicePlanFilters;
};

export function ServicePlanReport({ companyId, searched, rows, summary, meta, filters: initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<ServicePlanFilters>(initial);
  const isPlan = initial.groupBy === 'plan';

  const search = () => startTransition(() => router.push(reportRoutes.servicePlan(companyId, { ...filters, searched: 1 })));
  const clear = () => startTransition(() => router.push(reportRoutes.servicePlan(companyId)));

  return (
    <PageShell title="Reporte por Servicio / Plan" subtitle="Desempeño comercial agrupado por servicio o por plan">
      {searched && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportSummaryCard icon={BarChart3} title="Ingreso total" value={decimal(summary.totalRevenue)} valueClassName="text-ok" sub={`${summary.totalSales} venta${summary.totalSales !== 1 ? 's' : ''}`} />
          <ReportSummaryCard icon={Layers} title="Ticket promedio" value={decimal(summary.avgTicket)} sub="Ingreso ÷ ventas" />
          <ReportSummaryCard icon={Users} title="Mix de capacidad" value={`${summary.profileCount} / ${summary.fullAccountCount}`} sub="Perfil / Cuenta completa" />
          <ReportSummaryCard icon={Award} title={isPlan ? 'Plan top' : 'Servicio top'} value={summary.topLabel ?? '—'} sub="Mayor ingreso" />
        </div>
      )}

      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Desde</Label>
            <Input id="filter-date-from" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Hasta</Label>
            <Input id="filter-date-to" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-group-by">Agrupar por</Label>
            <SearchableSelect
              id="filter-group-by"
              options={[
                { value: 'service', label: 'Servicio' },
                { value: 'plan', label: 'Plan' },
              ]}
              value={filters.groupBy}
              onChange={(v) => v && setFilters({ ...filters, groupBy: v as ServicePlanGroup })}
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-capacity">Capacidad</Label>
            <SearchableSelect
              id="filter-capacity"
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'profile', label: 'Perfil' },
                { value: 'full_account', label: 'Cuenta completa' },
              ]}
              value={filters.capacity ?? 'all'}
              onChange={(v) => setFilters({ ...filters, capacity: !v || v === 'all' ? undefined : v })}
              placeholder="Todas"
              emptyText="Sin resultados"
            />
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
              <TableHead>{isPlan ? 'Plan' : 'Servicio'}</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Ingreso total</TableHead>
              <TableHead className="text-right">Ticket prom.</TableHead>
              <TableHead className="text-right">% ingreso</TableHead>
              {isPlan && (
                <>
                  <TableHead className="text-right">Precio plan</TableHead>
                  <TableHead className="text-right">ROI objetivo</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-semibold whitespace-nowrap tabular-nums">{row.code ?? '—'}</TableCell>
                <TableCell>{row.name ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.salesCount}</TableCell>
                <TableCell className="text-ok text-right font-bold whitespace-nowrap tabular-nums">{decimal(row.revenue)}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">{decimal(row.avgTicket)}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">{row.revenuePct.toFixed(1)}%</TableCell>
                {isPlan && (
                  <>
                    <TableCell className="text-muted-foreground text-right whitespace-nowrap tabular-nums">
                      {row.salePrice != null ? decimal(row.salePrice) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {row.roiTargetPct != null ? `${row.roiTargetPct.toFixed(1)}%` : '—'}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isPlan ? 8 : 6} className="text-muted-foreground p-12 text-center text-sm">
                  {searched ? 'Sin ventas para los filtros seleccionados.' : 'Aplica los filtros y presiona Buscar para ver el reporte.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <div className="text-muted-foreground flex items-center justify-between border-t px-5 py-3.5 text-[13px] font-semibold">
            <span>
              {rows.length} de {meta.total} {isPlan ? 'plan' : 'servicio'}
              {meta.total !== 1 ? 'es' : ''}
            </span>
            <span className="tabular-nums">Total: {decimal(summary.totalRevenue)}</span>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
