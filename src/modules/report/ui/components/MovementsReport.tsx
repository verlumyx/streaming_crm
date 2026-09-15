'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/page-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TransactionCatalog } from '@/modules/transaction/models/transaction.model';
import type { TransactionDto } from '@/modules/transaction/serializers/transaction.serializer';
import { reportRoutes } from '@/modules/report/routes';
import type { ReportMeta } from '@/modules/report/serializers/report.serializer';
import { LedgerTable } from './LedgerTable';
import { ReportFilterActions } from './ReportFilterActions';

export type MovementsFilters = { type?: string; category?: string; dateFrom?: string; dateTo?: string };

type Props = {
  companyId: string;
  searched: boolean;
  movements: TransactionDto[];
  meta: ReportMeta;
  filters: MovementsFilters;
  catalog: TransactionCatalog;
};

export function MovementsReport({ companyId, searched, movements, meta, filters: initial, catalog }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<MovementsFilters>(initial);

  const search = () => startTransition(() => router.push(reportRoutes.movements(companyId, { ...filters, searched: 1 })));
  const clear = () => {
    setFilters({});
    startTransition(() => router.push(reportRoutes.movements(companyId)));
  };

  return (
    <PageShell title="Movimientos" subtitle="Reporte de ingresos y egresos registrados">
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Desde</Label>
            <Input id="filter-date-from" type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Hasta</Label>
            <Input id="filter-date-to" type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-type">Tipo</Label>
            <Select value={filters.type ?? 'todos'} onValueChange={(v) => setFilters({ ...filters, type: v === 'todos' ? undefined : v })}>
              <SelectTrigger id="filter-type" className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {catalog.types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-category">Categoría</Label>
            <Select value={filters.category ?? 'todas'} onValueChange={(v) => setFilters({ ...filters, category: v === 'todas' ? undefined : v })}>
              <SelectTrigger id="filter-category" className="w-full">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {catalog.categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ReportFilterActions pending={pending} onSearch={search} onClear={clear} />
      </div>

      <LedgerTable
        movements={movements}
        total={meta.total}
        catalog={catalog}
        searched={searched}
        pending={pending}
        emptyText="Sin movimientos para tu búsqueda."
      />
    </PageShell>
  );
}
