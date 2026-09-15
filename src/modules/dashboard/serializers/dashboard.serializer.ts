/** JSON-safe shapes rendered by the dashboard blocks. */
export type DashboardMetricsDto = {
  incomeMonth: number;
  expenseMonth: number;
  netProfit: number;
  profitMarginPct: number;
  incomeTrendPct: number | null;
  profitTrendPct: number | null;
  activeProfiles: number;
  freeProfiles: number;
  totalProfiles: number;
  receivableAmount: number;
  receivableClients: number;
};

export type DashboardRevenuePointDto = { month: string; income: number; expense: number; profit: number };

export type DashboardOccupancyDto = { occupied: number; available: number; maintenance: number; total: number };

export type DashboardPlatformDto = { id: string; name: string; occupied: number };

export type DashboardExpirationStatus = 'vencido' | 'porvencer' | 'activo';

export type DashboardExpirationDto = {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  statusKey: DashboardExpirationStatus;
  days: number;
};
