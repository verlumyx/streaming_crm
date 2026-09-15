import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardRevenuePointDto } from '../serializers/dashboard.serializer';
import { MONTH_SHORT_LABELS, roundHalfAwayFromZero, shiftMonth } from '../domain/months';

/** Income vs expense for the last 6 calendar months, oldest first, ending in the current month. */
export class DashboardRevenueService {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(companyId: string, today: string): Promise<DashboardRevenuePointDto[]> {
    const windows = Array.from({ length: 6 }, (_, i) => shiftMonth(today, i - 5));
    const totals = await this.repository.monthlyTotals(companyId, windows[0].from);
    const byKey = new Map(totals.map((t) => [t.key, t]));

    return windows.map((w) => {
      const income = byKey.get(w.key)?.income ?? 0;
      const expense = byKey.get(w.key)?.expense ?? 0;
      return {
        month: MONTH_SHORT_LABELS[w.month - 1],
        income,
        expense,
        profit: roundHalfAwayFromZero(income - expense, 2),
      };
    });
  }
}
