import type { RoleStatus } from '../models/role.model';
import type { UpdateStatusRoleInput } from '../validation/update-status-role.schema';

export class UpdateStatusRoleCommand {
  constructor(readonly status: RoleStatus) {}

  static fromInput(input: UpdateStatusRoleInput): UpdateStatusRoleCommand {
    return new UpdateStatusRoleCommand(input.status);
  }
}
