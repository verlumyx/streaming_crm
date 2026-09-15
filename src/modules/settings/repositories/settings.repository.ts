import type { UserRow } from '@/db/auth-schema';
import type { UserCompanyRow } from '@/modules/shared/models/user-company.model';

export type ProfileChanges = { name: string; email: string; emailVerified: boolean };

export interface SettingsRepository {
  findUserById(userId: string): Promise<UserRow | null>;
  /** Case-insensitive email lookup across every user, ignoring `ignoreUserId`. */
  existsUserWithEmail(email: string, ignoreUserId: string): Promise<boolean>;
  updateProfile(userId: string, changes: ProfileChanges): Promise<void>;

  findMembership(userId: string, companyId: string): Promise<UserCompanyRow | null>;
  /** Marks `companyId` as the only default membership of the user. Run inside a transaction. */
  setDefaultCompany(userId: string, companyId: string): Promise<void>;
}
