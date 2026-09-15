import type { Metadata } from 'next';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { transactionCatalog } from '@/modules/transaction/models/transaction.model';
import { toTransactionDto } from '@/modules/transaction/serializers/transaction.serializer';
import { shiftMonth } from '@/modules/dashboard/domain/months';
import { REPORT_PERMISSIONS } from '@/modules/report/permissions';
import { createReportContainer } from '@/modules/report/container';
import { incomeExpenseReportSchema } from '@/modules/report/validation/income-expense-report.schema';
import { EMPTY_INCOME_EXPENSE_SUMMARY, meta } from '@/modules/report/serializers/report.serializer';
import { IncomeExpenseReport } from '@/modules/report/ui/components/IncomeExpenseReport';

export const metadata: Metadata = { title: 'Ingresos y Gastos' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Ingresos y gastos. Range defaults to the first day of the month → today. Doesn't query until `?searched=1`. */
export default async function IncomeExpensesReportPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REPORT_PERMISSIONS.INCOME_EXPENSES);

  const input = incomeExpenseReportSchema.parse(await searchParams);
  const today = todayIsoDate();
  const range = { dateFrom: input.dateFrom ?? shiftMonth(today, 0).from, dateTo: input.dateTo ?? today };

  const result = input.searched
    ? await createReportContainer(db).incomeExpenseService.execute(companyId, range, input.limit, input.offset)
    : { data: [], total: 0, summary: EMPTY_INCOME_EXPENSE_SUMMARY };

  return (
    <IncomeExpenseReport
      companyId={companyId}
      searched={input.searched}
      movements={result.data.map(toTransactionDto)}
      summary={result.summary}
      meta={meta(result.total, input.limit, input.offset)}
      filters={range}
      catalog={transactionCatalog()}
    />
  );
}
