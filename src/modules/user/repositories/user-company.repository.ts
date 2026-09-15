import type { UserCompanyRow } from '@/modules/shared/models/user-company.model';
import type { CreateUserCompanyCommand } from '../commands/create-user-company.command';
import type { UpdateStatusUserCommand } from '../commands/update-status-user.command';

/** Memberships (`user_company`): the per-company role and status of a user. */
export interface UserCompanyRepository {
  create(command: CreateUserCompanyCommand): Promise<void>;
  find(userId: string, companyId: string): Promise<UserCompanyRow | null>;
  /** Sets the role of the user in the company, creating an active membership when missing. */
  updateRole(userId: string, companyId: string, roleId: string | null): Promise<void>;
  updateStatus(row: UserCompanyRow, command: UpdateStatusUserCommand): Promise<void>;
}
