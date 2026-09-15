import type { AccountRenewalRow, AccountRow, ProfileRow } from '@/modules/account/models/account.model';
import type {
  AccountDetail,
  AccountRepository,
  AccountServiceRef,
  NewAccountRenewalData,
  NewProfileData,
  ProfileChange,
} from '@/modules/account/repositories/account.repository';
import type { CreateAccountCommand } from '@/modules/account/commands/create-account.command';
import type { SearchAccountCommand } from '@/modules/account/commands/search-account.command';
import type { UpdateAccountCommand } from '@/modules/account/commands/update-account.command';
import type { ServiceRow } from '@/modules/service/models/service.model';
import type { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { SecretCipher } from '@/modules/account/services/secret-cipher';
import { AccountNotFoundException } from '@/modules/account/exceptions/account-not-found.exception';
import { summarizeProfiles } from '@/modules/account/serializers/account.serializer';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';

/** In-memory `AccountRepository` for service unit tests. */
export class FakeAccountRepository implements AccountRepository {
  accounts: AccountRow[] = [];
  profiles: ProfileRow[] = [];
  renewals: AccountRenewalRow[] = [];
  services: AccountServiceRef[] = [];
  updateCalls = 0;

  async create(command: CreateAccountCommand, passwordEncrypted: string) {
    const sequence = this.accounts.filter((a) => a.companyId === command.companyId).length + 1;
    this.accounts.push({
      id: command.id,
      companyId: command.companyId,
      code: formatSequentialCode('ACC', sequence),
      serviceId: command.serviceId,
      email: command.email,
      passwordEncrypted,
      cost: command.cost.toFixed(2),
      purchaseDate: command.purchaseDate,
      nextRenewal: command.nextRenewal,
      status: command.status,
      notes: command.notes,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async createProfiles(accountId: string, rows: NewProfileData[]) {
    for (const row of rows) {
      this.profiles.push({
        id: uuidv7(),
        accountId,
        number: row.number,
        pin: row.pin,
        status: 'available',
        notes: null,
        createdAt: new Date(),
        updatedAt: null,
      });
    }
  }

  async createRenewal(renewal: NewAccountRenewalData) {
    this.renewals.push({ ...renewal, amount: renewal.amount.toFixed(2), createdAt: new Date(), updatedAt: null });
  }

  async findById(id: string, companyId: string) {
    return this.accounts.find((a) => a.id === id && a.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new AccountNotFoundException();
    return row;
  }

  async findDetail(id: string, companyId: string): Promise<AccountDetail | null> {
    const account = await this.findById(id, companyId);
    if (!account) return null;
    const service = this.services.find((s) => s.id === account.serviceId) ?? {
      id: account.serviceId,
      code: 'SER000001',
      name: 'Servicio',
      maxProfiles: 0,
    };
    return {
      account,
      service,
      profiles: await this.profilesOf(id),
      renewals: this.renewals.filter((r) => r.accountId === id),
    };
  }

  async profilesOf(accountId: string) {
    return this.profiles.filter((p) => p.accountId === accountId).sort((a, b) => a.number - b.number);
  }

  async update(row: AccountRow, command: UpdateAccountCommand, passwordEncrypted: string | null) {
    this.updateCalls++;
    Object.assign(row, {
      email: command.email,
      cost: command.cost.toFixed(2),
      purchaseDate: command.purchaseDate,
      nextRenewal: command.nextRenewal,
      status: command.status,
      notes: command.notes,
      ...(passwordEncrypted !== null ? { passwordEncrypted } : {}),
    });
  }

  async updateProfiles(accountId: string, changes: readonly ProfileChange[]) {
    for (const change of changes) {
      const profile = this.profiles.find((p) => p.accountId === accountId && p.number === change.number);
      if (!profile) continue;
      if (change.pin !== undefined) profile.pin = change.pin;
      if (change.notes !== undefined) profile.notes = change.notes;
      if (change.status) profile.status = change.status;
    }
  }

  async applyRenewal(row: AccountRow, nextRenewal: string, cost: number) {
    Object.assign(row, { nextRenewal, cost: cost.toFixed(2) });
  }

  async search(command: SearchAccountCommand) {
    const rows = this.accounts.filter((a) => a.companyId === command.companyId);
    const data = rows.slice(command.offset, command.offset + command.limit).map((account) => ({
      account,
      service: this.services.find((s) => s.id === account.serviceId)!,
      profilesSummary: summarizeProfiles(this.profiles.filter((p) => p.accountId === account.id)),
    }));
    return { data, total: rows.length };
  }

  async existsByEmail(email: string, serviceId: string, ignoreId?: string) {
    return this.accounts.some(
      (a) => a.serviceId === serviceId && a.email.toLowerCase() === email.toLowerCase() && a.id !== ignoreId,
    );
  }
}

/** Services visible to `AccountCreateService` (only `findById` is needed). */
export class FakeServiceLookup {
  rows: ServiceRow[] = [];

  add(companyId: string, maxProfiles: number): ServiceRow {
    const row: ServiceRow = {
      id: uuidv7(),
      companyId,
      code: formatSequentialCode('SER', this.rows.length + 1),
      name: `Servicio ${this.rows.length + 1}`,
      logoUrl: null,
      maxProfiles,
      active: true,
      createdAt: new Date(),
      updatedAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }
}

/** Ledger double: records every command it receives. */
export class FakeLedger {
  commands: CreateTransactionCommand[] = [];

  async create(command: CreateTransactionCommand) {
    this.commands.push(command);
  }
}

/** Reversible, readable cipher for assertions. */
export const fakeCipher: SecretCipher = {
  encrypt: (plain) => `enc(${plain})`,
  decrypt: (payload) => payload.slice(4, -1),
};
