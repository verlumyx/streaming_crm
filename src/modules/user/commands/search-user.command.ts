import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchUserInput } from '../validation/search-user.schema';

/** Keys MUST match `userFilters`. */
export type UserSearchFilters = Partial<Pick<SearchUserInput, 'name' | 'email' | 'emailVerified'>>;

export class SearchUserCommand {
  readonly filters: UserSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: { filters?: UserSearchFilters; limit?: number; offset?: number; companyId: string }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchUserInput, companyId: string): SearchUserCommand {
    const { limit, offset, ...filters } = input;
    return new SearchUserCommand({ filters, limit, offset, companyId });
  }
}
