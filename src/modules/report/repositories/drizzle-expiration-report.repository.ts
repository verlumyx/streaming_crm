import { and, count, countDistinct, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { saleRenewals, sales } from '@/modules/sale/models/sale.model';
import type {
  ExpirationReportRepository,
  ExpirationSummaryFilters,
  ExpirationTotals,
} from './expiration-report.repository';

export class DrizzleExpirationReportRepository implements ExpirationReportRepository {
  constructor(private readonly db: DbExecutor) {}

  async totals(companyId: string, f: ExpirationSummaryFilters): Promise<ExpirationTotals> {
    const scope = [
      eq(sales.companyId, companyId),
      isNull(sales.deletedAt),
      f.serviceId ? eq(sales.serviceId, f.serviceId) : undefined,
      f.agentId ? eq(sales.agentId, f.agentId) : undefined,
    ];
    const amount = sql<string>`coalesce(sum(${sales.price}), 0)`;

    const [[expiring], [expired], [renewed]] = await Promise.all([
      this.db
        .select({ n: count(), amount })
        .from(sales)
        .where(and(...scope, eq(sales.status, 'active'), gte(sales.endDate, f.expiringFrom), lte(sales.endDate, f.expiringTo))),
      this.db
        .select({ n: count(), amount })
        .from(sales)
        .where(
          and(
            ...scope,
            eq(sales.status, 'expired'),
            f.dateFrom ? gte(sales.endDate, f.dateFrom) : undefined,
            f.dateTo ? lte(sales.endDate, f.dateTo) : undefined,
          ),
        ),
      this.db
        .select({ n: countDistinct(saleRenewals.saleId) })
        .from(saleRenewals)
        .innerJoin(sales, eq(sales.id, saleRenewals.saleId))
        .where(
          and(
            ...scope,
            f.dateFrom ? gte(saleRenewals.previousEndDate, f.dateFrom) : undefined,
            f.dateTo ? lte(saleRenewals.previousEndDate, f.dateTo) : undefined,
          ),
        ),
    ]);

    return {
      expiringCount: expiring.n,
      expiringAmount: Number(expiring.amount),
      expiredCount: expired.n,
      expiredAmount: Number(expired.amount),
      renewedCount: renewed.n,
    };
  }
}
