import type {
  ManualTransactionLineRow,
  ManualTransactionRow,
} from '../models/manual-transaction.model';
import type { CreateManualTransactionCommand } from '../commands/create-manual-transaction.command';
import type { SearchManualTransactionCommand } from '../commands/search-manual-transaction.command';

export type RecordedByUser = { id: string; name: string } | null;

export type ManualTransactionDetail = ManualTransactionRow & {
  lines: ManualTransactionLineRow[];
  recordedByUser: RecordedByUser;
};

export type ManualTransactionListItem = ManualTransactionRow & {
  lineCount: number;
  recordedByUser: RecordedByUser;
};

export interface ManualTransactionRepository {
  /** Header (code `MTX000001`, total = Σ lines, status pending) + lines with the type derived from the category. */
  create(command: CreateManualTransactionCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<ManualTransactionDetail | null>;
  findOrFail(id: string, companyId: string): Promise<ManualTransactionDetail>;
  /** `SELECT … FOR UPDATE` on the header; must run inside the action's transaction. */
  lockById(id: string, companyId: string): Promise<ManualTransactionRow | null>;
  linesOf(id: string): Promise<ManualTransactionLineRow[]>;
  approve(row: ManualTransactionRow): Promise<void>;
  cancel(row: ManualTransactionRow): Promise<void>;
  search(command: SearchManualTransactionCommand): Promise<{ data: ManualTransactionListItem[]; total: number }>;
}
