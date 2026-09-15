import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DrizzlePlanRepository } from './repositories/drizzle-plan.repository';
import { PlanCreateService } from './services/plan-create.service';
import { PlanFindService } from './services/plan-find.service';
import { PlanSearchService } from './services/plan-search.service';
import { PlanUpdateService } from './services/plan-update.service';
import { PlanUpdateStatusService } from './services/plan-update-status.service';

export function createPlanContainer(db: DbExecutor) {
  const repository = new DrizzlePlanRepository(db); // the ONLY place the concrete repository is named

  return {
    repository,
    createService: new PlanCreateService(repository),
    updateService: new PlanUpdateService(repository),
    updateStatusService: new PlanUpdateStatusService(repository),
    findService: new PlanFindService(repository),
    searchService: new PlanSearchService(repository),
  };
}
