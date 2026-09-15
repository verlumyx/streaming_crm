import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardMetricsDto } from '../serializers/dashboard.serializer';
import { roundHalfAwayFromZero, shiftMonth } from '../domain/months';
import { DashboardOccupancyService } from './dashboard-occupancy.service';

/** Top cards: month income/expense/profit with trends vs previous month, profiles and receivables. */
export class DashboardMetricsService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(companyId: string, today: string): Promise<DashboardMetricsDto> {
    const current = shiftMonth(today, 0);
    const previous = shiftMonth(today, -1);

    const [incomeMonth, expenseMonth, incomePrev, expensePrev, occupancy, receivables] = await Promise.all([
      this.repository.sumTransactions(companyId, 'income', current.from, current.to),
      this.repository.sumTransactions(companyId, 'expense', current.from, current.to),
      this.repository.sumTransactions(companyId, 'income', previous.from, previous.to),
      this.repository.sumTransactions(companyId, 'expense', previous.from, previous.to),
      new DashboardOccupancyService(this.repository).execute(companyId),
      this.repository.receivables(companyId),
    ]);

    const netProfit = roundHalfAwayFromZero(incomeMonth - expenseMonth, 2);
    const netPrev = incomePrev - expensePrev;

    return {
      incomeMonth,
      expenseMonth,
      netProfit,
      profitMarginPct: incomeMonth > 0 ? roundHalfAwayFromZero((netProfit / incomeMonth) * 100) : 0,
      incomeTrendPct: trend(incomeMonth, incomePrev),
      profitTrendPct: trend(netProfit, netPrev),
      activeProfiles: occupancy.occupied,
      freeProfiles: occupancy.available,
      totalProfiles: occupancy.total,
      receivableAmount: receivables.amount,
      receivableClients: receivables.clients,
    };
  }
}

/** % change vs the previous period, or null when it is not comparable (previous ≤ 0). */
function trend(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return roundHalfAwayFromZero(((current - previous) / previous) * 100, 1);
}
