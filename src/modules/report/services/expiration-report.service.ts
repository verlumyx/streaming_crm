import { addDays } from '@/lib/format';
import { roundHalfAwayFromZero } from '@/modules/shared/math';
import type { SaleListItem, SaleRepository } from '@/modules/sale/repositories/sale.repository';
import { SearchSaleCommand, type SaleSearchFilters } from '@/modules/sale/commands/search-sale.command';
import type { ExpirationReportRepository } from '../repositories/expiration-report.repository';
import type { ExpirationStatusFilter } from '../validation/expirations-report.schema';
import type { ExpirationSummaryDto } from '../serializers/report.serializer';

export type ExpirationReportFilters = {
  days: number;
  status: ExpirationStatusFilter;
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  agentId?: string;
};

/**
 * Vencimientos: sales about to expire or expired without renewal (most urgent first), plus the summary cards.
 * "Por vencer" looks forward (today → today + days, or the explicit range); expired totals and the renewal rate
 * use the explicit range when given, or all history.
 */
export class ExpirationReportService {
  constructor(
    private readonly sales: Pick<SaleRepository, 'search'>,
    private readonly repository: ExpirationReportRepository,
  ) {}

  async execute(
    companyId: string,
    f: ExpirationReportFilters,
    today: string,
    limit: number,
    offset: number,
  ): Promise<{ data: SaleListItem[]; total: number; summary: ExpirationSummaryDto }> {
    const expiringFrom = f.dateFrom ?? today;
    const expiringTo = f.dateTo ?? addDays(today, f.days);

    const listFilters: SaleSearchFilters = { serviceId: f.serviceId, agentId: f.agentId };
    if (f.status === 'expiring') {
      Object.assign(listFilters, { status: 'active', endDateFrom: expiringFrom, endDateTo: expiringTo });
    } else if (f.status === 'expired') {
      Object.assign(listFilters, { status: 'expired', endDateFrom: f.dateFrom, endDateTo: f.dateTo });
    } else {
      Object.assign(listFilters, { statusIn: 'active,expired', endDateFrom: f.dateFrom, endDateTo: f.dateTo });
    }

    const [page, totals] = await Promise.all([
      this.sales.search(new SearchSaleCommand({ companyId, filters: listFilters, limit, offset, today, orderBy: 'endDate' })),
      this.repository.totals(companyId, {
        expiringFrom,
        expiringTo,
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        serviceId: f.serviceId,
        agentId: f.agentId,
      }),
    ]);

    const base = totals.renewedCount + totals.expiredCount;
    return {
      ...page,
      summary: {
        expiringCount: totals.expiringCount,
        expiringAmount: totals.expiringAmount,
        expiredCount: totals.expiredCount,
        expiredAmount: totals.expiredAmount,
        renewalRate: base > 0 ? roundHalfAwayFromZero((totals.renewedCount / base) * 100, 2) : 0,
      },
    };
  }
}
