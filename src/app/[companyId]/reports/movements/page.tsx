import type { Metadata } from 'next';
import { db } from '@/db/client';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { transactionCatalog } from '@/modules/transaction/models/transaction.model';
import { toTransactionDto } from '@/modules/transaction/serializers/transaction.serializer';
import { REPORT_PERMISSIONS } from '@/modules/report/permissions';
import { createReportContainer } from '@/modules/report/container';
import { movementsReportSchema } from '@/modules/report/validation/movements-report.schema';
import { meta } from '@/modules/report/serializers/report.serializer';
import { MovementsReport } from '@/modules/report/ui/components/MovementsReport';

export const metadata: Metadata = { title: 'Movimientos' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Movimientos. Doesn't query until `?searched=1`. */
export default async function MovementsReportPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REPORT_PERMISSIONS.MOVEMENTS);

  const { searched, limit, offset, ...filters } = movementsReportSchema.parse(await searchParams);
  const result = searched
    ? await createReportContainer(db).movementsService.execute(companyId, filters, limit, offset)
    : { data: [], total: 0 };

  return (
    <MovementsReport
      companyId={companyId}
      searched={searched}
      movements={result.data.map(toTransactionDto)}
      meta={meta(result.total, limit, offset)}
      filters={filters}
      catalog={transactionCatalog()}
    />
  );
}
