import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { user } from '@/db/auth-schema';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters, contains } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { clients } from '@/modules/client/models/client.model';
import { plans } from '@/modules/plan/models/plan.model';
import { services } from '@/modules/service/models/service.model';
import { accounts, profiles } from '@/modules/account/models/account.model';
import { saleProfiles, saleRenewals, sales, SALE_CODE_PREFIX, type SaleRow } from '../models/sale.model';
import type { LockedProfile } from '../domain/sale-rules';
import { SaleNotFoundException } from '../exceptions/sale-not-found.exception';
import { createSaleFilters } from './sale.filters';
import type {
  NewSaleData,
  SaleAgentOption,
  SaleAvailableProfile,
  SaleClientOption,
  SaleDetail,
  SaleListItem,
  SalePlanOption,
  SaleRenewalData,
  SaleRepository,
  SaleServiceOption,
  SaleServiceRef,
} from './sale.repository';
import type { SearchSaleCommand } from '../commands/search-sale.command';

export class DrizzleSaleRepository implements SaleRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(data: NewSaleData): Promise<void> {
    await lockCompanySequence(this.db, data.companyId, SALE_CODE_PREFIX);
    const code = await generateNextCode(this.db, sales, data.companyId, SALE_CODE_PREFIX);

    await this.db.insert(sales).values({
      id: data.id,
      companyId: data.companyId,
      code,
      clientId: data.clientId,
      planId: data.planId,
      agentId: data.agentId,
      serviceId: data.serviceId,
      capacity: data.capacity,
      durationDays: data.durationDays,
      price: data.price.toFixed(2),
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'active',
      notes: data.notes,
    });
  }

  private scope(id: string, companyId: string) {
    return and(eq(sales.id, id), eq(sales.companyId, companyId), isNull(sales.deletedAt));
  }

  async findById(id: string, companyId: string): Promise<SaleRow | null> {
    const [row] = await this.db.select().from(sales).where(this.scope(id, companyId)).limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<SaleRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new SaleNotFoundException();
    return row;
  }

  async findForUpdate(id: string, companyId: string): Promise<SaleRow | null> {
    const [row] = await this.db.select().from(sales).where(this.scope(id, companyId)).limit(1).for('update');
    return row ?? null;
  }

  private listSelection() {
    return {
      sale: sales,
      client: { id: clients.id, name: clients.name, code: clients.code },
      plan: {
        id: plans.id,
        name: plans.name,
        code: plans.code,
        durationDays: plans.durationDays,
        salePrice: plans.salePrice,
      },
      service: { id: services.id, name: services.name, code: services.code, maxProfiles: services.maxProfiles },
      agent: { id: user.id, name: user.name },
    };
  }

  private listQuery(where: SQL | undefined) {
    return this.db
      .select(this.listSelection())
      .from(sales)
      .leftJoin(clients, eq(clients.id, sales.clientId))
      .leftJoin(plans, eq(plans.id, sales.planId))
      .leftJoin(services, eq(services.id, sales.serviceId))
      .leftJoin(user, eq(user.id, sales.agentId))
      .where(where);
  }

  async findDetail(id: string, companyId: string): Promise<SaleDetail | null> {
    const [row] = await this.listQuery(this.scope(id, companyId)).limit(1);
    if (!row) return null;

    const [profileRows, renewals] = await Promise.all([
      this.db
        .select({
          id: saleProfiles.id,
          profileId: saleProfiles.profileId,
          number: profiles.number,
          profileStatus: profiles.status,
          account: { id: accounts.id, code: accounts.code, email: accounts.email },
          createdAt: saleProfiles.createdAt,
        })
        .from(saleProfiles)
        .innerJoin(profiles, eq(profiles.id, saleProfiles.profileId))
        .innerJoin(accounts, eq(accounts.id, profiles.accountId))
        .where(eq(saleProfiles.saleId, id))
        .orderBy(asc(saleProfiles.createdAt), asc(profiles.number)),
      this.db
        .select()
        .from(saleRenewals)
        .where(eq(saleRenewals.saleId, id))
        .orderBy(desc(saleRenewals.renewedAt), desc(saleRenewals.createdAt)),
    ]);

    return { ...toListItem(row), saleProfiles: profileRows, renewals };
  }

  async search(command: SearchSaleCommand): Promise<{ data: SaleListItem[]; total: number }> {
    const where = and(
      eq(sales.companyId, command.companyId),
      isNull(sales.deletedAt),
      ...applyFilters(createSaleFilters(command.today), command.filters),
    );

    const [{ total }] = await this.db.select({ total: count() }).from(sales).where(where);
    const order =
      command.orderBy === 'endDate'
        ? [asc(sales.endDate), asc(sales.code)]
        : [desc(sales.createdAt), desc(sales.id)];
    const rows = await this.listQuery(where)
      .orderBy(...order)
      .limit(command.limit)
      .offset(command.offset);

    return { data: rows.map(toListItem), total };
  }

  async findClient(clientId: string, companyId: string): Promise<SaleClientOption | null> {
    const [row] = await this.db
      .select({ id: clients.id, name: clients.name, code: clients.code, status: clients.status })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  private planSelection() {
    return {
      id: plans.id,
      name: plans.name,
      code: plans.code,
      serviceId: plans.serviceId,
      serviceName: services.name,
      maxProfiles: services.maxProfiles,
      capacity: plans.capacity,
      durationDays: plans.durationDays,
      salePrice: plans.salePrice,
    };
  }

  async findPlan(planId: string, companyId: string): Promise<SalePlanOption | null> {
    const [row] = await this.db
      .select(this.planSelection())
      .from(plans)
      .innerJoin(services, eq(services.id, plans.serviceId))
      .where(and(eq(plans.id, planId), eq(plans.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findService(serviceId: string, companyId: string): Promise<SaleServiceRef | null> {
    const [row] = await this.db
      .select({ id: services.id, name: services.name, code: services.code, maxProfiles: services.maxProfiles })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  /** The profile row is linked to `saleId`. */
  private linkedToSale(saleId: string): SQL<boolean> {
    return sql<boolean>`exists (select 1 from ${saleProfiles} as mine_sp where mine_sp.sale_id = ${saleId} and mine_sp.profile_id = ${profiles.id})`;
  }

  /**
   * Another non-cancelled sale linked the profile AFTER `saleId` did: that sale holds it now
   * (e.g. it was freed by the expiration job and sold again). Correlated on `app_profiles.id`.
   */
  private heldByAnotherSale(saleId: string): SQL<boolean> {
    return sql<boolean>`exists (
      select 1 from ${saleProfiles} as other_sp
      inner join ${sales} as other_sale on other_sale.id = other_sp.sale_id
      where other_sp.profile_id = ${profiles.id}
        and other_sp.sale_id <> ${saleId}
        and other_sale.status <> 'cancelled'
        and other_sale.deleted_at is null
        and other_sp.created_at > coalesce(
          (select mine_sp.created_at from ${saleProfiles} as mine_sp where mine_sp.sale_id = ${saleId} and mine_sp.profile_id = ${profiles.id}),
          '-infinity'::timestamptz
        )
    )`;
  }

  async lockProfiles(profileIds: readonly string[], saleId?: string): Promise<LockedProfile[]> {
    if (profileIds.length === 0) return [];

    return this.db
      .select({
        id: profiles.id,
        number: profiles.number,
        status: profiles.status,
        accountId: accounts.id,
        accountEmail: accounts.email,
        accountCompanyId: accounts.companyId,
        accountServiceId: accounts.serviceId,
        linkedToSale: saleId ? this.linkedToSale(saleId) : sql<boolean>`false`,
        heldByAnotherSale: saleId ? this.heldByAnotherSale(saleId) : sql<boolean>`false`,
      })
      .from(profiles)
      .innerJoin(accounts, eq(accounts.id, profiles.accountId))
      .where(inArray(profiles.id, [...profileIds]))
      .orderBy(asc(profiles.id))
      .for('update', { of: profiles });
  }

  async profileIdsOf(saleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ profileId: saleProfiles.profileId })
      .from(saleProfiles)
      .where(eq(saleProfiles.saleId, saleId))
      .orderBy(asc(saleProfiles.createdAt));
    return rows.map((r) => r.profileId);
  }

  async assignProfiles(saleId: string, profileIds: readonly string[]): Promise<void> {
    if (profileIds.length === 0) return;
    await this.db.insert(saleProfiles).values(profileIds.map((profileId) => ({ id: uuidv7(), saleId, profileId })));
    await this.db.update(profiles).set({ status: 'occupied' }).where(inArray(profiles.id, [...profileIds]));
  }

  async replaceProfiles(saleId: string, profileIds: readonly string[], releaseIds: readonly string[]): Promise<void> {
    if (releaseIds.length > 0) await this.freeProfiles(saleId, releaseIds);

    /**
     * EXCEPTION: Physical deletion allowed.
     * Justification: `app_sale_profiles` is a join table describing which profiles a sale occupies NOW;
     * reactivation replaces that assignment. The history lives in `app_sale_renewals` and the ledger,
     * and `app_sales` / `app_profiles` are never deleted.
     * Approved by: Sales module spec (guia.md, regla 9 — reasignación de perfiles al reactivar).
     */
    await this.db.delete(saleProfiles).where(eq(saleProfiles.saleId, saleId));
    await this.assignProfiles(saleId, profileIds);
  }

  async renew(sale: SaleRow, renewal: SaleRenewalData): Promise<void> {
    await this.insertRenewal(sale.id, renewal);
    await this.db
      .update(sales)
      .set({ endDate: renewal.newEndDate, status: 'active' })
      .where(eq(sales.id, sale.id));
  }

  async reactivate(sale: SaleRow, renewal: SaleRenewalData): Promise<void> {
    await this.insertRenewal(sale.id, renewal);
    await this.db
      .update(sales)
      .set({
        endDate: renewal.newEndDate,
        price: renewal.price.toFixed(2),
        durationDays: renewal.durationDays,
        status: 'active',
        cancelledAt: null,
        cancellationReason: null,
      })
      .where(eq(sales.id, sale.id));
  }

  private async insertRenewal(saleId: string, renewal: SaleRenewalData): Promise<void> {
    await this.db.insert(saleRenewals).values({
      id: renewal.id,
      saleId,
      renewedAt: renewal.renewedAt,
      previousEndDate: renewal.previousEndDate,
      newEndDate: renewal.newEndDate,
      durationDays: renewal.durationDays,
      price: renewal.price.toFixed(2),
      renewedBy: renewal.renewedBy,
      notes: renewal.notes,
    });
  }

  async cancel(sale: SaleRow, reason: string): Promise<void> {
    await this.db
      .update(sales)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason.slice(0, 255) })
      .where(eq(sales.id, sale.id));
    await this.freeProfiles(sale.id);
  }

  /** Occupied profiles of the sale (optionally only `onlyIds`) that no newer non-cancelled sale holds → available. */
  private async freeProfiles(saleId: string, onlyIds?: readonly string[]): Promise<number> {
    const ofSale = this.db
      .select({ profileId: saleProfiles.profileId })
      .from(saleProfiles)
      .where(eq(saleProfiles.saleId, saleId));

    const freed = await this.db
      .update(profiles)
      .set({ status: 'available' })
      .where(
        and(
          inArray(profiles.id, ofSale),
          onlyIds ? inArray(profiles.id, [...onlyIds]) : undefined,
          eq(profiles.status, 'occupied'),
          sql`not ${this.heldByAnotherSale(saleId)}`,
        ),
      )
      .returning({ id: profiles.id });
    return freed.length;
  }

  async findDueActiveSaleIds(today: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.status, 'active'), lt(sales.endDate, today), isNull(sales.deletedAt)))
      .orderBy(asc(sales.endDate), asc(sales.id));
    return rows.map((r) => r.id);
  }

  async markExpired(saleId: string, today: string): Promise<boolean> {
    const rows = await this.db
      .update(sales)
      .set({ status: 'expired' })
      .where(and(eq(sales.id, saleId), eq(sales.status, 'active'), lt(sales.endDate, today)))
      .returning({ id: sales.id });
    return rows.length > 0;
  }

  async findExpiredSaleIdsEndingBefore(cutoff: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.status, 'expired'), lt(sales.endDate, cutoff), isNull(sales.deletedAt)))
      .orderBy(asc(sales.endDate), asc(sales.id));
    return rows.map((r) => r.id);
  }

  async releaseProfiles(saleId: string): Promise<number> {
    return this.freeProfiles(saleId);
  }

  private clientOptionSelection() {
    return { id: clients.id, name: clients.name, code: clients.code, status: clients.status };
  }

  async searchActiveClients(companyId: string, term: string, limit: number): Promise<SaleClientOption[]> {
    const trimmed = term.trim();
    return this.db
      .select(this.clientOptionSelection())
      .from(clients)
      .where(
        and(
          eq(clients.companyId, companyId),
          eq(clients.status, 'active'),
          trimmed ? or(ilike(clients.name, contains(trimmed)), ilike(clients.code, contains(trimmed))) : undefined,
        ),
      )
      .orderBy(asc(clients.name), asc(clients.id))
      .limit(limit);
  }

  async listClients(companyId: string): Promise<SaleClientOption[]> {
    return this.db
      .select(this.clientOptionSelection())
      .from(clients)
      .where(eq(clients.companyId, companyId))
      .orderBy(asc(clients.name), asc(clients.id));
  }

  async listServices(companyId: string): Promise<SaleServiceOption[]> {
    return this.db
      .select({ id: services.id, name: services.name, code: services.code })
      .from(services)
      .where(eq(services.companyId, companyId))
      .orderBy(asc(services.name));
  }

  async listAgents(companyId: string): Promise<SaleAgentOption[]> {
    return this.db
      .selectDistinct({ id: user.id, name: user.name })
      .from(userCompanies)
      .innerJoin(user, eq(user.id, userCompanies.userId))
      .where(eq(userCompanies.companyId, companyId))
      .orderBy(asc(user.name), asc(user.id));
  }

  async listActivePlans(companyId: string): Promise<SalePlanOption[]> {
    return this.db
      .select(this.planSelection())
      .from(plans)
      .innerJoin(services, eq(services.id, plans.serviceId))
      .where(and(eq(plans.companyId, companyId), eq(plans.active, true)))
      .orderBy(asc(plans.name), asc(plans.id));
  }

  async listAvailableProfiles(companyId: string, serviceId?: string): Promise<SaleAvailableProfile[]> {
    return this.db
      .select({
        id: profiles.id,
        number: profiles.number,
        accountId: accounts.id,
        accountCode: accounts.code,
        accountEmail: accounts.email,
        serviceId: accounts.serviceId,
      })
      .from(profiles)
      .innerJoin(accounts, eq(accounts.id, profiles.accountId))
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(profiles.status, 'available'),
          serviceId ? eq(accounts.serviceId, serviceId) : undefined,
        ),
      )
      .orderBy(asc(accounts.email), asc(profiles.number));
  }
}

type ListRow = {
  sale: SaleRow;
  client: SaleListItem['client'];
  plan: SaleListItem['plan'];
  service: SaleListItem['service'];
  agent: SaleListItem['agent'];
};

function toListItem({ sale, client, plan, service, agent }: ListRow): SaleListItem {
  return { ...sale, client, plan, service, agent };
}

