import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { SeedCompanyServicesService } from '@/modules/service/services/seed-company-services.service';
import { DrizzleCompanyRepository } from './repositories/drizzle-company.repository';
import { CompanyCreateService } from './services/company-create.service';
import { CompanyFindService } from './services/company-find.service';
import { CompanySearchService } from './services/company-search.service';
import { CompanyUpdateService } from './services/company-update.service';
import { CompanyUpdateStatusService } from './services/company-update-status.service';

export function createCompanyContainer(db: DbExecutor) {
  const repository = new DrizzleCompanyRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new CompanyCreateService(repository, new SeedCompanyServicesService(db)),
    updateService: new CompanyUpdateService(repository),
    updateStatusService: new CompanyUpdateStatusService(repository),
    findService: new CompanyFindService(repository),
    searchService: new CompanySearchService(repository),
  };
}
