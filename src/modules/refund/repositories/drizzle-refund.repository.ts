import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { user } from '@/db/auth-schema';
import { sales } from '@/modules/sale/models/sale.model';
import { clients } from '@/modules/client/models/client.model';
import { refunds, REFUND_CODE_PREFIX, type RefundRow } from '../models/refund.model';
import { RefundNotFoundException } from '../exceptions/refund-not-found.exception';
import { refundFilters } from './refund.filters';
import type {
  NewRefundData,
  RefundableSale,
  RefundDetail,
  RefundListItem,
  RefundRepository,
} from './refund.repository';
import type { UpdateRefundCommand } from '../commands/update-refund.command';
import type { SearchRefundCommand } from '../commands/search-refund.command';

const requester = alias(user, 'refund_requester');
const resolver = alias(user, 'refund_resolver');

export class DrizzleRefundRepository implements RefundRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(data: NewRefundData): Promise<void> {
    await lockCompanySequence(this.db, data.companyId, REFUND_CODE_PREFIX);
    const code = await generateNextCode(this.db, refunds, data.companyId, REFUND_CODE_PREFIX);

    await this.db.insert(refunds).values({
      id: data.id,
      companyId: data.companyId,
      code,
      saleId: data.saleId,
      clientId: data.clientId,
      amount: data.amount.toFixed(2),
      reason: data.reason?.slice(0, 255) ?? null,
      status: 'pending',
      requestedBy: data.requestedBy,
    });
  }

  private scope(id: string, companyId: string): SQL | undefined {
    return and(eq(refunds.id, id), eq(refunds.companyId, companyId), isNull(refunds.deletedAt));
  }

  private listSelection() {
    return {
      refund: refunds,
      sale: { id: sales.id, code: sales.code, status: sales.status, price: sales.price },
      client: { id: clients.id, name: clients.name, code: clients.code },
    };
  }

  async findById(id: string, companyId: string): Promise<RefundDetail | null> {
    const [row] = await this.db
      .select({
        ...this.listSelection(),
        requestedByName: requester.name,
        resolvedByName: resolver.name,
      })
      .from(refunds)
      .leftJoin(sales, eq(sales.id, refunds.saleId))
      .leftJoin(clients, eq(clients.id, refunds.clientId))
      .leftJoin(requester, eq(requester.id, refunds.requestedBy))
      .leftJoin(resolver, eq(resolver.id, refunds.resolvedBy))
      .where(this.scope(id, companyId))
      .limit(1);
    if (!row) return null;

    return {
      ...toListItem(row),
      requestedByUser: row.refund.requestedBy && row.requestedByName ? { id: row.refund.requestedBy, name: row.requestedByName } : null,
      resolvedByUser: row.refund.resolvedBy && row.resolvedByName ? { id: row.refund.resolvedBy, name: row.resolvedByName } : null,
    };
  }

  async findOrFail(id: string, companyId: string): Promise<RefundDetail> {
    const row = await this.findById(id, companyId);
    if (!row) throw new RefundNotFoundException();
    return row;
  }

  async lockById(id: string, companyId: string): Promise<RefundRow | null> {
    const [row] = await this.db.select().from(refunds).where(this.scope(id, companyId)).limit(1).for('update');
    return row ?? null;
  }

  async update(row: RefundRow, command: UpdateRefundCommand): Promise<void> {
    await this.db
      .update(refunds)
      .set({ amount: command.amount.toFixed(2), reason: command.reason })
      .where(eq(refunds.id, row.id));
  }

  async approve(row: RefundRow, resolvedBy: string | null): Promise<void> {
    await this.db
      .update(refunds)
      .set({ status: 'approved', resolvedBy, resolvedAt: new Date() })
      .where(eq(refunds.id, row.id));
  }

  async reject(row: RefundRow, resolvedBy: string | null): Promise<void> {
    await this.db
      .update(refunds)
      .set({ status: 'rejected', resolvedBy, resolvedAt: new Date() })
      .where(eq(refunds.id, row.id));
  }

  async search(command: SearchRefundCommand): Promise<{ data: RefundListItem[]; total: number }> {
    const where = and(
      eq(refunds.companyId, command.companyId),
      isNull(refunds.deletedAt),
      ...applyFilters(refundFilters, command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(refunds).where(where);

    const rows = await this.db
      .select(this.listSelection())
      .from(refunds)
      .leftJoin(sales, eq(sales.id, refunds.saleId))
      .leftJoin(clients, eq(clients.id, refunds.clientId))
      .where(where)
      .orderBy(desc(refunds.createdAt), desc(refunds.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data: rows.map(toListItem), total };
  }

  async listRefundableSales(companyId: string, limit: number): Promise<RefundableSale[]> {
    return this.db
      .select({ id: sales.id, code: sales.code, clientName: clients.name, price: sales.price, status: sales.status })
      .from(sales)
      .leftJoin(clients, eq(clients.id, sales.clientId))
      .where(and(eq(sales.companyId, companyId), inArray(sales.status, ['active', 'cancelled']), isNull(sales.deletedAt)))
      .orderBy(desc(sales.createdAt), desc(sales.id))
      .limit(limit);
  }
}

type ListRow = {
  refund: RefundRow;
  sale: RefundListItem['sale'] | { id: null; code: null; status: null; price: null };
  client: RefundListItem['client'] | { id: null; name: null; code: null };
};

/** Left joins return an object of nulls when there is no match. */
function toListItem(row: ListRow): RefundListItem {
  return {
    ...row.refund,
    sale: row.sale && row.sale.id ? (row.sale as RefundListItem['sale']) : null,
    client: row.client && row.client.id ? (row.client as RefundListItem['client']) : null,
  };
}
