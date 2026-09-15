import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchRefundInput } from '../validation/search-refund.schema';

/** Keys MUST match `refundFilters`. */
export type RefundSearchFilters = Partial<Pick<SearchRefundInput, 'q' | 'status' | 'saleId' | 'clientId'>>;

export class SearchRefundCommand {
  readonly filters: RefundSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: RefundSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchRefundInput, companyId: string): SearchRefundCommand {
    const { limit, offset, ...filters } = input;
    return new SearchRefundCommand({ filters, limit, offset, companyId });
  }
}
