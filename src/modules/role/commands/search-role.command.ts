import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchRoleInput } from '../validation/search-role.schema';

/** Keys MUST match `roleFilters`. */
export type RoleSearchFilters = Partial<Pick<SearchRoleInput, 'name' | 'status' | 'description'>>;

export class SearchRoleCommand {
  readonly filters: RoleSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: RoleSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchRoleInput, companyId: string): SearchRoleCommand {
    const { limit, offset, ...filters } = input;
    return new SearchRoleCommand({ filters, limit, offset, companyId });
  }
}
