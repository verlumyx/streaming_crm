import type { MembershipStatus } from '@/modules/shared/models/user-company.model';
import type { CreateUserCommand } from '../commands/create-user.command';
import type { SearchUserCommand } from '../commands/search-user.command';
import type { UpdateUserCommand } from '../commands/update-user.command';

/** A global user seen from one company: its membership status and role there. */
export type UserWithMembership = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  companyId: string;
  companyName: string;
  membershipStatus: MembershipStatus;
  role: { id: string; name: string } | null;
};

/** Minimal global user data (no company scope). */
export type UserIdentity = { id: string; name: string; email: string };

export interface UserRepository {
  /** Inserts the global user (email not verified). */
  create(command: CreateUserCommand): Promise<void>;
  /** Stores the hash on the better-auth `credential` account, creating it when missing. */
  setCredentialPassword(userId: string, passwordHash: string): Promise<void>;
  /** Only users with a membership in `companyId`. */
  findById(id: string, companyId: string): Promise<UserWithMembership | null>;
  findOrFail(id: string, companyId: string): Promise<UserWithMembership>;
  update(row: UserWithMembership, command: UpdateUserCommand): Promise<void>;
  search(command: SearchUserCommand): Promise<{ data: UserWithMembership[]; total: number }>;

  findIdentityById(id: string): Promise<UserIdentity | null>;
  /** Case-insensitive. */
  findIdentityByEmail(email: string): Promise<UserIdentity | null>;
  /** Case-insensitive, global. */
  existsByEmail(email: string, ignoreId?: string): Promise<boolean>;
  roleBelongsToCompany(roleId: string, companyId: string): Promise<boolean>;
}
