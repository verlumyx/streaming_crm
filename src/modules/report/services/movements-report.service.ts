import type { TransactionRow } from '@/modules/transaction/models/transaction.model';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import {
  SearchTransactionCommand,
  type TransactionSearchFilters,
} from '@/modules/transaction/commands/search-transaction.command';

/** Movimientos: paginated ledger with type / category / date filters. */
export class MovementsReportService {
  constructor(private readonly ledger: Pick<TransactionRepository, 'search'>) {}

  execute(
    companyId: string,
    filters: TransactionSearchFilters,
    limit: number,
    offset: number,
  ): Promise<{ data: TransactionRow[]; total: number }> {
    return this.ledger.search(new SearchTransactionCommand({ companyId, filters, limit, offset }));
  }
}
