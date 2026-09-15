import type { ManualTransactionListItem, ManualTransactionRepository } from '../repositories/manual-transaction.repository';
import type { SearchManualTransactionCommand } from '../commands/search-manual-transaction.command';

/** Listar. */
export class ManualTransactionSearchService {
  constructor(private readonly repository: ManualTransactionRepository) {}

  execute(command: SearchManualTransactionCommand): Promise<{ data: ManualTransactionListItem[]; total: number }> {
    return this.repository.search(command);
  }
}
