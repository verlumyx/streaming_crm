import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleServiceRepository } from './repositories/drizzle-service.repository';
import { ServiceCreateService } from './services/service-create.service';
import { ServiceFindService } from './services/service-find.service';
import { ServiceListActiveService } from './services/service-list-active.service';
import { ServiceSearchService } from './services/service-search.service';
import { ServiceUpdateService } from './services/service-update.service';
import { ServiceUpdateStatusService } from './services/service-update-status.service';

export function createServiceContainer(db: DbExecutor) {
  const repository = new DrizzleServiceRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new ServiceCreateService(repository),
    updateService: new ServiceUpdateService(repository),
    updateStatusService: new ServiceUpdateStatusService(repository),
    findService: new ServiceFindService(repository),
    searchService: new ServiceSearchService(repository),
    listActiveService: new ServiceListActiveService(repository),
  };
}
