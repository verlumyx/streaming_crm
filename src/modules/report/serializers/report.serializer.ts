export type ServicePlanRowDto = {
  id: string;
  code: string | null;
  name: string | null;
  salesCount: number;
  revenue: number;
  avgTicket: number;
  revenuePct: number;
  salePrice?: number | null;
  roiTargetPct?: number | null;
};

export type ServicePlanSummaryDto = {
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
  profileCount: number;
  fullAccountCount: number;
  topLabel: string | null;
};

export type IncomeExpenseSummaryDto = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
};

export type ReportMeta = { total: number; limit: number; offset: number; hasMore: boolean };

export const EMPTY_SERVICE_PLAN_SUMMARY: ServicePlanSummaryDto = {
  totalSales: 0,
  totalRevenue: 0,
  avgTicket: 0,
  profileCount: 0,
  fullAccountCount: 0,
  topLabel: null,
};

export const EMPTY_INCOME_EXPENSE_SUMMARY: IncomeExpenseSummaryDto = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  incomeCount: 0,
  expenseCount: 0,
};

export const meta = (total: number, limit: number, offset: number): ReportMeta => ({
  total,
  limit,
  offset,
  hasMore: total > offset + limit,
});

export type ExpirationSummaryDto = {
  expiringCount: number;
  expiringAmount: number;
  expiredCount: number;
  expiredAmount: number;
  renewalRate: number;
};

export const EMPTY_EXPIRATION_SUMMARY: ExpirationSummaryDto = {
  expiringCount: 0,
  expiringAmount: 0,
  expiredCount: 0,
  expiredAmount: 0,
  renewalRate: 0,
};
