import type { UpdateStatusPlanInput } from '../validation/update-status-plan.schema';

export class UpdateStatusPlanCommand {
  constructor(readonly active: boolean) {}

  static fromInput(input: UpdateStatusPlanInput): UpdateStatusPlanCommand {
    return new UpdateStatusPlanCommand(input.active);
  }
}
