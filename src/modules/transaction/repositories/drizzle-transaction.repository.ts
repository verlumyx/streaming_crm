import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { transactions, typeForCategory, type TransactionRow } from '../models/transaction.model';
import { transactionFilters } from './transaction.filters';
import type { TransactionRepository, TransactionSummary } from './transaction.repository';
import type { CreateTransactionCommand } from '../commands/create-transaction.command';
import type { SearchTransactionCommand, TransactionSearchFilters } from '../commands/search-transaction.command';

export class DrizzleTransactionRepository implements TransactionRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateTransactionCommand): Promise<void> {
    const o = command.options;
    await this.db.insert(transactions).values({
      id: command.id,
      companyId: command.companyId,
      type: o.type ?? typeForCategory(command.category),
      category: command.category,
      amount: command.amount.toFixed(2),
      currency: o.currency ?? 'USD',
      date: command.date,
      paymentMethod: o.paymentMethod ?? 'cash',
      reference: o.reference ?? null,
      periodFrom: o.periodFrom ?? null,
      periodTo: o.periodTo ?? null,
      description: command.description.slice(0, 255),
      notes: o.notes ?? null,
      relatedType: o.relatedType ?? null,
      relatedId: o.relatedId ?? null,
      recordedBy: o.recordedBy ?? null,
    });
  }

  async findById(id: string, companyId: string): Promise<TransactionRow | null> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId), isNull(transactions.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  private scope(companyId: string, filters: TransactionSearchFilters) {
    return and(
      eq(transactions.companyId, companyId),
      isNull(transactions.deletedAt),
      ...applyFilters(transactionFilters, filters),
    );
  }

  async search(command: SearchTransactionCommand): Promise<{ data: TransactionRow[]; total: number }> {
    const where = this.scope(command.companyId, command.filters);
    const [{ total }] = await this.db.select({ total: count() }).from(transactions).where(where);
    const data = await this.db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(command.limit)
      .offset(command.offset);
    return { data, total };
  }

  async summarize(companyId: string, filters: TransactionSearchFilters): Promise<TransactionSummary> {
    const [row] = await this.db
      .select({
        totalIncome: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'income'), 0)`,
        totalExpense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'expense'), 0)`,
        incomeCount: sql<number>`count(*) filter (where ${transactions.type} = 'income')`.mapWith(Number),
        expenseCount: sql<number>`count(*) filter (where ${transactions.type} = 'expense')`.mapWith(Number),
      })
      .from(transactions)
      .where(this.scope(companyId, filters));

    return {
      totalIncome: Number(row.totalIncome),
      totalExpense: Number(row.totalExpense),
      incomeCount: row.incomeCount,
      expenseCount: row.expenseCount,
    };
  }

  async findRelated(companyId: string, relatedType: string, relatedId: string): Promise<TransactionRow[]> {
    return this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.companyId, companyId),
          eq(transactions.relatedType, relatedType as TransactionRow['relatedType'] & string),
          eq(transactions.relatedId, relatedId),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.createdAt));
  }
}
