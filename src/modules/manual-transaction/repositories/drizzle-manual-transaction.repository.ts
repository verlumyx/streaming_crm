import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { user } from '@/db/auth-schema';
import { typeForCategory } from '@/modules/transaction/models/transaction.model';
import {
  manualTransactionLines,
  manualTransactions,
  MANUAL_TRANSACTION_CODE_PREFIX,
  type ManualTransactionLineRow,
  type ManualTransactionRow,
} from '../models/manual-transaction.model';
import { ManualTransactionNotFoundException } from '../exceptions/manual-transaction-not-found.exception';
import { manualTransactionFilters } from './manual-transaction.filters';
import type {
  ManualTransactionDetail,
  ManualTransactionListItem,
  ManualTransactionRepository,
} from './manual-transaction.repository';
import type { CreateManualTransactionCommand } from '../commands/create-manual-transaction.command';
import type { SearchManualTransactionCommand } from '../commands/search-manual-transaction.command';

export class DrizzleManualTransactionRepository implements ManualTransactionRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateManualTransactionCommand): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, MANUAL_TRANSACTION_CODE_PREFIX);
    const code = await generateNextCode(this.db, manualTransactions, command.companyId, MANUAL_TRANSACTION_CODE_PREFIX);
    const totalCents = command.lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0);

    await this.db.insert(manualTransactions).values({
      id: command.id,
      companyId: command.companyId,
      code,
      date: command.date,
      paymentMethod: command.paymentMethod,
      reference: command.reference,
      currency: command.currency,
      description: command.description,
      notes: command.notes,
      recordedBy: command.recordedBy,
      total: (totalCents / 100).toFixed(2),
      status: 'pending',
    });

    await this.db.insert(manualTransactionLines).values(
      command.lines.map((line) => ({
        id: uuidv7(), // time-ordered: keeps the entry order when sorting by id
        manualTransactionId: command.id,
        type: typeForCategory(line.category),
        category: line.category,
        amount: line.amount.toFixed(2),
        description: line.description,
      })),
    );
  }

  async findById(id: string, companyId: string): Promise<ManualTransactionDetail | null> {
    const [row] = await this.db
      .select({ header: manualTransactions, recordedByName: user.name })
      .from(manualTransactions)
      .leftJoin(user, eq(user.id, manualTransactions.recordedBy))
      .where(and(eq(manualTransactions.id, id), eq(manualTransactions.companyId, companyId), isNull(manualTransactions.deletedAt)))
      .limit(1);
    if (!row) return null;

    return {
      ...row.header,
      lines: await this.linesOf(id),
      recordedByUser: row.header.recordedBy && row.recordedByName ? { id: row.header.recordedBy, name: row.recordedByName } : null,
    };
  }

  async findOrFail(id: string, companyId: string): Promise<ManualTransactionDetail> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ManualTransactionNotFoundException();
    return row;
  }

  async lockById(id: string, companyId: string): Promise<ManualTransactionRow | null> {
    const [row] = await this.db
      .select()
      .from(manualTransactions)
      .where(and(eq(manualTransactions.id, id), eq(manualTransactions.companyId, companyId), isNull(manualTransactions.deletedAt)))
      .limit(1)
      .for('update');
    return row ?? null;
  }

  linesOf(id: string): Promise<ManualTransactionLineRow[]> {
    return this.db
      .select()
      .from(manualTransactionLines)
      .where(eq(manualTransactionLines.manualTransactionId, id))
      .orderBy(asc(manualTransactionLines.createdAt), asc(manualTransactionLines.id));
  }

  async approve(row: ManualTransactionRow): Promise<void> {
    await this.db
      .update(manualTransactions)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(manualTransactions.id, row.id));
  }

  async cancel(row: ManualTransactionRow): Promise<void> {
    await this.db
      .update(manualTransactions)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(eq(manualTransactions.id, row.id));
  }

  async search(command: SearchManualTransactionCommand): Promise<{ data: ManualTransactionListItem[]; total: number }> {
    const where = and(
      eq(manualTransactions.companyId, command.companyId),
      isNull(manualTransactions.deletedAt),
      ...applyFilters(manualTransactionFilters, command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(manualTransactions).where(where);

    const rows = await this.db
      .select({
        header: manualTransactions,
        recordedByName: user.name,
        lineCount: sql<number>`(select count(*) from ${manualTransactionLines} where ${manualTransactionLines.manualTransactionId} = ${manualTransactions.id})`.mapWith(Number),
      })
      .from(manualTransactions)
      .leftJoin(user, eq(user.id, manualTransactions.recordedBy))
      .where(where)
      .orderBy(desc(manualTransactions.date), desc(manualTransactions.createdAt))
      .limit(command.limit)
      .offset(command.offset);

    return {
      total,
      data: rows.map((r) => ({
        ...r.header,
        lineCount: r.lineCount,
        recordedByUser: r.header.recordedBy && r.recordedByName ? { id: r.header.recordedBy, name: r.recordedByName } : null,
      })),
    };
  }
}
