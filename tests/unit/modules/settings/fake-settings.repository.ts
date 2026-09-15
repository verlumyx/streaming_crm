import type { UserRow } from '@/db/auth-schema';
import type { UserCompanyRow } from '@/modules/shared/models/user-company.model';
import type { ProfileChanges, SettingsRepository } from '@/modules/settings/repositories/settings.repository';

export function buildUserRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: '0192f3a0-0000-7000-8000-000000000001',
    name: 'Ana',
    email: 'ana@example.com',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    twoFactorEnabled: false,
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    isSystemOwner: false,
    ...overrides,
  };
}

export function buildMembershipRow(overrides: Partial<UserCompanyRow> = {}): UserCompanyRow {
  return {
    id: `0192f3a0-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    userId: '0192f3a0-0000-7000-8000-000000000001',
    companyId: '0192f3a0-0000-7000-8000-00000000c001',
    roleId: null,
    status: 'active',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  };
}

/** In-memory `SettingsRepository` for service unit tests. */
export class FakeSettingsRepository implements SettingsRepository {
  constructor(
    public users: UserRow[] = [],
    public memberships: UserCompanyRow[] = [],
  ) {}

  async findUserById(userId: string) {
    return this.users.find((u) => u.id === userId) ?? null;
  }

  async existsUserWithEmail(email: string, ignoreUserId: string) {
    return this.users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== ignoreUserId);
  }

  async updateProfile(userId: string, changes: ProfileChanges) {
    const row = this.users.find((u) => u.id === userId);
    if (row) Object.assign(row, changes);
  }

  async findMembership(userId: string, companyId: string) {
    return this.memberships.find((m) => m.userId === userId && m.companyId === companyId) ?? null;
  }

  async setDefaultCompany(userId: string, companyId: string) {
    for (const m of this.memberships) {
      if (m.userId === userId) m.isDefault = m.companyId === companyId;
    }
  }
}
