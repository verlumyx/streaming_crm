import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createTransactionContainer } from '@/modules/transaction/container';
import { createSaleContainer } from '@/modules/sale/container';
import { DrizzleServicePlanReportRepository } from './repositories/drizzle-service-plan-report.repository';
import { DrizzleExpirationReportRepository } from './repositories/drizzle-expiration-report.repository';
import { MovementsReportService } from './services/movements-report.service';
import { IncomeExpenseReportService } from './services/income-expense-report.service';
import { ServicePlanReportService } from './services/service-plan-report.service';
import { ExpirationReportService } from './services/expiration-report.service';

/** Reports are read-only views; they reuse the Transaction and Sale modules' repositories through their interfaces. */
export function createReportContainer(db: DbExecutor) {
  const ledger = createTransactionContainer(db).repository;
  const saleRepository = createSaleContainer(db).repository;

  return {
    movementsService: new MovementsReportService(ledger),
    incomeExpenseService: new IncomeExpenseReportService(ledger),
    servicePlanService: new ServicePlanReportService(new DrizzleServicePlanReportRepository(db)),
    expirationService: new ExpirationReportService(saleRepository, new DrizzleExpirationReportRepository(db)),
  };
}
