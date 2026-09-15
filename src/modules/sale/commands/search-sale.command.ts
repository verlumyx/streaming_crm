import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import { todayIsoDate } from '@/lib/format';
import type { SearchSaleInput } from '../validation/search-sale.schema';

/** Keys MUST match `createSaleFilters()`. Filters combine with AND. */
export type SaleSearchFilters = Partial<{
  code: string;
  status: string;
  /** Comma-separated statuses (`active,expired`). */
  statusIn: string;
  clientId: string;
  agentId: string;
  serviceId: string;
  /** Inclusive range on `startDate`. */
  dateFrom: string;
  dateTo: string;
  /** Inclusive range on `endDate`. */
  endDateFrom: string;
  endDateTo: string;
  /** N days: active AND `endDate` between today and today + N. */
  expiringSoon: string | number;
}>;

export type SaleSearchOrder = 'createdAt' | 'endDate';

export class SearchSaleCommand {
  readonly filters: SaleSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;
  /** Reference date for relative filters (`expiringSoon`). */
  readonly today: string;
  /** `createdAt` desc (listing, default) or `endDate` asc (expirations). */
  readonly orderBy: SaleSearchOrder;

  constructor(params: {
    filters?: SaleSearchFilters;
    limit?: number;
    offset?: number;
    companyId: string;
    today?: string;
    orderBy?: SaleSearchOrder;
  }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
    this.today = params.today ?? todayIsoDate();
    this.orderBy = params.orderBy ?? 'createdAt';
  }

  static fromInput(input: SearchSaleInput, companyId: string, today?: string): SearchSaleCommand {
    const { limit, offset, ...filters } = input;
    return new SearchSaleCommand({ filters, limit, offset, companyId, today });
  }
}
