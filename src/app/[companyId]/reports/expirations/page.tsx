import type { Metadata } from 'next';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { createSaleContainer } from '@/modules/sale/container';
import { toSaleDto } from '@/modules/sale/serializers/sale.serializer';
import { REPORT_PERMISSIONS } from '@/modules/report/permissions';
import { createReportContainer } from '@/modules/report/container';
import { expirationsReportSchema } from '@/modules/report/validation/expirations-report.schema';
import { EMPTY_EXPIRATION_SUMMARY, meta } from '@/modules/report/serializers/report.serializer';
import { ExpirationReport } from '@/modules/report/ui/components/ExpirationReport';

export const metadata: Metadata = { title: 'Reporte de Vencimientos' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Vencimientos. Doesn't query until `?searched=1`. The Renovar action reuses the Sale module's dialog. */
export default async function ExpirationsReportPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REPORT_PERMISSIONS.EXPIRATIONS);

  const { searched, limit, offset, ...filters } = expirationsReportSchema.parse(await searchParams);
  const today = todayIsoDate();
  const saleContainer = createSaleContainer(db);

  const [result, options] = await Promise.all([
    searched
      ? createReportContainer(db).expirationService.execute(companyId, filters, today, limit, offset)
      : Promise.resolve({ data: [], total: 0, summary: EMPTY_EXPIRATION_SUMMARY }),
    saleContainer.listOptionsService.execute(companyId),
  ]);

  const context = { today, graceDays: saleContainer.graceDays };

  return (
    <ExpirationReport
      companyId={companyId}
      searched={searched}
      sales={result.data.map((row) => toSaleDto(row, context))}
      summary={result.summary}
      services={options.services.map(({ id, name }) => ({ id, name }))}
      agents={options.agents.map(({ id, name }) => ({ id, name }))}
      meta={meta(result.total, limit, offset)}
      filters={filters}
    />
  );
}
