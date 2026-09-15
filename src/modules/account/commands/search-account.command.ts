import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchAccountInput } from '../validation/search-account.schema';

/** Keys MUST match `accountFilters`. */
export type AccountSearchFilters = Partial<Pick<SearchAccountInput, 'code' | 'email' | 'status' | 'serviceId'>>;

export class SearchAccountCommand {
  readonly filters: AccountSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: AccountSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchAccountInput, companyId: string): SearchAccountCommand {
    const { limit, offset, ...filters } = input;
    return new SearchAccountCommand({ filters, limit, offset, companyId });
  }
}
