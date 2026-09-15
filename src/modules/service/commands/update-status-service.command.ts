import type { UpdateStatusServiceInput } from '../validation/update-status-service.schema';

export class UpdateStatusServiceCommand {
  constructor(readonly active: boolean) {}

  static fromInput(input: UpdateStatusServiceInput): UpdateStatusServiceCommand {
    return new UpdateStatusServiceCommand(input.active);
  }
}
