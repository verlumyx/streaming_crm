import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchCompanyInput } from '../validation/search-company.schema';

/** Keys MUST match `companyFilters`. */
export type CompanySearchFilters = Partial<Pick<SearchCompanyInput, 'name' | 'status'>>;

/** Companies are global, so the search is not scoped by company. */
export class SearchCompanyCommand {
  readonly filters: CompanySearchFilters;
  readonly limit: number;
  readonly offset: number;

  constructor(params: { filters?: CompanySearchFilters; limit?: number; offset?: number } = {}) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
  }

  static fromInput(input: SearchCompanyInput): SearchCompanyCommand {
    const { limit, offset, ...filters } = input;
    return new SearchCompanyCommand({ filters, limit, offset });
  }
}
