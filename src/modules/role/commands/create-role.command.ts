import type { PermissionType } from '../models/role.model';
import type { CreateRoleInput } from '../validation/create-role.schema';

export class CreateRoleCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly name: string,
    readonly description: string | null,
    readonly permissionType: PermissionType,
    /** Permission action strings (`users.list`); empty for `all` roles. */
    readonly permissions: readonly string[],
  ) {}

  static fromInput(input: CreateRoleInput, companyId: string): CreateRoleCommand {
    return new CreateRoleCommand(
      input.id,
      companyId,
      input.name,
      input.description,
      input.permissionType,
      input.permissions,
    );
  }
}
