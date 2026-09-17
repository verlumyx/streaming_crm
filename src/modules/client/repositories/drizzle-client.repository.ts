import { and, asc, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { generateNextCode, lockCompanySequence } from '@/modules/shared/infrastructure/sequential-code';
import { clients, CLIENT_CODE_PREFIX, type ClientRow } from '../models/client.model';
import { saleProfiles, saleRenewals, sales, type SaleStatus } from '@/modules/sale/models/sale.model';
import { services } from '@/modules/service/models/service.model';
import { accounts, profiles } from '@/modules/account/models/account.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';
import { clientFilters } from './client.filters';
import type {
  ClientMetrics,
  ClientPlatform,
  ClientRepository,
  ClientSaleSummary,
} from './client.repository';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { SearchClientCommand } from '../commands/search-client.command';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import { toE164 } from '@/lib/phone';

export class DrizzleClientRepository implements ClientRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateClientCommand): Promise<void> {
    await lockCompanySequence(this.db, command.companyId, CLIENT_CODE_PREFIX);
    const code = await generateNextCode(this.db, clients, command.companyId, CLIENT_CODE_PREFIX);

    await this.db.insert(clients).values({
      id: command.id,
      companyId: command.companyId,
      code,
      name: command.name,
      phone: command.phone,
      phoneE164: toE164(command.phone),
      email: command.email,
      notes: command.notes,
      status: 'active',
      createdBy: command.createdBy,
    });
  }

  async findById(id: string, companyId: string): Promise<ClientRow | null> {
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .limit(1);
    return row ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClientNotFoundException();
    return row;
  }

  async update(row: ClientRow, command: UpdateClientCommand): Promise<void> {
    await this.db
      .update(clients)
      .set({
        name: command.name,
        phone: command.phone,
        phoneE164: toE164(command.phone),
        email: command.email,
        notes: command.notes,
      })
      .where(eq(clients.id, row.id));
  }

  async updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void> {
    await this.db.update(clients).set({ status: command.status }).where(eq(clients.id, row.id));
  }

  async search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
    const where = and(eq(clients.companyId, command.companyId), ...applyFilters(clientFilters, command.filters));

    const [{ total }] = await this.db.select({ total: count() }).from(clients).where(where);
    const data = await this.db
      .select()
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt), desc(clients.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data, total };
  }

  async existsByEmail(email: string, companyId: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.companyId, companyId),
          sql`lower(${clients.email}) = lower(${email})`,
          ignoreId ? ne(clients.id, ignoreId) : undefined,
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async activePlatformsByClient(clientIds: string[], companyId: string): Promise<Record<string, ClientPlatform[]>> {
    if (clientIds.length === 0) return {};

    const rows = await this.db
      .selectDistinct({ clientId: sales.clientId, id: services.id, name: services.name, code: services.code })
      .from(sales)
      .innerJoin(services, eq(services.id, sales.serviceId))
      .where(
        and(
          eq(sales.companyId, companyId),
          inArray(sales.clientId, clientIds),
          eq(sales.status, 'active'),
          isNull(sales.deletedAt),
        ),
      )
      .orderBy(asc(services.name));

    const byClient: Record<string, ClientPlatform[]> = {};
    for (const { clientId, ...platform } of rows) {
      (byClient[clientId] ??= []).push(platform);
    }
    return byClient;
  }

  async metrics(clientId: string, companyId: string): Promise<ClientMetrics> {
    const scope = and(eq(sales.companyId, companyId), eq(sales.clientId, clientId), isNull(sales.deletedAt));

    const [agg] = await this.db
      .select({
        monthlyIncome: sql<string>`coalesce(sum(${sales.price}) filter (where ${sales.status} = 'active'), 0)`,
        pendingDebt: sql<string>`coalesce(sum(${sales.price}) filter (where ${sales.status} = 'expired'), 0)`,
        // Pending / rejected sales were never paid.
        salesTotal: sql<string>`coalesce(sum(${sales.price}) filter (where ${sales.status} not in ('pending', 'rejected')), 0)`,
      })
      .from(sales)
      .where(scope);

    const [renewals] = await this.db
      .select({ total: sql<string>`coalesce(sum(${saleRenewals.price}), 0)` })
      .from(saleRenewals)
      .innerJoin(sales, eq(sales.id, saleRenewals.saleId))
      .where(scope);

    return {
      monthlyIncome: Number(agg.monthlyIncome),
      pendingDebt: Number(agg.pendingDebt),
      totalPaid: Number(agg.salesTotal) + Number(renewals.total),
    };
  }

  async currentSales(clientId: string, companyId: string): Promise<ClientSaleSummary[]> {
    const rows = await this.db
      .select({
        id: sales.id,
        code: sales.code,
        status: sales.status,
        capacity: sales.capacity,
        price: sales.price,
        endDate: sales.endDate,
        serviceName: services.name,
      })
      .from(sales)
      .innerJoin(services, eq(services.id, sales.serviceId))
      .where(
        and(
          eq(sales.companyId, companyId),
          eq(sales.clientId, clientId),
          inArray(sales.status, ['pending', 'active', 'expired'] satisfies SaleStatus[]),
          isNull(sales.deletedAt),
        ),
      )
      .orderBy(sql`case ${sales.status} when 'active' then 0 when 'pending' then 1 else 2 end`, desc(sales.endDate));

    if (rows.length === 0) return [];

    const occupied = await this.db
      .select({ saleId: saleProfiles.saleId, number: profiles.number, accountEmail: accounts.email })
      .from(saleProfiles)
      .innerJoin(profiles, eq(profiles.id, saleProfiles.profileId))
      .innerJoin(accounts, eq(accounts.id, profiles.accountId))
      .where(
        inArray(
          saleProfiles.saleId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(saleProfiles.createdAt), asc(profiles.number));

    return rows.map((sale) => {
      const mine = occupied.filter((p) => p.saleId === sale.id);
      return {
        ...sale,
        price: Number(sale.price),
        profileNumbers: mine.map((p) => p.number),
        accountEmail: mine[0]?.accountEmail ?? null,
      };
    });
  }
}
