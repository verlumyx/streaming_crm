import { and, asc, count, countDistinct, desc, eq, isNull, notInArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { sales } from '@/modules/sale/models/sale.model';
import { services } from '@/modules/service/models/service.model';
import { plans } from '@/modules/plan/models/plan.model';
import type {
  ServicePlanGroupRow,
  ServicePlanReportFilters,
  ServicePlanReportRepository,
  ServicePlanTotals,
} from './service-plan-report.repository';

export class DrizzleServicePlanReportRepository implements ServicePlanReportRepository {
  constructor(private readonly db: DbExecutor) {}

  private where(companyId: string, f: ServicePlanReportFilters) {
    return and(
      eq(sales.companyId, companyId),
      isNull(sales.deletedAt),
      sql`(${sales.createdAt})::date >= ${f.dateFrom}`,
      sql`(${sales.createdAt})::date <= ${f.dateTo}`,
      f.serviceId ? eq(sales.serviceId, f.serviceId) : undefined,
      // Without an explicit status only approved sales count: pending / rejected ones were never paid.
      f.status ? eq(sales.status, f.status) : notInArray(sales.status, ['pending', 'rejected']),
      f.capacity ? eq(sales.capacity, f.capacity) : undefined,
    );
  }

  async totals(companyId: string, f: ServicePlanReportFilters): Promise<ServicePlanTotals> {
    const [row] = await this.db
      .select({
        totalSales: count(),
        totalRevenue: sql<string>`coalesce(sum(${sales.price}), 0)`,
        profileCount: sql<number>`count(*) filter (where ${sales.capacity} = 'profile')`.mapWith(Number),
        fullAccountCount: sql<number>`count(*) filter (where ${sales.capacity} = 'full_account')`.mapWith(Number),
      })
      .from(sales)
      .where(this.where(companyId, f));
    return { ...row, totalRevenue: Number(row.totalRevenue) };
  }

  async groupCount(companyId: string, f: ServicePlanReportFilters): Promise<number> {
    const column = f.groupBy === 'plan' ? sales.planId : sales.serviceId;
    const [row] = await this.db.select({ total: countDistinct(column) }).from(sales).where(this.where(companyId, f));
    return row.total;
  }

  async groups(companyId: string, f: ServicePlanReportFilters): Promise<ServicePlanGroupRow[]> {
    const revenue = sql<string>`coalesce(sum(${sales.price}), 0)`;
    const where = this.where(companyId, f);

    if (f.groupBy === 'plan') {
      const rows = await this.db
        .select({
          id: plans.id,
          code: plans.code,
          name: plans.name,
          salePrice: plans.salePrice,
          roiTargetPct: plans.roiTargetPct,
          salesCount: count(),
          revenue,
        })
        .from(sales)
        .innerJoin(plans, eq(plans.id, sales.planId))
        .where(where)
        .groupBy(plans.id, plans.code, plans.name, plans.salePrice, plans.roiTargetPct)
        .orderBy(desc(revenue), asc(plans.name))
        .limit(f.limit)
        .offset(f.offset);
      return rows.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
        salePrice: Number(r.salePrice),
        roiTargetPct: Number(r.roiTargetPct),
      }));
    }

    const rows = await this.db
      .select({ id: services.id, code: services.code, name: services.name, salesCount: count(), revenue })
      .from(sales)
      .innerJoin(services, eq(services.id, sales.serviceId))
      .where(where)
      .groupBy(services.id, services.code, services.name)
      .orderBy(desc(revenue), asc(services.name))
      .limit(f.limit)
      .offset(f.offset);
    return rows.map((r) => ({ ...r, revenue: Number(r.revenue) }));
  }
}
