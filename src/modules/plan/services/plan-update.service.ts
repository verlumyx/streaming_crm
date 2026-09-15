import type { PlanRecord, PlanRepository } from '../repositories/plan.repository';
import type { UpdatePlanCommand } from '../commands/update-plan.command';
import { PlanNotFoundException } from '../exceptions/plan-not-found.exception';
import { PlanInvalidServiceException } from '../exceptions/plan-invalid-service.exception';

/** Actualizar: every commercial field; the (possibly new) service must belong to the same company. */
export class PlanUpdateService {
  constructor(private readonly repository: PlanRepository) {}

  async execute(id: string, companyId: string, command: UpdatePlanCommand): Promise<PlanRecord> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new PlanNotFoundException();

    if (!(await this.repository.serviceExists(command.serviceId, companyId))) {
      throw new PlanInvalidServiceException();
    }

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
