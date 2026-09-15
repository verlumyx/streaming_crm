import type { PlanCapacity } from '../models/plan.model';
import type { CreatePlanInput } from '../validation/create-plan.schema';

export class CreatePlanCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly serviceId: string,
    readonly name: string,
    readonly capacity: PlanCapacity,
    readonly durationDays: number,
    readonly salePrice: number,
    readonly roiTargetPct: number,
  ) {}

  static fromInput(input: CreatePlanInput, companyId: string): CreatePlanCommand {
    return new CreatePlanCommand(
      input.id,
      companyId,
      input.serviceId,
      input.name,
      input.capacity,
      input.durationDays,
      input.salePrice,
      input.roiTargetPct,
    );
  }
}
