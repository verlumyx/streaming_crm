import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { transactions, type TransactionType } from '@/modules/transaction/models/transaction.model';
import { accounts, profiles } from '@/modules/account/models/account.model';
import { services } from '@/modules/service/models/service.model';
import { sales } from '@/modules/sale/models/sale.model';
import { clients } from '@/modules/client/models/client.model';
import type {
  DashboardRepository,
  MonthlyTotals,
  ProfileStatusCounts,
  UpcomingSale,
} from './dashboard.repository';

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: DbExecutor) {}

  async sumTransactions(companyId: string, type: TransactionType, from: string, to: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.companyId, companyId),
          eq(transactions.type, type),
          gte(transactions.date, from),
          lte(transactions.date, to),
          isNull(transactions.deletedAt),
        ),
      );
    return Number(row.total);
  }

  async monthlyTotals(companyId: string, from: string): Promise<MonthlyTotals[]> {
    const key = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;
    const rows = await this.db
      .select({
        key,
        income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'income'), 0)`,
        expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'expense'), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.companyId, companyId), gte(transactions.date, from), isNull(transactions.deletedAt)))
      .groupBy(key);
    return rows.map((r) => ({ key: r.key, income: Number(r.income), expense: Number(r.expense) }));
  }

  async profileCountsByStatus(companyId: string): Promise<ProfileStatusCounts> {
    const rows = await this.db
      .select({ status: profiles.status, total: count() })
      .from(profiles)
      .innerJoin(accounts, eq(accounts.id, profiles.accountId))
      .where(eq(accounts.companyId, companyId))
      .groupBy(profiles.status);

    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.total]));
    return {
      occupied: byStatus.occupied ?? 0,
      available: byStatus.available ?? 0,
      maintenance: byStatus.maintenance ?? 0,
    };
  }

  async occupiedProfilesByService(companyId: string) {
    const occupied = count();
    return this.db
      .select({ id: services.id, name: services.name, occupied })
      .from(profiles)
      .innerJoin(accounts, eq(accounts.id, profiles.accountId))
      .innerJoin(services, eq(services.id, accounts.serviceId))
      .where(and(eq(accounts.companyId, companyId), eq(profiles.status, 'occupied')))
      .groupBy(services.id, services.name)
      .orderBy(desc(occupied), asc(services.name));
  }

  async receivables(companyId: string): Promise<{ amount: number; clients: number }> {
    const [row] = await this.db
      .select({
        amount: sql<string>`coalesce(sum(${sales.price}), 0)`,
        clients: countDistinct(sales.clientId),
      })
      .from(sales)
      .where(and(eq(sales.companyId, companyId), eq(sales.status, 'expired'), isNull(sales.deletedAt)));
    return { amount: Number(row.amount), clients: row.clients };
  }

  async upcomingSales(companyId: string, until: string, limit: number): Promise<UpcomingSale[]> {
    return this.db
      .select({
        id: sales.id,
        code: sales.code,
        clientName: clients.name,
        clientPhone: clients.phone,
        serviceName: services.name,
        endDate: sales.endDate,
      })
      .from(sales)
      .leftJoin(clients, eq(clients.id, sales.clientId))
      .leftJoin(services, eq(services.id, sales.serviceId))
      .where(
        and(
          eq(sales.companyId, companyId),
          inArray(sales.status, ['active', 'expired']),
          lte(sales.endDate, until),
          isNull(sales.deletedAt),
        ),
      )
      .orderBy(asc(sales.endDate), asc(sales.code))
      .limit(limit);
  }
}
