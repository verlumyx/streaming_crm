import type { TransactionRow } from '../models/transaction.model';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { SearchTransactionCommand } from '../commands/search-transaction.command';

/** Movements report / ledger listing. */
export class TransactionSearchService {
  constructor(private readonly repository: TransactionRepository) {}

  execute(command: SearchTransactionCommand): Promise<{ data: TransactionRow[]; total: number }> {
    return this.repository.search(command);
  }
}
