import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleTransactionRepository } from './repositories/drizzle-transaction.repository';
import { TransactionRecordService } from './services/transaction-record.service';
import { TransactionSearchService } from './services/transaction-search.service';
import { TransactionSummaryService } from './services/transaction-summary.service';

/**
 * The ledger has no pages of its own. Other modules wire `repository` (typed as the `TransactionRepository`
 * interface) into their services from their own container, passing the same `tx`.
 */
export function createTransactionContainer(db: DbExecutor) {
  const repository = new DrizzleTransactionRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    recordService: new TransactionRecordService(repository),
    searchService: new TransactionSearchService(repository),
    summaryService: new TransactionSummaryService(repository),
  };
}
