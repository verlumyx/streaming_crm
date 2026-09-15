import { and, eq, ne, sql } from 'drizzle-orm';
import { user, type UserRow } from '@/db/auth-schema';
import { userCompanies, type UserCompanyRow } from '@/modules/shared/models/user-company.model';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import type { ProfileChanges, SettingsRepository } from './settings.repository';

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DbExecutor) {}

  async findUserById(userId: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);
    return row ?? null;
  }

  async existsUserWithEmail(email: string, ignoreUserId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: user.id })
      .from(user)
      .where(and(sql`lower(${user.email}) = lower(${email})`, ne(user.id, ignoreUserId)))
      .limit(1);
    return Boolean(row);
  }

  async updateProfile(userId: string, changes: ProfileChanges): Promise<void> {
    await this.db
      .update(user)
      .set({ name: changes.name, email: changes.email, emailVerified: changes.emailVerified })
      .where(eq(user.id, userId));
  }

  async findMembership(userId: string, companyId: string): Promise<UserCompanyRow | null> {
    const [row] = await this.db
      .select()
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async setDefaultCompany(userId: string, companyId: string): Promise<void> {
    await this.db.update(userCompanies).set({ isDefault: false }).where(eq(userCompanies.userId, userId));
    await this.db
      .update(userCompanies)
      .set({ isDefault: true })
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)));
  }
}
