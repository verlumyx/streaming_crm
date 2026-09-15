import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import type { RefundRow } from '@/modules/refund/models/refund.model';
import type {
  NewRefundData,
  RefundableSale,
  RefundClientRef,
  RefundDetail,
  RefundRepository,
} from '@/modules/refund/repositories/refund.repository';
import type { UpdateRefundCommand } from '@/modules/refund/commands/update-refund.command';
import type { SearchRefundCommand } from '@/modules/refund/commands/search-refund.command';
import { RefundNotFoundException } from '@/modules/refund/exceptions/refund-not-found.exception';

/** In-memory `RefundRepository` for service unit tests. */
export class FakeRefundRepository implements RefundRepository {
  rows: RefundRow[] = [];
  clients: RefundClientRef[] = [];
  locks: string[] = [];

  async create(data: NewRefundData) {
    const sequence = this.rows.filter((r) => r.companyId === data.companyId).length + 1;
    this.rows.push({
      id: data.id,
      companyId: data.companyId,
      code: formatSequentialCode('REF', sequence),
      saleId: data.saleId,
      clientId: data.clientId,
      amount: data.amount.toFixed(2),
      reason: data.reason,
      status: 'pending',
      requestedBy: data.requestedBy,
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
    });
  }

  async findById(id: string, companyId: string): Promise<RefundDetail | null> {
    const row = this.rows.find((r) => r.id === id && r.companyId === companyId);
    if (!row) return null;
    return {
      ...row,
      sale: null,
      client: this.clients.find((c) => c.id === row.clientId) ?? null,
      requestedByUser: null,
      resolvedByUser: null,
    };
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new RefundNotFoundException();
    return row;
  }

  async lockById(id: string, companyId: string) {
    this.locks.push(id);
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async update(row: RefundRow, command: UpdateRefundCommand) {
    Object.assign(row, { amount: command.amount.toFixed(2), reason: command.reason });
  }

  async approve(row: RefundRow, resolvedBy: string | null) {
    Object.assign(row, { status: 'approved', resolvedBy, resolvedAt: new Date() });
  }

  async reject(row: RefundRow, resolvedBy: string | null) {
    Object.assign(row, { status: 'rejected', resolvedBy, resolvedAt: new Date() });
  }

  async search(command: SearchRefundCommand) {
    const data = this.rows
      .filter((r) => r.companyId === command.companyId)
      .map((r) => ({ ...r, sale: null, client: null }));
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async listRefundableSales(): Promise<RefundableSale[]> {
    return [];
  }
}
