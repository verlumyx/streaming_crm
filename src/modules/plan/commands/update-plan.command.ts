import type { PlanCapacity } from '../models/plan.model';
import type { UpdatePlanInput } from '../validation/update-plan.schema';

export class UpdatePlanCommand {
  constructor(
    readonly serviceId: string,
    readonly name: string,
    readonly capacity: PlanCapacity,
    readonly durationDays: number,
    readonly salePrice: number,
    readonly roiTargetPct: number,
  ) {}

  static fromInput(input: UpdatePlanInput): UpdatePlanCommand {
    return new UpdatePlanCommand(
      input.serviceId,
      input.name,
      input.capacity,
      input.durationDays,
      input.salePrice,
      input.roiTargetPct,
    );
  }
}
