import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { services } from '@/modules/service/models/service.model';
import {
  ACCOUNT_CODE_PREFIX,
  accountRenewals,
  accounts,
  profiles,
  type AccountRow,
  type ProfileRow,
} from '../models/account.model';
import { AccountNotFoundException } from '../exceptions/account-not-found.exception';
import { accountFilters } from './account.filters';
import type {
  AccountDetail,
  AccountListItem,
  AccountRepository,
  NewAccountRenewalData,
  NewProfileData,
  ProfileChange,
  ProfilesSummary,
} from './account.repository';
import type { CreateAccountCommand } from '../commands/create-account.command';
import type { SearchAccountCommand } from '../commands/search-account.command';
import type { UpdateAccountCommand } from '../commands/update-account.command';

const serviceRef = {
  id: services.id,
  code: services.code,
  name: services.name,
  maxProfiles: services.maxProfiles,
};

const EMPTY_SUMMARY: ProfilesSummary = { total: 0, available: 0, occupied: 0, maintenance: 0 };

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateAccountCommand, passwordEncrypted: string): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, ACCOUNT_CODE_PREFIX);
    const code = await generateNextCode(this.db, accounts, command.companyId, ACCOUNT_CODE_PREFIX);

    await this.db.insert(accounts).values({
      id: command.id,
      companyId: command.companyId,
      code,
      serviceId: command.serviceId,
      email: command.email,
      passwordEncrypted,
      cost: command.cost.toFixed(2),
      purchaseDate: command.purchaseDate,
      nextRenewal: command.nextRenewal,
      status: command.status,
      notes: command.notes,
    });
  }

  async createProfiles(accountId: string, rows: NewProfileData[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(profiles).values(
      rows.map((row) => ({ id: uuidv7(), accountId, number: row.number, pin: row.pin, status: 'available' as const })),
    );
  }

  async createRenewal(renewal: NewAccountRenewalData): Promise<void> {
    await this.db.insert(accountRenewals).values({ ...renewal, amount: renewal.amount.toFixed(2) });
  }

  async findById(id: string, companyId: string): Promise<AccountRow | null> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<AccountRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new AccountNotFoundException();
    return row;
  }

  async findDetail(id: string, companyId: string): Promise<AccountDetail | null> {
    const [head] = await this.db
      .select({ account: accounts, service: serviceRef })
      .from(accounts)
      .innerJoin(services, eq(services.id, accounts.serviceId))
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId)))
      .limit(1);
    if (!head) return null;

    const profileRows = await this.profilesOf(id);
    const renewalRows = await this.db
      .select()
      .from(accountRenewals)
      .where(eq(accountRenewals.accountId, id))
      .orderBy(desc(accountRenewals.paidAt), desc(accountRenewals.createdAt));

    return { ...head, profiles: profileRows, renewals: renewalRows };
  }

  async profilesOf(accountId: string): Promise<ProfileRow[]> {
    return this.db.select().from(profiles).where(eq(profiles.accountId, accountId)).orderBy(asc(profiles.number));
  }

  async update(row: AccountRow, command: UpdateAccountCommand, passwordEncrypted: string | null): Promise<void> {
    await this.db
      .update(accounts)
      .set({
        email: command.email,
        cost: command.cost.toFixed(2),
        purchaseDate: command.purchaseDate,
        nextRenewal: command.nextRenewal,
        status: command.status,
        notes: command.notes,
        ...(passwordEncrypted !== null ? { passwordEncrypted } : {}),
      })
      .where(eq(accounts.id, row.id));
  }

  async updateProfiles(accountId: string, changes: readonly ProfileChange[]): Promise<void> {
    for (const change of changes) {
      const values: Partial<Pick<ProfileRow, 'pin' | 'status' | 'notes'>> = {};
      if (change.pin !== undefined) values.pin = change.pin;
      if (change.notes !== undefined) values.notes = change.notes;
      if (change.status) values.status = change.status;
      if (Object.keys(values).length === 0) continue;

      await this.db
        .update(profiles)
        .set(values)
        .where(and(eq(profiles.accountId, accountId), eq(profiles.number, change.number)));
    }
  }

  async applyRenewal(row: AccountRow, nextRenewal: string, cost: number): Promise<void> {
    await this.db.update(accounts).set({ nextRenewal, cost: cost.toFixed(2) }).where(eq(accounts.id, row.id));
  }

  async search(command: SearchAccountCommand): Promise<{ data: AccountListItem[]; total: number }> {
    const where = and(eq(accounts.companyId, command.companyId), ...applyFilters(accountFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(accounts).where(where);
    const rows = await this.db
      .select({ account: accounts, service: serviceRef })
      .from(accounts)
      .innerJoin(services, eq(services.id, accounts.serviceId))
      .where(where)
      .orderBy(desc(accounts.createdAt), desc(accounts.id))
      .limit(command.limit)
      .offset(command.offset);

    const summaries = await this.profileSummaries(rows.map((r) => r.account.id));
    return {
      data: rows.map((r) => ({ ...r, profilesSummary: summaries[r.account.id] ?? EMPTY_SUMMARY })),
      total,
    };
  }

  async existsByEmail(email: string, serviceId: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.serviceId, serviceId),
          sql`lower(${accounts.email}) = lower(${email})`,
          ignoreId ? ne(accounts.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  private async profileSummaries(accountIds: string[]): Promise<Record<string, ProfilesSummary>> {
    if (accountIds.length === 0) return {};

    const rows = await this.db
      .select({
        accountId: profiles.accountId,
        total: count(),
        available: sql<number>`count(*) filter (where ${profiles.status} = 'available')`.mapWith(Number),
        occupied: sql<number>`count(*) filter (where ${profiles.status} = 'occupied')`.mapWith(Number),
        maintenance: sql<number>`count(*) filter (where ${profiles.status} = 'maintenance')`.mapWith(Number),
      })
      .from(profiles)
      .where(inArray(profiles.accountId, accountIds))
      .groupBy(profiles.accountId);

    return Object.fromEntries(rows.map(({ accountId, ...summary }) => [accountId, summary]));
  }
}
