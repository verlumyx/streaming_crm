import type { SaleCapacity, SaleStatus } from '@/modules/sale/models/sale.model';
import type { ServicePlanGroup } from '../validation/service-plan-report.schema';

export type ServicePlanReportFilters = {
  dateFrom: string;
  dateTo: string;
  groupBy: ServicePlanGroup;
  serviceId?: string;
  status?: SaleStatus;
  capacity?: SaleCapacity;
  limit: number;
  offset: number;
};

export type ServicePlanTotals = {
  totalSales: number;
  totalRevenue: number;
  profileCount: number;
  fullAccountCount: number;
};

export type ServicePlanGroupRow = {
  id: string;
  code: string;
  name: string;
  salesCount: number;
  revenue: number;
  /** Plan grouping only. */
  salePrice?: number;
  roiTargetPct?: number;
};

export interface ServicePlanReportRepository {
  totals(companyId: string, filters: ServicePlanReportFilters): Promise<ServicePlanTotals>;
  groupCount(companyId: string, filters: ServicePlanReportFilters): Promise<number>;
  /** Groups ordered by revenue desc; `limit`/`offset` from the filters. */
  groups(companyId: string, filters: ServicePlanReportFilters): Promise<ServicePlanGroupRow[]>;
}
