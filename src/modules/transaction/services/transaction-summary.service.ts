import type { TransactionRepository, TransactionSummary } from '../repositories/transaction.repository';
import type { TransactionSearchFilters } from '../commands/search-transaction.command';

/** Income vs expense totals (income-expenses report). `balance = income − expense`. */
export class TransactionSummaryService {
  constructor(private readonly repository: TransactionRepository) {}

  async execute(
    companyId: string,
    filters: TransactionSearchFilters,
  ): Promise<TransactionSummary & { balance: number }> {
    const summary = await this.repository.summarize(companyId, filters);
    return { ...summary, balance: Math.round((summary.totalIncome - summary.totalExpense) * 100) / 100 };
  }
}
