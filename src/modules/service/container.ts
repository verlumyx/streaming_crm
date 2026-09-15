import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleServiceRepository } from './repositories/drizzle-service.repository';
import { ServiceFindService } from './services/service-find.service';
import { ServiceListActiveService } from './services/service-list-active.service';
import { ServiceSearchService } from './services/service-search.service';

/** Read-only module: services are preloaded per company (`SeedCompanyServicesService`), never created or edited. */
export function createServiceContainer(db: DbExecutor) {
  const repository = new DrizzleServiceRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    findService: new ServiceFindService(repository),
    searchService: new ServiceSearchService(repository),
    listActiveService: new ServiceListActiveService(repository),
  };
}
