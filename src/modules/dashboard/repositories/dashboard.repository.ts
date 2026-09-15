import type { TransactionType } from '@/modules/transaction/models/transaction.model';

export type ProfileStatusCounts = { occupied: number; available: number; maintenance: number };

export type MonthlyTotals = { key: string; income: number; expense: number };

export type UpcomingSale = {
  id: string;
  code: string;
  clientName: string | null;
  clientPhone: string | null;
  serviceName: string | null;
  endDate: string;
};

/** Read-only aggregates across the ledger, inventory and sales of one company. */
export interface DashboardRepository {
  sumTransactions(companyId: string, type: TransactionType, from: string, to: string): Promise<number>;
  monthlyTotals(companyId: string, from: string): Promise<MonthlyTotals[]>;
  profileCountsByStatus(companyId: string): Promise<ProfileStatusCounts>;
  occupiedProfilesByService(companyId: string): Promise<{ id: string; name: string; occupied: number }[]>;
  receivables(companyId: string): Promise<{ amount: number; clients: number }>;
  upcomingSales(companyId: string, until: string, limit: number): Promise<UpcomingSale[]>;
}
