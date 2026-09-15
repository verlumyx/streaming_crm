import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createTransactionContainer } from '@/modules/transaction/container';
import { DrizzleManualTransactionRepository } from './repositories/drizzle-manual-transaction.repository';
import { ManualTransactionCreateService } from './services/manual-transaction-create.service';
import { ManualTransactionApproveService } from './services/manual-transaction-approve.service';
import { ManualTransactionCancelService } from './services/manual-transaction-cancel.service';
import { ManualTransactionFindService } from './services/manual-transaction-find.service';
import { ManualTransactionSearchService } from './services/manual-transaction-search.service';

export function createManualTransactionContainer(db: DbExecutor) {
  const repository = new DrizzleManualTransactionRepository(db); // the ONLY place the concrete repository is named
  const ledger = createTransactionContainer(db).repository; // same executor: ledger rows commit with the approval

  return {
    repository,
    createService: new ManualTransactionCreateService(repository),
    approveService: new ManualTransactionApproveService(repository, ledger),
    cancelService: new ManualTransactionCancelService(repository),
    findService: new ManualTransactionFindService(repository),
    searchService: new ManualTransactionSearchService(repository),
  };
}
