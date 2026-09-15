import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchManualTransactionInput } from '../validation/search-manual-transaction.schema';

/** Keys MUST match `manualTransactionFilters`. */
export type ManualTransactionSearchFilters = Partial<
  Pick<SearchManualTransactionInput, 'code' | 'reference' | 'dateFrom' | 'dateTo'>
>;

export class SearchManualTransactionCommand {
  readonly filters: ManualTransactionSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: ManualTransactionSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchManualTransactionInput, companyId: string): SearchManualTransactionCommand {
    const { limit, offset, ...filters } = input;
    return new SearchManualTransactionCommand({ filters, limit, offset, companyId });
  }
}
