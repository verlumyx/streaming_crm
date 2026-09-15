import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleClientRepository } from './repositories/drizzle-client.repository';
import { ClientCreateService } from './services/client-create.service';
import { ClientFindService } from './services/client-find.service';
import { ClientOverviewService } from './services/client-overview.service';
import { ClientSearchService } from './services/client-search.service';
import { ClientUpdateService } from './services/client-update.service';
import { ClientUpdateStatusService } from './services/client-update-status.service';

export function createClientContainer(db: DbExecutor) {
  const repository = new DrizzleClientRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new ClientCreateService(repository),
    updateService: new ClientUpdateService(repository),
    updateStatusService: new ClientUpdateStatusService(repository),
    findService: new ClientFindService(repository),
    searchService: new ClientSearchService(repository),
    overviewService: new ClientOverviewService(repository),
  };
}
