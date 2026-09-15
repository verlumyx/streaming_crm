import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { userCompanies, type UserCompanyRow } from '@/modules/shared/models/user-company.model';
import { uuidv7 } from '@/modules/shared/uuid';
import type { UserCompanyRepository } from './user-company.repository';
import type { CreateUserCompanyCommand } from '../commands/create-user-company.command';
import type { UpdateStatusUserCommand } from '../commands/update-status-user.command';

export class DrizzleUserCompanyRepository implements UserCompanyRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateUserCompanyCommand): Promise<void> {
    await this.db.insert(userCompanies).values({
      id: command.id,
      userId: command.userId,
      companyId: command.companyId,
      roleId: command.roleId,
      status: command.status,
      isDefault: command.isDefault,
    });
  }

  async find(userId: string, companyId: string): Promise<UserCompanyRow | null> {
    const [row] = await this.db
      .select()
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async updateRole(userId: string, companyId: string, roleId: string | null): Promise<void> {
    await this.db
      .insert(userCompanies)
      .values({ id: uuidv7(), userId, companyId, roleId, status: 'active', isDefault: false })
      .onConflictDoUpdate({ target: [userCompanies.userId, userCompanies.companyId], set: { roleId } });
  }

  async updateStatus(row: UserCompanyRow, command: UpdateStatusUserCommand): Promise<void> {
    await this.db.update(userCompanies).set({ status: command.status }).where(eq(userCompanies.id, row.id));
  }
}
