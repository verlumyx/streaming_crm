import type { SearchServiceInput } from '../validation/search-service.schema';

/** Keys MUST match `serviceFilters`. */
export type ServiceSearchFilters = Partial<Pick<SearchServiceInput, 'name' | 'code' | 'active'>>;

export class SearchServiceCommand {
  readonly filters: ServiceSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: ServiceSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? 20;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchServiceInput, companyId: string): SearchServiceCommand {
    const { limit, offset, ...filters } = input;
    return new SearchServiceCommand({ filters, limit, offset, companyId });
  }
}
