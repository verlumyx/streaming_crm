import { roundHalfAwayFromZero } from '@/modules/shared/math';
import type { TransactionRow } from '@/modules/transaction/models/transaction.model';
import type { TransactionRepository, TransactionSummary } from '@/modules/transaction/repositories/transaction.repository';
import { SearchTransactionCommand } from '@/modules/transaction/commands/search-transaction.command';

export type IncomeExpenseSummary = TransactionSummary & { balance: number };

/** Ingresos y gastos: movements in a date range plus income / expense / balance totals. */
export class IncomeExpenseReportService {
  constructor(private readonly ledger: Pick<TransactionRepository, 'search' | 'summarize'>) {}

  async execute(
    companyId: string,
    range: { dateFrom: string; dateTo: string },
    limit: number,
    offset: number,
  ): Promise<{ data: TransactionRow[]; total: number; summary: IncomeExpenseSummary }> {
    const filters = { dateFrom: range.dateFrom, dateTo: range.dateTo };
    const [page, totals] = await Promise.all([
      this.ledger.search(new SearchTransactionCommand({ companyId, filters, limit, offset })),
      this.ledger.summarize(companyId, filters),
    ]);
    return {
      ...page,
      summary: { ...totals, balance: roundHalfAwayFromZero(totals.totalIncome - totals.totalExpense, 2) },
    };
  }
}
