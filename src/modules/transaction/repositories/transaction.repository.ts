import type { TransactionRow } from '../models/transaction.model';
import type { CreateTransactionCommand } from '../commands/create-transaction.command';
import type { SearchTransactionCommand, TransactionSearchFilters } from '../commands/search-transaction.command';

export type TransactionSummary = {
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
};

/** The company ledger. Written by other modules through their services; read by reports and the dashboard. */
export interface TransactionRepository {
  create(command: CreateTransactionCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<TransactionRow | null>;
  search(command: SearchTransactionCommand): Promise<{ data: TransactionRow[]; total: number }>;
  summarize(companyId: string, filters: TransactionSearchFilters): Promise<TransactionSummary>;
  /** Entries linked to a record of another module (e.g. `Sale`, id). */
  findRelated(companyId: string, relatedType: string, relatedId: string): Promise<TransactionRow[]>;
}
