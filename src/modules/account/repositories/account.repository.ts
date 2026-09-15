import type {
  AccountRenewalRow,
  AccountRenewalType,
  AccountRow,
  ProfileRow,
  ProfileStatus,
} from '../models/account.model';
import type { CreateAccountCommand } from '../commands/create-account.command';
import type { SearchAccountCommand } from '../commands/search-account.command';
import type { UpdateAccountCommand, UpdateAccountProfileLine } from '../commands/update-account.command';

/** The service an account belongs to (joined for list / detail). */
export type AccountServiceRef = { id: string; code: string; name: string; maxProfiles: number };

export type ProfilesSummary = { total: number; available: number; occupied: number; maintenance: number };

export type AccountListItem = { account: AccountRow; service: AccountServiceRef; profilesSummary: ProfilesSummary };

/** Ver / Editar: account + service + profiles (by number) + renewals (latest first). */
export type AccountDetail = {
  account: AccountRow;
  service: AccountServiceRef;
  profiles: ProfileRow[];
  renewals: AccountRenewalRow[];
};

export type NewProfileData = { number: number; pin: string | null };

export type NewAccountRenewalData = {
  id: string;
  companyId: string;
  accountId: string;
  type: AccountRenewalType;
  amount: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  notes: string | null;
  createdBy: string | null;
};

export type ProfileChange = UpdateAccountProfileLine & { readonly status?: ProfileStatus };

export interface AccountRepository {
  /** Inserts the account with its per-company `ACC000001` code. */
  create(command: CreateAccountCommand, passwordEncrypted: string): Promise<void>;
  createProfiles(accountId: string, profiles: NewProfileData[]): Promise<void>;
  createRenewal(renewal: NewAccountRenewalData): Promise<void>;
  findById(id: string, companyId: string): Promise<AccountRow | null>;
  findOrFail(id: string, companyId: string): Promise<AccountRow>;
  findDetail(id: string, companyId: string): Promise<AccountDetail | null>;
  profilesOf(accountId: string): Promise<ProfileRow[]>;
  /** `passwordEncrypted === null` keeps the stored password. */
  update(row: AccountRow, command: UpdateAccountCommand, passwordEncrypted: string | null): Promise<void>;
  updateProfiles(accountId: string, changes: readonly ProfileChange[]): Promise<void>;
  applyRenewal(row: AccountRow, nextRenewal: string, cost: number): Promise<void>;
  search(command: SearchAccountCommand): Promise<{ data: AccountListItem[]; total: number }>;
  /** Case-insensitive email lookup inside a service, optionally ignoring one account. */
  existsByEmail(email: string, serviceId: string, ignoreId?: string): Promise<boolean>;
}
