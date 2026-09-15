export type ExpirationSummaryFilters = {
  /** Forward-looking window for active sales ("por vencer"). */
  expiringFrom: string;
  expiringTo: string;
  /** Explicit window for expired sales and renewals; all history when absent. */
  dateFrom?: string;
  dateTo?: string;
  serviceId?: string;
  agentId?: string;
};

export type ExpirationTotals = {
  expiringCount: number;
  expiringAmount: number;
  expiredCount: number;
  expiredAmount: number;
  /** Distinct sales with a renewal whose previous end date falls in the explicit window. */
  renewedCount: number;
};

export interface ExpirationReportRepository {
  totals(companyId: string, filters: ExpirationSummaryFilters): Promise<ExpirationTotals>;
}
