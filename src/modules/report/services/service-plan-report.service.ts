import { roundHalfAwayFromZero } from '@/modules/shared/math';
import type {
  ServicePlanReportFilters,
  ServicePlanReportRepository,
} from '../repositories/service-plan-report.repository';
import type { ServicePlanRowDto, ServicePlanSummaryDto } from '../serializers/report.serializer';

/** Servicio / Plan: sales grouped by service or plan with revenue share, average ticket and the top group. */
export class ServicePlanReportService {
  constructor(private readonly repository: ServicePlanReportRepository) {}

  async execute(
    companyId: string,
    filters: ServicePlanReportFilters,
  ): Promise<{ rows: ServicePlanRowDto[]; summary: ServicePlanSummaryDto; total: number }> {
    const [totals, total, groups, top] = await Promise.all([
      this.repository.totals(companyId, filters),
      this.repository.groupCount(companyId, filters),
      this.repository.groups(companyId, filters),
      this.repository.groups(companyId, { ...filters, limit: 1, offset: 0 }),
    ]);

    const rows = groups.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      salesCount: g.salesCount,
      revenue: g.revenue,
      avgTicket: g.salesCount > 0 ? roundHalfAwayFromZero(g.revenue / g.salesCount, 2) : 0,
      revenuePct: totals.totalRevenue > 0 ? roundHalfAwayFromZero((g.revenue / totals.totalRevenue) * 100, 2) : 0,
      ...(filters.groupBy === 'plan' ? { salePrice: g.salePrice ?? null, roiTargetPct: g.roiTargetPct ?? null } : {}),
    }));

    return {
      rows,
      total,
      summary: {
        totalSales: totals.totalSales,
        totalRevenue: totals.totalRevenue,
        avgTicket: totals.totalSales > 0 ? roundHalfAwayFromZero(totals.totalRevenue / totals.totalSales, 2) : 0,
        profileCount: totals.profileCount,
        fullAccountCount: totals.fullAccountCount,
        topLabel: top[0]?.name ?? null,
      },
    };
  }
}
