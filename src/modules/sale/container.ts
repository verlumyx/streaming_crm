import { salesConfig } from '@/config/sales';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createTransactionContainer } from '@/modules/transaction/container';
import { DrizzleSaleRepository } from './repositories/drizzle-sale.repository';
import { DrizzlePendingRefundWriter } from './repositories/drizzle-pending-refund.writer';
import { SaleCreateService } from './services/sale-create.service';
import { SaleRenewService } from './services/sale-renew.service';
import { SaleReactivateService } from './services/sale-reactivate.service';
import { SaleCancelService } from './services/sale-cancel.service';
import { SaleFindService } from './services/sale-find.service';
import { SaleSearchService } from './services/sale-search.service';
import { SaleListOptionsService } from './services/sale-list-options.service';
import { SaleCreateFormService } from './services/sale-create-form.service';
import { SaleClientSearchService } from './services/sale-client-search.service';
import { SalesExpireService, type SaleTransactionRunner } from './services/sales-expire.service';

export function createSaleContainer(db: DbExecutor, options: { graceDays?: number } = {}) {
  const graceDays = options.graceDays ?? salesConfig.gracePeriodDays;
  const repository = new DrizzleSaleRepository(db); // the ONLY place the concrete repository is named
  const { repository: transactionRepository } = createTransactionContainer(db); // same db | tx
  const refundWriter = new DrizzlePendingRefundWriter(db);
  // Each call opens its own transaction (a savepoint when `db` is already a transaction).
  const runInTransaction: SaleTransactionRunner = (work) => db.transaction((tx) => work(new DrizzleSaleRepository(tx)));

  return {
    repository,
    graceDays,
    createService: new SaleCreateService(repository, transactionRepository),
    renewService: new SaleRenewService(repository, transactionRepository, graceDays),
    reactivateService: new SaleReactivateService(repository, transactionRepository, graceDays),
    cancelService: new SaleCancelService(repository, refundWriter),
    findService: new SaleFindService(repository, transactionRepository, graceDays),
    searchService: new SaleSearchService(repository),
    listOptionsService: new SaleListOptionsService(repository),
    createFormService: new SaleCreateFormService(repository),
    clientSearchService: new SaleClientSearchService(repository),
    expireService: new SalesExpireService(repository, runInTransaction, graceDays),
  };
}
