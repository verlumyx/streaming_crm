import type { ClientStatus } from '../models/client.model';
import type { UpdateStatusClientInput } from '../validation/update-status-client.schema';

export class UpdateStatusClientCommand {
  constructor(readonly status: ClientStatus) {}

  static fromInput(input: UpdateStatusClientInput): UpdateStatusClientCommand {
    return new UpdateStatusClientCommand(input.status);
  }
}
