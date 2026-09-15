import type { PlanRecord, PlanRepository } from '../repositories/plan.repository';
import type { UpdateStatusPlanCommand } from '../commands/update-status-plan.command';
import { PlanNotFoundException } from '../exceptions/plan-not-found.exception';

/** Actualizar Estado: activate / deactivate (never delete). */
export class PlanUpdateStatusService {
  constructor(private readonly repository: PlanRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusPlanCommand): Promise<PlanRecord> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new PlanNotFoundException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
