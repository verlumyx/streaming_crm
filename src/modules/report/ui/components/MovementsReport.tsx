'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/page-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
            <SearchableSelect
              id="filter-type"
              options={[{ value: 'todos', label: 'Todos' }, ...catalog.types]}
              value={filters.type ?? 'todos'}
              onChange={(v) => setFilters({ ...filters, type: !v || v === 'todos' ? undefined : v })}
              placeholder="Tipo"
              emptyText="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-category">Categoría</Label>
            <SearchableSelect
              id="filter-category"
              options={[{ value: 'todas', label: 'Todas' }, ...catalog.categories]}
              value={filters.category ?? 'todas'}
              onChange={(v) => setFilters({ ...filters, category: !v || v === 'todas' ? undefined : v })}
              placeholder="Categoría"
              searchPlaceholder="Buscar categoría..."
              emptyText="Sin resultados"
            />
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
