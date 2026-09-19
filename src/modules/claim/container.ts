import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzleClaimRepository } from './repositories/drizzle-claim.repository';
import { ClaimCreateService } from './services/claim-create.service';
import { ClaimUpdateService } from './services/claim-update.service';
import { ClaimUpdateStatusService } from './services/claim-update-status.service';
import { ClaimFindService } from './services/claim-find.service';
import { ClaimSearchService } from './services/claim-search.service';
import { ClaimFormService } from './services/claim-form.service';

export function createClaimContainer(db: DbExecutor) {
  const repository = new DrizzleClaimRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new ClaimCreateService(repository),
    updateService: new ClaimUpdateService(repository),
    updateStatusService: new ClaimUpdateStatusService(repository),
    findService: new ClaimFindService(repository),
    searchService: new ClaimSearchService(repository),
    formService: new ClaimFormService(repository),
  };
}
