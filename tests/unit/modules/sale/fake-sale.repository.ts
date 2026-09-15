import { addDays } from '@/lib/format';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import type { SaleRow } from '@/modules/sale/models/sale.model';
import type { LockedProfile } from '@/modules/sale/domain/sale-rules';
import type {
  NewSaleData,
  SaleClientOption,
  SaleDetail,
  SalePlanOption,
  SaleRenewalData,
  SaleRepository,
  SaleServiceRef,
} from '@/modules/sale/repositories/sale.repository';
import type { PendingRefundData, PendingRefundWriter } from '@/modules/sale/repositories/pending-refund.writer';
import type { TransactionRepository } from '@/modules/transaction/repositories/transaction.repository';
import type { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import { SaleNotFoundException } from '@/modules/sale/exceptions/sale-not-found.exception';

type FakeProfile = Omit<LockedProfile, 'linkedToSale' | 'heldByAnotherSale'>;
type Link = { saleId: string; profileId: string; seq: number };

/** In-memory `SaleRepository` for service unit tests. */
export class FakeSaleRepository implements SaleRepository {
  sales: SaleRow[] = [];
  clients: SaleClientOption[] = [];
  plans: SalePlanOption[] = [];
  services: SaleServiceRef[] = [];
  profiles: FakeProfile[] = [];
  links: Link[] = [];
  renewals: (SaleRenewalData & { saleId: string })[] = [];
  private seq = 0;

  async create(data: NewSaleData) {
    const sequence = this.sales.filter((s) => s.companyId === data.companyId).length + 1;
    this.sales.push({
      ...data,
      code: formatSequentialCode('SAL', sequence),
      price: data.price.toFixed(2),
      status: 'active',
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
    });
  }

  addSale(overrides: Partial<SaleRow> & { id: string; companyId: string }, profileIds: string[] = []): SaleRow {
    const startDate = overrides.startDate ?? '2026-09-01';
    const row: SaleRow = {
      code: formatSequentialCode('SAL', this.sales.length + 1),
      clientId: 'client-1',
      planId: 'plan-1',
      agentId: 'agent-1',
      serviceId: 'service-1',
      capacity: 'profile',
      durationDays: 30,
      price: '10.00',
      startDate,
      endDate: addDays(startDate, 30),
      status: 'active',
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
      ...overrides,
    };
    this.sales.push(row);
    for (const profileId of profileIds) this.links.push({ saleId: row.id, profileId, seq: ++this.seq });
    return row;
  }

  async findById(id: string, companyId: string) {
    return this.sales.find((s) => s.id === id && s.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new SaleNotFoundException();
    return row;
  }

  findForUpdate(id: string, companyId: string) {
    return this.findById(id, companyId);
  }

  async findDetail(): Promise<SaleDetail | null> {
    return null;
  }

  async search() {
    return { data: [], total: 0 };
  }

  async findClient(clientId: string) {
    return this.clients.find((c) => c.id === clientId) ?? null;
  }

  async findPlan(planId: string) {
    return this.plans.find((p) => p.id === planId) ?? null;
  }

  async findService(serviceId: string) {
    return this.services.find((s) => s.id === serviceId) ?? null;
  }

  private heldByAnotherSale(profileId: string, saleId: string): boolean {
    const mine = this.links.find((l) => l.saleId === saleId && l.profileId === profileId)?.seq ?? -1;
    return this.links.some(
      (l) =>
        l.profileId === profileId &&
        l.saleId !== saleId &&
        l.seq > mine &&
        this.sales.find((s) => s.id === l.saleId)?.status !== 'cancelled',
    );
  }

  async lockProfiles(profileIds: readonly string[], saleId?: string): Promise<LockedProfile[]> {
    return this.profiles
      .filter((p) => profileIds.includes(p.id))
      .map((p) => ({
        ...p,
        linkedToSale: saleId ? this.links.some((l) => l.saleId === saleId && l.profileId === p.id) : false,
        heldByAnotherSale: saleId ? this.heldByAnotherSale(p.id, saleId) : false,
      }));
  }

  async profileIdsOf(saleId: string) {
    return this.links.filter((l) => l.saleId === saleId).map((l) => l.profileId);
  }

  async assignProfiles(saleId: string, profileIds: readonly string[]) {
    for (const profileId of profileIds) {
      this.links.push({ saleId, profileId, seq: ++this.seq });
      this.profile(profileId).status = 'occupied';
    }
  }

  async replaceProfiles(saleId: string, profileIds: readonly string[], releaseIds: readonly string[]) {
    this.free(saleId, releaseIds);
    this.links = this.links.filter((l) => l.saleId !== saleId);
    await this.assignProfiles(saleId, profileIds);
  }

  async renew(sale: SaleRow, renewal: SaleRenewalData) {
    this.renewals.push({ ...renewal, saleId: sale.id });
    Object.assign(sale, { endDate: renewal.newEndDate, status: 'active' });
  }

  async reactivate(sale: SaleRow, renewal: SaleRenewalData) {
    this.renewals.push({ ...renewal, saleId: sale.id });
    Object.assign(sale, {
      endDate: renewal.newEndDate,
      price: renewal.price.toFixed(2),
      durationDays: renewal.durationDays,
      status: 'active',
      cancelledAt: null,
      cancellationReason: null,
    });
  }

  async cancel(sale: SaleRow, reason: string) {
    Object.assign(sale, { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason });
    this.free(sale.id);
  }

  private free(saleId: string, onlyIds?: readonly string[]): number {
    let freed = 0;
    for (const link of this.links.filter((l) => l.saleId === saleId)) {
      if (onlyIds && !onlyIds.includes(link.profileId)) continue;
      const p = this.profile(link.profileId);
      if (p.status === 'occupied' && !this.heldByAnotherSale(p.id, saleId)) {
        p.status = 'available';
        freed++;
      }
    }
    return freed;
  }

  profile(id: string): FakeProfile {
    const found = this.profiles.find((p) => p.id === id);
    if (!found) throw new Error(`profile ${id} not found`);
    return found;
  }

  async findDueActiveSaleIds(today: string) {
    return this.sales.filter((s) => s.status === 'active' && s.endDate < today).map((s) => s.id);
  }

  async markExpired(saleId: string, today: string) {
    const sale = this.sales.find((s) => s.id === saleId && s.status === 'active' && s.endDate < today);
    if (sale) sale.status = 'expired';
    return Boolean(sale);
  }

  async findExpiredSaleIdsEndingBefore(cutoff: string) {
    return this.sales.filter((s) => s.status === 'expired' && s.endDate < cutoff).map((s) => s.id);
  }

  async releaseProfiles(saleId: string) {
    return this.free(saleId);
  }

  async searchActiveClients() {
    return [];
  }
  async listClients() {
    return [];
  }
  async listServices() {
    return [];
  }
  async listAgents() {
    return [];
  }
  async listActivePlans() {
    return [];
  }
  async listAvailableProfiles() {
    return [];
  }
}

export class FakeTransactionRepository implements TransactionRepository {
  created: CreateTransactionCommand[] = [];

  async create(command: CreateTransactionCommand) {
    this.created.push(command);
  }
  async findById() {
    return null;
  }
  async search() {
    return { data: [], total: 0 };
  }
  async summarize() {
    return { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 };
  }
  async findRelated() {
    return [];
  }
}

export class FakePendingRefundWriter implements PendingRefundWriter {
  created: PendingRefundData[] = [];

  async create(refund: PendingRefundData) {
    this.created.push(refund);
  }
}
