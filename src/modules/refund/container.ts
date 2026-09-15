import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createSaleContainer } from '@/modules/sale/container';
import { createTransactionContainer } from '@/modules/transaction/container';
import { DrizzleRefundRepository } from './repositories/drizzle-refund.repository';
import { RefundCreateService } from './services/refund-create.service';
import { RefundUpdateService } from './services/refund-update.service';
import { RefundApproveService } from './services/refund-approve.service';
import { RefundRejectService } from './services/refund-reject.service';
import { RefundFindService } from './services/refund-find.service';
import { RefundSearchService } from './services/refund-search.service';
import { RefundCreateFormService } from './services/refund-create-form.service';

export function createRefundContainer(db: DbExecutor) {
  const repository = new DrizzleRefundRepository(db); // the ONLY place the concrete repository is named
  // Same executor: the sale cancellation and the ledger expense commit with the approval.
  const sales = createSaleContainer(db).repository;
  const ledger = createTransactionContainer(db).repository;

  return {
    repository,
    createService: new RefundCreateService(repository, sales),
    updateService: new RefundUpdateService(repository),
    approveService: new RefundApproveService(repository, sales, ledger),
    rejectService: new RefundRejectService(repository),
    findService: new RefundFindService(repository, ledger),
    searchService: new RefundSearchService(repository),
    createFormService: new RefundCreateFormService(repository),
  };
}
