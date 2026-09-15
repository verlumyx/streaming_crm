import type { MembershipStatus } from '@/modules/shared/models/user-company.model';
import type { UpdateStatusUserInput } from '../validation/update-status-user.schema';

export class UpdateStatusUserCommand {
  constructor(readonly status: MembershipStatus) {}

  static fromInput(input: UpdateStatusUserInput): UpdateStatusUserCommand {
    return new UpdateStatusUserCommand(input.status);
  }
}
