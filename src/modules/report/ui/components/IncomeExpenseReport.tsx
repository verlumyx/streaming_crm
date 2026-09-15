'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageShell } from '@/components/page-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { decimal } from '@/lib/format';
import type { TransactionCatalog } from '@/modules/transaction/models/transaction.model';
import type { TransactionDto } from '@/modules/transaction/serializers/transaction.serializer';
import { reportRoutes } from '@/modules/report/routes';
import type { IncomeExpenseSummaryDto, ReportMeta } from '@/modules/report/serializers/report.serializer';
import { LedgerTable } from './LedgerTable';
import { ReportFilterActions } from './ReportFilterActions';
import { ReportSummaryCard } from './ReportSummaryCard';

export type IncomeExpenseFilters = { dateFrom: string; dateTo: string };

type Props = {
  companyId: string;
  searched: boolean;
  movements: TransactionDto[];
  summary: IncomeExpenseSummaryDto;
  meta: ReportMeta;
  filters: IncomeExpenseFilters;
  catalog: TransactionCatalog;
};

export function IncomeExpenseReport({ companyId, searched, movements, summary, meta, filters: initial, catalog }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<IncomeExpenseFilters>(initial);
  const currency = movements[0]?.currency ?? 'USD';
  const plural = (n: number) => `${n} movimiento${n !== 1 ? 's' : ''}`;

  const search = () => startTransition(() => router.push(reportRoutes.incomeExpenses(companyId, { ...filters, searched: 1 })));
  const clear = () => startTransition(() => router.push(reportRoutes.incomeExpenses(companyId)));

  return (
    <PageShell title="Ingresos y Gastos" subtitle="Detalle de movimientos por rango de fechas">
      {searched && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportSummaryCard icon={TrendingUp} iconClassName="text-ok" valueClassName="text-ok" title="Ingresos" value={`${decimal(summary.totalIncome)} ${currency}`} sub={plural(summary.incomeCount)} />
          <ReportSummaryCard icon={TrendingDown} iconClassName="text-bad" valueClassName="text-bad" title="Gastos" value={`${decimal(summary.totalExpense)} ${currency}`} sub={plural(summary.expenseCount)} />
          <ReportSummaryCard
            icon={Wallet}
            title="Balance"
            value={`${decimal(summary.balance)} ${currency}`}
            valueClassName={summary.balance >= 0 ? 'text-ok' : 'text-bad'}
            sub="Ingresos − Gastos"
          />
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
        </div>
        <ReportFilterActions pending={pending} onSearch={search} onClear={clear} />
      </div>

      <LedgerTable
        movements={movements}
        total={meta.total}
        catalog={catalog}
        searched={searched}
        pending={pending}
        emptyText="Sin movimientos para el rango seleccionado."
        signed
      />
    </PageShell>
  );
}
