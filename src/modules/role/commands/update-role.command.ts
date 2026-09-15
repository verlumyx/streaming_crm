import type { PermissionType } from '../models/role.model';
import type { UpdateRoleInput } from '../validation/update-role.schema';

export class UpdateRoleCommand {
  constructor(
    readonly name: string,
    readonly description: string | null,
    readonly permissionType: PermissionType,
    /** Replaces every permission of the role; empty for `all` roles. */
    readonly permissions: readonly string[],
  ) {}

  static fromInput(input: UpdateRoleInput): UpdateRoleCommand {
    return new UpdateRoleCommand(input.name, input.description, input.permissionType, input.permissions);
  }
}
