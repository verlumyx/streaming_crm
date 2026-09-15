import type { PlanRecord, PlanRepository } from '../repositories/plan.repository';
import { PlanNotFoundException } from '../exceptions/plan-not-found.exception';

/** Ver / Editar. */
export class PlanFindService {
  constructor(private readonly repository: PlanRepository) {}

  async execute(id: string, companyId: string): Promise<PlanRecord> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new PlanNotFoundException();
    return row;
  }
}
