import type { PlanRecord, PlanRepository } from '../repositories/plan.repository';
import type { SearchPlanCommand } from '../commands/search-plan.command';

/** Listar. */
export class PlanSearchService {
  constructor(private readonly repository: PlanRepository) {}

  execute(command: SearchPlanCommand): Promise<{ data: PlanRecord[]; total: number }> {
    return this.repository.search(command);
  }
}
