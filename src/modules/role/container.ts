import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleRoleRepository } from './repositories/drizzle-role.repository';
import { RoleActiveListService } from './services/role-active-list.service';
import { RoleCreateService } from './services/role-create.service';
import { RoleFindService } from './services/role-find.service';
import { RoleSearchService } from './services/role-search.service';
import { RoleUpdateService } from './services/role-update.service';
import { RoleUpdateStatusService } from './services/role-update-status.service';

export function createRoleContainer(db: DbExecutor) {
  const repository = new DrizzleRoleRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new RoleCreateService(repository),
    updateService: new RoleUpdateService(repository),
    updateStatusService: new RoleUpdateStatusService(repository),
    findService: new RoleFindService(repository),
    searchService: new RoleSearchService(repository),
    activeListService: new RoleActiveListService(repository),
  };
}
