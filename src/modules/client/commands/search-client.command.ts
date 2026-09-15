import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchClientInput } from '../validation/search-client.schema';

/** Keys MUST match `clientFilters`. */
export type ClientSearchFilters = Partial<Pick<SearchClientInput, 'name' | 'email' | 'phone' | 'code' | 'status'>>;

export class SearchClientCommand {
  readonly filters: ClientSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: ClientSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchClientInput, companyId: string): SearchClientCommand {
    const { limit, offset, ...filters } = input;
    return new SearchClientCommand({ filters, limit, offset, companyId });
  }
}
