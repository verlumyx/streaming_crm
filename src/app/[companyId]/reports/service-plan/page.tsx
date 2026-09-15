import type { Metadata } from 'next';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { guardPage } from '@/modules/shared/auth/require-permission';
import { shiftMonth } from '@/modules/dashboard/domain/months';
import { REPORT_PERMISSIONS } from '@/modules/report/permissions';
import { createReportContainer } from '@/modules/report/container';
import { servicePlanReportSchema } from '@/modules/report/validation/service-plan-report.schema';
import { EMPTY_SERVICE_PLAN_SUMMARY, meta } from '@/modules/report/serializers/report.serializer';
import { ServicePlanReport } from '@/modules/report/ui/components/ServicePlanReport';

export const metadata: Metadata = { title: 'Reporte por Servicio / Plan' };

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Servicio / Plan. Range (on the sale's creation date) defaults to the current month. Doesn't query until `?searched=1`. */
export default async function ServicePlanReportPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  await guardPage(companyId, REPORT_PERMISSIONS.SERVICE_PLAN);

  const { searched, limit, offset, dateFrom, dateTo, ...rest } = servicePlanReportSchema.parse(await searchParams);
  const today = todayIsoDate();
  const filters = { ...rest, dateFrom: dateFrom ?? shiftMonth(today, 0).from, dateTo: dateTo ?? today };

  const result = searched
    ? await createReportContainer(db).servicePlanService.execute(companyId, { ...filters, limit, offset })
    : { rows: [], summary: EMPTY_SERVICE_PLAN_SUMMARY, total: 0 };

  return (
    <ServicePlanReport
      companyId={companyId}
      searched={searched}
      rows={result.rows}
      summary={result.summary}
      meta={meta(result.total, limit, offset)}
      filters={filters}
    />
  );
}
